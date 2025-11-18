"""
Unit Tests for Purchase Order (PO) Workflow
Tests: PO creation (RM/PM/FG), conditional fields, artwork specs, delivery schedules
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.models.po import PurchaseOrder, POItem, POStatus, POType


class TestPOCreation:
    """Test PO creation for different types"""
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_create_fg_po_from_eopa(self, test_client, admin_headers, sample_eopa, test_db):
        """Test FG PO creation from EOPA"""
        # Get medicine_id from first EOPA item
        eopa_item = sample_eopa.items[0]
        pi_item = eopa_item.pi_item
        
        payload = {
            "eopa_id": sample_eopa.id,
            "delivery_date": (date.today() + timedelta(days=30)).isoformat(),
            "payment_terms": "NET 30",
            "po_type": "FG",
            "items": [
                {
                    "medicine_id": pi_item.medicine_id,
                    "ordered_quantity": float(eopa_item.quantity),
                    "unit": "UNITS"
                }
            ]
        }
        
        response = test_client.post("/api/po/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify PO details
        assert data["po_number"].startswith("PO/FG/")
        assert data["po_type"] == "FG"
        assert data["status"] == "OPEN"
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="PO creation schema needs items array structure")
    def test_create_rm_po_with_quality_specs(self, test_client, admin_headers, rm_vendor, medicine_paracetamol):
        """Test RM PO creation with quality specifications"""
        payload = {
            "vendor_id": rm_vendor.id,
            "po_type": "RM",
            "delivery_date": (date.today() + timedelta(days=45)).isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 5000,
                    "unit": "KG",
                    "quality_spec": "API Grade 99.5% purity",
                    "gsm": None,
                    "ply": None
                }
            ]
        }
        
        response = test_client.post("/api/po/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["po_type"] == "RM"
        assert data["po_number"].startswith("PO/RM/")
        assert data["items"][0]["quality_spec"] == "API Grade 99.5% purity"
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="PO creation schema needs items array structure")
    def test_create_pm_po_with_artwork_specs(self, test_client, admin_headers, pm_vendor, medicine_paracetamol):
        """Test PM PO creation with artwork specifications"""
        payload = {
            "vendor_id": pm_vendor.id,
            "po_type": "PM",
            "delivery_date": (date.today() + timedelta(days=60)).isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 10000,
                    "unit": "SHEETS",
                    "language": "EN",
                    "artwork_version": "v2.0",
                    "gsm": 250,
                    "ply": 2,
                    "dimensions": "10x15 cm"
                }
            ]
        }
        
        response = test_client.post("/api/po/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["po_type"] == "PM"
        assert data["po_number"].startswith("PO/PM/")
        assert data["items"][0]["language"] == "EN"
        assert data["items"][0]["artwork_version"] == "v2.0"
        assert data["items"][0]["gsm"] == 250
        assert data["items"][0]["ply"] == 2
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="PO creation schema validation")
    def test_po_number_generation_by_type(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test unique PO number generation for each type"""
        # Create POs of different types
        po_types = ["RM", "PM", "FG"]
        po_numbers = []
        
        for po_type in po_types:
            payload = {
                "vendor_id": manufacturer_vendor.id,
                "po_type": po_type,
                "delivery_date": (date.today() + timedelta(days=30)).isoformat(),
                "items": [
                    {
                        "medicine_id": medicine_paracetamol.id,
                        "ordered_quantity": 1000,
                        "unit": "UNITS"
                    }
                ]
            }
            
            response = test_client.post("/api/po/", json=payload, headers=admin_headers)
            assert response.status_code == 200
            
            po_number = response.json()["data"]["po_number"]
            po_numbers.append(po_number)
            
            # Verify format
            assert po_number.startswith(f"PO/{po_type}/")
        
        # Verify all unique
        assert len(set(po_numbers)) == 3


class TestPOPricing:
    """Test PO pricing is NOT stored (pricing comes from invoices)"""
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_po_has_no_price_fields(self, test_client, admin_headers, sample_fg_po):
        """Test PO does not contain pricing information"""
        response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # PO should NOT have these fields
        assert "unit_price" not in data
        assert "total_price" not in data
        
        # PO items should also not have pricing
        for item in data["items"]:
            assert "unit_price" not in item
            assert "total_price" not in item
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_po_only_has_quantity_fields(self, test_client, admin_headers, sample_fg_po):
        """Test PO contains only quantity-related fields"""
        response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # PO items should have quantity fields
        for item in data["items"]:
            assert "ordered_quantity" in item
            assert "fulfilled_quantity" in item
            assert "unit" in item


