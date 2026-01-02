from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from api.db import get_session
from api.models import Channel, Bonus, Surcharge, VisitLog, InputHistory, AdminUser, Segment
from api.services.calculator import EstimateCalculator
from api.services.recommender import AISegmentRecommender
from api.auth import create_access_token, get_current_user, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

app = FastAPI(title="KOBATA API", docs_url="/api/docs", openapi_url="/api/openapi.json")

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
    def _log():
        # In a real app, use a new session for background task or ensure thread safety
        # Since we are using dependency injection, it's safer to just do it here quickly
        log = VisitLog(ip_address=req.ip_address)
        session.add(log)
        session.commit()

    # For serverless, background tasks might be cut off if execution ends.
    # But for standard FastAPI, this is fine. Vercel functions have timeout limits.
    # It's better to await DB op here for serverless safety unless using a queue.
    log = VisitLog(ip_address=req.ip_address)
    session.add(log)
    session.commit()
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
    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
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

# Setup initial admin if not exists (for demo)
@app.on_event("startup")
def on_startup():
    from api.db import create_db_and_tables, engine
    # 1. Create tables first
    create_db_and_tables()

    # 2. Create admin user
    with Session(engine) as session:
        user = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        if not user:
            # Default password: admin
            hashed_pw = get_password_hash("admin")
            admin = AdminUser(username="admin", password_hash=hashed_pw)
            session.add(admin)
            session.commit()
