"""
Packing Material Models - Packing Material Master and Medicine-PM Mappings

Models:
1. PackingMaterialMaster - Master list of packing materials
2. MedicinePackingMaterial - Bill of Materials (BOM) linking medicines to packing materials
"""
from sqlalchemy import String, ForeignKey, Numeric, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from datetime import datetime
from typing import Optional

from app.models.base import Base


class PackingMaterialMaster(Base):
    """
    Packing Material Master - Catalog of all packing materials used in medicine packaging
    
    Examples: Labels, Cartons, Shipper Boxes, Inserts, Bottle Caps, etc.
    """
    __tablename__ = "packing_material_master"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pm_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    pm_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pm_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Label, Carton, Insert, Cap, etc.
    
    # Artwork specifications
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # EN, FR, AR, SP, HI, etc.
    artwork_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # v1.0, v1.1, v2.0, etc.
    artwork_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    artwork_approval_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Physical specifications
    gsm: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)  # Paper thickness (grams per square meter)
    ply: Mapped[Optional[int]] = mapped_column(nullable=True)  # Number of layers for cartons
    dimensions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "10x8x5 cm"
    color_spec: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # PANTONE or CMYK
    
    # Standard specifications
    unit_of_measure: Mapped[str] = mapped_column(String(20))  # PCS, SHEETS, ROLLS, etc.
    
    # Tax and regulatory
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    gst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)  # Percentage (5%, 12%, 18%)
    
    # Default vendor (can be overridden in medicine_packing_materials)
    default_vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    # Additional metadata
    printing_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    die_cut_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plate_charges: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    storage_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shelf_life_months: Mapped[Optional[int]] = mapped_column(nullable=True)
    
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    default_vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[default_vendor_id])
    medicine_mappings: Mapped[list["MedicinePackingMaterial"]] = relationship("MedicinePackingMaterial", back_populates="packing_material")


class MedicinePackingMaterial(Base):
    """
    Medicine Packing Material Mapping - Bill of Materials (BOM)
    
    Defines which packing materials are needed to package each medicine and in what quantities.
    Used for PM explosion during PO generation.
    """
    __tablename__ = "medicine_packing_materials"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"), index=True)
    packing_material_id: Mapped[int] = mapped_column(ForeignKey("packing_material_master.id"), index=True)
    
    # Vendor assignment (can override packing_material default)
    vendor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    
    # Quantity specifications
    qty_required_per_unit: Mapped[Decimal] = mapped_column(Numeric(15, 4))  # e.g., 1 label per bottle
    uom: Mapped[str] = mapped_column(String(20))  # Unit of measure (should match packing_material.uom)
    
    # Artwork overrides (can override packing_material defaults)
    artwork_override: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    language_override: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    artwork_version_override: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Tax details (can override packing_material defaults)
    hsn_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gst_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    
    # Additional details
    pm_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Primary, Secondary, Tertiary, Insert, etc.
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_critical: Mapped[bool] = mapped_column(default=False)  # Critical packing material (must be available)
    lead_time_days: Mapped[Optional[int]] = mapped_column(nullable=True)  # Procurement lead time
    
    # Wastage and yield
    wastage_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True, default=Decimal("0"))
    
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster", back_populates="packing_materials")
    packing_material: Mapped["PackingMaterialMaster"] = relationship("PackingMaterialMaster", back_populates="medicine_mappings")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", foreign_keys=[vendor_id])