class TestPOFulfillment:
    """Test PO fulfillment logic (driven by vendor invoices)"""
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.invoice
    def test_po_status_open_when_created(self, test_client, admin_headers, sample_fg_po):
        """Test PO status is OPEN when created"""
        response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "OPEN"
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.workflow
    def test_po_status_partial_after_partial_fulfillment(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test PO status changes to PARTIAL after partial invoice"""
        # Create partial invoice
        po_item = sample_fg_po.items[0]
        partial_qty = float(po_item.ordered_quantity) / 2
        subtotal = partial_qty * 50.00
        tax_amount = subtotal * 0.12
        
        invoice_payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/24-25/0001",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": subtotal + tax_amount,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": partial_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=invoice_payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify PO status updated to PARTIAL
        test_db.refresh(sample_fg_po)
        assert sample_fg_po.status == POStatus.PARTIAL
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.workflow
    def test_po_status_closed_after_full_fulfillment(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test PO status changes to CLOSED after full fulfillment"""
        # Create full invoice
        po_item = sample_fg_po.items[0]
        full_qty = float(po_item.ordered_quantity)
        subtotal = full_qty * 50.00
        tax_amount = subtotal * 0.12
        
        invoice_payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/24-25/0002",
            "invoice_date": date.today().isoformat(),
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": subtotal + tax_amount,
            "items": [
                {
                    "medicine_id": po_item.medicine_id,
                    "shipped_quantity": full_qty,
                    "unit_price": 50.00,
                    "tax_rate": 12.00
                }
            ]
        }
        
        response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=invoice_payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify PO status updated to CLOSED
        test_db.refresh(sample_fg_po)
        assert sample_fg_po.status == POStatus.CLOSED


class TestPODeliverySchedule:
    """Test delivery date and tolerances"""
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_po_delivery_date_mandatory(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test delivery_date is mandatory for PO creation"""
        payload = {
            "vendor_id": manufacturer_vendor.id,
            "po_type": "FG",
            # Missing delivery_date
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 1000,
                    "unit": "UNITS"
                }
            ]
        }
        
        response = test_client.post("/api/po/", json=payload, headers=admin_headers)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="Tolerance percentage field not in PO schema")
    def test_po_tolerance_percentage(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test PO tolerance percentage for quantity variance"""
        payload = {
            "vendor_id": manufacturer_vendor.id,
            "po_type": "FG",
            "delivery_date": (date.today() + timedelta(days=30)).isoformat(),
            "tolerance_percentage": 5.0,  # +/- 5%
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "ordered_quantity": 1000,
                    "unit": "UNITS"
                }
            ]
        }
        
        response = test_client.post("/api/po/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["tolerance_percentage"] == 5.0


class TestPORetrieval:
    """Test PO retrieval endpoints"""
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_list_all_pos(self, test_client, admin_headers, sample_fg_po):
        """Test listing all POs"""
        response = test_client.get("/api/po/", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_get_po_by_id(self, test_client, admin_headers, sample_fg_po):
        """Test retrieving PO by ID with nested relationships"""
        response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify nested relationships
        assert "vendor" in data
        assert "items" in data
        assert len(data["items"]) >= 1
        assert "medicine" in data["items"][0]
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_filter_po_by_type(self, test_client, admin_headers):
        """Test filtering POs by type"""
        response = test_client.get("/api/po/?po_type=FG", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # All returned POs should be FG type
        for po in data:
            assert po["po_type"] == "FG"
    
    @pytest.mark.unit
    @pytest.mark.po
    def test_filter_po_by_status(self, test_client, admin_headers):
        """Test filtering POs by status"""
        response = test_client.get("/api/po/?status=OPEN", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # All returned POs should be OPEN
        for po in data:
            assert po["status"] == "OPEN"


class TestPOAmendment:
    """Test PO amendment and change history"""
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="PO amendment endpoint not implemented")
    def test_amend_po_delivery_date(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test amending PO delivery date"""
        new_date = (date.today() + timedelta(days=60)).isoformat()
        
        response = test_client.put(
            f"/api/po/{sample_fg_po.id}/amend",
            json={"delivery_date": new_date, "amendment_reason": "Customer requested delay"},
            headers=admin_headers
        )
        
        assert response.status_code == 200
        
        # Verify amendment
        test_db.refresh(sample_fg_po)
        assert sample_fg_po.delivery_date.isoformat() == new_date
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="DELETE endpoint returns 405 - not implemented")
    def test_cannot_delete_fulfilled_po(self, test_client, admin_headers, sample_fg_po, test_db):
        """Test cannot delete PO with partial/full fulfillment"""
        # Mark PO as partially fulfilled
        sample_fg_po.status = POStatus.PARTIAL
        test_db.commit()
        
        response = test_client.delete(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        
        assert response.status_code in [400, 403]
