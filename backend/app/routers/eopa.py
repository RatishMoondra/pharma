from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime, date
from decimal import Decimal
import logging

from app.database.session import get_db
from app.schemas.eopa import (
    EOPACreate, EOPAUpdate, EOPAResponse, EOPAApproveSchema, 
    EOPABulkCreateRequest
)
from app.models.eopa import EOPA, EOPAStatus
from app.models.pi import PI, PIItem
from app.models.product import MedicineMaster
from app.models.vendor import Vendor, VendorType
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
    """Create EOPA for a specific PI item and vendor type"""
    # Get PI item with medicine
    pi_item = db.query(PIItem).options(
        joinedload(PIItem.medicine)
    ).filter(PIItem.id == eopa_data.pi_item_id).first()
    
    if not pi_item:
        raise AppException("PI item not found", "ERR_NOT_FOUND", 404)
    
    # Validate vendor exists and matches vendor type
    vendor = db.query(Vendor).filter(Vendor.id == eopa_data.vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    # Validate vendor type matches
    vendor_type_mapping = {
        "MANUFACTURER": VendorType.MANUFACTURER,
        "RM": VendorType.RM,
        "PM": VendorType.PM
    }
    
    if vendor.vendor_type != vendor_type_mapping.get(eopa_data.vendor_type):
        raise AppException(
            f"Vendor type mismatch. Expected {eopa_data.vendor_type}, got {vendor.vendor_type}",
            "ERR_VALIDATION",
            400
        )
    
    # Check if medicine has this vendor type mapped
    medicine = pi_item.medicine
    if eopa_data.vendor_type == "MANUFACTURER" and not medicine.manufacturer_vendor_id:
        raise AppException("Medicine does not have a manufacturer vendor mapped", "ERR_VALIDATION", 400)
    elif eopa_data.vendor_type == "RM" and not medicine.rm_vendor_id:
        raise AppException("Medicine does not have an RM vendor mapped", "ERR_VALIDATION", 400)
    elif eopa_data.vendor_type == "PM" and not medicine.pm_vendor_id:
        raise AppException("Medicine does not have a PM vendor mapped", "ERR_VALIDATION", 400)
    
    # Check if EOPA already exists for this PI item + vendor type
    existing_eopa = db.query(EOPA).filter(
        and_(
            EOPA.pi_item_id == eopa_data.pi_item_id,
            EOPA.vendor_type == eopa_data.vendor_type
        )
    ).first()
    
    if existing_eopa:
        raise AppException(
            f"EOPA already exists for this PI item and {eopa_data.vendor_type} vendor",
            "ERR_VALIDATION",
            400
        )
    
    # Generate EOPA number
    eopa_number = generate_eopa_number(db)
    
    # Calculate total - convert to Decimal
    estimated_total = Decimal(str(eopa_data.quantity)) * Decimal(str(eopa_data.estimated_unit_price))
    
    # Create EOPA
    eopa = EOPA(
        eopa_number=eopa_number,
        eopa_date=date.today(),
        pi_item_id=eopa_data.pi_item_id,
        vendor_type=eopa_data.vendor_type,
        vendor_id=eopa_data.vendor_id,
        quantity=Decimal(str(eopa_data.quantity)),
        estimated_unit_price=Decimal(str(eopa_data.estimated_unit_price)),
        estimated_total=estimated_total,
        remarks=eopa_data.remarks,
        created_by=current_user.id
    )
    
    db.add(eopa)
    db.commit()
    db.refresh(eopa)
    
    logger.info({
        "event": "EOPA_CREATED",
        "eopa_id": eopa.id,
        "eopa_number": eopa.eopa_number,
        "pi_item_id": eopa_data.pi_item_id,
        "vendor_type": eopa_data.vendor_type,
        "vendor_id": eopa_data.vendor_id,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "EOPA created successfully",
        "data": EOPAResponse.model_validate(eopa).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/bulk-create", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def bulk_create_eopa(
    bulk_data: EOPABulkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create EOPAs for all vendor types of a PI item"""
    # Get PI item with medicine
    pi_item = db.query(PIItem).options(
        joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor)
    ).filter(PIItem.id == bulk_data.pi_item_id).first()
    
    if not pi_item:
        raise AppException("PI item not found", "ERR_NOT_FOUND", 404)
    
    medicine = pi_item.medicine
    created_eopas = []
    
    # Create EOPA for Manufacturer if price provided
    if bulk_data.manufacturer_price and bulk_data.manufacturer_vendor_id:
        eopa_number = generate_eopa_number(db)
        eopa = EOPA(
            eopa_number=eopa_number,
            eopa_date=date.today(),
            pi_item_id=bulk_data.pi_item_id,
            vendor_type="MANUFACTURER",
            vendor_id=bulk_data.manufacturer_vendor_id,
            quantity=pi_item.quantity,
            estimated_unit_price=Decimal(str(bulk_data.manufacturer_price)),
            estimated_total=pi_item.quantity * Decimal(str(bulk_data.manufacturer_price)),
            remarks=bulk_data.remarks,
            created_by=current_user.id
        )
        db.add(eopa)
        db.flush()  # Flush to get the ID and update sequence
        created_eopas.append(eopa)
    
    # Create EOPA for RM if price provided
    if bulk_data.rm_price and bulk_data.rm_vendor_id:
        eopa_number = generate_eopa_number(db)
        eopa = EOPA(
            eopa_number=eopa_number,
            eopa_date=date.today(),
            pi_item_id=bulk_data.pi_item_id,
            vendor_type="RM",
            vendor_id=bulk_data.rm_vendor_id,
            quantity=pi_item.quantity,
            estimated_unit_price=Decimal(str(bulk_data.rm_price)),
            estimated_total=pi_item.quantity * Decimal(str(bulk_data.rm_price)),
            remarks=bulk_data.remarks,
            created_by=current_user.id
        )
        db.add(eopa)
        db.flush()  # Flush to get the ID and update sequence
        created_eopas.append(eopa)
    
    # Create EOPA for PM if price provided
    if bulk_data.pm_price and bulk_data.pm_vendor_id:
        eopa_number = generate_eopa_number(db)
        eopa = EOPA(
            eopa_number=eopa_number,
            eopa_date=date.today(),
            pi_item_id=bulk_data.pi_item_id,
            vendor_type="PM",
            vendor_id=bulk_data.pm_vendor_id,
            quantity=pi_item.quantity,
            estimated_unit_price=Decimal(str(bulk_data.pm_price)),
            estimated_total=pi_item.quantity * Decimal(str(bulk_data.pm_price)),
            remarks=bulk_data.remarks,
            created_by=current_user.id
        )
        db.add(eopa)
        db.flush()  # Flush to get the ID and update sequence
        created_eopas.append(eopa)
    
    db.commit()
    for eopa in created_eopas:
        db.refresh(eopa)
    
    logger.info({
        "event": "EOPA_BULK_CREATED",
        "pi_item_id": bulk_data.pi_item_id,
        "count": len(created_eopas),
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": f"{len(created_eopas)} EOPA(s) created successfully",
        "data": [EOPAResponse.model_validate(eopa).model_dump() for eopa in created_eopas],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_eopas(
    skip: int = 0,
    limit: int = 100,
    status: EOPAStatus = None,
    pi_id: int = None,
    vendor_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List EOPAs with optional filters"""
    query = db.query(EOPA).options(
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.vendor)
    )
    
    if status:
        query = query.filter(EOPA.status == status)
    
    if pi_id:
        # Filter by PI ID through PI item relationship
        query = query.join(PIItem).filter(PIItem.pi_id == pi_id)
    
    if vendor_type:
        query = query.filter(EOPA.vendor_type == vendor_type)
    
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
    """Get EOPA by ID"""
    eopa = db.query(EOPA).options(
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.pi).joinedload(PI.partner_vendor),
        joinedload(EOPA.vendor)
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
    """Update EOPA"""
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != EOPAStatus.PENDING:
        raise AppException("Cannot update approved/rejected EOPA", "ERR_VALIDATION", 400)
    
    # Update fields if provided
    if eopa_data.vendor_id is not None:
        # Validate vendor
        vendor = db.query(Vendor).filter(Vendor.id == eopa_data.vendor_id).first()
        if not vendor:
            raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
        eopa.vendor_id = eopa_data.vendor_id
    
    if eopa_data.quantity is not None:
        eopa.quantity = Decimal(str(eopa_data.quantity))
    
    if eopa_data.estimated_unit_price is not None:
        eopa.estimated_unit_price = Decimal(str(eopa_data.estimated_unit_price))
    
    if eopa_data.remarks is not None:
        eopa.remarks = eopa_data.remarks
    
    # Recalculate total - both are already Decimal from DB
    eopa.estimated_total = eopa.quantity * eopa.estimated_unit_price
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


@router.get("/pi-item/{pi_item_id}", response_model=dict)
async def get_eopas_by_pi_item(
    pi_item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all EOPAs for a specific PI item"""
    pi_item = db.query(PIItem).filter(PIItem.id == pi_item_id).first()
    if not pi_item:
        raise AppException("PI item not found", "ERR_NOT_FOUND", 404)
    
    eopas = db.query(EOPA).options(
        joinedload(EOPA.vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.rm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.medicine).joinedload(MedicineMaster.pm_vendor),
        joinedload(EOPA.pi_item).joinedload(PIItem.pi).joinedload(PI.partner_vendor)
    ).filter(EOPA.pi_item_id == pi_item_id).all()
    
    return {
        "success": True,
        "message": f"Found {len(eopas)} EOPA(s) for PI item",
        "data": [EOPAResponse.model_validate(eopa).model_dump() for eopa in eopas],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
