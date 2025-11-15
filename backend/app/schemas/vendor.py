from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.vendor import VendorType
from app.schemas.country import CountryBasic


class VendorBase(BaseModel):
    vendor_code: str
    vendor_name: str
    vendor_type: VendorType
    country_id: int
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class VendorCreate(BaseModel):
    vendor_name: str
    vendor_type: VendorType
    country_id: int
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    vendor_type: Optional[VendorType] = None
    country_id: Optional[int] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: Optional[bool] = None


class VendorResponse(VendorBase):
    id: int
    country: Optional[CountryBasic] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
