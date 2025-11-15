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
    """Create EOPA from PI item - vendor-agnostic"""
    pi_item_id: int
    quantity: float = Field(..., gt=0)
    estimated_unit_price: float = Field(..., gt=0)
    remarks: Optional[str] = None


class EOPAUpdate(BaseModel):
    """Update EOPA - only medicine/product details, no vendor fields"""
    quantity: Optional[float] = Field(None, gt=0)
    estimated_unit_price: Optional[float] = Field(None, gt=0)
    remarks: Optional[str] = None


class EOPAResponse(BaseModel):
    """EOPA response - vendor-agnostic approval layer"""
    id: int
    eopa_number: str
    eopa_date: date
    pi_item_id: int
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
    
    # Nested relationships (NO vendor - vendor resolution happens during PO generation)
    pi_item: Optional[PIItemBasic] = None
    
    class Config:
        from_attributes = True


class EOPAApproveSchema(BaseModel):
    approved: bool
    remarks: Optional[str] = None


class EOPABulkCreateRequest(BaseModel):
    """
    DEPRECATED: This schema is no longer needed with vendor-agnostic EOPA.
    Use EOPACreate instead - one EOPA per PI item.
    Vendor selection happens during PO generation from Medicine Master.
    """
    pi_item_id: int
    quantity: float = Field(..., gt=0)
    estimated_unit_price: float = Field(..., gt=0)
    remarks: Optional[str] = None
