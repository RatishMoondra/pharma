from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from app.models.po import POType, POStatus


class VendorBasic(BaseModel):
    """Basic vendor info"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class MedicineBasic(BaseModel):
    """Basic medicine info"""
    id: int
    medicine_name: str
    dosage_form: str
    
    class Config:
        from_attributes = True


class EOPABasic(BaseModel):
    """Basic EOPA info"""
    id: int
    eopa_number: str
    eopa_date: date
    
    class Config:
        from_attributes = True


class POItemResponse(BaseModel):
    id: int
    medicine_id: int
    ordered_quantity: float
    fulfilled_quantity: float
    unit: Optional[str] = None  # kg, liters, boxes, labels, etc.
    language: Optional[str] = None
    artwork_version: Optional[str] = None
    created_at: datetime
    medicine: Optional[MedicineBasic] = None
    
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
    vendor_id: Optional[int] = None  # Can be NULL for unassigned vendors
    status: POStatus
    total_ordered_qty: float
    total_fulfilled_qty: float
    created_by: int
    created_at: datetime
    items: List[POItemResponse] = []
    vendor: Optional[VendorBasic] = None
    eopa: Optional[EOPABasic] = None
    
    class Config:
        from_attributes = True
