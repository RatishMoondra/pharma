from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from decimal import Decimal
import logging

from app.database.session import get_db
from app.schemas.eopa import (
    EOPACreate, EOPAUpdate, EOPAResponse, EOPAApproveSchema
)
from app.models.eopa import EOPA, EOPAStatus, EOPAItem
from app.models.pi import PI, PIItem
from app.models.product import MedicineMaster
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_eopa_number
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_eopa(
    eopa_data: EOPACreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create ONE EOPA per PI with multiple line items.
    
    This endpoint is typically called by the PI approval process.
    ONE EOPA is created for the entire PI, with EOPA items for each PI item.
    
    Workflow: PI Approval → ONE EOPA (with N line items) → PO Generation
    """
    # Get PI with items
    pi = db.query(PI).options(
        joinedload(PI.items).joinedload(PIItem.medicine),
        joinedload(PI.partner_vendor)
    ).filter(PI.id == eopa_data.pi_id).first()
    
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    if not pi.items or len(pi.items) == 0:
        raise AppException("PI has no items", "ERR_VALIDATION", 400)
    
    # Check if EOPA already exists for this PI
    existing_eopa = db.query(EOPA).filter(
        EOPA.pi_id == eopa_data.pi_id
    ).first()
    
    if existing_eopa:
        raise AppException(
            f"EOPA already exists for this PI: {existing_eopa.eopa_number}",
            "ERR_DUPLICATE_EOPA",
            400
        )
    
    # Generate EOPA number (EOPA/YY-YY/####)
    eopa_number = generate_eopa_number(db)
    
    # Create ONE EOPA for the entire PI
    eopa = EOPA(
        eopa_number=eopa_number,
        eopa_date=date.today(),
        pi_id=pi.id,
        remarks=eopa_data.remarks or f"Auto-generated from PI {pi.pi_number}",
        created_by=current_user.id
    )
    
    db.add(eopa)
    db.flush()  # Get EOPA ID for items
    
    # Create EOPA items for each PI item
    for pi_item in pi.items:
        eopa_item = EOPAItem(
            eopa_id=eopa.id,
            pi_item_id=pi_item.id,
            quantity=Decimal(str(pi_item.quantity)),
            estimated_unit_price=Decimal(str(pi_item.unit_price)),
            estimated_total=Decimal(str(pi_item.total_price)),
            created_by=current_user.id
        )
        db.add(eopa_item)
    
    db.commit()
    db.refresh(eopa)
    
    # Eager load relationships for response
    eopa = db.query(EOPA).options(
        joinedload(EOPA.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.items).joinedload(EOPAItem.pi_item).joinedload(PIItem.medicine)
    ).filter(EOPA.id == eopa.id).first()
    
    logger.info({
        "event": "EOPA_CREATED",
        "eopa_id": eopa.id,
        "eopa_number": eopa.eopa_number,
        "pi_id": pi.id,
        "pi_number": pi.pi_number,
        "line_items": len(pi.items),
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": f"EOPA created successfully with {len(pi.items)} line item(s)",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_eopas(
    skip: int = 0,
    limit: int = 100,
    status: EOPAStatus = None,
    pi_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List EOPAs (PI-level) with their line items.
    
    Each EOPA represents one PI with multiple line items (EOPA items).
    """
    query = db.query(EOPA).options(
        joinedload(EOPA.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.items).joinedload(EOPAItem.pi_item).joinedload(PIItem.medicine)
    )
    
    if status:
        query = query.filter(EOPA.status == status)
    
    if pi_id:
        query = query.filter(EOPA.pi_id == pi_id)
    
    eopas = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "EOPAs retrieved successfully",
        "data": [EOPAResponse.model_validate(eopa).model_dump() for eopa in eopas],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{eopa_id}", response_model=dict)
async def get_eopa(
    eopa_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get EOPA by ID with all line items"""
    eopa = db.query(EOPA).options(
        joinedload(EOPA.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.items).joinedload(EOPAItem.pi_item).joinedload(PIItem.medicine)
    ).filter(EOPA.id == eopa_id).first()
    
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "message": "EOPA retrieved successfully",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def update_eopa(
    eopa_id: int,
    eopa_data: EOPAUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update EOPA remarks.
    
    Note: EOPA line item quantities/prices are managed via individual EOPA items,
    not through this endpoint. This endpoint only updates EOPA-level remarks.
    """
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != EOPAStatus.PENDING:
        raise AppException("Cannot update approved/rejected EOPA", "ERR_VALIDATION", 400)
    
    # Update remarks if provided
    if eopa_data.remarks is not None:
        eopa.remarks = eopa_data.remarks
    
    eopa.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(eopa)
    
    logger.info({
        "event": "EOPA_UPDATED",
        "eopa_id": eopa.id,
        "eopa_number": eopa.eopa_number,
        "updated_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "EOPA updated successfully",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_eopa(
    eopa_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete EOPA"""
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status == EOPAStatus.APPROVED:
        raise AppException("Cannot delete approved EOPA", "ERR_VALIDATION", 400)
    
    # Check if POs have been generated
    if eopa.purchase_orders and len(eopa.purchase_orders) > 0:
        raise AppException("Cannot delete EOPA with generated POs", "ERR_VALIDATION", 400)
    
    eopa_number = eopa.eopa_number
    
    db.delete(eopa)
    db.commit()
    
    logger.info({
        "event": "EOPA_DELETED",
        "eopa_id": eopa_id,
        "eopa_number": eopa_number,
        "deleted_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "EOPA deleted successfully",
        "data": None,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{eopa_id}/approve", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def approve_eopa(
    eopa_id: int,
    approval_data: EOPAApproveSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject EOPA.
    
    Approval is required before PO generation.
    Only approved EOPAs can proceed to PO stage where vendor resolution happens.
    """
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != EOPAStatus.PENDING:
        raise AppException("EOPA has already been processed", "ERR_VALIDATION", 400)
    
    eopa.status = EOPAStatus.APPROVED if approval_data.approved else EOPAStatus.REJECTED
    eopa.approved_by = current_user.id
    eopa.approved_at = datetime.utcnow()
    if approval_data.remarks:
        eopa.remarks = approval_data.remarks
    
    db.commit()
    db.refresh(eopa)
    
    logger.info({
        "event": "EOPA_APPROVED" if approval_data.approved else "EOPA_REJECTED",
        "eopa_id": eopa.id,
        "eopa_number": eopa.eopa_number,
        "approved_by": current_user.username
    })
    
    return {
        "success": True,
        "message": f"EOPA {'approved' if approval_data.approved else 'rejected'} successfully",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/by-pi/{pi_id}", response_model=dict)
async def get_eopas_by_pi(
    pi_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all EOPAs for a specific PI"""
    # Verify PI exists
    pi = db.query(PI).filter(PI.id == pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    # Fetch EOPAs linked to this PI
    eopas = db.query(EOPA).options(
        joinedload(EOPA.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.items).joinedload(EOPAItem.pi_item).joinedload(PIItem.medicine)
    ).filter(EOPA.pi_id == pi_id).all()
    
    return {
        "success": True,
        "message": f"EOPAs for PI #{pi_id} retrieved successfully",
        "data": [EOPAResponse.model_validate(eopa).model_dump() for eopa in eopas],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
