from typing import Optional, List
from sqlmodel import SQLModel, Field, JSON
from datetime import datetime

# --- Sales Policy Models ---

class Channel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str = Field(index=True, unique=True)
    base_cpv: float
    cpv_audience: float
    cpv_non_target: float

class Bonus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str
    bonus_type: str
    condition_type: str
    min_value: float
    rate: float
    description: Optional[str] = None

class Surcharge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    channel_name: str
    surcharge_type: str
    condition_value: str
    rate: float
    description: Optional[str] = None

# --- Segment Model ---

class Segment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category_large: str  # 대분류
    category_middle: str  # 중분류
    name: str # 세그먼트명
    description: str # 세그먼트 설명
    keywords: str # 키워드 (comma separated or JSON)

# --- Analytics Models ---

class VisitLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now)
    ip_address: Optional[str] = None # Optional, hashed ideally

class InputHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now)
    product_understanding: Optional[str] = None
    expanded_keywords: Optional[str] = None
    total_budget: Optional[float] = None
    duration: Optional[int] = None
    ad_duration: Optional[int] = None
    audience_targeting: Optional[str] = None
    region_targeting: Optional[str] = None
    is_new_advertiser: bool = False
    channel_budgets_json: Optional[str] = None # Store as JSON string
