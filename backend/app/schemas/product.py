from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal


class ProductMasterBase(BaseModel):
    product_code: str
    product_name: str
    description: Optional[str] = None
    unit_of_measure: str
    # New field for tax compliance
    hsn_code: Optional[str] = None


class ProductMasterCreate(ProductMasterBase):
    pass


class ProductMasterUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None


class ProductMasterResponse(ProductMasterBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class MedicineMasterBase(BaseModel):
    medicine_code: str
    medicine_name: str
    product_id: int
    vendor_id: int
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    pack_size: Optional[str] = None


class MedicineMasterCreate(BaseModel):
    product_id: int
    medicine_name: str
    composition: Optional[str] = None
    dosage_form: str
    strength: Optional[str] = None
    pack_size: Optional[str] = None
    # New fields for tax compliance and packaging
    hsn_code: Optional[str] = None
    primary_unit: Optional[str] = None
    secondary_unit: Optional[str] = None
    conversion_factor: Optional[float] = None
    primary_packaging: Optional[str] = None
    secondary_packaging: Optional[str] = None
    units_per_pack: Optional[int] = None
    regulatory_approvals: Optional[Dict[str, Any]] = None
    # Vendor mappings
    manufacturer_vendor_id: Optional[int] = None
    rm_vendor_id: Optional[int] = None
    pm_vendor_id: Optional[int] = None


class MedicineMasterUpdate(BaseModel):
    medicine_name: Optional[str] = None
    product_id: Optional[int] = None
    vendor_id: Optional[int] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    pack_size: Optional[str] = None
    composition: Optional[str] = None
    # New fields for tax compliance and packaging
    hsn_code: Optional[str] = None
    primary_unit: Optional[str] = None
    secondary_unit: Optional[str] = None
    conversion_factor: Optional[float] = None
    primary_packaging: Optional[str] = None
    secondary_packaging: Optional[str] = None
    units_per_pack: Optional[int] = None
    regulatory_approvals: Optional[Dict[str, Any]] = None
    # Vendor mappings
    manufacturer_vendor_id: Optional[int] = None
    rm_vendor_id: Optional[int] = None
    pm_vendor_id: Optional[int] = None
    is_active: Optional[bool] = None


class VendorBasic(BaseModel):
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class MedicineMasterResponse(BaseModel):
    id: int
    medicine_code: str
    medicine_name: str
    product_id: int
    composition: Optional[str] = None
    dosage_form: str
    strength: Optional[str] = None
    pack_size: Optional[str] = None
    # New fields for tax compliance and packaging
    hsn_code: Optional[str] = None
    primary_unit: Optional[str] = None
    secondary_unit: Optional[str] = None
    conversion_factor: Optional[Decimal] = None
    primary_packaging: Optional[str] = None
    secondary_packaging: Optional[str] = None
    units_per_pack: Optional[int] = None
    regulatory_approvals: Optional[Dict[str, Any]] = None
    # Vendor mappings
    manufacturer_vendor_id: Optional[int] = None
    rm_vendor_id: Optional[int] = None
    pm_vendor_id: Optional[int] = None
    manufacturer_vendor: Optional[VendorBasic] = None
    rm_vendor: Optional[VendorBasic] = None
    pm_vendor: Optional[VendorBasic] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
