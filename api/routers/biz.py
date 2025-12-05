from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from api.database import get_session
from api.services.recommender import AISegmentRecommender
from api.services.calculator import EstimateCalculator
from api.models import InputHistory

router = APIRouter(prefix="/api/biz", tags=["biz"])

class AnalyzeRequest(BaseModel):
    product_name: str
    url: Optional[str] = ""
    num_recs: int = 3

class EstimateRequest(BaseModel):
    budget: int
    channel_allocations: Dict[str, float]
    duration: int
    region_targeting: bool = False
    region_selections: Dict[str, str] = {}
    audience_targeting: bool = False
    ad_duration: int = 15
    custom_targeting: bool = False
    is_new_advertiser: bool = False

@router.post("/analyze")
def analyze_product(req: AnalyzeRequest, session: Session = Depends(get_session)):
    recommender = AISegmentRecommender(session)
    result = recommender.recommend_segments(req.product_name, req.url, req.num_recs)
    return result

@router.post("/estimate")
def calculate_estimate(req: EstimateRequest, session: Session = Depends(get_session)):
    calculator = EstimateCalculator(session)
    # The calculator expects selected_channels as a list.
    # channel_allocations in request is {channel: amount_mw}
    # We derive selected_channels from keys where amount > 0

    selected_channels = [k for k, v in req.channel_allocations.items() if v > 0]

    result = calculator.calculate_estimate(
        selected_channels=selected_channels,
        channel_budgets=req.channel_allocations,
        duration=req.duration,
        region_targeting=req.region_targeting,
        region_selections=req.region_selections,
        audience_targeting=req.audience_targeting,
        ad_duration=req.ad_duration,
        custom_targeting=req.custom_targeting,
        is_new_advertiser=req.is_new_advertiser
    )
    return result

@router.post("/log/history")
def log_history(data: Dict[str, Any], session: Session = Depends(get_session)):
    # Extract known fields, put rest in raw_input_json
    try:
        history = InputHistory(
            product_name=data.get("product_name", "Unknown"),
            total_budget=float(data.get("total_budget", 0)),
            duration=int(data.get("duration", 0)),
            ad_duration=int(data.get("ad_duration", 15)),
            is_new_advertiser=bool(data.get("is_new_advertiser", False)),
            raw_input_json=data
        )
        session.add(history)
        session.commit()
        return {"status": "ok", "id": history.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
