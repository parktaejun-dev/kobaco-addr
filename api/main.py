from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from api.db import get_session
from api.models import Channel, Bonus, Surcharge, VisitLog, InputHistory
from api.services.calculator import EstimateCalculator
from api.services.recommender import AISegmentRecommender

app = FastAPI(title="KOBATA API", docs_url="/api/docs", openapi_url="/api/openapi.json")

# --- Pydantic Schemas for Request/Response ---

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
