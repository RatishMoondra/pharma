"""
Configuration Router - API endpoints for system configuration management
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import logging

from app.database.session import get_db
from app.schemas.configuration import (
    ConfigurationCreate,
    ConfigurationUpdate,
    ConfigurationResponse,
    ConfigurationPublicResponse
)
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.services.configuration_service import ConfigurationService
from app.exceptions.base import AppException


router = APIRouter()
logger = logging.getLogger("pharma")


@router.get("/", response_model=dict)
async def list_configurations(
    category: Optional[str] = None,
    include_sensitive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all configurations
    
    Query Parameters:
    - category: Filter by category (system, workflow, numbering, etc.)
    - include_sensitive: Include sensitive configs (requires ADMIN role)
    """
    # Only ADMIN can view sensitive configs
    if include_sensitive and current_user.role != UserRole.ADMIN:
        raise AppException("Only ADMIN can view sensitive configurations", "ERR_FORBIDDEN", 403)
    
    service = ConfigurationService(db)
    configs = service.get_all_configs(category=category, include_sensitive=include_sensitive)
    
    # Use public response schema for non-admin users
    if current_user.role != UserRole.ADMIN:
        data = [ConfigurationPublicResponse.model_validate(c).model_dump() for c in configs]
    else:
        data = [ConfigurationResponse.model_validate(c).model_dump() for c in configs]
    
    return {
        "success": True,
        "message": f"Retrieved {len(configs)} configuration(s)",
        "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{key}", response_model=dict)
async def get_configuration(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get configuration by key"""
    service = ConfigurationService(db)
    
    try:
        config_value = service.get_config(key, use_cache=True)
        
        return {
            "success": True,
            "message": f"Configuration '{key}' retrieved successfully",
            "data": {
                "key": key,
                "value": config_value
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_configuration(
    config_data: ConfigurationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new configuration (ADMIN only)"""
    service = ConfigurationService(db)
    
    try:
        config = service.create_config(
            key=config_data.config_key,
            value=config_data.config_value,
            description=config_data.description,
            category=config_data.category,
            is_sensitive=config_data.is_sensitive
        )
        
        logger.info({
            "event": "CONFIG_CREATED_VIA_API",
            "key": config_data.config_key,
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": f"Configuration '{config_data.config_key}' created successfully",
            "data": ConfigurationResponse.model_validate(config).model_dump(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise


@router.put("/{key}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def update_configuration(
    key: str,
    config_data: ConfigurationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update configuration (ADMIN only)"""
    service = ConfigurationService(db)
    
    try:
        config = service.update_config(
            key=key,
            value=config_data.config_value,
            description=config_data.description,
            category=config_data.category,
            is_sensitive=config_data.is_sensitive
        )
        
        logger.info({
            "event": "CONFIG_UPDATED_VIA_API",
            "key": key,
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": f"Configuration '{key}' updated successfully",
            "data": ConfigurationResponse.model_validate(config).model_dump(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise


@router.delete("/{key}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_configuration(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete configuration (ADMIN only)"""
    service = ConfigurationService(db)
    
    try:
        service.delete_config(key)
        
        logger.info({
            "event": "CONFIG_DELETED_VIA_API",
            "key": key,
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": f"Configuration '{key}' deleted successfully",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise


@router.get("/system/info", response_model=dict)
async def get_system_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system-level configuration (company info, currency, etc.)"""
    service = ConfigurationService(db)
    system_info = service.get_system_info()
    
    return {
        "success": True,
        "message": "System configuration retrieved successfully",
        "data": system_info,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/workflow/rules", response_model=dict)
async def get_workflow_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workflow configuration rules"""
    service = ConfigurationService(db)
    workflow_rules = service.get_workflow_rules()
    
    return {
        "success": True,
        "message": "Workflow rules retrieved successfully",
        "data": workflow_rules,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/document/numbering", response_model=dict)
async def get_document_numbering(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document numbering formats"""
    service = ConfigurationService(db)
    numbering = service.get_document_numbering()
    
    return {
        "success": True,
        "message": "Document numbering formats retrieved successfully",
        "data": numbering,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/vendor/rules", response_model=dict)
async def get_vendor_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vendor and medicine master rules"""
    service = ConfigurationService(db)
    vendor_rules = service.get_vendor_rules()
    
    return {
        "success": True,
        "message": "Vendor rules retrieved successfully",
        "data": vendor_rules,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
