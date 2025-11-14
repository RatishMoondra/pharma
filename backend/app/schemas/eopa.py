from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from app.models.eopa import EOPAStatus


class VendorBasic(BaseModel):
    """Basic vendor info"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class MedicineBasic(BaseModel):
    """Basic medicine info for nested responses"""
    id: int
    medicine_name: str
    dosage_form: str
    unit: Optional[str] = None
    manufacturer_vendor_id: Optional[int] = None
    rm_vendor_id: Optional[int] = None
    pm_vendor_id: Optional[int] = None
    manufacturer_vendor: Optional[VendorBasic] = None
    rm_vendor: Optional[VendorBasic] = None
    pm_vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True


class PIBasicForEOPA(BaseModel):
    """Basic PI info for EOPA"""
    id: int
    pi_number: str
    pi_date: date
    partner_vendor_id: int
    partner_vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True


class PIItemBasic(BaseModel):
    """Basic PI item info"""
    id: int
    pi_id: int
    medicine_id: int
    quantity: float
    unit_price: float
    total_price: float
    medicine: Optional[MedicineBasic] = None
    pi: Optional[PIBasicForEOPA] = None
    
    class Config:
        from_attributes = True


class EOPACreate(BaseModel):
    pi_item_id: int
    vendor_type: str = Field(..., pattern="^(MANUFACTURER|RM|PM)$")
    vendor_id: int
    quantity: float = Field(..., gt=0)
    estimated_unit_price: float = Field(..., gt=0)
    remarks: Optional[str] = None


class EOPAUpdate(BaseModel):
    vendor_id: Optional[int] = None
    quantity: Optional[float] = Field(None, gt=0)
    estimated_unit_price: Optional[float] = Field(None, gt=0)
    remarks: Optional[str] = None


class EOPAResponse(BaseModel):
    id: int
    eopa_number: str
    eopa_date: date
    pi_item_id: int
    vendor_type: str
    vendor_id: int
    status: EOPAStatus
    quantity: float
    estimated_unit_price: float
    estimated_total: float
    remarks: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    # Nested relationships
    pi_item: Optional[PIItemBasic] = None
    vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True


class EOPAApproveSchema(BaseModel):
    approved: bool
    remarks: Optional[str] = None


class EOPABulkCreateRequest(BaseModel):
    """Create EOPAs for all vendor types of a PI item"""
    pi_item_id: int
    manufacturer_price: Optional[float] = Field(None, gt=0)
    manufacturer_vendor_id: Optional[int] = None
    rm_price: Optional[float] = Field(None, gt=0)
    rm_vendor_id: Optional[int] = None
    pm_price: Optional[float] = Field(None, gt=0)
    pm_vendor_id: Optional[int] = None
    remarks: Optional[str] = None
