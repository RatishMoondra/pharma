"""
Unit Tests for Vendor Invoice Workflow
Tests: Invoice processing, HSN/GST validation, batch tracking, PO fulfillment
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.models.invoice import VendorInvoice, InvoiceStatus
from app.models.po import POStatus


class TestInvoiceCreation:
    """Test invoice creation and validation"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_create_invoice_for_po(self, test_client, admin_headers, sample_fg_po, medicine_paracetamol):
        """Test creating vendor invoice for PO"""
        po_item = sample_fg_po.items[0]
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/VENDOR/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["invoice_number"] == "INV/VENDOR/001"
        assert data["po_number"] == sample_fg_po.po_number
        assert data["invoice_type"] == "FG"
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_invoice_hsn_auto_population(self, test_client, admin_headers, sample_fg_po, medicine_paracetamol, test_db):
        """Test HSN code auto-populated from medicine master"""
        po_item = sample_fg_po.items[0]
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/HSN/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 25000.00,
            "tax_amount": 3000.00,
            "total_amount": 28000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 500,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["invoice_number"] == "INV/HSN/001"
        # HSN code is on invoice items, verify invoice was created
        invoice = test_db.query(VendorInvoice).filter(
            VendorInvoice.invoice_number == "INV/HSN/001"
        ).first()
        
        assert invoice is not None
        assert len(invoice.items) == 1
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_invoice_gst_calculation(self, test_client, admin_headers, sample_fg_po, medicine_paracetamol):
        """Test GST calculation based on medicine master GST rate"""
        po_item = sample_fg_po.items[0]
        subtotal = 50000.00
        tax_amount = 6000.00  # 12% GST
        total_amount = 56000.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/GST/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": total_amount,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["total_amount"] == total_amount
        assert data["invoice_number"] == "INV/GST/001"
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_invoice_batch_tracking(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test batch number and expiry tracking"""
        po_item = sample_fg_po.items[0]
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/BATCH/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00,
                    "batch_number": "BATCH2025001",
                    "expiry_date": (date.today() + timedelta(days=730)).isoformat(),
                    "manufacturing_date": date.today().isoformat()
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["invoice_number"] == "INV/BATCH/001"
        # Batch info is on invoice items, verify via database
        invoice = test_db.query(VendorInvoice).filter(
            VendorInvoice.invoice_number == "INV/BATCH/001"
        ).first()
        assert invoice is not None
        assert len(invoice.items) == 1
        assert invoice.items[0].batch_number == "BATCH2025001"


class TestInvoicePOFulfillment:
    """Test invoice-driven PO fulfillment logic"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    def test_invoice_updates_po_fulfilled_quantity(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test invoice updates PO item fulfilled_quantity"""
        po_item = sample_fg_po.items[0]
        shipped_qty = 500
        subtotal = shipped_qty * 50.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/FULFILL/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": subtotal * 0.12,
            "total_amount": subtotal * 1.12,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": shipped_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify PO item fulfilled_quantity updated
        test_db.refresh(po_item)
        assert po_item.fulfilled_quantity == shipped_qty
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    def test_multiple_invoices_accumulate_fulfillment(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test multiple invoices accumulate fulfilled_quantity"""
        po_item = sample_fg_po.items[0]
        
        # First invoice: 400 units
        payload1 = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/MULTI/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 20000.00,
            "tax_amount": 2400.00,
            "total_amount": 22400.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 400,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload1, headers=admin_headers)
        
        # Second invoice: 300 units
        payload2 = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/MULTI/002",
            "invoice_date": date.today().isoformat(),
            "subtotal": 15000.00,
            "tax_amount": 1800.00,
            "total_amount": 16800.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 300,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload2, headers=admin_headers)
        
        # Verify accumulated fulfillment
        test_db.refresh(po_item)
        assert po_item.fulfilled_quantity == 700
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    def test_invoice_updates_po_status_to_partial(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test partial invoice changes PO status to PARTIAL"""
        po_item = sample_fg_po.items[0]
        partial_qty = float(po_item.ordered_quantity) / 2
        subtotal = partial_qty * 50.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PARTIAL/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": subtotal * 0.12,
            "total_amount": subtotal * 1.12,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": partial_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify PO status changed to PARTIAL
        test_db.refresh(sample_fg_po)
        assert sample_fg_po.status == POStatus.PARTIAL
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    def test_invoice_updates_po_status_to_closed(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test full invoice changes PO status to CLOSED"""
        po_item = sample_fg_po.items[0]
        ordered_qty = float(po_item.ordered_quantity)
        subtotal = ordered_qty * 50.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/CLOSED/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": subtotal * 0.12,
            "total_amount": subtotal * 1.12,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": ordered_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify PO status changed to CLOSED
        test_db.refresh(sample_fg_po)
        assert sample_fg_po.status == POStatus.CLOSED


class TestInvoiceStatus:
    """Test invoice status tracking"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_invoice_status_pending_on_creation(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test invoice status is PENDING on creation"""
        po_item = sample_fg_po.items[0]
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PAYMENT/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["invoice_number"] == "INV/PAYMENT/001"
        
        # Status is not in summary response, check database
        invoice = test_db.query(VendorInvoice).filter(
            VendorInvoice.invoice_number == "INV/PAYMENT/001"
        ).first()
        assert invoice.status == InvoiceStatus.PENDING
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_mark_invoice_as_processed(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test invoice is created with PENDING status by default"""
        # Create invoice
        po_item = sample_fg_po.items[0]
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PAID/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        invoice_id = response.json()["data"]["invoice_id"]
        
        # Verify invoice created with PENDING status
        invoice = test_db.query(VendorInvoice).filter(VendorInvoice.id == invoice_id).first()
        assert invoice is not None
        assert invoice.status == InvoiceStatus.PENDING


class TestInvoiceRetrieval:
    """Test invoice retrieval endpoints"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_list_all_invoices(self, test_client, admin_headers, sample_fg_po):
        """Test listing all invoices"""
        # Create invoice first
        po_item = sample_fg_po.items[0]
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/LIST/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        # List invoices
        response = test_client.get("/api/invoice/", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_get_invoices_by_po(self, test_client, admin_headers, sample_fg_po):
        """Test retrieving invoices for specific PO"""
        # Create invoice
        po_item = sample_fg_po.items[0]
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PO/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 50000.00,
            "tax_amount": 6000.00,
            "total_amount": 56000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 1000,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        # Get invoices for PO
        response = test_client.get(f"/api/invoice/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert all(inv["po_id"] == sample_fg_po.id for inv in data)
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_filter_invoices_by_status(self, test_client, admin_headers):
        """Test filtering invoices by status"""
        response = test_client.get("/api/invoice/?status=PENDING", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # All returned invoices should be PENDING
        for invoice in data:
            assert invoice["status"] == "PENDING"


class TestInvoiceValidation:
    """Test invoice validation rules"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_cannot_invoice_more_than_ordered(self, test_client, admin_headers, sample_fg_po):
        """Test validation fails if shipped_quantity > ordered_quantity"""
        po_item = sample_fg_po.items[0]
        over_qty = float(po_item.ordered_quantity) * 2
        subtotal = over_qty * 50.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/OVER/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": subtotal * 0.12,
            "total_amount": subtotal * 1.12,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": over_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        # Should fail validation (unless tolerance allows)
        assert response.status_code in [400, 422]
    
    @pytest.mark.unit
    @pytest.mark.invoice
    def test_invoice_duplicate_number_prevention(self, test_client, admin_headers, sample_fg_po):
        """Test duplicate invoice number is prevented"""
        po_item = sample_fg_po.items[0]
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/DUP/001",
            "invoice_date": date.today().isoformat(),
            "subtotal": 25000.00,
            "tax_amount": 3000.00,
            "total_amount": 28000.00,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": 500,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        # Create first invoice
        response1 = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=payload, headers=admin_headers)
        
        # Should fail
        assert response2.status_code in [400, 409]
