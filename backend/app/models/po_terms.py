from sqlalchemy import String, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.models.base import Base


class POTermsConditions(Base):
    """
    Purchase Order Terms & Conditions
    
    Allows flexible, multi-line terms and conditions for each PO.
    Can be pre-defined templates or custom per-PO.
    """
    __tablename__ = "po_terms_conditions"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"))
    term_text: Mapped[str] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # For ordering terms (lower = higher priority)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="terms_conditions")
