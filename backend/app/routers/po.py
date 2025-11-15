from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
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
from app.services.po_service import POGenerationService

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/generate-from-eopa/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def generate_pos_from_eopa(
    eopa_id: int,
    po_quantities: dict = None,  # Optional custom quantities
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate Purchase Orders from an approved EOPA.
    
    Optionally accepts custom quantities for RM/PM POs.
    
    Business Logic:
    - Creates FG PO for each manufacturer
    - Creates RM PO for each raw material vendor (if exists)
    - Creates PM PO for each packing material vendor (if exists)
    - Groups line items by vendor and PO type
    - Uses custom quantities if provided, otherwise uses EOPA quantities
    
    Args:
        eopa_id: ID of the EOPA to generate POs from
        po_quantities: Optional dict with custom quantities per PO type
            Example: {"po_quantities": [{"eopa_item_id": 1, "po_type": "RM", "quantity": 100}]}
    
    Returns:
        Summary of created POs with PO numbers and details
    """
    service = POGenerationService(db)
    
    try:
        result = service.generate_pos_from_eopa(eopa_id, current_user.id, po_quantities)
        
        return {
            "success": True,
            "message": f"Successfully generated {result['total_pos_created']} Purchase Order(s) from EOPA {result['eopa_number']}",
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except AppException:
        raise
    except Exception as e:
        logger.error({
            "event": "PO_GENERATION_ENDPOINT_ERROR",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            "Failed to generate Purchase Orders",
            "ERR_PO_GENERATION",
            500
        )


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
    eopa_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Purchase Orders with optional filters"""
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine)
    )
    
    if po_type:
        query = query.filter(PurchaseOrder.po_type == po_type)
    
    if eopa_id:
        query = query.filter(PurchaseOrder.eopa_id == eopa_id)
    
    pos = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Purchase Orders retrieved successfully",
        "data": [POResponse.model_validate(po).model_dump() for po in pos],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{po_id}", response_model=dict)
async def get_po(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Purchase Order by ID"""
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    return {
        "success": True,
        "message": "Purchase Order retrieved successfully",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/{po_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def update_po(
    po_id: int,
    vendor_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update Purchase Order vendor.
    
    Allows changing the vendor for a PO if needed.
    Only ADMIN and PROCUREMENT_OFFICER can update.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status == POStatus.CLOSED:
        raise AppException("Cannot update a closed PO", "ERR_VALIDATION", 400)
    
    if vendor_id:
        # Verify vendor exists and matches PO type
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
        
        # Validate vendor type matches PO type
        expected_vendor_type = {
            POType.FG: "MANUFACTURER",
            POType.RM: "RM",
            POType.PM: "PM"
        }.get(po.po_type)
        
        if vendor.vendor_type != expected_vendor_type:
            raise AppException(
                f"Vendor type mismatch. Expected {expected_vendor_type}, got {vendor.vendor_type}",
                "ERR_VALIDATION",
                400
            )
        
        po.vendor_id = vendor_id
        po.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_UPDATED",
        "po_id": po.id,
        "po_number": po.po_number,
        "vendor_id": vendor_id,
        "updated_by": current_user.username
    })
    
    # Reload with relationships
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine)
    ).filter(PurchaseOrder.id == po_id).first()
    
    return {
        "success": True,
        "message": "Purchase Order updated successfully",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
