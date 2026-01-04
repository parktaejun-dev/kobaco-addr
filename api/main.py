from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, delete
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from contextlib import asynccontextmanager
from api.db import get_session
from api.models import Channel, Bonus, Surcharge, VisitLog, InputHistory, AdminUser, Segment, SystemSettings
from api.services.calculator import EstimateCalculator
from api.services.recommender import AISegmentRecommender
from api.auth import create_access_token, get_current_user, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

# --- Lifespan Manager ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and default admin
    from api.db import create_db_and_tables, engine
    create_db_and_tables()

    with Session(engine) as session:
        user = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        # Always force reset password to 'admin' to ensure login works after auth logic changes
        new_hashed_pw = get_password_hash("admin")
        if not user:
            admin = AdminUser(username="admin", password_hash=new_hashed_pw)
            session.add(admin)
            print("Admin user created.")
        else:
            user.password_hash = new_hashed_pw
            session.add(user)
            print("Admin password reset to 'admin'.")
        session.commit()
    yield
    # Shutdown logic if any

# --- App Init ---

# Trigger deployment
app = FastAPI(
    title="KOBATA API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Register a Korean font if available, else default
try:
    pdfmetrics.registerFont(TTFont('NanumGothic', 'NanumGothic.ttf'))
    FONT_NAME = 'NanumGothic'
except:
    FONT_NAME = 'Helvetica'

# --- Pydantic Schemas for Request/Response ---

class Token(BaseModel):
    access_token: str
    token_type: str

class RecommendationRequest(BaseModel):
    product_name: str
    website_url: Optional[str] = ""
    num_recommendations: int = 5

class EstimateRequest(BaseModel):
    selected_channels: List[str]
    channel_budgets: Dict[str, float]
    duration: int
    region_targeting: bool
    region_selections: Dict[str, str]
    audience_targeting: bool
    ad_duration: int
    custom_targeting: bool
    is_new_advertiser: bool
    advertiser_name: Optional[str] = ""
    product_name: Optional[str] = ""

class LogVisitRequest(BaseModel):
    ip_address: Optional[str] = None

class LogInputRequest(BaseModel):
    product_understanding: Optional[str]
    expanded_keywords: Optional[str]
    total_budget: float
    duration: int
    ad_duration: int
    audience_targeting: Optional[str]
    region_targeting: Optional[str]
    is_new_advertiser: bool
    channel_budgets: Dict[str, float]

class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    active_model: Optional[str] = None

# --- Endpoints ---

@app.get("/api/config")
def get_config(session: Session = Depends(get_session)):
    channels = session.exec(select(Channel)).all()
    # Bonuses/Surcharges might be too complex to send all at once for UI rendering unless needed
    # but let's send channels for the budget slider
    return {"channels": channels}

@app.post("/api/recommend")
def get_recommendations(req: RecommendationRequest, session: Session = Depends(get_session)):
    recommender = AISegmentRecommender(session)
    result = recommender.recommend_segments(req.product_name, req.website_url, req.num_recommendations)
    return result

@app.post("/api/estimate")
def get_estimate(req: EstimateRequest, session: Session = Depends(get_session)):
    calculator = EstimateCalculator(session)
    result = calculator.calculate_estimate(
        req.selected_channels,
        req.channel_budgets,
        req.duration,
        req.region_targeting,
        req.region_selections,
        req.audience_targeting,
        req.ad_duration,
        req.custom_targeting,
        req.is_new_advertiser
    )

    # Generate summary comment if not error
    if "error" not in result and req.product_name:
        recommender = AISegmentRecommender(session)
        summary = recommender.generate_summary_comment(
            req.product_name,
            req.advertiser_name or "광고주",
            result.get('recommended_segments', []), # Pass segments if available in request context or store state
            result['summary']['total_budget'],
            result['summary']['total_impressions']
        )
        result['summary_comment'] = summary

    return result

@app.post("/api/log/visit")
def log_visit(req: LogVisitRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # For serverless, waiting is safer than BackgroundTasks if execution cuts off immediately
    # But usually Vercel waits for response. To be safe, we do it synchronously here.
    try:
        log = VisitLog(ip_address=req.ip_address)
        session.add(log)
        session.commit()
    except Exception as e:
        print(f"Log visit error: {e}")
    return {"status": "logged"}

@app.post("/api/log/input")
def log_input(req: LogInputRequest, session: Session = Depends(get_session)):
    import json
    history = InputHistory(
        product_understanding=req.product_understanding,
        expanded_keywords=req.expanded_keywords,
        total_budget=req.total_budget,
        duration=req.duration,
        ad_duration=req.ad_duration,
        audience_targeting=req.audience_targeting,
        region_targeting=req.region_targeting,
        is_new_advertiser=req.is_new_advertiser,
        channel_budgets_json=json.dumps(req.channel_budgets)
    )
    session.add(history)
    session.commit()
    return {"status": "logged"}

@app.post("/api/report/download")
def download_report(req: EstimateRequest):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)

    # Title
    p.setFont(FONT_NAME, 20)
    p.drawString(100, 800, "KOBA-TA Estimate Report")

    p.setFont(FONT_NAME, 12)
    p.drawString(100, 770, f"Advertiser: {req.advertiser_name or 'Unknown'}")
    p.drawString(100, 750, f"Product: {req.product_name or 'Unknown'}")

    # Calculate estimate again to be sure (or trust frontend pass, but re-calc is safer)
    # Ideally we should re-use the service logic.
    # For now, let's just print basic info from request

    y = 700
    p.drawString(100, y, f"Total Budget: {sum(req.channel_budgets.values()):,.0f} (x10,000 KRW)")
    y -= 20
    p.drawString(100, y, f"Duration: {req.duration} months")
    y -= 20

    p.drawString(100, y, "Selected Channels:")
    y -= 20
    for ch, budget in req.channel_budgets.items():
        if budget > 0:
            p.drawString(120, y, f"- {ch}: {budget} (x10,000 KRW)")
            y -= 20

    p.showPage()
    p.save()

    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})


