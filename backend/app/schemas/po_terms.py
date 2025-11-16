from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class POTermsConditionsBase(BaseModel):
    term_text: str
    priority: int = 0


class POTermsConditionsCreate(POTermsConditionsBase):
    po_id: int


class POTermsConditionsUpdate(BaseModel):
    term_text: Optional[str] = None
    priority: Optional[int] = None


class POTermsConditionsResponse(POTermsConditionsBase):
    id: int
    po_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
