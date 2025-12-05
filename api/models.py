from typing import Optional, List
from sqlmodel import SQLModel, Field
from datetime import datetime
from pydantic import ConfigDict
from sqlalchemy import Column, JSON

class Channel(SQLModel, table=True):
    __tablename__ = "channels"
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str = Field(unique=True, index=True)
    base_cpv: float
    cpv_audience: float
    cpv_non_target: float

class Bonus(SQLModel, table=True):
    __tablename__ = "bonuses"
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str = Field(index=True) # Foreign key relation logically, but we keep it simple as SOW suggests
    bonus_type: str
    condition_type: Optional[str] = None
    min_value: float
    rate: float
    description: Optional[str] = None

class Surcharge(SQLModel, table=True):
    __tablename__ = "surcharges"
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str = Field(index=True)
    surcharge_type: str
    condition_value: Optional[str] = None
    rate: float
    description: Optional[str] = None

class Segment(SQLModel, table=True):
    __tablename__ = "segments"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    category_large: Optional[str] = None
    category_mid: Optional[str] = None
    category_small: Optional[str] = None
    recommended_advertisers: Optional[str] = None
    full_path: Optional[str] = None

class InputHistory(SQLModel, table=True):
    __tablename__ = "input_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    product_name: str
    total_budget: float
    duration: int
    ad_duration: int
    is_new_advertiser: bool
    raw_input_json: dict = Field(default={}, sa_column=Column(JSON))

    model_config = ConfigDict(arbitrary_types_allowed=True)
