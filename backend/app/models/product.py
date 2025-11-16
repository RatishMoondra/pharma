from sqlalchemy import String, ForeignKey, Numeric, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

from app.models.base import Base


class ProductMaster(Base):
    __tablename__ = "product_master"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    product_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit_of_measure: Mapped[str] = mapped_column(String(20))  # KG, LITER, NOS, etc.
    
    # New field for tax compliance
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    medicine_masters: Mapped[List["MedicineMaster"]] = relationship("MedicineMaster", back_populates="product")


class MedicineMaster(Base):
    __tablename__ = "medicine_master"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    medicine_name: Mapped[str] = mapped_column(String(200))
    product_id: Mapped[int] = mapped_column(ForeignKey("product_master.id"))
    composition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dosage_form: Mapped[str] = mapped_column(String(50))
    strength: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    pack_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # New fields for tax compliance and packaging
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    primary_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Tablet, Capsule, Vial
    secondary_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Strip, Box, Carton
    conversion_factor: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)  # e.g., 10 tablets = 1 strip
    primary_packaging: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Blister, Bottle
    secondary_packaging: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Carton, Shipper
    units_per_pack: Mapped[Optional[int]] = mapped_column(nullable=True)  # Units in secondary package
    regulatory_approvals: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {"FDA": "...", "EMA": "..."}
    
    manufacturer_vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    rm_vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    pm_vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product: Mapped["ProductMaster"] = relationship("ProductMaster", back_populates="medicine_masters")
    manufacturer_vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[manufacturer_vendor_id])
    rm_vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[rm_vendor_id])
    pm_vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[pm_vendor_id])
    pi_items: Mapped[List["PIItem"]] = relationship("PIItem", back_populates="medicine")
