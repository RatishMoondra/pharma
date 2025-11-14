from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProductMasterBase(BaseModel):
    product_code: str
    product_name: str
    description: Optional[str] = None
    unit_of_measure: str


class ProductMasterCreate(ProductMasterBase):
    pass


class ProductMasterUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
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
