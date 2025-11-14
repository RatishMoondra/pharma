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
    """Estimated Order & Price Approval"""
    __tablename__ = "eopa"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    eopa_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    eopa_date: Mapped[date] = mapped_column(Date)
    pi_id: Mapped[int] = mapped_column(ForeignKey("pi.id"), unique=True)
    status: Mapped[EOPAStatus] = mapped_column(SQLEnum(EOPAStatus), default=EOPAStatus.PENDING)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2))
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pi: Mapped["PI"] = relationship("PI", back_populates="eopa")
    creator: Mapped["User"] = relationship("User", foreign_keys="[EOPA.created_by]")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys="[EOPA.approved_by]")
    items: Mapped[List["EOPAItem"]] = relationship("EOPAItem", back_populates="eopa", cascade="all, delete-orphan")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="eopa")


class EOPAItem(Base):
    """EOPA Item"""
    __tablename__ = "eopa_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    eopa_id: Mapped[int] = mapped_column(ForeignKey("eopa.id"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    total_price: Mapped[float] = mapped_column(Numeric(15, 2))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    eopa: Mapped["EOPA"] = relationship("EOPA", back_populates="items")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
