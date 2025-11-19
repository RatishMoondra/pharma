from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Nested schemas for related objects
class PurchaseOrderBasic(BaseModel):
    id: int
    po_number: str
    class Config:
        from_attributes = True

class VendorInvoiceBasic(BaseModel):
    id: int
    invoice_number: str
    class Config:
        from_attributes = True

class VendorBasic(BaseModel):
    id: int
    vendor_name: str
    vendor_code: str
    class Config:
        from_attributes = True

class RawMaterialBasic(BaseModel):
    id: int
    rm_name: Optional[str] = None
    class Config:
        from_attributes = True


class PackingMaterialBasic(BaseModel):
    id: int
    pm_name: Optional[str] = None
    class Config:
        from_attributes = True

class MaterialBalanceLedgerRow(BaseModel):
    id: int
    raw_material_id: Optional[int] = None
    packing_material_id: Optional[int] = None
    vendor_id: int
    po_id: int
    invoice_id: int
    ordered_qty: float
    received_qty: float
    balance_qty: float
    last_updated: datetime

    # Nested objects
    po: Optional[PurchaseOrderBasic] = None
    invoice: Optional[VendorInvoiceBasic] = None
    vendor: Optional[VendorBasic] = None
    raw_material: Optional[RawMaterialBasic] = None
    packing_material: Optional[PackingMaterialBasic] = None

    class Config:
        from_attributes = True

class MaterialBalanceSummary(BaseModel):
    total_ordered: float
    total_received: float
    total_balance: float
    recent_transactions: list[MaterialBalanceLedgerRow]
