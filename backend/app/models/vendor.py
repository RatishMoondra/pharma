from sqlalchemy import String, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional
import enum

from app.models.base import Base


class VendorType(str, enum.Enum):
    PARTNER = "PARTNER"
    RM = "RM"
    PM = "PM"
    MANUFACTURER = "MANUFACTURER"


class Vendor(Base):
    __tablename__ = "vendors"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    vendor_name: Mapped[str] = mapped_column(String(200))
    vendor_type: Mapped[VendorType] = mapped_column(SQLEnum(VendorType))
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"), nullable=False, index=True)
    contact_person: Mapped[str] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(100), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    gst_number: Mapped[str] = mapped_column(String(15), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country: Mapped["Country"] = relationship("Country", back_populates="vendors")
    pis: Mapped[List["PI"]] = relationship("PI", back_populates="partner_vendor")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="vendor")
    invoices: Mapped[List["VendorInvoice"]] = relationship("VendorInvoice", back_populates="vendor")
