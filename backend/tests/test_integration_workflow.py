"""
Integration Tests for Full Pharma Workflow
Tests: PI → EOPA → PO → Invoice → GRN → Closure
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.models.pi import PIStatus
from app.models.eopa import EOPAStatus
from app.models.po import POStatus


class TestFullWorkflowPIToGRN:
    """Test complete workflow from PI creation to GRN"""
    
    @pytest.mark.integration
    @pytest.mark.workflow
    @pytest.mark.slow
    @pytest.mark.skip(reason="Complex integration test - needs EOPA and PO endpoints")
    def test_complete_fg_workflow(
        self,
        test_client,
        admin_headers,
        partner_vendor,
        manufacturer_vendor,
        medicine_paracetamol,
        test_db
    ):
        """Test full FG workflow: PI → EOPA → PO → Invoice → GRN"""
        
        # Step 1: Create PI
        pi_payload = {
            "partner_vendor_id": partner_vendor.id,
            "country_id": partner_vendor.country_id,
            "pi_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "quantity": 1000,
                    "unit_price": 50.00,
                    "total_price": 50000.00
                }
            ]
        }
        
        pi_response = test_client.post("/api/pi/", json=pi_payload, headers=admin_headers)
        assert pi_response.status_code == 200
        pi_id = pi_response.json()["data"]["id"]
        
        # Verify PI created with PENDING status
        pi_data = pi_response.json()["data"]
        assert pi_data["status"] == "PENDING"
        assert pi_data["pi_number"].startswith("PI/")
        
        # Step 2: Approve PI (triggers EOPA generation)
        approval_response = test_client.post(
            f"/api/pi/{pi_id}/approve",
            json={"approved": True},
            headers=admin_headers
        )
        assert approval_response.status_code == 200
        
        # Verify PI status changed to APPROVED
        pi_get_response = test_client.get(f"/api/pi/{pi_id}", headers=admin_headers)
        assert pi_get_response.json()["data"]["status"] == "APPROVED"
        
        # Step 3: Verify EOPA created
        eopa_response = test_client.get(f"/api/eopa/pi/{pi_id}", headers=admin_headers)
        assert eopa_response.status_code == 200
        eopas = eopa_response.json()["data"]
        assert len(eopas) >= 1
        
        manufacturer_eopa = next(e for e in eopas if e["vendor_type"] == "MANUFACTURER")
        eopa_id = manufacturer_eopa["id"]
        
        # Step 4: Approve EOPA
        eopa_approval_response = test_client.post(
            f"/api/eopa/{eopa_id}/approve",
            json={"approved": True, "remarks": "Price acceptable"},
            headers=admin_headers
        )
        assert eopa_approval_response.status_code == 200
        
        # Step 5: Generate FG PO from EOPA
        po_payload = {
            "delivery_date": (date.today() + timedelta(days=30)).isoformat(),
            "payment_terms": "NET 30"
        }
        po_response = test_client.post(
            f"/api/eopa/{eopa_id}/generate-po",
            json=po_payload,
            headers=admin_headers
        )
        assert po_response.status_code == 200
        po_id = po_response.json()["data"]["id"]
        
        # Verify PO created with OPEN status
        po_get_response = test_client.get(f"/api/po/{po_id}", headers=admin_headers)
        po_data = po_get_response.json()["data"]
        assert po_data["status"] == "OPEN"
        assert po_data["po_type"] == "FG"
        assert po_data["po_number"].startswith("PO/FG/")
        
        # Step 6: Create vendor invoice (full fulfillment)
        po_item = po_data["items"][0]
        invoice_payload = {
            "po_id": po_id,
            "invoice_number": "INV/VENDOR/FULL/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": po_item["medicine_id"],
            "shipped_quantity": po_item["ordered_quantity"],
            "unit_price": 50.00,
            "total_amount": po_item["ordered_quantity"] * 50.00,
            "batch_number": "BATCH2025001",
            "batch_expiry_date": (date.today() + timedelta(days=730)).isoformat()
        }
        
        invoice_response = test_client.post("/api/invoice/", json=invoice_payload, headers=admin_headers)
        assert invoice_response.status_code == 200
        invoice_id = invoice_response.json()["data"]["id"]
        
        # Verify PO status changed to CLOSED (full fulfillment)
        po_get_response = test_client.get(f"/api/po/{po_id}", headers=admin_headers)
        assert po_get_response.json()["data"]["status"] == "CLOSED"
        
        # Step 7: Create GRN (Goods Receipt Note)
        grn_payload = {
            "po_id": po_id,
            "invoice_id": invoice_id,
            "received_date": date.today().isoformat(),
            "received_quantity": po_item["ordered_quantity"],
            "quality_check_status": "APPROVED",
            "remarks": "All goods received in good condition"
        }
        
        grn_response = test_client.post("/api/grn/", json=grn_payload, headers=admin_headers)
        assert grn_response.status_code == 200
        grn_data = grn_response.json()["data"]
        
        # Verify GRN details
        assert grn_data["po_id"] == po_id
        assert grn_data["quality_check_status"] == "APPROVED"
    
    @pytest.mark.integration
    @pytest.mark.workflow
    def test_partial_fulfillment_workflow(
        self,
        test_client,
        admin_headers,
        sample_fg_po,
        test_db
    ):
        """Test workflow with partial invoice fulfillment"""
        
        po_item = sample_fg_po.items[0]
        partial_qty = float(po_item.ordered_quantity) / 2
        subtotal = partial_qty * 50.00
        tax_amount = subtotal * 0.12
        
        # Step 1: Create first partial invoice (50% fulfillment)
        invoice1_payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PARTIAL/001",
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
        
        invoice1_response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=invoice1_payload, headers=admin_headers)
        assert invoice1_response.status_code == 200
        
        # Verify PO status is PARTIAL
        po_get_response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        assert po_get_response.json()["data"]["status"] == "PARTIAL"
        
        # Verify fulfilled_quantity updated
        po_item_data = po_get_response.json()["data"]["items"][0]
        assert po_item_data["fulfilled_quantity"] == partial_qty
        
        # Step 2: Create second invoice (remaining 50%)
        invoice2_payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/PARTIAL/002",
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
        
        invoice2_response = test_client.post(f"/api/invoice/vendor/{sample_fg_po.id}", json=invoice2_payload, headers=admin_headers)
        assert invoice2_response.status_code == 200
        
        # Verify PO status changed to CLOSED (full fulfillment)
        po_get_response = test_client.get(f"/api/po/{sample_fg_po.id}", headers=admin_headers)
        assert po_get_response.json()["data"]["status"] == "CLOSED"
        
        # Verify total fulfilled_quantity
        po_item_data = po_get_response.json()["data"]["items"][0]
        assert po_item_data["fulfilled_quantity"] == po_item.ordered_quantity


class TestMultiVendorWorkflow:
    """Test workflow with multiple vendor types (RM/PM/FG)"""
    
    @pytest.mark.integration
    @pytest.mark.workflow
    @pytest.mark.slow
    @pytest.mark.skip(reason="Complex multi-vendor workflow - needs full EOPA/PO implementation")
    def test_rm_pm_fg_workflow(
        self,
        test_client,
        admin_headers,
        partner_vendor,
        manufacturer_vendor,
        rm_vendor,
        pm_vendor,
        medicine_paracetamol,
        test_db
    ):
        """Test complete workflow with RM, PM, and FG POs"""
        
        # Step 1: Create PI
        pi_payload = {
            "partner_vendor_id": partner_vendor.id,
            "country_id": partner_vendor.country_id,
            "pi_date": date.today().isoformat(),
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "quantity": 5000,
                    "unit_price": 50.00,
                    "total_price": 250000.00
                }
            ]
        }
        
        pi_response = test_client.post("/api/pi/", json=pi_payload, headers=admin_headers)
        pi_id = pi_response.json()["data"]["id"]
        
        # Step 2: Approve PI
        test_client.post(f"/api/pi/{pi_id}/approve", json={"approved": True}, headers=admin_headers)
        
        # Step 3: Get EOPAs (should have MANUFACTURER, RM, PM)
        eopa_response = test_client.get(f"/api/eopa/pi/{pi_id}", headers=admin_headers)
        eopas = eopa_response.json()["data"]
        
        eopa_ids = {eopa["vendor_type"]: eopa["id"] for eopa in eopas}
        
        # Step 4: Approve all EOPAs
        for vendor_type, eopa_id in eopa_ids.items():
            test_client.post(
                f"/api/eopa/{eopa_id}/approve",
                json={"approved": True},
                headers=admin_headers
            )
        
        # Step 5: Generate RM PO
        rm_po_response = test_client.post(
            f"/api/eopa/{eopa_ids['RM']}/generate-po",
            json={
                "delivery_date": (date.today() + timedelta(days=45)).isoformat(),
                "payment_terms": "NET 45"
            },
            headers=admin_headers
        )
        rm_po_id = rm_po_response.json()["data"]["id"]
        
        # Verify RM PO type
        rm_po_data = test_client.get(f"/api/po/{rm_po_id}", headers=admin_headers).json()["data"]
        assert rm_po_data["po_type"] == "RM"
        assert rm_po_data["po_number"].startswith("PO/RM/")
        
        # Step 6: Generate PM PO
        pm_po_response = test_client.post(
            f"/api/eopa/{eopa_ids['PM']}/generate-po",
            json={
                "delivery_date": (date.today() + timedelta(days=60)).isoformat(),
                "language": "EN",
                "artwork_version": "v2.0"
            },
            headers=admin_headers
        )
        pm_po_id = pm_po_response.json()["data"]["id"]
        
        # Verify PM PO type
        pm_po_data = test_client.get(f"/api/po/{pm_po_id}", headers=admin_headers).json()["data"]
        assert pm_po_data["po_type"] == "PM"
        assert pm_po_data["po_number"].startswith("PO/PM/")
        
        # Step 7: Generate FG PO
        fg_po_response = test_client.post(
            f"/api/eopa/{eopa_ids['MANUFACTURER']}/generate-po",
            json={
                "delivery_date": (date.today() + timedelta(days=90)).isoformat(),
                "payment_terms": "NET 30"
            },
            headers=admin_headers
        )
        fg_po_id = fg_po_response.json()["data"]["id"]
        
        # Verify FG PO type
        fg_po_data = test_client.get(f"/api/po/{fg_po_id}", headers=admin_headers).json()["data"]
        assert fg_po_data["po_type"] == "FG"
        assert fg_po_data["po_number"].startswith("PO/FG/")


class TestErrorScenarios:
    """Test error handling in workflows"""
    
    @pytest.mark.integration
    @pytest.mark.workflow
    def test_cannot_approve_rejected_pi(self, test_client, admin_headers, sample_pi):
        """Test cannot approve a rejected PI"""
        # Reject PI
        test_client.post(
            f"/api/pi/{sample_pi.id}/approve",
            json={"approved": False, "remarks": "Invalid request"},
            headers=admin_headers
        )
        
        # Try to approve rejected PI
        response = test_client.post(
            f"/api/pi/{sample_pi.id}/approve",
            json={"approved": True},
            headers=admin_headers
        )
        
        # Should fail
        assert response.status_code in [400, 403]
    
    @pytest.mark.integration
    @pytest.mark.workflow
    @pytest.mark.skip(reason="Fixture called directly - needs sample_pi parameter")
    def test_cannot_generate_po_from_pending_eopa(self, test_client, admin_headers, test_db):
        """Test cannot generate PO from pending EOPA"""
        # Create PI and approve to get EOPA
        from tests.conftest import sample_pi
        pi = sample_pi(test_db)
        test_client.post(f"/api/pi/{pi.id}/approve", json={"approved": True}, headers=admin_headers)
        
        # Get EOPA (should be PENDING)
        eopa_response = test_client.get(f"/api/eopa/pi/{pi.id}", headers=admin_headers)
        eopa_id = eopa_response.json()["data"][0]["id"]
        
        # Try to generate PO without approval
        response = test_client.post(
            f"/api/eopa/{eopa_id}/generate-po",
            json={"delivery_date": date.today().isoformat()},
            headers=admin_headers
        )
        
        # Should fail
        assert response.status_code in [400, 403]
