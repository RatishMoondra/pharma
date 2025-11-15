"""
Invoice Service - Process Vendor Tax Invoices and Update PO Fulfillment

KEY BUSINESS RULES:
1. Invoices are the SOURCE OF TRUTH for pricing
2. Invoice receipt updates PO fulfillment status
3. RM/PM invoices update manufacturer's material balance
4. FG invoices update final shipment records
"""
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List
import logging

from app.models.invoice import VendorInvoice, VendorInvoiceItem, InvoiceType, InvoiceStatus
from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.material import MaterialBalance
from app.models.vendor import Vendor
from app.models.product import MedicineMaster
from app.schemas.invoice import InvoiceCreate
from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


class InvoiceService:
    """Service for processing vendor invoices and updating PO fulfillment"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_vendor_invoice(
        self,
        po_id: int,
        invoice_data: InvoiceCreate,
        current_user_id: int
    ) -> Dict:
        """
        Process a vendor tax invoice (RM, PM, or FG).
        
        Workflow:
        1. Validate PO exists and is open
        2. Create invoice record with actual pricing
        3. Update PO fulfillment quantities
        4. Update PO status (OPEN → PARTIAL → CLOSED)
        5. For RM/PM: Update manufacturer's material balance
        6. Log all operations
        
        Args:
            po_id: Purchase Order ID
            invoice_data: Invoice details from vendor
            current_user_id: User processing the invoice
            
        Returns:
            Dict with invoice details and PO updates
        """
        try:
            # Load PO with all relationships
            po = self.db.query(PurchaseOrder).options(
                joinedload(PurchaseOrder.vendor),
                joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
                joinedload(PurchaseOrder.eopa)
            ).filter(PurchaseOrder.id == po_id).first()
            
            if not po:
                raise AppException(
                    f"Purchase Order {po_id} not found",
                    "ERR_PO_NOT_FOUND",
                    404
                )
            
            # Validate PO is not closed or cancelled
            if po.status == POStatus.CLOSED:
                raise AppException(
                    f"PO {po.po_number} is already closed",
                    "ERR_PO_CLOSED",
                    400
                )
            
            if po.status == POStatus.CANCELLED:
                raise AppException(
                    f"PO {po.po_number} is cancelled",
                    "ERR_PO_CANCELLED",
                    400
                )
            
            # Check for duplicate invoice number
            existing_invoice = self.db.query(VendorInvoice).filter(
                VendorInvoice.invoice_number == invoice_data.invoice_number
            ).first()
            
            if existing_invoice:
                raise AppException(
                    f"Invoice {invoice_data.invoice_number} already exists",
                    "ERR_DUPLICATE_INVOICE",
                    400
                )
            
            # Determine invoice type from PO type
            invoice_type = InvoiceType(po.po_type.value)
            
            # Create invoice
            invoice = VendorInvoice(
                invoice_number=invoice_data.invoice_number,
                invoice_date=invoice_data.invoice_date,
                invoice_type=invoice_type,
                po_id=po.id,
                vendor_id=po.vendor_id,
                subtotal=Decimal(str(invoice_data.subtotal)),
                tax_amount=Decimal(str(invoice_data.tax_amount)),
                total_amount=Decimal(str(invoice_data.total_amount)),
                # FG-specific fields
                dispatch_note_number=invoice_data.dispatch_note_number,
                dispatch_date=invoice_data.dispatch_date,
                warehouse_location=invoice_data.warehouse_location,
                warehouse_received_by=invoice_data.warehouse_received_by,
                status=InvoiceStatus.PENDING,
                remarks=invoice_data.remarks,
                received_by=current_user_id,
                received_at=datetime.utcnow()
            )
            
            self.db.add(invoice)
            self.db.flush()
            
            # Create invoice items and update PO fulfillment
            total_shipped_qty = Decimal("0.00")
            
            for item_data in invoice_data.items:
                # Calculate tax amount for item
                item_subtotal = Decimal(str(item_data.shipped_quantity)) * Decimal(str(item_data.unit_price))
                item_tax = item_subtotal * (Decimal(str(item_data.tax_rate)) / Decimal("100"))
                item_total = item_subtotal + item_tax
                
                # Create invoice item
                invoice_item = VendorInvoiceItem(
                    invoice_id=invoice.id,
                    medicine_id=item_data.medicine_id,
                    shipped_quantity=Decimal(str(item_data.shipped_quantity)),
                    unit_price=Decimal(str(item_data.unit_price)),
                    total_price=item_total,
                    tax_rate=Decimal(str(item_data.tax_rate)),
                    tax_amount=item_tax,
                    batch_number=item_data.batch_number,
                    expiry_date=item_data.expiry_date,
                    remarks=item_data.remarks
                )
                
                self.db.add(invoice_item)
                
                # Update PO item fulfillment
                po_item = next(
                    (pi for pi in po.items if pi.medicine_id == item_data.medicine_id),
                    None
                )
                
                if not po_item:
                    raise AppException(
                        f"Medicine {item_data.medicine_id} not found in PO {po.po_number}",
                        "ERR_MEDICINE_NOT_IN_PO",
                        400
                    )
                
                shipped_qty = Decimal(str(item_data.shipped_quantity))
                po_item.fulfilled_quantity += shipped_qty
                total_shipped_qty += shipped_qty
                
                # Validate not over-shipped
                if po_item.fulfilled_quantity > po_item.ordered_quantity:
                    raise AppException(
                        f"Shipped quantity exceeds ordered quantity for {po_item.medicine.medicine_name}",
                        "ERR_OVERSHIPPED",
                        400
                    )
                
                # Update manufacturer material balance for RM/PM
                if po.po_type in [POType.RM, POType.PM]:
                    self._update_material_balance(item_data.medicine_id, shipped_qty)
            
            # Update PO fulfillment totals
            po.total_fulfilled_qty += total_shipped_qty
            
            # Update PO status based on fulfillment
            if po.total_fulfilled_qty >= po.total_ordered_qty:
                po.status = POStatus.CLOSED
            elif po.total_fulfilled_qty > 0:
                po.status = POStatus.PARTIAL
            
            # Keep invoice as PENDING - it needs to be explicitly processed later
            # This allows editing before final processing
            invoice.status = InvoiceStatus.PENDING
            # invoice.processed_at will be set when explicitly processed
            
            # Commit transaction
            self.db.commit()
            
            logger.info({
                "event": "INVOICE_PROCESSED",
                "invoice_number": invoice.invoice_number,
                "invoice_type": invoice_type.value,
                "po_number": po.po_number,
                "vendor_name": po.vendor.vendor_name,
                "total_amount": float(invoice.total_amount),
                "shipped_qty": float(total_shipped_qty),
                "po_status": po.status.value,
                "processed_by": current_user_id
            })
            
            return {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_type": invoice_type.value,
                "po_number": po.po_number,
                "po_status": po.status.value,
                "total_shipped_qty": float(total_shipped_qty),
                "total_amount": float(invoice.total_amount),
                "items_count": len(invoice_data.items)
            }
            
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error({
                "event": "INVOICE_PROCESSING_FAILED",
                "po_id": po_id,
                "error": str(e)
            })
            raise AppException(
                f"Failed to process invoice: {str(e)}",
                "ERR_INVOICE_PROCESSING",
                500
            )
    
    def _update_material_balance(self, medicine_id: int, quantity: Decimal) -> None:
        """
        Update manufacturer's material balance when RM/PM is received.
        
        Args:
            medicine_id: Medicine ID
            quantity: Quantity received
        """
        balance = self.db.query(MaterialBalance).filter(
            MaterialBalance.medicine_id == medicine_id
        ).first()
        
        if balance:
            balance.available_quantity += quantity
            balance.last_updated = datetime.utcnow()
        else:
            # Create new balance record
            balance = MaterialBalance(
                medicine_id=medicine_id,
                available_quantity=quantity,
                last_updated=datetime.utcnow()
            )
            self.db.add(balance)
        
        logger.info({
            "event": "MATERIAL_BALANCE_UPDATED",
            "medicine_id": medicine_id,
            "quantity_added": float(quantity),
            "new_balance": float(balance.available_quantity)
        })
    
    def get_po_invoices(self, po_id: int) -> List[VendorInvoice]:
        """
        Get all invoices for a Purchase Order.
        
        Args:
            po_id: Purchase Order ID
            
        Returns:
            List of invoices
        """
        invoices = self.db.query(VendorInvoice).options(
            joinedload(VendorInvoice.vendor),
            joinedload(VendorInvoice.items).joinedload(VendorInvoiceItem.medicine)
        ).filter(VendorInvoice.po_id == po_id).all()
        
        return invoices
    
    def get_all_invoices(self) -> List[VendorInvoice]:
        """
        Get all vendor invoices with PO, vendor, and item details.
        
        Returns:
            List of all invoices ordered by received date (newest first)
        """
        invoices = self.db.query(VendorInvoice).options(
            joinedload(VendorInvoice.purchase_order),
            joinedload(VendorInvoice.vendor),
            joinedload(VendorInvoice.items).joinedload(VendorInvoiceItem.medicine)
        ).order_by(VendorInvoice.received_at.desc()).all()
        
        return invoices
    
    def update_invoice(
        self,
        invoice_id: int,
        invoice_data: InvoiceCreate,
        current_user_id: int
    ) -> Dict:
        """
        Update an existing invoice.
        
        Args:
            invoice_id: Invoice ID
            invoice_data: Updated invoice data
            current_user_id: User updating the invoice
            
        Returns:
            Dict with updated invoice details
        """
        try:
            # Load existing invoice
            invoice = self.db.query(VendorInvoice).options(
                joinedload(VendorInvoice.purchase_order),
                joinedload(VendorInvoice.items)
            ).filter(VendorInvoice.id == invoice_id).first()
            
            if not invoice:
                raise AppException(
                    f"Invoice {invoice_id} not found",
                    "ERR_INVOICE_NOT_FOUND",
                    404
                )
            
            # Update invoice fields
            invoice.invoice_number = invoice_data.invoice_number
            invoice.invoice_date = invoice_data.invoice_date
            invoice.subtotal = Decimal(str(invoice_data.subtotal))
            invoice.tax_amount = Decimal(str(invoice_data.tax_amount))
            invoice.total_amount = Decimal(str(invoice_data.total_amount))
            invoice.dispatch_note_number = invoice_data.dispatch_note_number
            invoice.dispatch_date = invoice_data.dispatch_date
            invoice.warehouse_location = invoice_data.warehouse_location
            invoice.warehouse_received_by = invoice_data.warehouse_received_by
            invoice.remarks = invoice_data.remarks
            
            # Delete existing items
            for item in invoice.items:
                self.db.delete(item)
            
            # Add new items
            for item_data in invoice_data.items:
                item_subtotal = Decimal(str(item_data.shipped_quantity)) * Decimal(str(item_data.unit_price))
                item_tax = item_subtotal * (Decimal(str(item_data.tax_rate)) / Decimal("100"))
                item_total = item_subtotal + item_tax
                
                invoice_item = VendorInvoiceItem(
                    invoice_id=invoice.id,
                    medicine_id=item_data.medicine_id,
                    shipped_quantity=Decimal(str(item_data.shipped_quantity)),
                    unit_price=Decimal(str(item_data.unit_price)),
                    total_price=item_total,
                    tax_rate=Decimal(str(item_data.tax_rate)),
                    tax_amount=item_tax,
                    batch_number=item_data.batch_number,
                    expiry_date=item_data.expiry_date,
                    remarks=item_data.remarks
                )
                self.db.add(invoice_item)
            
            self.db.commit()
            
            logger.info({
                "event": "INVOICE_UPDATED",
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "updated_by": current_user_id
            })
            
            return {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "total_amount": float(invoice.total_amount)
            }
            
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error({
                "event": "INVOICE_UPDATE_FAILED",
                "invoice_id": invoice_id,
                "error": str(e)
            })
            raise AppException(
                f"Failed to update invoice: {str(e)}",
                "ERR_INVOICE_UPDATE",
                500
            )
    
    def delete_invoice(
        self,
        invoice_id: int,
        current_user_id: int
    ) -> None:
        """
        Delete an invoice.
        
        Args:
            invoice_id: Invoice ID
            current_user_id: User deleting the invoice
        """
        try:
            invoice = self.db.query(VendorInvoice).filter(
                VendorInvoice.id == invoice_id
            ).first()
            
            if not invoice:
                raise AppException(
                    f"Invoice {invoice_id} not found",
                    "ERR_INVOICE_NOT_FOUND",
                    404
                )
            
            invoice_number = invoice.invoice_number
            
            # Delete invoice (cascade will delete items)
            self.db.delete(invoice)
            self.db.commit()
            
            logger.info({
                "event": "INVOICE_DELETED",
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "deleted_by": current_user_id
            })
            
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error({
                "event": "INVOICE_DELETE_FAILED",
                "invoice_id": invoice_id,
                "error": str(e)
            })
            raise AppException(
                f"Failed to delete invoice: {str(e)}",
                "ERR_INVOICE_DELETE",
                500
            )
    
    def process_invoice(
        self,
        invoice_id: int,
        current_user_id: int
    ) -> Dict:
        """
        Mark invoice as PROCESSED.
        Once processed, invoice cannot be edited.
        
        Args:
            invoice_id: Invoice ID
            current_user_id: User processing the invoice
            
        Returns:
            Dict with processed invoice details
        """
        try:
            invoice = self.db.query(VendorInvoice).filter(
                VendorInvoice.id == invoice_id
            ).first()
            
            if not invoice:
                raise AppException(
                    f"Invoice {invoice_id} not found",
                    "ERR_INVOICE_NOT_FOUND",
                    404
                )
            
            if invoice.status == InvoiceStatus.PROCESSED:
                raise AppException(
                    f"Invoice {invoice.invoice_number} is already processed",
                    "ERR_INVOICE_ALREADY_PROCESSED",
                    400
                )
            
            # Mark as processed
            invoice.status = InvoiceStatus.PROCESSED
            invoice.processed_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info({
                "event": "INVOICE_MARKED_PROCESSED",
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "processed_by": current_user_id
            })
            
            return {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "status": invoice.status.value
            }
            
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error({
                "event": "INVOICE_PROCESS_FAILED",
                "invoice_id": invoice_id,
                "error": str(e)
            })
            raise AppException(
                f"Failed to process invoice: {str(e)}",
                "ERR_INVOICE_PROCESS",
                500
            )
    
    def get_invoice_by_number(self, invoice_number: str) -> VendorInvoice:
        """
        Get invoice by invoice number.
        
        Args:
            invoice_number: Invoice number
            
        Returns:
            Invoice
        """
        invoice = self.db.query(VendorInvoice).options(
            joinedload(VendorInvoice.purchase_order),
            joinedload(VendorInvoice.vendor),
            joinedload(VendorInvoice.items).joinedload(VendorInvoiceItem.medicine)
        ).filter(VendorInvoice.invoice_number == invoice_number).first()
        
        if not invoice:
            raise AppException(
                f"Invoice {invoice_number} not found",
                "ERR_INVOICE_NOT_FOUND",
                404
            )
        
        return invoice
