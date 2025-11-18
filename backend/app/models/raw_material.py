"""
Raw Material Models - Raw Material Master and Medicine-RM Mappings

Models:
1. RawMaterialMaster - Master list of raw materials
2. MedicineRawMaterial - Bill of Materials (BOM) linking medicines to raw materials
"""
from sqlalchemy import String, ForeignKey, Numeric, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from datetime import datetime
from typing import Optional

from app.models.base import Base


class RawMaterialMaster(Base):
    """
    Raw Material Master - Catalog of all raw materials used in medicine manufacturing
    
    Examples: Active Pharmaceutical Ingredients (APIs), Excipients, Binding Agents, etc.
    """
    __tablename__ = "raw_material_master"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rm_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    rm_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # API, Excipient, Binder, etc.
    
    # Standard specifications
    unit_of_measure: Mapped[str] = mapped_column(String(20))  # KG, LITER, GM, etc.
    standard_purity: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # Percentage (99.5%)
    
    # Tax and regulatory
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    gst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # Percentage (5%, 12%, 18%)
    
    # Default vendor (can be overridden in medicine_raw_materials)
    default_vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    # Additional metadata
    cas_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Chemical Abstract Service number
    storage_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # "Store at 2-8°C"
    shelf_life_months: Mapped[Optional[int]] = mapped_column(nullable=True)
    
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    default_vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[default_vendor_id])
    medicine_mappings: Mapped[list["MedicineRawMaterial"]] = relationship("MedicineRawMaterial", back_populates="raw_material")


class MedicineRawMaterial(Base):
    """
    Medicine Raw Material Mapping - Bill of Materials (BOM)
    
    Defines which raw materials are needed to produce each medicine and in what quantities.
    Used for RM explosion during PO generation.
    """
    __tablename__ = "medicine_raw_materials"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"), index=True)
    raw_material_id: Mapped[int] = mapped_column(ForeignKey("raw_material_master.id"), index=True)
    
    # Vendor assignment (can override raw_material default)
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    # Quantity specifications
    qty_required_per_unit: Mapped[Decimal] = mapped_column(Numeric(15, 4))  # e.g., 0.005 KG per tablet
    uom: Mapped[str] = mapped_column(String(20))  # Unit of measure (should match raw_material.uom)
    
    # Quality specifications (can override raw_material defaults)
    purity_required: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # Percentage
    
    # Tax details (can override raw_material defaults)
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    
    # Additional details
    rm_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # API, Excipient, Binder, Solvent, etc.
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_critical: Mapped[bool] = mapped_column(default=False)  # Critical raw material (must be available)
    lead_time_days: Mapped[Optional[int]] = mapped_column(nullable=True)  # Procurement lead time
    
    # Wastage and yield
    wastage_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True, default=Decimal("0"))
    
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster", back_populates="raw_materials")
    raw_material: Mapped["RawMaterialMaster"] = relationship("RawMaterialMaster", back_populates="medicine_mappings")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[vendor_id])
