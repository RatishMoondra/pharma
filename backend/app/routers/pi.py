from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from decimal import Decimal
import logging

from app.database.session import get_db
from app.schemas.pi import PICreate, PIResponse, PIApprovalSchema
from app.models.pi import PI, PIItem, PIStatus
from app.models.eopa import EOPA
from app.models.product import MedicineMaster
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorType
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_pi_number, generate_eopa_number
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
    pis = db.query(PI).options(
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor),
        joinedload(PI.country),
        joinedload(PI.partner_vendor).joinedload(Vendor.country)
    ).offset(skip).limit(limit).all()
    
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
    pi = db.query(PI).options(
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(PI.items).joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor),
        joinedload(PI.country),
        joinedload(PI.partner_vendor).joinedload(Vendor.country)
    ).filter(PI.id == pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "message": "PI retrieved successfully",
        "data": PIResponse.model_validate(pi).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/{pi_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def update_pi(
    pi_id: int,
    pi_data: PICreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update Proforma Invoice"""
    pi = db.query(PI).filter(PI.id == pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    # Validate partner vendor
    vendor = db.query(Vendor).filter(Vendor.id == pi_data.partner_vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    if vendor.vendor_type != VendorType.PARTNER:
        raise AppException("Vendor must be of type PARTNER", "ERR_VALIDATION", 400)
    
    # Calculate total amount
    total_amount = sum(item.quantity * item.unit_price for item in pi_data.items)
    
    # Update PI
    pi.pi_date = pi_data.pi_date
    pi.partner_vendor_id = pi_data.partner_vendor_id
    pi.total_amount = total_amount
    pi.currency = pi_data.currency
    pi.remarks = pi_data.remarks
    pi.updated_by = current_user.id
    pi.updated_at = datetime.utcnow()
    
    # Delete existing items
    db.query(PIItem).filter(PIItem.pi_id == pi.id).delete()
    
    # Create new items
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
        "event": "PI_UPDATED",
        "pi_id": pi.id,
        "pi_number": pi.pi_number,
        "partner_vendor_id": pi_data.partner_vendor_id,
        "total_amount": float(total_amount),
        "updated_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "PI updated successfully",
        "data": PIResponse.model_validate(pi).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{pi_id}/approve", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def approve_pi(
    pi_id: int,
    approval_data: PIApprovalSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve or reject PI.
    
    When PI is APPROVED, automatically generates ONE EOPA for the entire PI
    with multiple line items (one per PI item).
    """
    pi = db.query(PI).options(
        joinedload(PI.items).joinedload(PIItem.medicine)
    ).filter(PI.id == pi_id).first()
    
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    if pi.status != PIStatus.PENDING:
        raise AppException("PI has already been processed", "ERR_VALIDATION", 400)
    
    # Update PI status
    pi.status = PIStatus.APPROVED if approval_data.approved else PIStatus.REJECTED
    pi.approved_by = current_user.id
    pi.approved_at = datetime.utcnow()
    if approval_data.remarks:
        pi.remarks = approval_data.remarks
    
    eopa_number = None
    
    # If approved, auto-generate ONE EOPA for the entire PI
    if approval_data.approved:
        if not pi.items or len(pi.items) == 0:
            raise AppException("Cannot approve PI without items", "ERR_VALIDATION", 400)
        
        # Check if EOPA already exists for this PI
        from app.models.eopa import EOPA, EOPAItem
        existing_eopa = db.query(EOPA).filter(EOPA.pi_id == pi.id).first()
        
        if existing_eopa:
            logger.warning({
                "event": "EOPA_ALREADY_EXISTS",
                "pi_id": pi.id,
                "eopa_number": existing_eopa.eopa_number,
                "message": "Skipping EOPA creation - already exists"
            })
            eopa_number = existing_eopa.eopa_number
        else:
            # Generate EOPA number
            eopa_number = generate_eopa_number(db)
            
            # Create ONE EOPA for the entire PI
            eopa = EOPA(
                eopa_number=eopa_number,
                eopa_date=date.today(),
                pi_id=pi.id,
                remarks=f"Auto-generated from PI {pi.pi_number}",
                created_by=current_user.id
            )
            
            db.add(eopa)
            db.flush()  # Flush to get eopa.id
            
            # Create EOPA items for each PI item
            for pi_item in pi.items:
                eopa_item = EOPAItem(
                    eopa_id=eopa.id,
                    pi_item_id=pi_item.id,
                    quantity=pi_item.quantity,
                    estimated_unit_price=pi_item.unit_price,
                    estimated_total=pi_item.total_price,
                    created_by=current_user.id
                )
                db.add(eopa_item)
            
            logger.info({
                "event": "EOPA_AUTO_CREATED",
                "eopa_number": eopa.eopa_number,
                "pi_id": pi.id,
                "pi_number": pi.pi_number,
                "line_items": len(pi.items),
                "created_by": current_user.username
            })
    
    db.commit()
    db.refresh(pi)
    
    # Reload with full relationships
    pi = db.query(PI).options(
        joinedload(PI.items).joinedload(PIItem.medicine),
        joinedload(PI.country),
        joinedload(PI.partner_vendor).joinedload(Vendor.country)
    ).filter(PI.id == pi_id).first()
    
    logger.info({
        "event": "PI_APPROVED" if approval_data.approved else "PI_REJECTED",
        "pi_id": pi.id,
        "pi_number": pi.pi_number,
        "eopa_created": eopa_number is not None if approval_data.approved else False,
        "approved_by": current_user.username
    })
    
    response_data = PIResponse.model_validate(pi).model_dump()
    
    # Add EOPA number to response
    if approval_data.approved and eopa_number:
        response_data["eopa_number"] = eopa_number
    
    return {
        "success": True,
        "message": f"PI {'approved' if approval_data.approved else 'rejected'} successfully" + 
                   (f" - EOPA {eopa_number} created with {len(pi.items)} line items" if approval_data.approved and eopa_number else ""),
        "data": response_data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/{pi_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_pi(
    pi_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete Proforma Invoice"""
    pi = db.query(PI).filter(PI.id == pi_id).first()
    if not pi:
        raise AppException("PI not found", "ERR_NOT_FOUND", 404)
    
    # Store PI number for logging
    pi_number = pi.pi_number
    
    # Delete items first (cascade should handle this, but being explicit)
    db.query(PIItem).filter(PIItem.pi_id == pi.id).delete()
    
    # Delete PI
    db.delete(pi)
    db.commit()
    
    logger.info({
        "event": "PI_DELETED",
        "pi_id": pi_id,
        "pi_number": pi_number,
        "deleted_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "PI deleted successfully",
        "data": None,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
