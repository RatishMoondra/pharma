"""
Invoice Models - Vendor Tax Invoices for PO Fulfillment

Key Business Rules:
- POs contain NO pricing, only quantities
- Vendors send Tax Invoices with actual shipped quantities and pricing
- Invoices drive PO fulfillment status updates
- Invoice receipt updates material balance for manufacturers
"""
from sqlalchemy import String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import List, Optional
import enum

from app.models.base import Base


class InvoiceType(str, enum.Enum):
    """Invoice Type matches PO Type"""
    RM = "RM"  # Raw Material Invoice from RM Vendor
    PM = "PM"  # Packing Material Invoice from PM Vendor
    FG = "FG"  # Finished Goods Invoice from Manufacturer


class InvoiceStatus(str, enum.Enum):
    PENDING = "PENDING"      # Invoice received, not processed
    PROCESSED = "PROCESSED"  # Invoice processed, PO updated
    CANCELLED = "CANCELLED"  # Invoice cancelled


class VendorInvoice(Base):
    """
    Vendor Tax Invoice - The SOURCE OF TRUTH for pricing and fulfillment.
    
    Workflow:
    1. PO created with quantities only (no pricing)
    2. Vendor ships goods and sends Tax Invoice with:
       - Invoice number, date
       - Shipped quantities
       - Actual unit prices
       - Tax details
    3. System processes invoice:
       - Updates PO fulfillment status
       - Updates material balance (for RM/PM to manufacturer)
       - Records actual pricing
    """
    __tablename__ = "vendor_invoices"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    invoice_date: Mapped[date] = mapped_column(Date)
    invoice_type: Mapped[InvoiceType] = mapped_column(SQLEnum(InvoiceType))
    
    # Link to PO
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"), index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    
    # Invoice totals (from vendor)
    subtotal: Mapped[float] = mapped_column(Numeric(15, 2))
    tax_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2))
    
    # Status tracking
    status: Mapped[InvoiceStatus] = mapped_column(SQLEnum(InvoiceStatus), default=InvoiceStatus.PENDING)
    
    # FG-specific fields (Finished Goods from Manufacturer)
    dispatch_note_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dispatch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    warehouse_location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # Where goods stored
    warehouse_received_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Warehouse person name
    
    # Metadata
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    received_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    processed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="invoices")
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="invoices")
    receiver: Mapped["User"] = relationship("User")
    items: Mapped[List["VendorInvoiceItem"]] = relationship(
        "VendorInvoiceItem", 
        back_populates="invoice", 
        cascade="all, delete-orphan"
    )


class VendorInvoiceItem(Base):
    """
    Invoice Line Item - Contains actual pricing and shipped quantity.
    
    This is where the REAL pricing comes from, not the PO.
    """
    __tablename__ = "vendor_invoice_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("vendor_invoices.id"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    
    # Actual shipped quantity from vendor
    shipped_quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    
    # Actual pricing from vendor invoice (SOURCE OF TRUTH)
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    total_price: Mapped[float] = mapped_column(Numeric(15, 2))
    
    # Tax details
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)  # e.g., 18.00 for 18% GST
    tax_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    
    # Batch tracking
    batch_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    invoice: Mapped["VendorInvoice"] = relationship("VendorInvoice", back_populates="items")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
