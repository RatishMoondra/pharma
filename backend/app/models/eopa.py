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
    """Estimated Order & Price Approval - Created per PI Item for each vendor type"""
    __tablename__ = "eopa"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    eopa_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    eopa_date: Mapped[date] = mapped_column(Date)
    pi_item_id: Mapped[int] = mapped_column(ForeignKey("pi_items.id"))
    vendor_type: Mapped[str] = mapped_column(String(20))  # MANUFACTURER, RM, PM
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    status: Mapped[EOPAStatus] = mapped_column(SQLEnum(EOPAStatus), default=EOPAStatus.PENDING)
    quantity: Mapped[float] = mapped_column(Numeric(15, 3))
    estimated_unit_price: Mapped[float] = mapped_column(Numeric(15, 2))
    estimated_total: Mapped[float] = mapped_column(Numeric(15, 2))
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pi_item: Mapped["PIItem"] = relationship("PIItem", back_populates="eopas")
    vendor: Mapped["Vendor"] = relationship("Vendor")
    creator: Mapped["User"] = relationship("User", foreign_keys="[EOPA.created_by]")
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys="[EOPA.approved_by]")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="eopa")



