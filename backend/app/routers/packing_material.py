"""
Packing Material Router - API Endpoints for Packing Material Master and Medicine-PM Mappings
"""
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from app.database.session import get_db
from app.schemas.packing_material import (
    PackingMaterialCreate,
    PackingMaterialUpdate,
    PackingMaterialResponse,
    MedicinePackingMaterialCreate,
    MedicinePackingMaterialUpdate,
    MedicinePackingMaterialResponse,
    MedicinePackingMaterialBulkCreate,
    PMExplosionResponse,
    PMPOPreview
)
from app.models.packing_material import PackingMaterialMaster, MedicinePackingMaterial
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException
from app.services.pm_explosion_service import PMExplosionService
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("pharma")


# ==================== Packing Material Master CRUD ====================

@router.post("/packing-materials/", response_model=dict)
async def create_packing_material(
    pm_data: PackingMaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new packing material"""
    from app.utils.number_generator import generate_pm_code
    
    # Auto-generate PM code
    pm_code = generate_pm_code(db)
    
    # Create packing material with auto-generated code
    pm_dict = pm_data.model_dump()
    pm_dict['pm_code'] = pm_code  # Override with auto-generated code
    
    packing_material = PackingMaterialMaster(**pm_dict)
    db.add(packing_material)
    db.commit()
    db.refresh(packing_material)
    
    logger.info({
        "event": "PACKING_MATERIAL_CREATED",
        "pm_id": packing_material.id,
        "pm_code": packing_material.pm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Packing material '{packing_material.pm_name}' created successfully",
        "data": PackingMaterialResponse.model_validate(packing_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/packing-materials/", response_model=dict)
async def get_packing_materials(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    pm_type: Optional[str] = Query(None, description="Filter by PM type"),
    language: Optional[str] = Query(None, description="Filter by language"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all packing materials"""
    query = db.query(PackingMaterialMaster).options(
        joinedload(PackingMaterialMaster.default_vendor)
    )
    
    if is_active is not None:
        query = query.filter(PackingMaterialMaster.is_active == is_active)
    
    if pm_type:
        query = query.filter(PackingMaterialMaster.pm_type == pm_type)
    
    if language:
        query = query.filter(PackingMaterialMaster.language == language)
    
    packing_materials = query.order_by(PackingMaterialMaster.pm_code).all()
    
    return {
        "success": True,
        "message": f"Retrieved {len(packing_materials)} packing materials",
        "data": [PackingMaterialResponse.model_validate(pm).model_dump() for pm in packing_materials],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/packing-materials/{pm_id}", response_model=dict)
async def get_packing_material(
    pm_id: int = Path(..., description="Packing Material ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single packing material by ID"""
    packing_material = db.query(PackingMaterialMaster).options(
        joinedload(PackingMaterialMaster.default_vendor)
    ).filter(PackingMaterialMaster.id == pm_id).first()
    
    if not packing_material:
        raise AppException("Packing material not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "data": PackingMaterialResponse.model_validate(packing_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/packing-materials/{pm_id}", response_model=dict)
async def update_packing_material(
    pm_id: int,
    pm_data: PackingMaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a packing material"""
    packing_material = db.query(PackingMaterialMaster).filter(PackingMaterialMaster.id == pm_id).first()
    
    if not packing_material:
        raise AppException("Packing material not found", "ERR_NOT_FOUND", 404)
    
    # Update fields
    update_data = pm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(packing_material, field, value)
    
    db.commit()
    db.refresh(packing_material)
    
    logger.info({
        "event": "PACKING_MATERIAL_UPDATED",
        "pm_id": packing_material.id,
        "pm_code": packing_material.pm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Packing material '{packing_material.pm_name}' updated successfully",
        "data": PackingMaterialResponse.model_validate(packing_material).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/packing-materials/{pm_id}", response_model=dict)
async def delete_packing_material(
    pm_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a packing material (soft delete)"""
    packing_material = db.query(PackingMaterialMaster).filter(PackingMaterialMaster.id == pm_id).first()
    
    if not packing_material:
        raise AppException("Packing material not found", "ERR_NOT_FOUND", 404)
    
    packing_material.is_active = False
    db.commit()
    
    logger.info({
        "event": "PACKING_MATERIAL_DELETED",
        "pm_id": packing_material.id,
        "pm_code": packing_material.pm_code,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Packing material '{packing_material.pm_name}' deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ==================== Medicine Packing Material (BOM) CRUD ====================

@router.post("/medicines/{medicine_id}/packing-materials/", response_model=dict)
async def add_medicine_packing_material(
    medicine_id: int,
    pm_data: MedicinePackingMaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a packing material to a medicine's Bill of Materials"""
    # Ensure medicine exists
    from app.models.product import MedicineMaster
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found", "ERR_NOT_FOUND", 404)
    
    # Ensure packing material exists
    packing_material = db.query(PackingMaterialMaster).filter(
        PackingMaterialMaster.id == pm_data.packing_material_id
    ).first()
    if not packing_material:
        raise AppException("Packing material not found", "ERR_NOT_FOUND", 404)
    
    # Check for duplicates
    existing = db.query(MedicinePackingMaterial).filter(
        MedicinePackingMaterial.medicine_id == medicine_id,
        MedicinePackingMaterial.packing_material_id == pm_data.packing_material_id
    ).first()
    
    if existing:
        raise AppException(
            f"Packing material '{packing_material.pm_name}' already added to this medicine",
            "ERR_DUPLICATE",
            400
        )
    
    med_pm = MedicinePackingMaterial(**pm_data.model_dump())
    db.add(med_pm)
    db.commit()
    
    # Reload with relationships
    med_pm = db.query(MedicinePackingMaterial).options(
        joinedload(MedicinePackingMaterial.packing_material).joinedload(PackingMaterialMaster.default_vendor),
        joinedload(MedicinePackingMaterial.vendor)
    ).filter(MedicinePackingMaterial.id == med_pm.id).first()
    
    logger.info({
        "event": "MEDICINE_PM_ADDED",
        "medicine_id": medicine_id,
        "pm_id": pm_data.packing_material_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Packing material added to medicine BOM",
        "data": MedicinePackingMaterialResponse.model_validate(med_pm).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/medicines/{medicine_id}/packing-materials/", response_model=dict)
async def get_medicine_packing_materials(
    medicine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all packing materials for a medicine (BOM)"""
    med_pms = db.query(MedicinePackingMaterial).options(
        joinedload(MedicinePackingMaterial.packing_material).joinedload(PackingMaterialMaster.default_vendor),
        joinedload(MedicinePackingMaterial.vendor)
    ).filter(
        MedicinePackingMaterial.medicine_id == medicine_id,
        MedicinePackingMaterial.is_active == True
    ).all()
    
    return {
        "success": True,
        "message": f"Retrieved {len(med_pms)} packing materials for medicine",
        "data": [MedicinePackingMaterialResponse.model_validate(mp).model_dump() for mp in med_pms],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/medicines/packing-materials/{mapping_id}", response_model=dict)
async def update_medicine_packing_material(
    mapping_id: int,
    pm_data: MedicinePackingMaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a medicine-PM mapping"""
    med_pm = db.query(MedicinePackingMaterial).filter(MedicinePackingMaterial.id == mapping_id).first()
    
    if not med_pm:
        raise AppException("Medicine-PM mapping not found", "ERR_NOT_FOUND", 404)
    
    update_data = pm_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(med_pm, field, value)
    
    db.commit()
    
    # Reload with relationships
    med_pm = db.query(MedicinePackingMaterial).options(
        joinedload(MedicinePackingMaterial.packing_material).joinedload(PackingMaterialMaster.default_vendor),
        joinedload(MedicinePackingMaterial.vendor)
    ).filter(MedicinePackingMaterial.id == mapping_id).first()
    
    logger.info({
        "event": "MEDICINE_PM_UPDATED",
        "mapping_id": mapping_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine-PM mapping updated successfully",
        "data": MedicinePackingMaterialResponse.model_validate(med_pm).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/medicines/packing-materials/{mapping_id}", response_model=dict)
async def delete_medicine_packing_material(
    mapping_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a medicine-PM mapping (soft delete)"""
    med_pm = db.query(MedicinePackingMaterial).filter(MedicinePackingMaterial.id == mapping_id).first()
    
    if not med_pm:
        raise AppException("Medicine-PM mapping not found", "ERR_NOT_FOUND", 404)
    
    med_pm.is_active = False
    db.commit()
    
    logger.info({
        "event": "MEDICINE_PM_DELETED",
        "mapping_id": mapping_id,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine-PM mapping deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


# ==================== PM Explosion & PO Preview ====================

@router.get("/eopa/{eopa_id}/pm-explosion", response_model=dict)
async def get_pm_explosion(
    eopa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform packing material explosion for an EOPA.
    
    Returns vendor-grouped packing material requirements for PO generation.
    """
    service = PMExplosionService(db)
    
    try:
        result = service.explode_eopa_to_packing_materials(eopa_id)
        
        return {
            "success": True,
            "message": f"PM explosion completed for EOPA #{eopa_id}",
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "PM_EXPLOSION_ERROR",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"PM explosion failed: {str(e)}",
            "ERR_PM_EXPLOSION",
            500
        )


@router.get("/eopa/{eopa_id}/pm-po-preview", response_model=dict)
async def get_pm_po_preview(
    eopa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get PM PO preview (before actual PO creation).
    
    Shows how PM POs will be grouped by vendor with editable quantities.
    """
    service = PMExplosionService(db)
    
    try:
        previews = service.get_po_preview(eopa_id)
        
        return {
            "success": True,
            "message": f"PM PO preview generated for EOPA #{eopa_id}",
            "data": previews,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "PM_PO_PREVIEW_ERROR",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"PM PO preview failed: {str(e)}",
            "ERR_PM_PO_PREVIEW",
            500
        )
