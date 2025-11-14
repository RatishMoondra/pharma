from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal


class PIItemBase(BaseModel):
    medicine_id: int
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)


class PIItemCreate(PIItemBase):
    pass


class PIItemResponse(PIItemBase):
    id: int
    total_price: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class PIBase(BaseModel):
    pi_date: date
    partner_vendor_id: int
    currency: str = "INR"
    remarks: Optional[str] = None


class PICreate(PIBase):
    items: List[PIItemCreate]


class PIUpdate(BaseModel):
    pi_date: Optional[date] = None
    remarks: Optional[str] = None


class PIResponse(PIBase):
    id: int
    pi_number: str
    total_amount: float
    created_by: int
    created_at: datetime
    items: List[PIItemResponse] = []
    
    class Config:
        from_attributes = True
