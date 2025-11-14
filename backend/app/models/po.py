from sqlalchemy import String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import List, Optional
import enum

from app.models.base import Base


class POType(str, enum.Enum):
    RM = "RM"  # Raw Material
    PM = "PM"  # Packing Material
    FG = "FG"  # Finished Goods


class POStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class PurchaseOrder(Base):
    """Purchase Order"""
    __tablename__ = "purchase_orders"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    po_date: Mapped[date] = mapped_column(Date)
    po_type: Mapped[POType] = mapped_column(SQLEnum(POType))
    eopa_id: Mapped[int] = mapped_column(ForeignKey("eopa.id"))
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    status: Mapped[POStatus] = mapped_column(SQLEnum(POStatus), default=POStatus.OPEN)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2))
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    eopa: Mapped["EOPA"] = relationship("EOPA", back_populates="purchase_orders")
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="purchase_orders")
    creator: Mapped["User"] = relationship("User", foreign_keys="[PurchaseOrder.created_by]")
    items: Mapped[List["POItem"]] = relationship("POItem", back_populates="purchase_order", cascade="all, delete-orphan")
    material_receipts: Mapped[List["MaterialReceipt"]] = relationship("MaterialReceipt", back_populates="purchase_order")


class POItem(Base):
    """Purchase Order Item"""
    __tablename__ = "po_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    total_price: Mapped[float] = mapped_column(Numeric(15, 2))
    received_quantity: Mapped[float] = mapped_column(Numeric(15, 3), default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
