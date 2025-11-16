"""
Invoice Router - API Endpoints for Vendor Tax Invoice Processing

Endpoints:
- POST /invoice/vendor/{po_id} - Process vendor invoice (RM/PM/FG)
- GET /invoice/po/{po_id} - Get all invoices for a PO
- GET /invoice/{invoice_number} - Get invoice by number
- GET /invoice/{invoice_id}/download-pdf - Generate and download invoice PDF
"""
from fastapi import APIRouter, Depends, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
import logging

from app.database.session import get_db
from app.schemas.invoice import InvoiceCreate, InvoiceResponse
from app.services.invoice_service import InvoiceService
from app.services.invoice_pdf_service import InvoicePDFService
from app.models.user import User, UserRole
from app.models.invoice import VendorInvoice, VendorInvoiceItem
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post(
    "/vendor/{po_id}",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.WAREHOUSE_MANAGER]))]
)
async def process_vendor_invoice(
    po_id: int = Path(description="Purchase Order ID"),
    invoice_data: InvoiceCreate = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process a vendor tax invoice (RM, PM, or FG).
    
    This endpoint:
    1. Records the actual pricing from vendor
    2. Updates PO fulfillment quantities
    3. Updates PO status (OPEN → PARTIAL → CLOSED)
    4. For RM/PM: Updates manufacturer's material balance
    
    Business Rules:
    - POs contain only quantities
    - Invoices provide actual pricing (source of truth)
    - Invoice receipt drives PO fulfillment
    - RM/PM invoices update manufacturer stock
    """
    service = InvoiceService(db)
    result = service.process_vendor_invoice(po_id, invoice_data, current_user.id)
    
    return {
        "success": True,
        "message": f"Invoice {invoice_data.invoice_number} processed successfully",
        "data": result
    }


@router.get(
    "/po/{po_id}",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.WAREHOUSE_MANAGER, UserRole.ACCOUNTANT]))]
)
async def get_po_invoices(
    po_id: int = Path(description="Purchase Order ID"),
    db: Session = Depends(get_db)
):
    """
    Get all invoices for a Purchase Order.
    
    Returns:
        List of invoices with line items and pricing details
    """
    service = InvoiceService(db)
    invoices = service.get_po_invoices(po_id)
    
    return {
        "success": True,
        "data": [InvoiceResponse.model_validate(inv).model_dump() for inv in invoices]
    }


@router.get(
    "/number/{invoice_number}",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.WAREHOUSE_MANAGER, UserRole.ACCOUNTANT]))]
)
async def get_invoice_by_number(
    invoice_number: str = Path(description="Invoice Number"),
    db: Session = Depends(get_db)
):
    """
    Get invoice details by invoice number.
    
    Returns:
        Invoice with PO details, vendor info, and line items
    """
    service = InvoiceService(db)
    invoice = service.get_invoice_by_number(invoice_number)
    
    return {
        "success": True,
        "data": InvoiceResponse.model_validate(invoice).model_dump()
    }


@router.get(
    "/",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.ACCOUNTANT]))]
)
async def get_all_invoices(
    db: Session = Depends(get_db)
):
    """
    Get all vendor invoices with PO and vendor details.
    
    Returns:
        List of all invoices with line items, PO info, and vendor details
    """
    service = InvoiceService(db)
    invoices = service.get_all_invoices()
    
    return {
        "success": True,
        "data": [InvoiceResponse.model_validate(inv).model_dump() for inv in invoices]
    }


@router.put(
    "/{invoice_id}",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))]
)
async def update_invoice(
    invoice_id: int = Path(description="Invoice ID"),
    invoice_data: InvoiceCreate = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing invoice.
    Only PENDING invoices can be updated.
    """
    service = InvoiceService(db)
    result = service.update_invoice(invoice_id, invoice_data, current_user.id)
    
    return {
        "success": True,
        "message": f"Invoice {invoice_data.invoice_number} updated successfully",
        "data": result
    }


@router.delete(
    "/{invoice_id}",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN]))]
)
async def delete_invoice(
    invoice_id: int = Path(description="Invoice ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an invoice.
    Only ADMIN can delete invoices.
    """
    service = InvoiceService(db)
    service.delete_invoice(invoice_id, current_user.id)
    
    return {
        "success": True,
        "message": "Invoice deleted successfully"
    }


@router.post(
    "/{invoice_id}/process",
    response_model=dict,
    dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))]
)
async def process_invoice(
    invoice_id: int = Path(description="Invoice ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark invoice as PROCESSED.
    Once processed, invoice cannot be edited.
    """
    service = InvoiceService(db)
    result = service.process_invoice(invoice_id, current_user.id)
    
    return {
        "success": True,
        "message": "Invoice processed successfully",
        "data": result
    }


@router.get("/{invoice_id}/download-pdf", dependencies=[Depends(get_current_user)])
async def download_invoice_pdf(
    invoice_id: int = Path(description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate and download Invoice PDF.
    
    Returns PDF file with professional letterhead and formatting.
    Includes batch tracking, GST details, and dispatch info (for FG invoices).
    """
    # Get Invoice with all relationships
    invoice = db.query(VendorInvoice).options(
        joinedload(VendorInvoice.vendor),
        joinedload(VendorInvoice.purchase_order),
        joinedload(VendorInvoice.items).joinedload(VendorInvoiceItem.medicine)
    ).filter(VendorInvoice.id == invoice_id).first()
    
    if not invoice:
        raise AppException("Invoice not found", "ERR_NOT_FOUND", 404)
    
    try:
        pdf_service = InvoicePDFService(db)  # Pass db session for config access
        pdf_buffer = pdf_service.generate_invoice_pdf(invoice)
        
        logger.info({
            "event": "INVOICE_PDF_GENERATED",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "user": current_user.username
        })
        
        # Clean filename (remove special characters)
        filename = invoice.invoice_number.replace('/', '_')
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}.pdf"
            }
        )
    
    except Exception as e:
        logger.error({
            "event": "INVOICE_PDF_GENERATION_ERROR",
            "invoice_id": invoice_id,
            "error": str(e),
            "user": current_user.username
        })
        raise AppException(
            f"Failed to generate PDF: {str(e)}",
            "ERR_PDF_GENERATION",
            500
        )
