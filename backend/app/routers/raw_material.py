"""
Raw Material Router - API Endpoints for Raw Material Master and Medicine-RM Mappings
"""
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from app.database.session import get_db
from app.schemas.raw_material import (
    RawMaterialCreate,
    RawMaterialUpdate,
    RawMaterialResponse,
    MedicineRawMaterialCreate,
    MedicineRawMaterialUpdate,
    MedicineRawMaterialResponse,
    MedicineRawMaterialBulkCreate,
    RMExplosionResponse,
    RMPOPreview
)
from app.models.raw_material import RawMaterialMaster, MedicineRawMaterial
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException
from app.services.rm_explosion_service import RMExplosionService
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("pharma")


# ==================== Raw Material Master CRUD ====================

@router.post("/raw-materials/", response_model=dict)
async def create_raw_material(
    rm_data: RawMaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new raw material"""
    from app.utils.number_generator import generate_rm_code
    
    # Auto-generate RM code
    rm_code = generate_rm_code(db)
    
    # Create raw material with auto-generated code
    rm_dict = rm_data.model_dump()
    rm_dict['rm_code'] = rm_code  # Override with auto-generated code
    
    raw_material = RawMaterialMaster(**rm_dict)
    db.add(raw_material)
    db.commit()
    db.refresh(raw_material)
    
    logger.info({
        "event": "RAW_MATERIAL_CREATED",
        "rm_id": raw_material.id,
        "rm_code": raw_material.rm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Raw material '{raw_material.rm_name}' created successfully",
        "data": RawMaterialResponse.model_validate(raw_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/raw-materials/", response_model=dict)
async def get_raw_materials(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all raw materials"""
    query = db.query(RawMaterialMaster).options(
        joinedload(RawMaterialMaster.default_vendor)
    )
    
    if is_active is not None:
        query = query.filter(RawMaterialMaster.is_active == is_active)
    
    if category:
        query = query.filter(RawMaterialMaster.category == category)
    
    raw_materials = query.order_by(RawMaterialMaster.rm_code).all()
    
    return {
        "success": True,
        "message": f"Retrieved {len(raw_materials)} raw materials",
        "data": [RawMaterialResponse.model_validate(rm).model_dump() for rm in raw_materials],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/raw-materials/{rm_id}", response_model=dict)
async def get_raw_material(
    rm_id: int = Path(..., description="Raw Material ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single raw material by ID"""
    raw_material = db.query(RawMaterialMaster).options(
        joinedload(RawMaterialMaster.default_vendor)
    ).filter(RawMaterialMaster.id == rm_id).first()
    
    if not raw_material:
        raise AppException("Raw material not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "data": RawMaterialResponse.model_validate(raw_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/raw-materials/{rm_id}", response_model=dict)
async def update_raw_material(
    rm_id: int,
    rm_data: RawMaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a raw material"""
    raw_material = db.query(RawMaterialMaster).filter(RawMaterialMaster.id == rm_id).first()
    
    if not raw_material:
        raise AppException("Raw material not found", "ERR_NOT_FOUND", 404)
    
    # Update fields
    update_data = rm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(raw_material, field, value)
    
    db.commit()
    db.refresh(raw_material)
    
    logger.info({
        "event": "RAW_MATERIAL_UPDATED",
        "rm_id": raw_material.id,
        "rm_code": raw_material.rm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Raw material '{raw_material.rm_name}' updated successfully",
        "data": RawMaterialResponse.model_validate(raw_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/raw-materials/{rm_id}", response_model=dict)
async def delete_raw_material(
    rm_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a raw material (soft delete)"""
    raw_material = db.query(RawMaterialMaster).filter(RawMaterialMaster.id == rm_id).first()
    
    if not raw_material:
        raise AppException("Raw material not found", "ERR_NOT_FOUND", 404)
    
    raw_material.is_active = False
    db.commit()
    
    logger.info({
        "event": "RAW_MATERIAL_DELETED",
        "rm_id": raw_material.id,
        "rm_code": raw_material.rm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Raw material '{raw_material.rm_name}' deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ==================== Medicine Raw Material (BOM) CRUD ====================

@router.post("/medicines/{medicine_id}/raw-materials/", response_model=dict)
async def add_medicine_raw_material(
    medicine_id: int,
    rm_data: MedicineRawMaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a raw material to a medicine's Bill of Materials"""
    # Ensure medicine exists
    from app.models.product import MedicineMaster
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found", "ERR_NOT_FOUND", 404)
    
    # Ensure raw material exists
    raw_material = db.query(RawMaterialMaster).filter(
        RawMaterialMaster.id == rm_data.raw_material_id
    ).first()
    if not raw_material:
        raise AppException("Raw material not found", "ERR_NOT_FOUND", 404)
    
    # Check for duplicates
    existing = db.query(MedicineRawMaterial).filter(
        MedicineRawMaterial.medicine_id == medicine_id,
        MedicineRawMaterial.raw_material_id == rm_data.raw_material_id
    ).first()
    
    if existing:
        raise AppException(
            f"Raw material '{raw_material.rm_name}' already added to this medicine",
            "ERR_DUPLICATE",
            400
        )
    
    med_rm = MedicineRawMaterial(**rm_data.model_dump())
    db.add(med_rm)
    db.commit()
    
    # Reload with relationships
    med_rm = db.query(MedicineRawMaterial).options(
        joinedload(MedicineRawMaterial.raw_material).joinedload(RawMaterialMaster.default_vendor),
        joinedload(MedicineRawMaterial.vendor)
    ).filter(MedicineRawMaterial.id == med_rm.id).first()
    
    logger.info({
        "event": "MEDICINE_RM_ADDED",
        "medicine_id": medicine_id,
        "rm_id": rm_data.raw_material_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Raw material added to medicine BOM",
        "data": MedicineRawMaterialResponse.model_validate(med_rm).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/medicines/{medicine_id}/raw-materials/", response_model=dict)
async def get_medicine_raw_materials(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all raw materials for a medicine (BOM)"""
    med_rms = db.query(MedicineRawMaterial).options(
        joinedload(MedicineRawMaterial.raw_material).joinedload(RawMaterialMaster.default_vendor),
        joinedload(MedicineRawMaterial.vendor)
    ).filter(
        MedicineRawMaterial.medicine_id == medicine_id,
        MedicineRawMaterial.is_active == True
    ).all()
    
    return {
        "success": True,
        "message": f"Retrieved {len(med_rms)} raw materials for medicine",
        "data": [MedicineRawMaterialResponse.model_validate(mr).model_dump() for mr in med_rms],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/medicines/raw-materials/{mapping_id}", response_model=dict)
async def update_medicine_raw_material(
    mapping_id: int,
    rm_data: MedicineRawMaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a medicine-RM mapping"""
    med_rm = db.query(MedicineRawMaterial).filter(MedicineRawMaterial.id == mapping_id).first()
    
    if not med_rm:
        raise AppException("Medicine-RM mapping not found", "ERR_NOT_FOUND", 404)
    
    update_data = rm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(med_rm, field, value)
    
    db.commit()
    
    # Reload with relationships
    med_rm = db.query(MedicineRawMaterial).options(
        joinedload(MedicineRawMaterial.raw_material).joinedload(RawMaterialMaster.default_vendor),
        joinedload(MedicineRawMaterial.vendor)
    ).filter(MedicineRawMaterial.id == mapping_id).first()
    
    logger.info({
        "event": "MEDICINE_RM_UPDATED",
        "mapping_id": mapping_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine-RM mapping updated successfully",
        "data": MedicineRawMaterialResponse.model_validate(med_rm).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/medicines/raw-materials/{mapping_id}", response_model=dict)
async def delete_medicine_raw_material(
    mapping_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a medicine-RM mapping (soft delete)"""
    med_rm = db.query(MedicineRawMaterial).filter(MedicineRawMaterial.id == mapping_id).first()
    
    if not med_rm:
        raise AppException("Medicine-RM mapping not found", "ERR_NOT_FOUND", 404)
    
    med_rm.is_active = False
    db.commit()
    
    logger.info({
        "event": "MEDICINE_RM_DELETED",
        "mapping_id": mapping_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine-RM mapping deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ==================== RM Explosion & PO Preview ====================

@router.get("/rm-explosion/{eopa_id}", response_model=dict)
async def get_rm_explosion(
    eopa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform raw material explosion for an EOPA.
    
    Returns vendor-grouped raw material requirements for PO generation.
    """
    service = RMExplosionService(db)
    
    try:
        result = service.explode_eopa_to_raw_materials(eopa_id)
        
        return {
            "success": True,
            "message": f"RM explosion completed for EOPA #{eopa_id}",
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "RM_EXPLOSION_ERROR",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"RM explosion failed: {str(e)}",
            "ERR_RM_EXPLOSION",
            500
        )


@router.get("/eopa/rm-po-preview/{eopa_id}", response_model=dict)
async def get_rm_po_preview(
    eopa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get RM PO preview (before actual PO creation).
    
    Shows how RM POs will be grouped by vendor with editable quantities.
    """
    service = RMExplosionService(db)
    
    try:
        previews = service.get_po_preview(eopa_id)
        
        return {
            "success": True,
            "message": f"RM PO preview generated for EOPA #{eopa_id}",
            "data": previews,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "RM_PO_PREVIEW_ERROR",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"RM PO preview failed: {str(e)}",
            "ERR_RM_PO_PREVIEW",
            500
        )
