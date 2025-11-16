from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal


class PIStatus(str):
    """PI Status enum for Pydantic"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class CountryBasic(BaseModel):
    """Basic country info for nested responses"""
    id: int
    country_code: str
    country_name: str
    language: str
    currency: Optional[str] = None
    
    class Config:
        from_attributes = True


class VendorBasic(BaseModel):
    """Basic vendor info for nested responses"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    country_id: int
    country: Optional[CountryBasic] = None
    
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


class PIItemBase(BaseModel):
    medicine_id: int
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    # New fields for tax compliance (auto-populated from medicine_master, user-editable)
    hsn_code: Optional[str] = None
    pack_size: Optional[str] = None


class PIItemCreate(PIItemBase):
    pass


class PIBasic(BaseModel):
    """Basic PI info for nested responses in EOPA"""
    id: int
    pi_number: str
    pi_date: date
    country_id: int
    country: Optional[CountryBasic] = None
    partner_vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True


class PIItemResponse(PIItemBase):
    id: int
    total_price: float
    hsn_code: Optional[str] = None
    pack_size: Optional[str] = None
    created_at: datetime
    medicine: Optional[MedicineBasic] = None
    pi: Optional[PIBasic] = None
    
    class Config:
        from_attributes = True


class PIBase(BaseModel):
    pi_date: date
    country_id: int
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
    status: str  # PIStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    items: List[PIItemResponse] = []
    country: Optional[CountryBasic] = None
    partner_vendor: Optional[VendorBasic] = None
    
    class Config:
        from_attributes = True


class PIApprovalSchema(BaseModel):
    """Schema for approving/rejecting PI"""
    approved: bool
    remarks: Optional[str] = None
