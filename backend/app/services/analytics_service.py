"""
Analytics Service - Business Intelligence & Insights

Features:
1. Invoice-PO matching with visual indicators
2. Quantity discrepancy tracking
3. Vendor performance ratings
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any
import logging

from app.models.po import PurchaseOrder, POItem, POStatus
from app.models.invoice import VendorInvoice, VendorInvoiceItem, InvoiceStatus
from app.models.vendor import Vendor
from app.models.eopa import EOPA

logger = logging.getLogger("pharma")


class AnalyticsService:
    """Analytics and Business Intelligence Service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_invoice_po_matching_status(self) -> List[Dict[str, Any]]:
        """
        Auto-match invoices to POs with visual indicators.
        
        Returns:
        - ✓ matched: Invoice quantities match PO perfectly
        - ⚠ partial: Some items matched, some don't
        - ✗ mismatch: Significant discrepancies
        """
        invoices = self.db.query(VendorInvoice).options(
            joinedload(VendorInvoice.items).joinedload(VendorInvoiceItem.medicine),
            joinedload(VendorInvoice.purchase_order).joinedload(PurchaseOrder.items),
            joinedload(VendorInvoice.vendor)
        ).all()
        
        results = []
        
        for invoice in invoices:
            po = invoice.purchase_order
            if not po:
                continue
            
            # Create mapping of medicine_id to quantities
            po_items_map = {item.medicine_id: float(item.ordered_quantity) for item in po.items}
            invoice_items_map = {item.medicine_id: float(item.shipped_quantity) for item in invoice.items}
            
            total_matches = 0
            total_mismatches = 0
            total_items = len(invoice.items)
            discrepancies = []
            
            for inv_item in invoice.items:
                medicine_id = inv_item.medicine_id
                shipped_qty = float(inv_item.shipped_quantity)
                ordered_qty = po_items_map.get(medicine_id, 0)
                
                if ordered_qty == 0:
                    # Item in invoice but not in PO
                    total_mismatches += 1
                    discrepancies.append({
                        'medicine': inv_item.medicine.medicine_name if inv_item.medicine else 'Unknown',
                        'type': 'extra_item',
                        'shipped': shipped_qty,
                        'ordered': 0,
                        'variance': shipped_qty
                    })
                elif abs(shipped_qty - ordered_qty) < 0.01:  # Match (accounting for decimal precision)
                    total_matches += 1
                else:
                    # Quantity mismatch
                    variance = shipped_qty - ordered_qty
                    variance_pct = (variance / ordered_qty * 100) if ordered_qty > 0 else 0
                    
                    total_mismatches += 1
                    discrepancies.append({
                        'medicine': inv_item.medicine.medicine_name if inv_item.medicine else 'Unknown',
                        'type': 'over_shipment' if variance > 0 else 'under_shipment',
                        'shipped': shipped_qty,
                        'ordered': ordered_qty,
                        'variance': variance,
                        'variance_pct': round(variance_pct, 2)
                    })
            
            # Determine overall status
            if total_mismatches == 0:
                status = 'matched'
                icon = '✓'
                color = 'success'
            elif total_matches > 0 and total_mismatches > 0:
                status = 'partial'
                icon = '⚠'
                color = 'warning'
            else:
                status = 'mismatch'
                icon = '✗'
                color = 'error'
            
            results.append({
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'invoice_date': invoice.invoice_date.isoformat(),
                'po_number': po.po_number,
                'vendor_name': invoice.vendor.vendor_name if invoice.vendor else 'N/A',
                'status': status,
                'icon': icon,
                'color': color,
                'total_items': total_items,
                'matched_items': total_matches,
                'mismatched_items': total_mismatches,
                'discrepancies': discrepancies
            })
        
        return results
    
    def get_quantity_discrepancies(self) -> List[Dict[str, Any]]:
        """
        Track quantity discrepancies across all POs and invoices.
        
        Shows:
        - Over-shipments: Vendor sent more than ordered
        - Under-shipments: Vendor sent less than ordered
        - Pending: Not yet shipped
        """
        pos = self.db.query(PurchaseOrder).options(
            joinedload(PurchaseOrder.items).joinedload(POItem.medicine),
            joinedload(PurchaseOrder.vendor),
            joinedload(PurchaseOrder.invoices).joinedload(VendorInvoice.items)
        ).filter(PurchaseOrder.status != POStatus.CLOSED).all()
        
        results = []
        
        for po in pos:
            for po_item in po.items:
                ordered = float(po_item.ordered_quantity)
                fulfilled = float(po_item.fulfilled_quantity)
                pending = ordered - fulfilled
                
                variance = fulfilled - ordered
                variance_pct = (variance / ordered * 100) if ordered > 0 else 0
                
                if abs(variance) > 0.01:  # There's a discrepancy
                    results.append({
                        'po_number': po.po_number,
                        'po_date': po.po_date.isoformat(),
                        'vendor_name': po.vendor.vendor_name if po.vendor else 'N/A',
                        'medicine': po_item.medicine.medicine_name if po_item.medicine else 'Unknown',
                        'ordered_qty': ordered,
                        'fulfilled_qty': fulfilled,
                        'pending_qty': pending,
                        'variance': variance,
                        'variance_pct': round(variance_pct, 2),
                        'status': 'over_shipment' if variance > 0 else 'under_shipment',
                        'severity': 'high' if abs(variance_pct) > 10 else 'medium' if abs(variance_pct) > 5 else 'low'
                    })
        
        return sorted(results, key=lambda x: abs(x['variance_pct']), reverse=True)
    
    def get_vendor_performance_ratings(self) -> List[Dict[str, Any]]:
        """
        Calculate vendor performance ratings.
        
        Criteria:
        - On-time delivery (comparing invoice date to expected delivery)
        - Quantity accuracy (how often they ship exact quantities)
        - Response time (avg days from PO to invoice)
        
        Ratings:
        - 🟢 Excellent (90-100%): Green
        - 🟡 Average (70-89%): Yellow
        - 🔴 Poor (<70%): Red
        """
        vendors = self.db.query(Vendor).options(
            joinedload(Vendor.purchase_orders).joinedload(PurchaseOrder.invoices)
        ).all()
        
        results = []
        
        for vendor in vendors:
            total_pos = len(vendor.purchase_orders)
            if total_pos == 0:
                continue
            
            # Calculate metrics
            total_invoices = 0
            on_time_count = 0
            exact_quantity_count = 0
            total_response_days = 0
            
            for po in vendor.purchase_orders:
                for invoice in po.invoices:
                    total_invoices += 1
                    
                    # On-time delivery check
                    if po.delivery_date and invoice.invoice_date <= po.delivery_date:
                        on_time_count += 1
                    
                    # Quantity accuracy check
                    invoice_total = sum(float(item.shipped_quantity) for item in invoice.items)
                    po_total = float(po.total_ordered_qty)
                    if abs(invoice_total - po_total) < 0.01:
                        exact_quantity_count += 1
                    
                    # Response time
                    days_diff = (invoice.invoice_date - po.po_date).days
                    total_response_days += days_diff
            
            if total_invoices == 0:
                continue
            
            # Calculate percentages
            on_time_pct = (on_time_count / total_invoices * 100) if total_invoices > 0 else 0
            quantity_accuracy_pct = (exact_quantity_count / total_invoices * 100) if total_invoices > 0 else 0
            avg_response_days = total_response_days / total_invoices if total_invoices > 0 else 0
            
            # Overall score (weighted average)
            overall_score = (on_time_pct * 0.4) + (quantity_accuracy_pct * 0.4) + (min(100, max(0, 100 - avg_response_days)) * 0.2)
            
            # Determine rating
            if overall_score >= 90:
                rating = 'Excellent'
                icon = '🟢'
                color = 'success'
            elif overall_score >= 70:
                rating = 'Average'
                icon = '🟡'
                color = 'warning'
            else:
                rating = 'Poor'
                icon = '🔴'
                color = 'error'
            
            results.append({
                'vendor_id': vendor.id,
                'vendor_name': vendor.vendor_name,
                'vendor_code': vendor.vendor_code,
                'vendor_type': vendor.vendor_type,
                'total_pos': total_pos,
                'total_invoices': total_invoices,
                'on_time_pct': round(on_time_pct, 1),
                'quantity_accuracy_pct': round(quantity_accuracy_pct, 1),
                'avg_response_days': round(avg_response_days, 1),
                'overall_score': round(overall_score, 1),
                'rating': rating,
                'icon': icon,
                'color': color
            })
        
        return sorted(results, key=lambda x: x['overall_score'], reverse=True)
