"""
Invoice Pydantic Schemas for API Request/Response Validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


# ============================================================================
# Invoice Item Schemas
# ============================================================================

class InvoiceItemCreate(BaseModel):
    """Schema for creating an invoice item"""
    medicine_id: int
    shipped_quantity: float = Field(gt=0, description="Quantity shipped by vendor")
    unit_price: float = Field(gt=0, description="Actual unit price from vendor invoice")
    tax_rate: float = Field(ge=0, le=100, default=0, description="Tax rate percentage (e.g., 18 for 18%)")
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    remarks: Optional[str] = None
    
    @field_validator('shipped_quantity', 'unit_price')
    @classmethod
    def convert_to_decimal_string(cls, v):
        """Convert to Decimal-compatible string"""
        return str(Decimal(str(v)))


class InvoiceItemResponse(BaseModel):
    """Schema for invoice item response"""
    id: int
    medicine_id: int
    medicine: Optional["MedicineBasic"] = None
    shipped_quantity: float
    unit_price: float
    total_price: float
    tax_rate: float
    tax_amount: float
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    remarks: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Invoice Schemas
# ============================================================================

class InvoiceCreate(BaseModel):
    """
    Schema for creating a vendor invoice.
    
    This is the PRIMARY entry point for invoice data from vendors.
    System uses this to:
    1. Record actual pricing (source of truth)
    2. Update PO fulfillment status
    3. Update material balance for manufacturer
    """
    invoice_number: str = Field(min_length=1, max_length=100, description="Vendor's invoice number")
    invoice_date: date
    po_id: int = Field(description="Purchase Order this invoice fulfills")
    
    # Tax and totals
    subtotal: float = Field(gt=0, description="Subtotal before tax")
    tax_amount: float = Field(ge=0, default=0, description="Total tax amount")
    total_amount: float = Field(gt=0, description="Total invoice amount")
    
    # FG-specific fields (optional, only for Finished Goods invoices)
    dispatch_note_number: Optional[str] = Field(None, max_length=100, description="Dispatch note from manufacturer")
    dispatch_date: Optional[date] = Field(None, description="Date goods dispatched from manufacturer")
    warehouse_location: Optional[str] = Field(None, max_length=200, description="Warehouse location where goods stored")
    warehouse_received_by: Optional[str] = Field(None, max_length=100, description="Warehouse person who received goods")
    
    # Line items
    items: List[InvoiceItemCreate] = Field(min_length=1, description="Invoice line items")
    
    remarks: Optional[str] = None
    
    @field_validator('subtotal', 'tax_amount', 'total_amount')
    @classmethod
    def convert_to_decimal_string(cls, v):
        """Convert to Decimal-compatible string"""
        return str(Decimal(str(v)))


class InvoiceResponse(BaseModel):
    """Schema for invoice response"""
    id: int
    invoice_number: str
    invoice_date: date
    invoice_type: str
    po_id: int
    po: Optional["POBasic"] = None
    vendor_id: int
    vendor: Optional["VendorBasic"] = None
    subtotal: float
    tax_amount: float
    total_amount: float
    status: str
    
    # FG-specific fields
    dispatch_note_number: Optional[str] = None
    dispatch_date: Optional[date] = None
    warehouse_location: Optional[str] = None
    warehouse_received_by: Optional[str] = None
    
    remarks: Optional[str] = None
    received_by: int
    received_at: datetime
    processed_at: Optional[datetime] = None
    items: List[InvoiceItemResponse] = []
    
    class Config:
        from_attributes = True


# ============================================================================
# Nested Basic Schemas (for relationships)
# ============================================================================

class MedicineBasic(BaseModel):
    """Basic medicine info for nested responses"""
    id: int
    medicine_name: str
    dosage_form: Optional[str] = None
    
    class Config:
        from_attributes = True


class VendorBasic(BaseModel):
    """Basic vendor info for nested responses"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str
    
    class Config:
        from_attributes = True


class POBasic(BaseModel):
    """Basic PO info for nested responses"""
    id: int
    po_number: str
    po_type: str
    po_date: date
    status: str
    
    class Config:
        from_attributes = True


# ============================================================================
# Update models to prevent circular imports
# ============================================================================
InvoiceItemResponse.model_rebuild()
InvoiceResponse.model_rebuild()