# --- Admin Auth & Endpoints ---

@app.post("/api/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    # Debug: Check if any admin exists
    # all_admins = session.exec(select(AdminUser)).all()
    # print(f"DEBUG: Found {len(all_admins)} admins")

    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    if not user:
        print(f"Login failed: User {form_data.username} not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        print(f"Login failed: Password mismatch for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/admin/segments")
def get_segments(current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    segments = session.exec(select(Segment)).all()
    return segments

@app.get("/api/admin/policies")
def get_policies(current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    channels = session.exec(select(Channel)).all()
    bonuses = session.exec(select(Bonus)).all()
    surcharges = session.exec(select(Surcharge)).all()
    return {"channels": channels, "bonuses": bonuses, "surcharges": surcharges}

@app.get("/api/admin/settings")
def get_settings(current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    settings_db = session.exec(select(SystemSettings)).all()
    settings_dict = {s.key: s.value for s in settings_db}
    # Mask keys for security
    if 'gemini_api_key' in settings_dict:
        settings_dict['gemini_api_key'] = '********' + settings_dict['gemini_api_key'][-4:] if len(settings_dict['gemini_api_key']) > 4 else '****'
    if 'deepseek_api_key' in settings_dict:
        settings_dict['deepseek_api_key'] = '********' + settings_dict['deepseek_api_key'][-4:] if len(settings_dict['deepseek_api_key']) > 4 else '****'

    return settings_dict

@app.post("/api/admin/settings")
def update_settings(update: SettingsUpdate, current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    def set_val(key, val):
        if not val: return
        setting = session.exec(select(SystemSettings).where(SystemSettings.key == key)).first()
        if not setting:
            setting = SystemSettings(key=key, value=val)
            session.add(setting)
        else:
            setting.value = val
            session.add(setting)

    set_val('gemini_api_key', update.gemini_api_key)
    set_val('deepseek_api_key', update.deepseek_api_key)
    set_val('active_model', update.active_model)
    session.commit()
    return {"status": "updated"}

@app.put("/api/admin/channels/{id}")
def update_channel(id: int, data: Channel, session: Session = Depends(get_session), current_user: AdminUser = Depends(get_current_user)):
    obj = session.get(Channel, id)
    if not obj: raise HTTPException(status_code=404, detail="Channel not found")
    # Update allow-listed fields
    obj.base_cpv = data.base_cpv
    obj.cpv_audience = data.cpv_audience
    obj.cpv_non_target = data.cpv_non_target
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@app.put("/api/admin/bonuses/{id}")
def update_bonus(id: int, data: Bonus, session: Session = Depends(get_session), current_user: AdminUser = Depends(get_current_user)):
    obj = session.get(Bonus, id)
    if not obj: raise HTTPException(status_code=404, detail="Bonus not found")
    obj.min_value = data.min_value
    obj.rate = data.rate
    obj.description = data.description
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@app.put("/api/admin/surcharges/{id}")
def update_surcharge(id: int, data: Surcharge, session: Session = Depends(get_session), current_user: AdminUser = Depends(get_current_user)):
    obj = session.get(Surcharge, id)
    if not obj: raise HTTPException(status_code=404, detail="Surcharge not found")
    obj.rate = data.rate
    obj.description = data.description
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@app.put("/api/admin/segments/{id}")
def update_segment(id: int, data: Segment, session: Session = Depends(get_session), current_user: AdminUser = Depends(get_current_user)):
    obj = session.get(Segment, id)
    if not obj: raise HTTPException(status_code=404, detail="Segment not found")
    obj.category_large = data.category_large
    obj.category_middle = data.category_middle
    obj.name = data.name
    obj.description = data.description
    obj.keywords = data.keywords
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

# --- Backup & Restore ---

@app.get("/api/admin/backup")
def backup_data(current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    channels = session.exec(select(Channel)).all()
    bonuses = session.exec(select(Bonus)).all()
    surcharges = session.exec(select(Surcharge)).all()
    segments = session.exec(select(Segment)).all()
    
    return {
        "channels": [c.model_dump() for c in channels],
        "bonuses": [b.model_dump() for b in bonuses],
        "surcharges": [s.model_dump() for s in surcharges],
        "segments": [s.model_dump() for s in segments]
    }

@app.post("/api/admin/restore")
def restore_data(data: Dict[str, List[Dict]], current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    try:
        # Delete existing
        session.exec(delete(Channel))
        session.exec(delete(Bonus))
        session.exec(delete(Surcharge))
        session.exec(delete(Segment))
        
        # Insert new
        # Note: model_validate handles conversion from dict, assuming IDs are included or managed
        # If IDs are present, they are preserved. If not, auto-increment.
        
        if "channels" in data:
            for item in data["channels"]:
                session.add(Channel.model_validate(item))
        
        if "bonuses" in data:
            for item in data["bonuses"]:
                session.add(Bonus.model_validate(item))
                
        if "surcharges" in data:
            for item in data["surcharges"]:
                session.add(Surcharge.model_validate(item))
                
        if "segments" in data:
            for item in data["segments"]:
                session.add(Segment.model_validate(item))
            
        session.commit()
        return {"status": "restored", "counts": {k: len(v) for k,v in data.items() if isinstance(v, list)}}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Restore failed: {str(e)}")
