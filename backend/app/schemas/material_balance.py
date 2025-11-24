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

    # Computed fields for frontend display
    @property
    def material_code(self) -> str:
        if self.raw_material_id and self.raw_material:
            return f"RM-{self.raw_material_id}"
        elif self.packing_material_id and self.packing_material:
            return f"PM-{self.packing_material_id}"
        return "N/A"
    
    @property
    def material_name(self) -> str:
        if self.raw_material and self.raw_material.rm_name:
            return self.raw_material.rm_name
        elif self.packing_material and self.packing_material.pm_name:
            return self.packing_material.pm_name
        return "Unknown Material"
    
    @property
    def material_type(self) -> str:
        return "RM" if self.raw_material_id else "PM"
    
    @property
    def reference_document(self) -> str:
        po_num = self.po.po_number if self.po else f"PO-{self.po_id}"
        inv_num = self.invoice.invoice_number if self.invoice else f"INV-{self.invoice_id}"
        return f"{po_num} / {inv_num}"

    class Config:
        from_attributes = True

class MaterialBalanceSummary(BaseModel):
    total_ordered: float
    total_received: float
    total_balance: float
    recent_transactions: list[MaterialBalanceLedgerRow]
