from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date
import logging

from app.database.session import get_db
from app.schemas.eopa import EOPACreate, EOPAResponse, EOPAApproveSchema
from app.models.eopa import EOPA, EOPAItem, EOPAStatus
from app.models.pi import PI
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
    """Create EOPA from PI"""
    # Get PI
    pi = db.query(PI).filter(PI.id == eopa_data.pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    # Check if EOPA already exists for this PI
    existing_eopa = db.query(EOPA).filter(EOPA.pi_id == eopa_data.pi_id).first()
    if existing_eopa:
        raise AppException("EOPA already exists for this PI", "ERR_VALIDATION", 400)
    
    # Generate EOPA number
    eopa_number = generate_eopa_number(db)
    
    # Create EOPA
    eopa = EOPA(
        eopa_number=eopa_number,
        eopa_date=date.today(),
        pi_id=eopa_data.pi_id,
        total_amount=pi.total_amount,
        remarks=eopa_data.remarks,
        created_by=current_user.id
    )
    
    db.add(eopa)
    db.flush()
    
    # Copy PI items to EOPA items
    for pi_item in pi.items:
        eopa_item = EOPAItem(
            eopa_id=eopa.id,
            medicine_id=pi_item.medicine_id,
            quantity=pi_item.quantity,
            unit_price=pi_item.unit_price,
            total_price=pi_item.total_price
        )
        db.add(eopa_item)
    
    db.commit()
    db.refresh(eopa)
    
    logger.info({
        "event": "EOPA_CREATED",
        "eopa_id": eopa.id,
        "eopa_number": eopa.eopa_number,
        "pi_id": eopa_data.pi_id,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "EOPA created successfully",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{eopa_id}/approve", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def approve_eopa(
    eopa_id: int,
    approval_data: EOPAApproveSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject EOPA"""
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


@router.get("/", response_model=dict)
async def list_eopas(
    skip: int = 0,
    limit: int = 100,
    status: EOPAStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List EOPAs"""
    query = db.query(EOPA)
    if status:
        query = query.filter(EOPA.status == status)
    
    eopas = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "EOPAs retrieved successfully",
        "data": [EOPAResponse.model_validate(eopa).model_dump() for eopa in eopas],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
