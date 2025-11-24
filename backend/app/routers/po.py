
from fastapi import APIRouter, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging
import time
from typing import List

from app.database.session import get_db
from app.schemas.po import POCreate, POResponse, POUpdateRequest
from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.vendor import Vendor
from app.models.eopa import EOPA, EOPAStatus
from app.models.product import MedicineMaster
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_po_number
from app.exceptions.base import AppException
from app.services.po_service import POGenerationService
from app.services.pdf_service import POPDFService
from app.services.email_service import EmailService

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


@router.post("/generate-from-eopa", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def generate_pos_from_eopa_body(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate Purchase Orders from an approved EOPA (body-based).

    Payload:
    {
        "eopa_id": int,
        "po_quantities": { ... }  # optional overrides
    }
    """
    try:
        eopa_id = payload.get("eopa_id")
        po_quantities = payload.get("po_quantities") if payload else None
        if not eopa_id:
            raise AppException("eopa_id is required", "ERR_VALIDATION", 400)

        service = POGenerationService(db)
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
            "event": "PO_GENERATION_ENDPOINT_ERROR_BODY",
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            "Failed to generate Purchase Orders",
            "ERR_PO_GENERATION",
            500
        )


@router.post("/generate-rm-pos/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def generate_rm_pos_from_explosion(
    eopa_id: int,
    rm_po_overrides: dict = None,  # Optional user overrides from preview
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate Raw Material POs from BOM explosion.
    
    Creates ONE RM PO per vendor with multiple line items (one per raw material).
    
    Business Logic:
    - Performs RM explosion for all medicines in the EOPA
    - Groups raw materials by vendor
    - Creates one RM PO per vendor with raw material line items
    - Each PO item contains: raw_material_id, quantity, uom, hsn_code, gst_rate
    - Supports user overrides from the PO preview step
    
    Args:
        eopa_id: ID of the EOPA
        rm_po_overrides: Optional user overrides from preview
            Example: [{"vendor_id": 1, "items": [{"raw_material_id": 1, "quantity": 100, "uom": "KG", ...}]}]
    
    Returns:
        Summary of created RM POs with PO numbers and details
    """
    try:
        po_service = POGenerationService(db)
        
        # Extract rm_pos list if provided in nested structure
        overrides_list = None
        if rm_po_overrides:
            overrides_list = rm_po_overrides.get("rm_pos") or rm_po_overrides.get("vendor_groups")
        
        result = po_service.generate_rm_pos_from_explosion(
            eopa_id=eopa_id,
            current_user_id=current_user.id,
            rm_po_overrides=overrides_list
        )
        
        logger.info({
            "event": "RM_POS_GENERATED_FROM_API",
            "eopa_id": eopa_id,
            "total_rm_pos": result["total_rm_pos_created"],
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": f"Successfully generated {result['total_rm_pos_created']} RM PO(s) from EOPA explosion",
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "RM_PO_GENERATION_FAILED",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            "Failed to generate RM Purchase Orders from explosion",
            "ERR_RM_PO_GENERATION",
            500
        )


@router.post("/generate-pm-pos/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def generate_pm_pos_from_explosion(
    eopa_id: int,
    pm_po_overrides: dict = None,  # Optional user overrides from preview
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate Packing Material POs from BOM explosion.
    
    Creates ONE PM PO per vendor with multiple line items (one per packing material).
    
    Business Logic:
    - Performs PM explosion for all medicines in the EOPA
    - Groups packing materials by vendor
    - Creates one PM PO per vendor with packing material line items
    - Each PO item contains: packing_material_id, quantity, uom, language, artwork_version, gsm, ply, dimensions, hsn_code, gst_rate
    - Supports user overrides from the PO preview step
    
    Args:
        eopa_id: ID of the EOPA
        pm_po_overrides: Optional user overrides from preview
            Example: [{"vendor_id": 1, "items": [{"packing_material_id": 1, "quantity": 1000, "uom": "PCS", "language": "EN", ...}]}]
    
    Returns:
        Summary of created PM POs with PO numbers and details
    """
    try:
        po_service = POGenerationService(db)
        
        # Extract pm_pos list if provided in nested structure
        overrides_list = None
        if pm_po_overrides:
            overrides_list = pm_po_overrides.get("pm_pos") or pm_po_overrides.get("vendor_groups")
        
        result = po_service.generate_pm_pos_from_explosion(
            eopa_id=eopa_id,
            current_user_id=current_user.id,
            pm_po_overrides=overrides_list
        )
        
        logger.info({
            "event": "PM_POS_GENERATED_FROM_API",
            "eopa_id": eopa_id,
            "total_pm_pos": result["total_pm_pos_created"],
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": f"Successfully generated {result['total_pm_pos_created']} PM PO(s) from EOPA explosion",
            "data": result,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except AppException as e:
        raise e
    except Exception as e:
        logger.error({
            "event": "PM_PO_GENERATION_FAILED",
            "eopa_id": eopa_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            "Failed to generate PM Purchase Orders from explosion",
            "ERR_PM_PO_GENERATION",
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
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == first_item.pi_item.medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found in Medicine Master", "ERR_VENDOR_MISMATCH", 400)


    # Select vendor based on PO type
    if po_data.po_type.value == "FG":
        vendor_id = medicine.manufacturer_vendor_id
    elif po_data.po_type.value == "RM":
        vendor_id = medicine.rm_vendor_id
    elif po_data.po_type.value == "PM":
        vendor_id = medicine.pm_vendor_id
    else:
        vendor_id = None

    if not vendor_id:
        raise AppException("Vendor not mapped for this PO type in Medicine Master", "ERR_VENDOR_MISMATCH", 400)

    # Generate PO number
    po_number = generate_po_number(db, po_data.po_type.value)

    # Ensure po_date is not null
    from datetime import date
    po_date = po_data.po_date or date.today()

    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        po_date=po_date,
        po_type=po_data.po_type,
        eopa_id=po_data.eopa_id,
        vendor_id=vendor_id,
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
            medicine_id=eopa_item.pi_item.medicine_id,
            ordered_quantity=eopa_item.quantity,
            fulfilled_quantity=0
            # Add other required fields if needed (unit, etc.)
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
    limit: int = 50,  # Reduced default limit from 100 to 50
    po_type: POType = None,
    eopa_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Purchase Orders with optional filters"""
    start_time = time.time()
    
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
    )
    
    if po_type:
        query = query.filter(PurchaseOrder.po_type == po_type)
    
    if eopa_id:
        query = query.filter(PurchaseOrder.eopa_id == eopa_id)
    
    # Order by most recent first
    pos = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    
    query_time = time.time() - start_time
    logger.info(f"PO query took {query_time:.2f}s, fetched {len(pos)} records")
    
    # Convert to response
    response_data = [POResponse.model_validate(po).model_dump() for po in pos]
    # Debug: log PO items for first PO
    if response_data and response_data[0].get('items'):
        logger.info({
            'event': 'PO_LIST_ITEMS_DEBUG',
            'po_id': response_data[0].get('id'),
            'items': response_data[0]['items']
        })
    
    total_time = time.time() - start_time
    logger.info(f"PO list endpoint total time: {total_time:.2f}s")
    
    return {
        "success": True,
        "message": "Purchase Orders retrieved successfully",
        "data": response_data,
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
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
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
    po_data: POUpdateRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update Purchase Order vendor.
    
    Allows changing the vendor for a PO if needed.
    Only ADMIN and PROCUREMENT_OFFICER can update.
    """
    logger.info({
        "event": "PO_UPDATE_PAYLOAD_RECEIVED",
        "po_id": po_id,
        "vendor_id": po_data.vendor_id,
        "items": po_data.items
    })
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status == POStatus.CLOSED:
        raise AppException("Cannot update a closed PO", "ERR_VALIDATION", 400)
    
    if po_data.vendor_id:
        # Verify vendor exists and matches PO type
        vendor = db.query(Vendor).filter(Vendor.id == po_data.vendor_id).first()
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
        po.vendor_id = po_data.vendor_id
        po.updated_at = datetime.utcnow()

    # Update PO items if provided
    # FIX B: Support both UPDATE existing items and INSERT new items
    if po_data.items:
        for item_data in po_data.items:
            # Check if this is a new item (no ID) or existing item
            item_id = getattr(item_data, 'id', None)
            
            if item_id and item_id > 0:
                # UPDATE existing item
                po_item = db.query(POItem).filter(POItem.id == item_id, POItem.po_id == po_id).first()
            else:
                # Try to match by material ID
                if po.po_type == POType.FG:
                    po_item = db.query(POItem).filter(POItem.medicine_id == item_data.medicine_id, POItem.po_id == po_id).first()
                elif po.po_type == POType.RM:
                    po_item = db.query(POItem).filter(POItem.raw_material_id == getattr(item_data, 'raw_material_id', None), POItem.po_id == po_id).first()
                elif po.po_type == POType.PM:
                    po_item = db.query(POItem).filter(POItem.packing_material_id == getattr(item_data, 'packing_material_id', None), POItem.po_id == po_id).first()
                else:
                    po_item = None
            
            logger.info({
                "event": "PO_ITEM_UPDATE_ATTEMPT",
                "item_data": item_data,
                "po_item_found": po_item is not None,
                "po_item_id": po_item.id if po_item else None,
                "po_id": po_id
            })
            
            if po_item:
                # UPDATE existing item - only update if PO is not closed
                if po.status != POStatus.CLOSED:
                    if item_data.ordered_quantity is not None:
                        from decimal import Decimal
                        po_item.ordered_quantity = Decimal(str(item_data.ordered_quantity))
                    if item_data.unit is not None:
                        po_item.unit = item_data.unit
                    # FIX D: Update raw_material_id if changed
                    if hasattr(item_data, 'raw_material_id') and item_data.raw_material_id is not None:
                        po_item.raw_material_id = item_data.raw_material_id
                    if hasattr(item_data, 'packing_material_id') and item_data.packing_material_id is not None:
                        po_item.packing_material_id = item_data.packing_material_id
                    if hasattr(item_data, 'medicine_id') and item_data.medicine_id is not None:
                        po_item.medicine_id = item_data.medicine_id
            else:
                # INSERT new item - FIX B
                if po.status != POStatus.CLOSED:
                    from decimal import Decimal
                    new_po_item = POItem(
                        po_id=po_id,
                        medicine_id=getattr(item_data, 'medicine_id', None),
                        raw_material_id=getattr(item_data, 'raw_material_id', None),
                        packing_material_id=getattr(item_data, 'packing_material_id', None),
                        ordered_quantity=Decimal(str(item_data.ordered_quantity)) if item_data.ordered_quantity else Decimal('0'),
                        fulfilled_quantity=Decimal(str(getattr(item_data, 'fulfilled_quantity', 0))),
                        unit=getattr(item_data, 'unit', 'pcs')
                    )
                    db.add(new_po_item)
                    logger.info({
                        "event": "PO_ITEM_INSERTED",
                        "po_id": po_id,
                        "medicine_id": new_po_item.medicine_id,
                        "raw_material_id": new_po_item.raw_material_id,
                        "packing_material_id": new_po_item.packing_material_id
                    })
        po.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_UPDATED",
        "po_id": po.id,
        "po_number": po.po_number,
        "vendor_id": po_data.vendor_id,
        "updated_by": current_user.username
    })
    
    # Reload with relationships
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
    ).filter(PurchaseOrder.id == po_id).first()
    
    return {
        "success": True,
        "message": "Purchase Order updated successfully",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{po_id}/recalculate", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def recalculate_po(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Recalculate all commercial amounts for a PO and its items.
    
    This endpoint:
    1. Recalculates value, GST, and total for each PO item
    2. Recalculates PO totals based on updated item totals
    3. Returns updated PO with all calculations
    
    Used when:
    - User updates rates or quantities
    - GST rates change
    - Manual recalculation is needed
    """
    from app.services.po_service import calculate_po_item_amounts, calculate_po_totals
    
    # Get PO with all items
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status == POStatus.CLOSED:
        raise AppException("Cannot recalculate a closed PO", "ERR_VALIDATION", 400)
    
    # Recalculate each item
    for item in po.items:
        calculate_po_item_amounts(item)
    
    # Recalculate PO totals
    calculate_po_totals(po)
    
    po.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info({
        "event": "PO_RECALCULATED",
        "po_id": po.id,
        "po_number": po.po_number,
        "total_value": float(po.total_value_amount) if po.total_value_amount else 0,
        "total_gst": float(po.total_gst_amount) if po.total_gst_amount else 0,
        "total_invoice": float(po.total_invoice_amount) if po.total_invoice_amount else 0,
        "user": current_user.username
    })
    
    # Reload with all relationships
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.eopa),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
    ).filter(PurchaseOrder.id == po_id).first()
    
    return {
        "success": True,
        "message": "Purchase Order recalculated successfully",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/{po_id}/download-pdf", dependencies=[Depends(get_current_user)])
async def download_po_pdf(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and download PO PDF.
    
    Returns PDF file with professional letterhead and formatting.
    """
    # Get PO with all relationships (including approval workflow and terms)
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material),
        joinedload(PurchaseOrder.preparer),
        joinedload(PurchaseOrder.checker),
        joinedload(PurchaseOrder.approver),
        joinedload(PurchaseOrder.verifier),
        joinedload(PurchaseOrder.terms_conditions)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    try:
        pdf_service = POPDFService(db)  # Pass db session for config access
        pdf_buffer = pdf_service.generate_po_pdf(po)
        
        logger.info({
            "event": "PO_PDF_GENERATED",
            "po_id": po.id,
            "po_number": po.po_number,
            "user": current_user.username
        })
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={po.po_number}.pdf"
            }
        )
    
    except Exception as e:
        logger.error({
            "event": "PO_PDF_GENERATION_ERROR",
            "po_id": po_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"Failed to generate PDF: {str(e)}",
            "ERR_PDF_GENERATION",
            500
        )


@router.post("/{po_id}/send-email", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def send_po_email(
    po_id: int,
    email_data: dict,  # {"to_emails": ["vendor@example.com"], "cc_emails": [], "subject": "", "body": ""}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send PO email to vendor with PDF attachment.
    
    Args:
        po_id: PO ID
        email_data: dict with to_emails (required), cc_emails (optional), subject (optional), body (optional)
    
    Returns:
        Success/failure status with message
    """
    # Get PO with all relationships
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    # Validate email data
    to_emails = email_data.get("to_emails", [])
    if not to_emails or not isinstance(to_emails, list):
        raise AppException("to_emails is required and must be a list", "ERR_VALIDATION", 400)
    
    try:
        email_service = EmailService(db)
        result = email_service.send_po_email(
            po=po,
            to_emails=to_emails,
            cc_emails=email_data.get("cc_emails"),
            subject=email_data.get("subject"),
            body=email_data.get("body"),
            attach_pdf=email_data.get("attach_pdf", True)
        )
        
        if result["success"]:
            logger.info({
                "event": "PO_EMAIL_SENT",
                "po_id": po.id,
                "po_number": po.po_number,
                "to_emails": to_emails,
                "user": current_user.username
            })
        else:
            logger.warning({
                "event": "PO_EMAIL_FAILED",
                "po_id": po.id,
                "po_number": po.po_number,
                "error": result["message"],
                "user": current_user.username
            })
        
        return {
            "success": result["success"],
            "message": result["message"],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    except Exception as e:
        logger.error({
            "event": "PO_EMAIL_ERROR",
            "po_id": po_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"Failed to send email: {str(e)}",
            "ERR_EMAIL_SEND",
            500
        )


@router.post("/test-email", dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def test_email_configuration(
    test_data: dict,  # {"email": "test@example.com"}
    current_user: User = Depends(get_current_user)
):
    """
    Test email configuration by sending a test email.
    
    Args:
        test_data: dict with email address
    
    Returns:
        Success/failure status
    """
    email = test_data.get("email")
    if not email:
        raise AppException("Email address is required", "ERR_VALIDATION", 400)
    
    try:
        email_service = EmailService()
        result = email_service.send_test_email(email)
        
        logger.info({
            "event": "EMAIL_TEST_SENT",
            "email": email,
            "success": result["success"],
            "user": current_user.username
        })
        
        return {
            "success": result["success"],
            "message": result["message"],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    except Exception as e:
        logger.error({
            "event": "EMAIL_TEST_ERROR",
            "email": email,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"Email test failed: {str(e)}",
            "ERR_EMAIL_TEST",
            500
        )



@router.post("/{po_id}/mark-pending", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def mark_po_pending(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark PO as pending approval (DRAFT → PENDING_APPROVAL)"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    if po.status != POStatus.DRAFT:
        raise AppException("Only DRAFT POs can be marked as pending approval", "ERR_VALIDATION", 400)

    # Re-generate PO number to remove DRAFT from number
    from app.utils.number_generator import generate_po_number
    new_po_number = generate_po_number(db, po.po_type.value, is_draft=False)
    po.po_number = new_po_number
    po.status = POStatus.PENDING_APPROVAL
    po.prepared_by = current_user.id
    po.prepared_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(po)
    logger.info({
        "event": "PO_MARKED_PENDING_APPROVAL",
        "po_id": po.id,
        "po_number": po.po_number,
        "user": current_user.username
    })
    return {
        "success": True,
        "message": f"PO {po.po_number} marked as pending approval",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.post("/{po_id}/send", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def send_po(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send PO (READY → SENT) without email logic"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    if po.status != POStatus.READY:
        raise AppException("Only READY POs can be sent", "ERR_VALIDATION", 400)
    po.status = POStatus.SENT
    po.sent_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(po)
    logger.info({
        "event": "PO_SENT",
        "po_id": po.id,
        "po_number": po.po_number,
        "user": current_user.username
    })
    return {
        "success": True,
        "message": f"PO {po.po_number} marked as SENT",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.post("/{po_id}/approve", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def approve_po(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve PO (PENDING_APPROVAL → APPROVED)"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status != POStatus.PENDING_APPROVAL:
        raise AppException("Only PENDING_APPROVAL POs can be approved", "ERR_VALIDATION", 400)
    
    po.status = POStatus.APPROVED
    po.approved_by = current_user.id
    po.approved_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_APPROVED",
        "po_id": po.id,
        "po_number": po.po_number,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"PO {po.po_number} approved",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{po_id}/reject", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def reject_po(
    po_id: int,
    remarks: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject PO (PENDING_APPROVAL/APPROVED → DRAFT)"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status not in [POStatus.PENDING_APPROVAL, POStatus.APPROVED]:
        raise AppException("Only PENDING_APPROVAL or APPROVED POs can be rejected", "ERR_VALIDATION", 400)
    
    po.status = POStatus.DRAFT
    if remarks:
        po.remarks = (po.remarks or "") + f"\n[Rejected by {current_user.username}]: {remarks}"
    po.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_REJECTED",
        "po_id": po.id,
        "po_number": po.po_number,
        "user": current_user.username,
        "remarks": remarks
    })
    
    return {
        "success": True,
        "message": f"PO {po.po_number} rejected",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{po_id}/mark-ready", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def mark_po_ready(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark PO as ready to send (APPROVED → READY)"""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status != POStatus.APPROVED:
        raise AppException("Only APPROVED POs can be marked as ready", "ERR_VALIDATION", 400)
    
    po.status = POStatus.READY
    po.verified_by = current_user.id
    po.verified_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_MARKED_READY",
        "po_id": po.id,
        "po_number": po.po_number,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"PO {po.po_number} marked as ready",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/{po_id}/send-to-vendor", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def send_po_to_vendor(
    po_id: int,
    send_email: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send PO to vendor (READY → SENT)"""
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    if po.status != POStatus.READY:
        raise AppException("Only READY POs can be sent to vendor", "ERR_VALIDATION", 400)
    
    po.status = POStatus.SENT
    po.sent_at = datetime.utcnow()
    po.updated_at = datetime.utcnow()
    
    # Optionally send email
    if send_email and po.vendor and po.vendor.email:
        try:
            email_service = EmailService(db)
            email_result = email_service.send_po_email(
                po=po,
                to_emails=[po.vendor.email],
                attach_pdf=True
            )
            if not email_result["success"]:
                logger.warning({
                    "event": "PO_EMAIL_FAILED",
                    "po_id": po.id,
                    "po_number": po.po_number,
                    "error": email_result["message"]
                })
        except Exception as e:
            logger.error({
                "event": "PO_EMAIL_ERROR",
                "po_id": po.id,
                "error": str(e)
            })
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_SENT_TO_VENDOR",
        "po_id": po.id,
        "po_number": po.po_number,
        "vendor": po.vendor.vendor_name if po.vendor else "NOT ASSIGNED",
        "email_sent": send_email,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"PO {po.po_number} sent to vendor",
        "data": POResponse.model_validate(po).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/by-eopa/{eopa_id}", response_model=dict)
async def get_pos_by_eopa(
    eopa_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all Purchase Orders generated from a specific EOPA"""
    from app.models.eopa import EOPA
    from app.models.vendor import Vendor
    
    # Verify EOPA exists
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    # Fetch POs linked to this EOPA
    pos = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
        joinedload(PurchaseOrder.items).joinedload(POItem.raw_material),
        joinedload(PurchaseOrder.items).joinedload(POItem.packing_material)
    ).filter(PurchaseOrder.eopa_id == eopa_id).all()
    
    return {
        "success": True,
        "message": f"Purchase Orders for EOPA #{eopa_id} retrieved successfully",
        "data": [POResponse.model_validate(po).model_dump() for po in pos],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/generate-po-by-vendor", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def generate_po_by_vendor(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a single PO for a specific vendor and PO type from EOPA.
    
    PART A: Draft PO Reuse Logic - Check if DRAFT PO exists before creating new one
    PART B: fulfilled_quantity = EOPA qty (set ONCE, never modified), ordered_quantity = user editable
    
    Payload:
    {
        "eopa_id": int,
        "vendor_id": int,
        "po_type": "RM" | "PM" | "FG",
        "items": [
            {
                "medicine_id": int,
                "raw_material_id": int,  // for RM PO
                "packing_material_id": int,  // for PM PO
                "ordered_quantity": float,
                "unit": "kg" | "pcs" | "boxes" | etc.
            }
        ]
    }
    
    Returns mode="update" if DRAFT exists, mode="create" if new PO created
    """
    # Local imports to avoid circular references and fix incorrect modules
    from datetime import date, timedelta
    from decimal import Decimal
    from app.models.eopa import EOPA, EOPAItem
    from app.models.vendor import Vendor
    from app.models.product import MedicineMaster
    from app.models.raw_material import RawMaterialMaster
    from app.models.packing_material import PackingMaterialMaster
    from app.utils.number_generator import generate_po_number
    
    eopa_id = payload.get('eopa_id')
    vendor_id = payload.get('vendor_id')
    po_type = payload.get('po_type')
    items = payload.get('items', [])
    
    if not all([eopa_id, vendor_id, po_type]):
        raise AppException("Missing required fields: eopa_id, vendor_id, po_type", "ERR_VALIDATION", 400)
    
    # Validate EOPA
    eopa = db.query(EOPA).options(
        joinedload(EOPA.items)
    ).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != "APPROVED":
        raise AppException("EOPA must be APPROVED to generate POs", "ERR_EOPA_NOT_APPROVED", 400)
    
    # Validate vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    # BUG FIX: Check for existing PO in priority order: DRAFT → PENDING → APPROVED → READY → SENT
    # Search in order of status priority
    status_priority = [
        POStatus.DRAFT,
        POStatus.PENDING_APPROVAL,
        POStatus.APPROVED,
        POStatus.READY,
        POStatus.SENT
    ]
    
    existing_po = None
    for status in status_priority:
        existing_po = db.query(PurchaseOrder).filter(
            PurchaseOrder.eopa_id == eopa_id,
            PurchaseOrder.vendor_id == vendor_id,
            PurchaseOrder.po_type == po_type,
            PurchaseOrder.status == status
        ).order_by(PurchaseOrder.created_at.desc()).first()
        
        if existing_po:
            break
    
    if existing_po:
        # UPDATE MODE - Return existing PO with items (regardless of status)
        logger.info({
            "event": "PO_FOUND",
            "po_id": existing_po.id,
            "po_number": existing_po.po_number,
            "po_status": existing_po.status.value if hasattr(existing_po.status, 'value') else str(existing_po.status),
            "vendor_id": vendor_id,
            "eopa_id": eopa_id,
            "user": current_user.username
        })
        
        # Load existing items
        existing_items = db.query(POItem).options(
            joinedload(POItem.medicine),
            joinedload(POItem.raw_material),
            joinedload(POItem.packing_material)
        ).filter(POItem.po_id == existing_po.id).all()
        
        items_data = []
        for po_item in existing_items:
            item_dict = {
                "id": po_item.id,
                "medicine_id": po_item.medicine_id,
                "raw_material_id": po_item.raw_material_id,
                "packing_material_id": po_item.packing_material_id,
                "medicine_name": po_item.medicine.medicine_name if po_item.medicine else None,
                "raw_material_name": po_item.raw_material.rm_name if po_item.raw_material else None,
                "packing_material_name": po_item.packing_material.pm_name if po_item.packing_material else None,
                "ordered_quantity": float(po_item.ordered_quantity) if po_item.ordered_quantity else 0,
                "fulfilled_quantity": float(po_item.fulfilled_quantity) if po_item.fulfilled_quantity else 0,
                "unit": po_item.unit
            }
            items_data.append(item_dict)
        
        po_status_str = existing_po.status.value if hasattr(existing_po.status, 'value') else str(existing_po.status)
        
        return {
            "success": True,
            "message": f"Found existing {po_status_str} PO {existing_po.po_number}",
            "data": {
                "mode": "update",
                "po_id": existing_po.id,
                "po_number": existing_po.po_number,
                "po_status": po_status_str,
                "po_type": po_type,
                "vendor_name": vendor.vendor_name,
                "items": items_data
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    # CREATE MODE - No existing DRAFT, create new PO
    po_number = generate_po_number(db, po_type)
    
    po = PurchaseOrder(
        po_number=po_number,
        po_date=date.today(),
        po_type=po_type,
        eopa_id=eopa_id,
        vendor_id=vendor_id,
        delivery_date=date.today() + timedelta(days=30),  # Default 30 days
        status=POStatus.DRAFT,
        created_by=current_user.id
    )
    
    db.add(po)
    db.flush()
    
    # FIX A: If no items provided, auto-generate from EOPA based on PO type
    if not items or len(items) == 0:
        # Auto-generate items from EOPA based on po_type
        eopa_with_items = db.query(EOPA).options(
            joinedload(EOPA.items).joinedload(EOPAItem.pi_item)
        ).filter(EOPA.id == eopa_id).first()
        
        items = []
        for eopa_item in (eopa_with_items.items if eopa_with_items else []):
            if not eopa_item.pi_item or not eopa_item.pi_item.medicine_id:
                continue
            
            medicine = db.query(MedicineMaster).filter(MedicineMaster.id == eopa_item.pi_item.medicine_id).first()
            if not medicine:
                continue
            
            eopa_qty = float(eopa_item.quantity or 0)
            
            if po_type == 'FG':
                # BUG FIX #2: Filter by vendor - only include if medicine manufacturer matches target vendor
                if medicine.manufacturer_vendor_id == vendor_id:
                    items.append({
                        'medicine_id': medicine.id,
                        'ordered_quantity': eopa_qty,
                        'eopa_quantity': eopa_qty,
                        'unit': 'PCS'
                    })
            elif po_type == 'RM':
                # Fetch RM BOM for this medicine
                rm_bom_items = db.query(MedicineMaster).filter(MedicineMaster.id == medicine.id).first()
                if hasattr(rm_bom_items, 'raw_materials'):
                    for bom_item in rm_bom_items.raw_materials:
                        # BUG FIX #2: Filter by vendor - only include if BOM item vendor matches target vendor
                        item_vendor_id = getattr(bom_item, 'vendor_id', None) or medicine.rm_vendor_id
                        if item_vendor_id == vendor_id:
                            qty_required = float(getattr(bom_item, 'qty_required_per_unit', 0))
                            exploded_qty = eopa_qty * qty_required
                            if bom_item.raw_material_id and exploded_qty > 0:
                                items.append({
                                    'raw_material_id': bom_item.raw_material_id,
                                    'ordered_quantity': exploded_qty,
                                    'eopa_quantity': exploded_qty,
                                    'unit': getattr(bom_item, 'uom', 'KG')
                                })
            elif po_type == 'PM':
                # Fetch PM BOM for this medicine
                pm_bom_items = db.query(MedicineMaster).filter(MedicineMaster.id == medicine.id).first()
                if hasattr(pm_bom_items, 'packing_materials'):
                    for bom_item in pm_bom_items.packing_materials:
                        # BUG FIX #2: Filter by vendor - only include if BOM item vendor matches target vendor
                        item_vendor_id = getattr(bom_item, 'vendor_id', None) or medicine.pm_vendor_id
                        if item_vendor_id == vendor_id:
                            qty_required = float(getattr(bom_item, 'qty_required_per_unit', 0))
                            exploded_qty = eopa_qty * qty_required
                            if bom_item.packing_material_id and exploded_qty > 0:
                                items.append({
                                    'packing_material_id': bom_item.packing_material_id,
                                    'ordered_quantity': exploded_qty,
                                    'eopa_quantity': exploded_qty,
                                    'unit': getattr(bom_item, 'uom', 'PCS')
                                })
    
    # Create PO items from payload
    # PART B: fulfilled_quantity = EOPA qty (stored ONCE), ordered_quantity = user editable
    items_data = []
    for item in items:
        medicine_id = item.get('medicine_id')
        raw_material_id = item.get('raw_material_id')
        packing_material_id = item.get('packing_material_id')
        ordered_quantity = item.get('ordered_quantity', 0)
        eopa_quantity = item.get('eopa_quantity', ordered_quantity)  # Use eopa_quantity if provided, else ordered_quantity
        unit = item.get('unit', 'pcs')
        
        # Skip invalid items
        if not any([medicine_id, raw_material_id, packing_material_id]) or not ordered_quantity:
            continue
        
        # PART B: fulfilled_quantity stores EOPA original qty, ordered_quantity is editable
        po_item = POItem(
            po_id=po.id,
            medicine_id=medicine_id,
            raw_material_id=raw_material_id,
            packing_material_id=packing_material_id,
            ordered_quantity=Decimal(str(ordered_quantity)),
            fulfilled_quantity=Decimal(str(eopa_quantity)),  # EOPA original qty - NEVER modified
            unit=unit
        )
        db.add(po_item)
        db.flush()
        
        # Fetch names for response
        medicine_name = None
        raw_material_name = None
        packing_material_name = None
        
        if medicine_id:
            medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
            medicine_name = medicine.medicine_name if medicine else None
        
        if raw_material_id:
            rm = db.query(RawMaterialMaster).filter(RawMaterialMaster.id == raw_material_id).first()
            raw_material_name = rm.rm_name if rm else None
        
        if packing_material_id:
            pm = db.query(PackingMaterialMaster).filter(PackingMaterialMaster.id == packing_material_id).first()
            packing_material_name = pm.pm_name if pm else None
        
        items_data.append({
            "id": po_item.id,
            "medicine_id": medicine_id,
            "raw_material_id": raw_material_id,
            "packing_material_id": packing_material_id,
            "medicine_name": medicine_name,
            "raw_material_name": raw_material_name,
            "packing_material_name": packing_material_name,
            "ordered_quantity": float(ordered_quantity),
            "fulfilled_quantity": float(eopa_quantity),
            "unit": unit
        })
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_GENERATED_SINGLE",
        "po_id": po.id,
        "po_number": po_number,
        "po_type": po_type,
        "vendor_id": vendor_id,
        "eopa_id": eopa_id,
        "items_count": len(items_data),
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Successfully generated {po_type} PO {po_number} for vendor {vendor.vendor_name}",
        "data": {
            "mode": "create",
            "po_id": po.id,
            "po_number": po_number,
            "po_type": po_type,
            "vendor_name": vendor.vendor_name,
            "items": items_data
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/{po_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def delete_po(
    po_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single Purchase Order"""
    from app.models.invoice import VendorInvoice
    
    # Fetch PO
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise AppException("Purchase Order not found", "ERR_NOT_FOUND", 404)
    
    po_number = po.po_number
    po_type = po.po_type
    
    # Check if PO has any invoices
    invoice_count = db.query(VendorInvoice).filter(VendorInvoice.po_id == po_id).count()
    
    if invoice_count > 0:
        raise AppException(
            f"Cannot delete PO {po_number}. It has {invoice_count} invoice(s) associated with it. Please delete or reassign invoices first.",
            "ERR_PO_HAS_INVOICES",
            400
        )
    
    # Delete PO (cascade should handle items)
    db.delete(po)
    db.commit()
    
    logger.info({
        "event": "PO_DELETED",
        "po_id": po_id,
        "po_number": po_number,
        "po_type": po_type,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Purchase Order {po_number} deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/{po_id}/items/{item_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def delete_po_item(
    po_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single PO line item"""
    # Fetch PO item
    po_item = db.query(POItem).filter(
        POItem.id == item_id,
        POItem.po_id == po_id
    ).first()
    
    if not po_item:
        raise AppException("PO item not found", "ERR_NOT_FOUND", 404)
    
    # Check if PO is closed
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if po and po.status == POStatus.CLOSED:
        raise AppException("Cannot delete items from a closed PO", "ERR_VALIDATION", 400)
    
    item_description = (
        po_item.medicine.medicine_name if po_item.medicine else
        po_item.raw_material.rm_name if po_item.raw_material else
        po_item.packing_material.pm_name if po_item.packing_material else
        "Unknown Item"
    )
    
    # Delete the item
    db.delete(po_item)
    db.commit()
    
    logger.info({
        "event": "PO_ITEM_DELETED",
        "po_id": po_id,
        "item_id": item_id,
        "item_description": item_description,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"PO item '{item_description}' deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/by-eopa/{eopa_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def delete_pos_by_eopa(
    eopa_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all Purchase Orders generated from a specific EOPA"""
    from app.models.eopa import EOPA
    from app.models.invoice import VendorInvoice
    
    # Verify EOPA exists
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    # Fetch POs linked to this EOPA
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.eopa_id == eopa_id).all()
    
    if not pos:
        return {
            "success": True,
            "message": f"No Purchase Orders found for EOPA {eopa.eopa_number}",
            "data": {"deleted_count": 0},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    # Check if any PO has invoices
    po_ids = [po.id for po in pos]
    invoices = db.query(VendorInvoice).filter(VendorInvoice.po_id.in_(po_ids)).all()
    
    if invoices:
        pos_with_invoices = list(set([inv.purchase_order.po_number for inv in invoices]))
        raise AppException(
            f"Cannot delete POs. The following POs have invoices: {', '.join(pos_with_invoices)}. Please delete or reassign invoices first.",
            "ERR_POS_HAVE_INVOICES",
            400
        )
    
    deleted_count = len(pos)
    po_numbers = [po.po_number for po in pos]
    
    # Delete all POs and their items (cascade should handle items)
    for po in pos:
        db.delete(po)
    
    db.commit()
    
    logger.info({
        "event": "POS_DELETED_BULK",
        "eopa_id": eopa_id,
        "eopa_number": eopa.eopa_number,
        "deleted_count": deleted_count,
        "po_numbers": po_numbers,
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Successfully deleted {deleted_count} Purchase Order(s) for EOPA {eopa.eopa_number}",
        "data": {
            "deleted_count": deleted_count,
            "po_numbers": po_numbers
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
