from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.po import POCreate, POResponse
from app.models.po import PurchaseOrder, POItem, POType
from app.models.eopa import EOPA, EOPAStatus
from app.models.product import MedicineMaster
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_po_number
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_po(
    po_data: POCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Purchase Order from EOPA"""
    # Get EOPA
    eopa = db.query(EOPA).filter(EOPA.id == po_data.eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != EOPAStatus.APPROVED:
        raise AppException("EOPA must be approved before creating PO", "ERR_VALIDATION", 400)
    
    # Get vendor from first medicine item (all items should be from same vendor based on medicine master)
    first_item = eopa.items[0]
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == first_item.medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found in Medicine Master", "ERR_VENDOR_MISMATCH", 400)
    
    vendor_id = medicine.vendor_id
    
    # Generate PO number
    po_number = generate_po_number(db, po_data.po_type.value)
    
    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        po_date=po_data.po_date,
        po_type=po_data.po_type,
        eopa_id=po_data.eopa_id,
        vendor_id=vendor_id,
        total_amount=eopa.total_amount,
        delivery_date=po_data.delivery_date,
        remarks=po_data.remarks,
        created_by=current_user.id
    )
    
    db.add(po)
    db.flush()
    
    # Copy EOPA items to PO items
    for eopa_item in eopa.items:
        po_item = POItem(
            po_id=po.id,
            medicine_id=eopa_item.medicine_id,
            quantity=eopa_item.quantity,
            unit_price=eopa_item.unit_price,
            total_price=eopa_item.total_price
        )
        db.add(po_item)
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_CREATED",
        "po_id": po.id,
        "po_number": po.po_number,
        "po_type": po_data.po_type.value,
        "eopa_id": po_data.eopa_id,
        "vendor_id": vendor_id,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Purchase Order created successfully",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_pos(
    skip: int = 0,
    limit: int = 100,
    po_type: POType = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Purchase Orders"""
    query = db.query(PurchaseOrder)
    if po_type:
        query = query.filter(PurchaseOrder.po_type == po_type)
    
    pos = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Purchase Orders retrieved successfully",
        "data": [POResponse.model_validate(po).model_dump() for po in pos],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
