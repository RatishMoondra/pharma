from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from app.models.po import POType, POStatus


class VendorBasic(BaseModel):
    """Basic vendor info"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    
    class Config:
        from_attributes = True


class MedicineBasic(BaseModel):
    """Basic medicine info"""
    id: int
    medicine_name: str
    dosage_form: str
    hsn_code: str       # ← REQUIRED
    class Config:
        from_attributes = True


class RawMaterialBasic(BaseModel):
    """Basic raw material info"""
    id: int
    rm_name: str
    rm_code: Optional[str] = None
    hsn_code: str       # ← REQUIRED

    class Config:
        from_attributes = True


class PackingMaterialBasic(BaseModel):
    """Basic packing material info"""
    id: int
    pm_name: str
    pm_code: Optional[str] = None
    hsn_code: str       # ← REQUIRED
    unit_of_measure: Optional[str] = None  # Unit of Measure

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
    medicine_id: Optional[int] = None
    raw_material_id: Optional[int] = None
    packing_material_id: Optional[int] = None
    ordered_quantity: float
    fulfilled_quantity: float
    unit: Optional[str] = None  # kg, liters, boxes, labels, etc.
    
    # Tax compliance
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None
    pack_size: Optional[str] = None
    
    # Artwork specifications (for PM)
    artwork_file_url: Optional[str] = None
    artwork_approval_ref: Optional[str] = None
    language: Optional[str] = None
    artwork_version: Optional[str] = None
    gsm: Optional[Decimal] = None
    ply: Optional[int] = None
    box_dimensions: Optional[str] = None
    color_spec: Optional[str] = None
    printing_instructions: Optional[str] = None
    die_cut_info: Optional[str] = None
    plate_charges: Optional[Decimal] = None
    
    # Quality specs (for RM)
    specification_reference: Optional[str] = None
    test_method: Optional[str] = None
    
    # Delivery
    delivery_schedule_type: Optional[str] = None
    delivery_date: Optional[date] = None
    delivery_window_start: Optional[date] = None
    delivery_window_end: Optional[date] = None
    
    # Tolerances
    quantity_tolerance_percentage: Optional[Decimal] = None
    price_tolerance_percentage: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    
    created_at: datetime
    medicine: Optional[MedicineBasic] = None
    raw_material: Optional[RawMaterialBasic] = None
    packing_material: Optional[PackingMaterialBasic] = None
    

    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        # Ensure ordered_quantity is always present
        if 'ordered_quantity' not in data:
            data['ordered_quantity'] = getattr(self, 'ordered_quantity', None)
        return data

    class Config:
        from_attributes = True


class POBase(BaseModel):
    po_date: date
    po_type: POType
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None
    
    # Quality requirements
    require_coa: bool = False
    require_bmr: bool = False
    require_msds: bool = False
    sample_quantity: Optional[float] = None
    shelf_life_minimum: Optional[int] = None
    
    # Shipping and billing
    ship_to: Optional[str] = None
    bill_to: Optional[str] = None
    buyer_reference_no: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    transport_mode: Optional[str] = None
    freight_terms: Optional[str] = None
    payment_terms: Optional[str] = None
    currency_code: Optional[str] = "INR"
    
    # Amendment tracking
    amendment_number: int = 0
    amendment_date: Optional[date] = None
    original_po_id: Optional[int] = None
    
    # Approval workflow
    prepared_by: Optional[int] = None
    checked_by: Optional[int] = None
    approved_by: Optional[int] = None
    verified_by: Optional[int] = None


class POCreate(BaseModel):
    eopa_id: int
    po_type: POType
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None
    
    # Quality requirements
    require_coa: bool = False
    require_bmr: bool = False
    require_msds: bool = False
    sample_quantity: Optional[float] = None
    shelf_life_minimum: Optional[int] = None
    
    # Shipping and billing
    ship_to: Optional[str] = None
    bill_to: Optional[str] = None
    buyer_reference_no: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    transport_mode: Optional[str] = None
    freight_terms: Optional[str] = None
    payment_terms: Optional[str] = None
    currency_code: Optional[str] = "INR"
    
    # Approval workflow
    prepared_by: Optional[int] = None
    checked_by: Optional[int] = None
    approved_by: Optional[int] = None
    verified_by: Optional[int] = None


class POUpdate(BaseModel):
    delivery_date: Optional[date] = None
    remarks: Optional[str] = None
    status: Optional[POStatus] = None
    
    # Quality requirements
    require_coa: Optional[bool] = None
    require_bmr: Optional[bool] = None
    require_msds: Optional[bool] = None
    sample_quantity: Optional[float] = None
    shelf_life_minimum: Optional[int] = None
    
    # Shipping and billing
    ship_to: Optional[str] = None
    bill_to: Optional[str] = None
    buyer_reference_no: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    transport_mode: Optional[str] = None
    freight_terms: Optional[str] = None
    payment_terms: Optional[str] = None
    currency_code: Optional[str] = None
    
    # Approval workflow
    prepared_by: Optional[int] = None
    checked_by: Optional[int] = None
    approved_by: Optional[int] = None
    verified_by: Optional[int] = None



# For PO update requests
class POItemUpdate(BaseModel):
    id: Optional[int] = None
    medicine_id: Optional[int] = None
    ordered_quantity: float
    unit: Optional[str] = None
    language: Optional[str] = None
    artwork_version: Optional[str] = None

class POUpdateRequest(BaseModel):
    vendor_id: Optional[int] = None
    items: List[POItemUpdate] = []
    remarks: Optional[str] = None
    status: Optional[POStatus] = None
    delivery_date: Optional[date] = None
    # Add other fields as needed


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
