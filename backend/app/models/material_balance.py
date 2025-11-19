from sqlalchemy import Column, Integer, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class MaterialBalance(Base):
    __tablename__ = "material_balance"

    id = Column(Integer, primary_key=True)
    raw_material_id = Column(Integer, ForeignKey('raw_material_master.id'), nullable=True)
    packing_material_id = Column(Integer, ForeignKey('packing_material_master.id'), nullable=True)
    vendor_id = Column(Integer, ForeignKey('vendors.id'), nullable=False)
    po_id = Column(Integer, ForeignKey('purchase_orders.id'), nullable=False)
    invoice_id = Column(Integer, ForeignKey('vendor_invoices.id'), nullable=False)
    ordered_qty = Column(Numeric, nullable=False)
    received_qty = Column(Numeric, nullable=False)
    balance_qty = Column(Numeric, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    raw_material = relationship('RawMaterialMaster')
    packing_material = relationship('PackingMaterialMaster')
    vendor = relationship('Vendor', foreign_keys=[vendor_id])
    po = relationship('PurchaseOrder')
    invoice = relationship('VendorInvoice')
