from sqlalchemy import String, ForeignKey, Numeric, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import List, Optional

from app.models.base import Base


class PI(Base):
    """Proforma Invoice"""
    __tablename__ = "pi"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pi_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    pi_date: Mapped[date] = mapped_column(Date)
    partner_vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    partner_vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="pis")
    creator: Mapped["User"] = relationship("User", foreign_keys="[PI.created_by]")
    items: Mapped[List["PIItem"]] = relationship("PIItem", back_populates="pi", cascade="all, delete-orphan")
    eopa: Mapped[Optional["EOPA"]] = relationship("EOPA", back_populates="pi", uselist=False)


class PIItem(Base):
    """Proforma Invoice Item"""
    __tablename__ = "pi_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pi_id: Mapped[int] = mapped_column(ForeignKey("pi.id"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    total_price: Mapped[float] = mapped_column(Numeric(15, 2))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    pi: Mapped["PI"] = relationship("PI", back_populates="items")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster", back_populates="pi_items")
