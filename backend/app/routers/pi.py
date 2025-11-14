from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, date
import logging

from app.database.session import get_db
from app.schemas.pi import PICreate, PIResponse
from app.models.pi import PI, PIItem
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorType
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_pi_number
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_pi(
    pi_data: PICreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Proforma Invoice"""
    # Validate partner vendor
    vendor = db.query(Vendor).filter(Vendor.id == pi_data.partner_vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    if vendor.vendor_type != VendorType.PARTNER:
        raise AppException("Vendor must be of type PARTNER", "ERR_VALIDATION", 400)
    
    # Generate PI number
    pi_number = generate_pi_number(db)
    
    # Calculate total amount
    total_amount = sum(item.quantity * item.unit_price for item in pi_data.items)
    
    # Create PI
    pi = PI(
        pi_number=pi_number,
        pi_date=pi_data.pi_date,
        partner_vendor_id=pi_data.partner_vendor_id,
        total_amount=total_amount,
        currency=pi_data.currency,
        remarks=pi_data.remarks,
        created_by=current_user.id
    )
    
    db.add(pi)
    db.flush()
    
    # Create PI items
    for item_data in pi_data.items:
        pi_item = PIItem(
            pi_id=pi.id,
            medicine_id=item_data.medicine_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=item_data.quantity * item_data.unit_price
        )
        db.add(pi_item)
    
    db.commit()
    db.refresh(pi)
    
    logger.info({
        "event": "PI_CREATED",
        "pi_id": pi.id,
        "pi_number": pi.pi_number,
        "partner_vendor_id": pi_data.partner_vendor_id,
        "total_amount": float(total_amount),
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "PI created successfully",
        "data": PIResponse.model_validate(pi).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_pis(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Proforma Invoices"""
    pis = db.query(PI).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "PIs retrieved successfully",
        "data": [PIResponse.model_validate(pi).model_dump() for pi in pis],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{pi_id}", response_model=dict)
async def get_pi(
    pi_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get PI by ID"""
    pi = db.query(PI).filter(PI.id == pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "message": "PI retrieved successfully",
        "data": PIResponse.model_validate(pi).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
