from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from api.database import get_session
from api.models import Channel, Segment

router = APIRouter(prefix="/api/system", tags=["system"])

@router.get("/init")
def get_init_data(session: Session = Depends(get_session)):
    channels = session.exec(select(Channel)).all()
    segments = session.exec(select(Segment)).all()

    return {
        "channels": channels,
        "segments": segments
    }
