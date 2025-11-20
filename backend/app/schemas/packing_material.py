"""
Pydantic Schemas for Packing Material Master and Medicine-PM Mappings
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


# ==================== Packing Material Master Schemas ====================

class PackingMaterialBase(BaseModel):
    """Base schema for Packing Material"""
    pm_code: str = Field(..., max_length=200, description="Packing material code")
    pm_name: str = Field(..., max_length=200, description="Packing material name")
    description: Optional[str] = Field(None, description="Detailed description")
    pm_type: Optional[str] = Field(None, max_length=50, description="Label, Carton, Insert, Blister, etc.")
    language: Optional[str] = Field(None, max_length=50, description="Label language (EN, FR, AR, etc.)")
    artwork_version: Optional[str] = Field(None, max_length=50, description="Artwork version (v1.0, v2.0, etc.)")
    artwork_file_url: Optional[str] = Field(None, max_length=500, description="URL to artwork file")
    artwork_approval_ref: Optional[str] = Field(None, max_length=100, description="Artwork approval reference number")
    gsm: Optional[Decimal] = Field(None, ge=0, description="GSM (grams per square meter) for paper/board")
    ply: Optional[int] = Field(None, ge=0, description="Number of plies for cartons")
    dimensions: Optional[str] = Field(None, max_length=100, description="Dimensions (LxWxH)")
    color_spec: Optional[str] = Field(None, description="Color specifications")
    unit_of_measure: str = Field(..., max_length=20, description="PCS, ROLLS, SHEETS, etc.")
    hsn_code: Optional[str] = Field(None, max_length=20, description="HSN code for tax")
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="GST rate percentage")
    default_vendor_id: Optional[int] = Field(None, description="Default vendor ID")
    printing_instructions: Optional[str] = Field(None, description="Printing instructions")
    die_cut_info: Optional[str] = Field(None, description="Die-cutting information")
    plate_charges: Optional[Decimal] = Field(None, ge=0, description="Plate making charges")
    storage_conditions: Optional[str] = Field(None, description="Storage requirements")
    shelf_life_months: Optional[int] = Field(None, ge=0, description="Shelf life in months")
    is_active: bool = Field(True, description="Is packing material active")


class PackingMaterialCreate(PackingMaterialBase):
    """Schema for creating a new packing material (pm_code will be auto-generated)"""
    pass


class PackingMaterialUpdate(BaseModel):
    """Schema for updating a packing material (all fields optional)"""
    pm_code: Optional[str] = Field(None, max_length=50)
    pm_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    pm_type: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=50)
    artwork_version: Optional[str] = Field(None, max_length=50)
    artwork_file_url: Optional[str] = Field(None, max_length=500)
    artwork_approval_ref: Optional[str] = Field(None, max_length=100)
    gsm: Optional[Decimal] = Field(None, ge=0)
    ply: Optional[int] = Field(None, ge=0)
    dimensions: Optional[str] = Field(None, max_length=100)
    color_spec: Optional[str] = None
    unit_of_measure: Optional[str] = Field(None, max_length=20)
    hsn_code: Optional[str] = Field(None, max_length=20)
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    default_vendor_id: Optional[int] = None
    printing_instructions: Optional[str] = None
    die_cut_info: Optional[str] = None
    plate_charges: Optional[Decimal] = Field(None, ge=0)
    storage_conditions: Optional[str] = None
    shelf_life_months: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class VendorBasicForPM(BaseModel):
    """Basic vendor info for packing material responses"""
    id: int
    vendor_name: str
    vendor_code: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class PackingMaterialResponse(PackingMaterialBase):
    """Schema for packing material response"""
    id: int
    default_vendor: Optional[VendorBasicForPM] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== Medicine Packing Material (BOM) Schemas ====================

class MedicinePackingMaterialBase(BaseModel):
    """Base schema for Medicine-PM mapping"""
    medicine_id: int = Field(..., description="Medicine ID")
    packing_material_id: int = Field(..., description="Packing Material ID")
    vendor_id: Optional[int] = Field(None, description="Vendor ID (overrides packing_material default)")
    qty_required_per_unit: Decimal = Field(..., gt=0, description="Quantity required per medicine unit")
    uom: str = Field(..., max_length=20, description="Unit of measure")
    artwork_override: Optional[str] = Field(None, max_length=500, description="Medicine-specific artwork URL")
    language_override: Optional[str] = Field(None, max_length=50, description="Language override (EN, FR, AR, etc.)")
    artwork_version_override: Optional[str] = Field(None, max_length=50, description="Artwork version override")
    hsn_code: Optional[str] = Field(None, max_length=20, description="HSN code override")
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="GST rate override")
    pm_role: Optional[str] = Field(None, max_length=50, description="Role of packing material (Primary, Secondary, Tertiary, etc.)")
    notes: Optional[str] = Field(None, description="Additional notes")
    is_critical: bool = Field(False, description="Is this a critical packing material")
    lead_time_days: Optional[int] = Field(None, ge=0, description="Procurement lead time in days")
    wastage_percentage: Decimal = Field(Decimal("0"), ge=0, le=100, description="Expected wastage percentage")
    is_active: bool = Field(True, description="Is mapping active")


class MedicinePackingMaterialCreate(MedicinePackingMaterialBase):
    """Schema for creating medicine-PM mapping"""
    pass


class MedicinePackingMaterialUpdate(BaseModel):
    """Schema for updating medicine-PM mapping (all fields optional)"""
    vendor_id: Optional[int] = None
    qty_required_per_unit: Optional[Decimal] = Field(None, gt=0)
    uom: Optional[str] = Field(None, max_length=20)
    artwork_override: Optional[str] = Field(None, max_length=500)
    language_override: Optional[str] = Field(None, max_length=50)
    artwork_version_override: Optional[str] = Field(None, max_length=50)
    hsn_code: Optional[str] = Field(None, max_length=20)
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    pm_role: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    is_critical: Optional[bool] = None
    lead_time_days: Optional[int] = Field(None, ge=0)
    wastage_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class PackingMaterialBasicForBOM(BaseModel):
    """Basic packing material info for BOM responses"""
    id: int
    pm_code: str
    pm_name: str
    pm_type: Optional[str]
    language: Optional[str]
    artwork_version: Optional[str]
    gsm: Optional[Decimal]
    ply: Optional[int]
    dimensions: Optional[str]
    unit_of_measure: str
    hsn_code: Optional[str]
    
    class Config:
        from_attributes = True


class MedicinePackingMaterialResponse(MedicinePackingMaterialBase):
    """Schema for medicine-PM mapping response"""
    id: int
    packing_material: PackingMaterialBasicForBOM
    vendor: Optional[VendorBasicForPM] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MedicinePackingMaterialBulkCreate(BaseModel):
    """Schema for bulk creating medicine-PM mappings"""
    medicine_id: int
    packing_materials: List[MedicinePackingMaterialCreate]


# ==================== PM Explosion Schemas ====================

class PMExplosionItem(BaseModel):
    """Schema for a single exploded packing material requirement"""
    packing_material_id: int
    packing_material_code: str
    packing_material_name: str
    pm_type: Optional[str]
    language: Optional[str]
    artwork_version: Optional[str]
    gsm: Optional[Decimal]
    ply: Optional[int]
    dimensions: Optional[str]
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


class PMExplosionGrouped(BaseModel):
    """Schema for vendor-grouped PM explosion"""
    vendor_id: int
    vendor_name: str
    vendor_code: str
    vendor_type: str
    total_items: int
    packing_materials: List[PMExplosionItem]


class PMExplosionResponse(BaseModel):
    """Schema for complete PM explosion result"""
    eopa_id: int
    eopa_number: str
    total_vendors: int
    grouped_by_vendor: List[PMExplosionGrouped]
    
    
class PMPOPreview(BaseModel):
    """Schema for previewing PM POs before generation"""
    vendor_id: int
    vendor_name: str
    po_type: str = "PM"
    total_line_items: int
    items: List[PMExplosionItem]
    editable: bool = True  # Allow user to edit before final PO generation


class PMPOGenerationRequest(BaseModel):
    """Schema for generating PM POs with user overrides"""
    eopa_id: int
    pm_pos: List["PMPOWithOverrides"]


class PMPOWithOverrides(BaseModel):
    """Schema for PM PO with user-modified values"""
    vendor_id: int
    items: List["PMPOItemOverride"]


class PMPOItemOverride(BaseModel):
    """Schema for individual PM PO item with overrides"""
    packing_material_id: int
    medicine_id: int
    eopa_item_id: int
    quantity: Decimal  # User can override
    uom: str  # User can override
    vendor_id: Optional[int] = None  # User can override vendor
    language: Optional[str] = None  # User can override language
    artwork_version: Optional[str] = None  # User can override artwork version
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None
    notes: Optional[str] = None
