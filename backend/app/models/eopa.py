from sqlalchemy import String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import List, Optional
import enum

from app.models.base import Base


class EOPAStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EOPA(Base):
    """
    Estimated Order & Price Approval - Vendor-Agnostic Intermediate Layer
    
    ONE EOPA per PI (not per PI item). Contains multiple line items via eopa_items table.
    Created from PI to act as approval checkpoint for medicine/product details ONLY.
    Does NOT contain vendor information - vendors are resolved later during PO generation
    based on Medicine Master mappings.
    
    Workflow: PI → EOPA (with items) → PO (vendor resolution from Medicine Master)
    """
    __tablename__ = "eopa"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    eopa_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    eopa_date: Mapped[date] = mapped_column(Date)
    pi_id: Mapped[int] = mapped_column(ForeignKey("pi.id"))
    status: Mapped[EOPAStatus] = mapped_column(SQLEnum(EOPAStatus), default=EOPAStatus.PENDING)
    
    # Approval and audit fields
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pi: Mapped["PI"] = relationship("PI", back_populates="eopas")
    items: Mapped[List["EOPAItem"]] = relationship("EOPAItem", back_populates="eopa", cascade="all, delete-orphan")
    creator: Mapped["User"] = relationship("User", foreign_keys="[EOPA.created_by]")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys="[EOPA.approved_by]")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="eopa")


class EOPAItem(Base):
    """
    EOPA Line Items - one per PI item
    
    Stores medicine/product details and estimated pricing for each line item
    in the EOPA.
    """
    __tablename__ = "eopa_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    eopa_id: Mapped[int] = mapped_column(ForeignKey("eopa.id"))
    pi_item_id: Mapped[int] = mapped_column(ForeignKey("pi_items.id"))
    
    # Medicine/Product details (from PI item)
    quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    estimated_unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    estimated_total: Mapped[float] = mapped_column(Numeric(15, 2))
    
    # Audit fields
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    eopa: Mapped["EOPA"] = relationship("EOPA", back_populates="items")
    pi_item: Mapped["PIItem"] = relationship("PIItem")
    creator: Mapped["User"] = relationship("User", foreign_keys="[EOPAItem.created_by]")



