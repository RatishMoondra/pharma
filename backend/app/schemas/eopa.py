from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from app.models.eopa import EOPAStatus


class MedicineBasic(BaseModel):
    """Basic medicine info for nested responses"""
    id: int
    medicine_name: str
    dosage_form: str
    
    class Config:
        from_attributes = True


class PIBasic(BaseModel):
    """Basic PI info for nested responses"""
    id: int
    pi_number: str
    pi_date: date
    
    class Config:
        from_attributes = True


class EOPAItemResponse(BaseModel):
    id: int
    medicine_id: int
    quantity: float
    unit_price: float
    total_price: float
    created_at: datetime
    medicine: Optional[MedicineBasic] = None
    
    class Config:
        from_attributes = True


class EOPABase(BaseModel):
    eopa_date: date
    remarks: Optional[str] = None


class EOPACreate(BaseModel):
    pi_id: int
    remarks: Optional[str] = None


class EOPAResponse(EOPABase):
    id: int
    eopa_number: str
    pi_id: int
    status: EOPAStatus
    total_amount: float
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    items: List[EOPAItemResponse] = []
    pi: Optional[PIBasic] = None
    
    class Config:
        from_attributes = True


class EOPAApproveSchema(BaseModel):
    approved: bool
    remarks: Optional[str] = None
