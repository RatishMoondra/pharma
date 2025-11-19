"""
Terms & Conditions Models
- Master terms library
- Vendor-specific terms assignments
- Partner vendor medicine assignments
"""
from sqlalchemy import String, ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.models.base import Base


class TermsConditionsMaster(Base):
    """Master library of terms and conditions"""
    __tablename__ = "terms_conditions_master"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    term_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # PAYMENT, DELIVERY, WARRANTY, etc.
    priority: Mapped[int] = mapped_column(Integer, default=0, index=True)  # Lower number = higher priority
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor_assignments: Mapped[list["VendorTermsConditions"]] = relationship(
        "VendorTermsConditions", 
        back_populates="term",
        cascade="all, delete-orphan"
    )


class VendorTermsConditions(Base):
    """Terms & Conditions assigned to specific vendors"""
    __tablename__ = "vendor_terms_conditions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), index=True)
    term_id: Mapped[int] = mapped_column(ForeignKey("terms_conditions_master.id"), index=True)
    priority_override: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Override master priority
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="terms_conditions")
    term: Mapped["TermsConditionsMaster"] = relationship("TermsConditionsMaster", back_populates="vendor_assignments")


class PartnerVendorMedicines(Base):
    """Medicines allowed for partner vendors (customer-facing)"""
    __tablename__ = "partner_vendor_medicines"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"), index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="allowed_medicines")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
    
    # Unique constraint: one medicine per partner vendor
    __table_args__ = (
        {"schema": None},
    )
