"""
Unit Tests for Material Balance Logic
Tests: Material balance tracking, vendor-wise balance, invoice deduction
"""
import pytest
from datetime import date
from decimal import Decimal

from app.models.material import MaterialBalance


class TestMaterialBalanceTracking:
    """Test material balance initialization and tracking"""
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Material balance endpoints not implemented")
    def test_material_balance_creation(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test creating material balance record"""
        payload = {
            "vendor_id": manufacturer_vendor.id,
            "medicine_id": medicine_paracetamol.id,
            "balance_quantity": 0.0,
            "unit": "UNITS"
        }
        
        response = test_client.post("/api/material-balance/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["vendor_id"] == manufacturer_vendor.id
        assert data["medicine_id"] == medicine_paracetamol.id
        assert data["balance_quantity"] == 0.0
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Material balance endpoints not implemented")
    def test_material_balance_unique_constraint(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol, test_db):
        """Test unique constraint on (vendor_id, medicine_id)"""
        # Create first balance
        balance1 = MaterialBalance(
            vendor_id=manufacturer_vendor.id,
            medicine_id=medicine_paracetamol.id,
            balance_quantity=0.0
        )
        test_db.add(balance1)
        test_db.commit()
        
        # Try to create duplicate
        payload = {
            "vendor_id": manufacturer_vendor.id,
            "medicine_id": medicine_paracetamol.id,
            "balance_quantity": 100.0
        }
        
        response = test_client.post("/api/material-balance/", json=payload, headers=admin_headers)
        
        # Should fail due to unique constraint
        assert response.status_code in [400, 409]


class TestRMInvoiceBalanceUpdate:
    """Test RM invoice increases material balance"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    @pytest.mark.skip(reason="Material balance logic not fully implemented")
    def test_rm_invoice_increases_balance(self, test_client, admin_headers, rm_vendor, medicine_paracetamol, test_db):
        """Test RM invoice receipt increases manufacturer material balance"""
        # Create RM PO
        rm_po_payload = {
            "vendor_id": rm_vendor.id,
            "po_type": "RM",
            "delivery_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 5000,
                    "unit": "KG"
                }
            ]
        }
        rm_po_response = test_client.post("/api/po/", json=rm_po_payload, headers=admin_headers)
        rm_po_id = rm_po_response.json()["data"]["id"]
        
        # Get initial balance
        balance_response = test_client.get(
            f"/api/material-balance/vendor/{rm_vendor.id}/medicine/{medicine_paracetamol.id}",
            headers=admin_headers
        )
        initial_balance = Decimal("0.0")
        if balance_response.status_code == 200:
            initial_balance = Decimal(str(balance_response.json()["data"]["balance_quantity"]))
        
        # Create RM invoice
        rm_invoice_payload = {
            "po_id": rm_po_id,
            "invoice_number": "INV/RM/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": medicine_paracetamol.id,
            "shipped_quantity": 2000,  # 2000 KG received
            "unit_price": 500.00,
            "total_amount": 1000000.00
        }
        response = test_client.post("/api/invoice/", json=rm_invoice_payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify material balance increased
        balance_response = test_client.get(
            f"/api/material-balance/vendor/{rm_vendor.id}/medicine/{medicine_paracetamol.id}",
            headers=admin_headers
        )
        new_balance = Decimal(str(balance_response.json()["data"]["balance_quantity"]))
        
        assert new_balance == initial_balance + Decimal("2000.0")


class TestPMInvoiceBalanceUpdate:
    """Test PM invoice increases material balance"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    @pytest.mark.skip(reason="Material balance logic not fully implemented")
    def test_pm_invoice_increases_balance(self, test_client, admin_headers, pm_vendor, medicine_paracetamol, test_db):
        """Test PM invoice receipt increases manufacturer material balance"""
        # Create PM PO
        pm_po_payload = {
            "vendor_id": pm_vendor.id,
            "po_type": "PM",
            "delivery_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 10000,
                    "unit": "SHEETS",
                    "language": "EN",
                    "artwork_version": "v1.0"
                }
            ]
        }
        pm_po_response = test_client.post("/api/po/", json=pm_po_payload, headers=admin_headers)
        pm_po_id = pm_po_response.json()["data"]["id"]
        
        # Get initial balance
        balance_response = test_client.get(
            f"/api/material-balance/vendor/{pm_vendor.id}/medicine/{medicine_paracetamol.id}",
            headers=admin_headers
        )
        initial_balance = Decimal("0.0")
        if balance_response.status_code == 200:
            initial_balance = Decimal(str(balance_response.json()["data"]["balance_quantity"]))
        
        # Create PM invoice
        pm_invoice_payload = {
            "po_id": pm_po_id,
            "invoice_number": "INV/PM/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": medicine_paracetamol.id,
            "shipped_quantity": 5000,  # 5000 sheets received
            "unit_price": 10.00,
            "total_amount": 50000.00
        }
        response = test_client.post("/api/invoice/", json=pm_invoice_payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify material balance increased
        balance_response = test_client.get(
            f"/api/material-balance/vendor/{pm_vendor.id}/medicine/{medicine_paracetamol.id}",
            headers=admin_headers
        )
        new_balance = Decimal(str(balance_response.json()["data"]["balance_quantity"]))
        
        assert new_balance == initial_balance + Decimal("5000.0")


class TestFGInvoiceBalanceDeduction:
    """Test FG invoice decreases material balance"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.workflow
    @pytest.mark.skip(reason="Material balance logic not fully implemented")
    def test_fg_invoice_decreases_balance(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol, test_db):
        """Test FG invoice dispatch decreases manufacturer material balance"""
        # Initialize balance with some quantity
        initial_balance_qty = 5000.0
        balance_payload = {
            "vendor_id": manufacturer_vendor.id,
            "medicine_id": medicine_paracetamol.id,
            "balance_quantity": initial_balance_qty,
            "unit": "UNITS"
        }
        test_client.post("/api/material-balance/", json=balance_payload, headers=admin_headers)
        
        # Create FG PO
        fg_po_payload = {
            "vendor_id": manufacturer_vendor.id,
            "po_type": "FG",
            "delivery_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 2000,
                    "unit": "UNITS"
                }
            ]
        }
        fg_po_response = test_client.post("/api/po/", json=fg_po_payload, headers=admin_headers)
        fg_po_id = fg_po_response.json()["data"]["id"]
        
        # Create FG invoice (dispatch)
        fg_invoice_payload = {
            "po_id": fg_po_id,
            "invoice_number": "INV/FG/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": medicine_paracetamol.id,
            "shipped_quantity": 1000,  # 1000 units dispatched
            "unit_price": 50.00,
            "total_amount": 50000.00
        }
        response = test_client.post("/api/invoice/", json=fg_invoice_payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify material balance decreased
        balance_response = test_client.get(
            f"/api/material-balance/vendor/{manufacturer_vendor.id}/medicine/{medicine_paracetamol.id}",
            headers=admin_headers
        )
        new_balance = Decimal(str(balance_response.json()["data"]["balance_quantity"]))
        
        assert new_balance == Decimal(str(initial_balance_qty)) - Decimal("1000.0")


class TestMaterialBalanceValidation:
    """Test material balance validation rules"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="Material balance validation not implemented")
    def test_cannot_dispatch_more_than_balance(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test FG invoice fails if shipped_quantity > material_balance"""
        # Set low balance
        balance_payload = {
            "vendor_id": manufacturer_vendor.id,
            "medicine_id": medicine_paracetamol.id,
            "balance_quantity": 500.0,  # Only 500 units available
            "unit": "UNITS"
        }
        test_client.post("/api/material-balance/", json=balance_payload, headers=admin_headers)
        
        # Create FG PO
        fg_po_payload = {
            "vendor_id": manufacturer_vendor.id,
            "po_type": "FG",
            "delivery_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 2000,
                    "unit": "UNITS"
                }
            ]
        }
        fg_po_response = test_client.post("/api/po/", json=fg_po_payload, headers=admin_headers)
        fg_po_id = fg_po_response.json()["data"]["id"]
        
        # Try to dispatch more than balance
        fg_invoice_payload = {
            "po_id": fg_po_id,
            "invoice_number": "INV/FG/OVER/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": medicine_paracetamol.id,
            "shipped_quantity": 1000,  # Exceeds balance of 500
            "unit_price": 50.00,
            "total_amount": 50000.00
        }
        
        response = test_client.post("/api/invoice/", json=fg_invoice_payload, headers=admin_headers)
        
        # Should fail validation
        assert response.status_code in [400, 422]


class TestMaterialBalanceReports:
    """Test material balance reporting"""
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Report endpoints not implemented")
    def test_vendor_wise_balance_report(self, test_client, admin_headers):
        """Test vendor-wise material balance summary"""
        response = test_client.get("/api/material-balance/vendor-summary", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should contain vendor-wise breakdown
        assert isinstance(data, list)
        for vendor_entry in data:
            assert "vendor_id" in vendor_entry
            assert "vendor_name" in vendor_entry
            assert "medicines" in vendor_entry
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Report endpoints not implemented")
    def test_medicine_wise_balance_report(self, test_client, admin_headers):
        """Test medicine-wise material balance across vendors"""
        response = test_client.get("/api/material-balance/medicine-summary", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should contain medicine-wise breakdown
        assert isinstance(data, list)
        for medicine_entry in data:
            assert "medicine_id" in medicine_entry
            assert "medicine_name" in medicine_entry
            assert "total_balance" in medicine_entry
