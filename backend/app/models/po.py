from sqlalchemy import String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from datetime import datetime, date
from typing import List, Optional
import enum

from app.models.base import Base


class POType(str, enum.Enum):
    RM = "RM"  # Raw Material
    PM = "PM"  # Packing Material
    FG = "FG"  # Finished Goods


class POStatus(str, enum.Enum):
    OPEN = "OPEN"          # No fulfillment yet
    PARTIAL = "PARTIAL"    # Partially fulfilled
    CLOSED = "CLOSED"      # Fully fulfilled
    CANCELLED = "CANCELLED"


class PurchaseOrder(Base):
    """
    Purchase Order - QUANTITY ONLY, NO PRICING
    
    Business Rules:
    - PO contains only quantities to be ordered
    - NO pricing information (pricing comes from vendor invoices)
    - Fulfillment tracked via vendor invoices
    - Status updated based on invoice receipts
    """
    __tablename__ = "purchase_orders"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    po_date: Mapped[date] = mapped_column(Date)
    po_type: Mapped[POType] = mapped_column(SQLEnum(POType))
    eopa_id: Mapped[int] = mapped_column(ForeignKey("eopa.id"))
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    status: Mapped[POStatus] = mapped_column(SQLEnum(POStatus), default=POStatus.OPEN)
    
    # Fulfillment tracking (quantity-based, not price-based)
    total_ordered_qty: Mapped[float] = mapped_column(Numeric(15, 3), default=0)
    total_fulfilled_qty: Mapped[float] = mapped_column(Numeric(15, 3), default=0)
    
    # Quality requirements (especially for RM)
    require_coa: Mapped[bool] = mapped_column(Boolean, default=False)  # Certificate of Analysis
    require_bmr: Mapped[bool] = mapped_column(Boolean, default=False)  # Batch Manufacturing Record
    require_msds: Mapped[bool] = mapped_column(Boolean, default=False)  # Material Safety Data Sheet
    sample_quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    shelf_life_minimum: Mapped[Optional[int]] = mapped_column(nullable=True)  # Minimum shelf life in days
    
    # Shipping and billing
    ship_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Shipping address
    bill_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Billing address
    buyer_reference_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    buyer_contact_person: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    transport_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # AIR, SEA, ROAD
    freight_terms: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # FOB, CIF, EXW, etc.
    payment_terms: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # NET 30, NET 45, etc.
    currency_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="INR")
    
    # Amendment tracking
    amendment_number: Mapped[int] = mapped_column(default=0)  # 0 = original, 1+ = amendments
    amendment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    original_po_id: Mapped[Optional[int]] = mapped_column(ForeignKey("purchase_orders.id"), nullable=True)  # Links to original PO
    
    # Approval workflow metadata
    prepared_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    checked_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    eopa: Mapped["EOPA"] = relationship("EOPA", back_populates="purchase_orders")
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="purchase_orders", foreign_keys="[PurchaseOrder.vendor_id]")
    creator: Mapped["User"] = relationship("User", foreign_keys="[PurchaseOrder.created_by]")
    preparer: Mapped[Optional["User"]] = relationship("User", foreign_keys="[PurchaseOrder.prepared_by]")
    checker: Mapped[Optional["User"]] = relationship("User", foreign_keys="[PurchaseOrder.checked_by]")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys="[PurchaseOrder.approved_by]")
    verifier: Mapped[Optional["User"]] = relationship("User", foreign_keys="[PurchaseOrder.verified_by]")
    original_po: Mapped[Optional["PurchaseOrder"]] = relationship("PurchaseOrder", remote_side="[PurchaseOrder.id]", foreign_keys="[PurchaseOrder.original_po_id]")
    items: Mapped[List["POItem"]] = relationship("POItem", back_populates="purchase_order", cascade="all, delete-orphan")
    material_receipts: Mapped[List["MaterialReceipt"]] = relationship("MaterialReceipt", back_populates="purchase_order")
    invoices: Mapped[List["VendorInvoice"]] = relationship("VendorInvoice", back_populates="purchase_order")
    terms_conditions: Mapped[List["POTermsConditions"]] = relationship("POTermsConditions", back_populates="purchase_order", cascade="all, delete-orphan")


class POItem(Base):
    """
    Purchase Order Item - QUANTITY ONLY, NO PRICING
    
    Business Rules:
    - Contains only ordered and fulfilled quantities
    - NO pricing fields (pricing comes from invoices)
    - Fulfillment tracked via vendor invoices
    """
    __tablename__ = "po_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    
    # Quantity tracking only
    ordered_quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    fulfilled_quantity: Mapped[float] = mapped_column(Numeric(15, 3), default=0)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # kg, liters, boxes, labels, pcs, etc.
    
    # Tax compliance (auto-populated from medicine_master, user-editable)
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    gst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # e.g., 12.00 for 12%
    pack_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Artwork specifications (for PM items)
    artwork_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    artwork_approval_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # For PM: English, Hindi, etc.
    artwork_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # For PM: v1.0, v2.0, etc.
    gsm: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)  # Paper thickness
    ply: Mapped[Optional[int]] = mapped_column(nullable=True)  # Number of layers for cartons
    box_dimensions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "10x8x5 cm"
    color_spec: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # PANTONE or CMYK color specifications
    printing_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    die_cut_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Die-cutting specifications
    plate_charges: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)  # One-time plate cost
    
    # Quality specifications (for RM items)
    specification_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # USP, BP, IP, etc.
    test_method: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Test methods required
    
    # Delivery schedule
    delivery_schedule_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # SINGLE_BATCH, STAGGERED
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # Expected delivery date
    delivery_window_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    delivery_window_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Tolerances
    quantity_tolerance_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # ±5%
    price_tolerance_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # ±2%
    discount_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
