"""
System Configuration Model - Store all configurable settings in JSONB
"""
from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Any, Dict

from app.models.base import Base


class SystemConfiguration(Base):
    """
    System Configuration Table
    
    Stores all configurable settings using JSONB for flexibility.
    
    Categories:
    - system: Company info, currency, timezone, date format
    - workflow: Business rules (PI edit, EOPA approval, auto-close)
    - numbering: Document number formats
    - vendor: Vendor resolution rules, fallbacks
    - email: SMTP settings, templates
    - security: Password policy, token expiry
    - ui: Theme, branding, pagination
    - integration: ERP, webhooks, file storage
    """
    __tablename__ = "system_configuration"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    config_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    config_value: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=True, index=True)  # system, workflow, numbering, etc.
    is_sensitive: Mapped[bool] = mapped_column(default=False)  # For SMTP passwords, API keys
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<SystemConfiguration(key={self.config_key}, category={self.category})>"
