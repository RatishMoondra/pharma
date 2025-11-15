from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.vendor import VendorCreate, VendorResponse, VendorUpdate
from app.models.vendor import Vendor
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new vendor"""
    # Generate vendor code based on vendor type
    vendor_type_prefix = {
        "PARTNER": "PART",
        "RM": "RM",
        "PM": "PM",
        "MANUFACTURER": "MFG"
    }
    
    prefix = vendor_type_prefix.get(vendor_data.vendor_type.value, "VEN")
    
    # Get the last vendor code for this type
    last_vendor = db.query(Vendor).filter(
        Vendor.vendor_code.like(f"VEN-{prefix}-%")
    ).order_by(Vendor.id.desc()).first()
    
    if last_vendor:
        # Extract number from last code (e.g., VEN-PART-001 -> 001)
        last_num = int(last_vendor.vendor_code.split('-')[-1])
        vendor_code = f"VEN-{prefix}-{str(last_num + 1).zfill(3)}"
    else:
        vendor_code = f"VEN-{prefix}-001"
    
    # Check if vendor code already exists (should not happen with auto-generation)
    existing = db.query(Vendor).filter(Vendor.vendor_code == vendor_code).first()
    if existing:
        raise AppException("Vendor code generation failed. Please try again.", "ERR_VALIDATION", 400)
    
    vendor = Vendor(
        vendor_code=vendor_code,
        **vendor_data.model_dump()
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    
    # Eager load country relationship
    vendor = db.query(Vendor).options(joinedload(Vendor.country)).filter(Vendor.id == vendor.id).first()
    
    logger.info({
        "event": "VENDOR_CREATED",
        "vendor_id": vendor.id,
        "vendor_code": vendor.vendor_code,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Vendor created successfully",
        "data": VendorResponse.model_validate(vendor).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_vendors(
    skip: int = 0,
    limit: int = 100,
    vendor_type: str = None,
    country_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List vendors with optional filtering by type and country"""
    query = db.query(Vendor).options(joinedload(Vendor.country))
    
    if vendor_type:
        query = query.filter(Vendor.vendor_type == vendor_type)
    
    if country_id:
        query = query.filter(Vendor.country_id == country_id)
    
    vendors = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Vendors retrieved successfully",
        "data": [VendorResponse.model_validate(v).model_dump() for v in vendors],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{vendor_id}", response_model=dict)
async def get_vendor(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vendor by ID"""
    vendor = db.query(Vendor).options(joinedload(Vendor.country)).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "message": "Vendor retrieved successfully",
        "data": VendorResponse.model_validate(vendor).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/{vendor_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    # Update fields
    for key, value in vendor_data.model_dump(exclude_unset=True).items():
        setattr(vendor, key, value)
    
    vendor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vendor)
    
    logger.info({
        "event": "VENDOR_UPDATED",
        "vendor_id": vendor.id,
        "updated_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Vendor updated successfully",
        "data": VendorResponse.model_validate(vendor).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/{vendor_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_vendor(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    db.delete(vendor)
    db.commit()
    
    logger.info({
        "event": "VENDOR_DELETED",
        "vendor_id": vendor_id,
        "deleted_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Vendor deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
