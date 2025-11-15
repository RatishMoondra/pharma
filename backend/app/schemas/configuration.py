"""
Configuration Schemas - Request/Response models for configuration API
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from datetime import datetime


class ConfigurationBase(BaseModel):
    """Base configuration schema"""
    config_key: str = Field(..., description="Unique configuration key")
    config_value: Dict[str, Any] = Field(..., description="Configuration value as JSON")
    description: Optional[str] = Field(None, description="Human-readable description")
    category: Optional[str] = Field(None, description="Category: system, workflow, numbering, etc.")
    is_sensitive: bool = Field(default=False, description="Whether this contains sensitive data (passwords, API keys)")


class ConfigurationCreate(ConfigurationBase):
    """Schema for creating new configuration"""
    pass


class ConfigurationUpdate(BaseModel):
    """Schema for updating configuration"""
    config_value: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_sensitive: Optional[bool] = None


class ConfigurationResponse(ConfigurationBase):
    """Schema for configuration response"""
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConfigurationPublicResponse(BaseModel):
    """Public response (hides sensitive data)"""
    id: int
    config_key: str
    config_value: Dict[str, Any]
    description: Optional[str]
    category: Optional[str]
    updated_at: datetime
    
    class Config:
        from_attributes = True
