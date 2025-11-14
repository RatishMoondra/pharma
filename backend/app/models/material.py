from sqlalchemy import String, ForeignKey, Numeric, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from typing import Optional

from app.models.base import Base


class MaterialReceipt(Base):
    """Material Receipt from Vendor"""
    __tablename__ = "material_receipts"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    receipt_date: Mapped[date] = mapped_column(Date)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    quantity_received: Mapped[float] = mapped_column(Numeric(15, 3))
    batch_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="material_receipts")
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
    receiver: Mapped["User"] = relationship("User")


class MaterialBalance(Base):
    """Current Material Inventory Balance"""
    __tablename__ = "material_balance"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"), unique=True)
    available_quantity: Mapped[float] = mapped_column(Numeric(15, 3), default=0)
    last_updated: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")


class DispatchAdvice(Base):
    """Dispatch Advice to Warehouse"""
    __tablename__ = "dispatch_advice"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    dispatch_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    dispatch_date: Mapped[date] = mapped_column(Date)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicine_master.id"))
    quantity_dispatched: Mapped[float] = mapped_column(Numeric(15, 3))
    destination: Mapped[str] = mapped_column(String(200))
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dispatched_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    medicine: Mapped["MedicineMaster"] = relationship("MedicineMaster")
    dispatcher: Mapped["User"] = relationship("User")


class WarehouseGRN(Base):
    """Warehouse Goods Receipt Note"""
    __tablename__ = "warehouse_grn"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    grn_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    grn_date: Mapped[date] = mapped_column(Date)
    dispatch_advice_id: Mapped[int] = mapped_column(ForeignKey("dispatch_advice.id"))
    quantity_received: Mapped[float] = mapped_column(Numeric(15, 3))
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    dispatch_advice: Mapped["DispatchAdvice"] = relationship("DispatchAdvice")
    receiver: Mapped["User"] = relationship("User")
