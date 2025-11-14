from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from app.models.po import POType, POStatus


class POItemResponse(BaseModel):
    id: int
    medicine_id: int
    quantity: float
    unit_price: float
    total_price: float
    received_quantity: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class POBase(BaseModel):
    po_date: date
    po_type: POType
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None


class POCreate(BaseModel):
    eopa_id: int
    po_type: POType
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None


class POUpdate(BaseModel):
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None
    status: Optional[POStatus] = None


class POResponse(POBase):
    id: int
    po_number: str
    eopa_id: int
    vendor_id: int
    status: POStatus
    total_amount: float
    created_by: int
    created_at: datetime
    items: List[POItemResponse] = []
    
    class Config:
        from_attributes = True
