"""
Configuration Service - Business logic for managing system configuration

Implements caching mechanism for frequently accessed configs.
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

from app.models.configuration import SystemConfiguration
from app.exceptions.base import AppException


logger = logging.getLogger("pharma")


class ConfigurationService:
    """
    Configuration Service with in-memory caching
    
    Cache is refreshed every 5 minutes or on write operations.
    """
    
    _cache: Dict[str, Dict[str, Any]] = {}
    _cache_timestamp: Optional[datetime] = None
    _cache_ttl_minutes = 5
    
    def __init__(self, db: Session):
        self.db = db
    
    def _refresh_cache(self):
        """Refresh configuration cache from database"""
        configs = self.db.query(SystemConfiguration).all()
        self._cache = {config.config_key: config.config_value for config in configs}
        self._cache_timestamp = datetime.utcnow()
        logger.info({"event": "CONFIG_CACHE_REFRESHED", "count": len(self._cache)})
    
    def _is_cache_stale(self) -> bool:
        """Check if cache needs refresh"""
        if not self._cache_timestamp:
            return True
        age = datetime.utcnow() - self._cache_timestamp
        return age > timedelta(minutes=self._cache_ttl_minutes)
    
    def get_config(self, key: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get configuration by key
        
        Args:
            key: Configuration key
            use_cache: Whether to use cached value (default: True)
        
        Returns:
            Configuration value as dict
        
        Raises:
            AppException: If key not found
        """
        if use_cache:
            if self._is_cache_stale():
                self._refresh_cache()
            
            if key in self._cache:
                return self._cache[key]
        
        # Cache miss or cache disabled - query database
        config = self.db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == key
        ).first()
        
        if not config:
            raise AppException(f"Configuration key '{key}' not found", "ERR_CONFIG_NOT_FOUND", 404)
        
        return config.config_value
    
    def get_all_configs(self, category: Optional[str] = None, include_sensitive: bool = False) -> List[SystemConfiguration]:
        """
        Get all configurations, optionally filtered by category
        
        Args:
            category: Filter by category (optional)
            include_sensitive: Whether to include sensitive configs (default: False)
        
        Returns:
            List of SystemConfiguration objects
        """
        query = self.db.query(SystemConfiguration)
        
        if category:
            query = query.filter(SystemConfiguration.category == category)
        
        if not include_sensitive:
            query = query.filter(SystemConfiguration.is_sensitive == False)
        
        return query.all()
    
    def create_config(self, key: str, value: Dict[str, Any], description: str = None, 
                     category: str = None, is_sensitive: bool = False) -> SystemConfiguration:
        """
        Create new configuration
        
        Args:
            key: Unique configuration key
            value: Configuration value as dict
            description: Human-readable description
            category: Category (system, workflow, etc.)
            is_sensitive: Whether contains sensitive data
        
        Returns:
            Created SystemConfiguration object
        
        Raises:
            AppException: If key already exists
        """
        existing = self.db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == key
        ).first()
        
        if existing:
            raise AppException(f"Configuration key '{key}' already exists", "ERR_CONFIG_EXISTS", 400)
        
        config = SystemConfiguration(
            config_key=key,
            config_value=value,
            description=description,
            category=category,
            is_sensitive=is_sensitive
        )
        
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        
        # Invalidate cache
        self._refresh_cache()
        
        logger.info({
            "event": "CONFIG_CREATED",
            "key": key,
            "category": category
        })
        
        return config
    
    def update_config(self, key: str, value: Optional[Dict[str, Any]] = None,
                     description: Optional[str] = None, category: Optional[str] = None,
                     is_sensitive: Optional[bool] = None) -> SystemConfiguration:
        """
        Update existing configuration
        
        Args:
            key: Configuration key
            value: New configuration value (optional)
            description: New description (optional)
            category: New category (optional)
            is_sensitive: New sensitive flag (optional)
        
        Returns:
            Updated SystemConfiguration object
        
        Raises:
            AppException: If key not found
        """
        config = self.db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == key
        ).first()
        
        if not config:
            raise AppException(f"Configuration key '{key}' not found", "ERR_CONFIG_NOT_FOUND", 404)
        
        if value is not None:
            config.config_value = value
        if description is not None:
            config.description = description
        if category is not None:
            config.category = category
        if is_sensitive is not None:
            config.is_sensitive = is_sensitive
        
        config.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(config)
        
        # Invalidate cache
        self._refresh_cache()
        
        logger.info({
            "event": "CONFIG_UPDATED",
            "key": key,
            "category": config.category
        })
        
        return config
    
    def delete_config(self, key: str):
        """
        Delete configuration
        
        Args:
            key: Configuration key
        
        Raises:
            AppException: If key not found
        """
        config = self.db.query(SystemConfiguration).filter(
            SystemConfiguration.config_key == key
        ).first()
        
        if not config:
            raise AppException(f"Configuration key '{key}' not found", "ERR_CONFIG_NOT_FOUND", 404)
        
        self.db.delete(config)
        self.db.commit()
        
        # Invalidate cache
        self._refresh_cache()
        
        logger.info({
            "event": "CONFIG_DELETED",
            "key": key
        })
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system-level configuration (company info, currency, etc.)"""
        try:
            return self.get_config("system")
        except AppException:
            # Return defaults if not configured
            return {
                "company_name": "PharmaCo Industries Ltd.",
                "company_address": "123 Pharma Street, Medical District",
                "company_city": "Mumbai, Maharashtra 400001",
                "default_currency": "INR",
                "default_timezone": "Asia/Kolkata",
                "date_format": "DD-MM-YYYY",
                "fiscal_year": "24-25"
            }
    
    def get_workflow_rules(self) -> Dict[str, Any]:
        """Get workflow configuration rules"""
        try:
            return self.get_config("workflow_rules")
        except AppException:
            # Return defaults
            return {
                "allow_pi_edit_after_submit": False,
                "allow_eopa_edit_after_approval": False,
                "auto_close_po_when_fulfilled": True,
                "enable_partial_dispatch": True,
                "enable_material_balance_logic": True,
                "enable_invoice_based_fulfillment": True,
                "enable_multilingual_pm": True
            }
    
    def get_document_numbering(self) -> Dict[str, str]:
        """Get document numbering formats"""
        try:
            return self.get_config("document_numbering")
        except AppException:
            # Return defaults
            return {
                "pi_format": "PI/{FY}/{SEQ:04d}",
                "eopa_format": "EOPA/{FY}/{SEQ:04d}",
                "po_rm_format": "PO/RM/{FY}/{SEQ:04d}",
                "po_pm_format": "PO/PM/{FY}/{SEQ:04d}",
                "po_fg_format": "PO/FG/{FY}/{SEQ:04d}",
                "grn_format": "GRN/{DATE}/{SEQ:04d}",
                "dispatch_format": "DA/{FY}/{SEQ:04d}",
                "invoice_format": "INV/{FY}/{SEQ:04d}"
            }
    
    def get_vendor_rules(self) -> Dict[str, Any]:
        """Get vendor and medicine master rules"""
        try:
            return self.get_config("vendor_rules")
        except AppException:
            # Return defaults
            return {
                "allowed_packaging_languages": ["EN", "FR", "AR", "SP", "HI"],
                "allowed_artwork_versions": ["v1.0", "v1.1", "v2.0"],
                "enable_fallback_vendor": True,
                "require_vendor_mapping": True
            }
