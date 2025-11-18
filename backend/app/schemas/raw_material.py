"""
Pydantic Schemas for Raw Material Master and Medicine-RM Mappings
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


# ==================== Raw Material Master Schemas ====================

class RawMaterialBase(BaseModel):
    """Base schema for Raw Material"""
    rm_name: str = Field(..., max_length=200, description="Raw material name")
    description: Optional[str] = Field(None, description="Detailed description")
    category: Optional[str] = Field(None, max_length=50, description="API, Excipient, Binder, etc.")
    unit_of_measure: str = Field(..., max_length=20, description="KG, LITER, GM, etc.")
    standard_purity: Optional[Decimal] = Field(None, ge=0, le=100, description="Purity percentage")
    hsn_code: Optional[str] = Field(None, max_length=20, description="HSN code for tax")
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="GST rate percentage")
    default_vendor_id: Optional[int] = Field(None, description="Default vendor ID")
    cas_number: Optional[str] = Field(None, max_length=50, description="Chemical Abstract Service number")
    storage_conditions: Optional[str] = Field(None, description="Storage requirements")
    shelf_life_months: Optional[int] = Field(None, ge=0, description="Shelf life in months")
    is_active: bool = Field(True, description="Is raw material active")


class RawMaterialCreate(RawMaterialBase):
    """Schema for creating a new raw material (rm_code will be auto-generated)"""
    pass


class RawMaterialUpdate(BaseModel):
    """Schema for updating a raw material (all fields optional)"""
    rm_code: Optional[str] = Field(None, max_length=50)
    rm_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    unit_of_measure: Optional[str] = Field(None, max_length=20)
    standard_purity: Optional[Decimal] = Field(None, ge=0, le=100)
    hsn_code: Optional[str] = Field(None, max_length=20)
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    default_vendor_id: Optional[int] = None
    cas_number: Optional[str] = Field(None, max_length=50)
    storage_conditions: Optional[str] = None
    shelf_life_months: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class VendorBasicForRM(BaseModel):
    """Basic vendor info for raw material responses"""
    id: int
    vendor_name: str
    vendor_code: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class RawMaterialResponse(RawMaterialBase):
    """Schema for raw material response"""
    id: int
    default_vendor: Optional[VendorBasicForRM] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Medicine Raw Material (BOM) Schemas ====================

class MedicineRawMaterialBase(BaseModel):
    """Base schema for Medicine-RM mapping"""
    medicine_id: int = Field(..., description="Medicine ID")
    raw_material_id: int = Field(..., description="Raw Material ID")
    vendor_id: Optional[int] = Field(None, description="Vendor ID (overrides raw_material default)")
    qty_required_per_unit: Decimal = Field(..., gt=0, description="Quantity required per medicine unit")
    uom: str = Field(..., max_length=20, description="Unit of measure")
    purity_required: Optional[Decimal] = Field(None, ge=0, le=100, description="Required purity percentage")
    rm_role: Optional[str] = Field(None, max_length=50, description="Role of raw material in formulation (API, Binder, Solvent, etc.)")
    hsn_code: Optional[str] = Field(None, max_length=20, description="HSN code override")
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="GST rate override")
    notes: Optional[str] = Field(None, description="Additional notes")
    is_critical: bool = Field(False, description="Is this a critical raw material")
    lead_time_days: Optional[int] = Field(None, ge=0, description="Procurement lead time in days")
    wastage_percentage: Decimal = Field(Decimal("0"), ge=0, le=100, description="Expected wastage percentage")
    is_active: bool = Field(True, description="Is mapping active")


class MedicineRawMaterialCreate(MedicineRawMaterialBase):
    """Schema for creating medicine-RM mapping"""
    pass


class MedicineRawMaterialUpdate(BaseModel):
    """Schema for updating medicine-RM mapping (all fields optional)"""
    vendor_id: Optional[int] = None
    qty_required_per_unit: Optional[Decimal] = Field(None, gt=0)
    uom: Optional[str] = Field(None, max_length=20)
    purity_required: Optional[Decimal] = Field(None, ge=0, le=100)
    rm_role: Optional[str] = Field(None, max_length=50)
    hsn_code: Optional[str] = Field(None, max_length=20)
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    is_critical: Optional[bool] = None
    lead_time_days: Optional[int] = Field(None, ge=0)
    wastage_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class RawMaterialBasicForBOM(BaseModel):
    """Basic raw material info for BOM responses"""
    id: int
    rm_code: str
    rm_name: str
    category: Optional[str]
    unit_of_measure: str
    hsn_code: Optional[str]
    
    class Config:
        from_attributes = True


class MedicineRawMaterialResponse(MedicineRawMaterialBase):
    """Schema for medicine-RM mapping response"""
    id: int
    raw_material: RawMaterialBasicForBOM
    vendor: Optional[VendorBasicForRM] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MedicineRawMaterialBulkCreate(BaseModel):
    """Schema for bulk creating medicine-RM mappings"""
    medicine_id: int
    raw_materials: List[MedicineRawMaterialCreate]


# ==================== RM Explosion Schemas ====================

class RMExplosionItem(BaseModel):
    """Schema for a single exploded raw material requirement"""
    raw_material_id: int
    raw_material_code: str
    raw_material_name: str
    vendor_id: int
    vendor_name: str
    vendor_code: str
    qty_required: Decimal  # Total quantity needed
    uom: str
    hsn_code: Optional[str]
    gst_rate: Optional[Decimal]
    medicine_id: int  # Source medicine
    medicine_name: str
    eopa_item_id: int  # Source EOPA item
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class RMExplosionGrouped(BaseModel):
    """Schema for vendor-grouped RM explosion"""
    vendor_id: int
    vendor_name: str
    vendor_code: str
    vendor_type: str
    total_items: int
    raw_materials: List[RMExplosionItem]


class RMExplosionResponse(BaseModel):
    """Schema for complete RM explosion result"""
    eopa_id: int
    eopa_number: str
    total_vendors: int
    grouped_by_vendor: List[RMExplosionGrouped]
    
    
class RMPOPreview(BaseModel):
    """Schema for previewing RM POs before generation"""
    vendor_id: int
    vendor_name: str
    po_type: str = "RM"
    total_line_items: int
    items: List[RMExplosionItem]
    editable: bool = True  # Allow user to edit before final PO generation


class RMPOGenerationRequest(BaseModel):
    """Schema for generating RM POs with user overrides"""
    eopa_id: int
    rm_pos: List["RMPOWithOverrides"]


class RMPOWithOverrides(BaseModel):
    """Schema for RM PO with user-modified values"""
    vendor_id: int
    items: List["RMPOItemOverride"]


class RMPOItemOverride(BaseModel):
    """Schema for individual RM PO item with overrides"""
    raw_material_id: int
    medicine_id: int
    eopa_item_id: int
    quantity: Decimal  # User can override
    uom: str  # User can override
    vendor_id: Optional[int] = None  # User can override vendor
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None
    notes: Optional[str] = None
