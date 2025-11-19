
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging
import time
from typing import List

from app.database.session import get_db
from app.schemas.po import POCreate, POResponse
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
    
    Payload:
    {
        "eopa_id": int,
        "vendor_id": int,
        "po_type": "RM" | "PM" | "FG",
        "items": [
            {
                "medicine_id": int,
                "ordered_quantity": float,
                "unit": "kg" | "pcs" | "boxes" | etc.
            }
        ]
    }
    """
    # Local imports to avoid circular references and fix incorrect modules
    from datetime import date, timedelta
    from decimal import Decimal
    from app.models.eopa import EOPA
    from app.models.vendor import Vendor
    from app.models.product import MedicineMaster
    from app.utils.number_generator import generate_po_number
    
    eopa_id = payload.get('eopa_id')
    vendor_id = payload.get('vendor_id')
    po_type = payload.get('po_type')
    items = payload.get('items', [])
    
    if not all([eopa_id, vendor_id, po_type, items]):
        raise AppException("Missing required fields: eopa_id, vendor_id, po_type, items", "ERR_VALIDATION", 400)
    
    # Validate EOPA
    eopa = db.query(EOPA).filter(EOPA.id == eopa_id).first()
    if not eopa:
        raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
    
    if eopa.status != "APPROVED":
        raise AppException("EOPA must be APPROVED to generate POs", "ERR_EOPA_NOT_APPROVED", 400)
    
    # Validate vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise AppException("Vendor not found", "ERR_NOT_FOUND", 404)
    
    # Generate PO number
    po_number = generate_po_number(db, po_type)
    
    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        po_date=date.today(),
        po_type=po_type,
        eopa_id=eopa_id,
        vendor_id=vendor_id,
        delivery_date=date.today() + timedelta(days=30),  # Default 30 days
        status="OPEN",
        created_by=current_user.id
    )
    
    db.add(po)
    db.flush()
    
    # Create PO items
    for item in items:
        medicine_id = item.get('medicine_id')
        ordered_quantity = item.get('ordered_quantity')
        unit = item.get('unit', 'pcs')
        
        if not medicine_id or not ordered_quantity:
            continue
        
        medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
        if not medicine:
            continue
        
        po_item = POItem(
            po_id=po.id,
            medicine_id=medicine_id,
            ordered_quantity=Decimal(str(ordered_quantity)),
            fulfilled_quantity=Decimal('0'),
            unit=unit
        )
        db.add(po_item)
    
    db.commit()
    db.refresh(po)
    
    logger.info({
        "event": "PO_GENERATED_SINGLE",
        "po_id": po.id,
        "po_number": po_number,
        "po_type": po_type,
        "vendor_id": vendor_id,
        "eopa_id": eopa_id,
        "items_count": len(items),
        "user": current_user.username
    })
    
    return {
        "success": True,
        "message": f"Successfully generated {po_type} PO {po_number} for vendor {vendor.vendor_name}",
        "data": {
            "po_id": po.id,
            "po_number": po_number,
            "po_type": po_type,
            "vendor_name": vendor.vendor_name
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
