"""
Unit Tests for PI (Proforma Invoice) Workflow
Tests: PI creation, validation, EOPA generation, approval workflow
"""
import pytest
from datetime import date
from decimal import Decimal

from app.models.pi import PI, PIItem, PIStatus
from app.models.eopa import EOPA, EOPAStatus


class TestPICreation:
    """Test PI creation and validation"""
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_create_pi_success(self, test_client, admin_headers, create_pi_payload):
        """Test successful PI creation"""
        payload = create_pi_payload()
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["pi_number"].startswith("PI/")
        assert data["data"]["status"] == "PENDING"
        assert len(data["data"]["items"]) == 1
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_create_pi_hsn_auto_population(self, test_client, admin_headers, create_pi_payload, medicine_paracetamol):
        """Test HSN code auto-population from medicine master"""
        payload = create_pi_payload()
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        pi_item = data["data"]["items"][0]
        assert pi_item["hsn_code"] == medicine_paracetamol.hsn_code
        assert pi_item["pack_size"] == medicine_paracetamol.pack_size
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_create_pi_total_calculation(self, test_client, admin_headers, create_pi_payload):
        """Test PI total amount calculation"""
        payload = create_pi_payload()
        payload["items"] = [
            {"medicine_id": payload["items"][0]["medicine_id"], "quantity": 1000, "unit_price": 50.00},
            {"medicine_id": payload["items"][0]["medicine_id"], "quantity": 500, "unit_price": 45.00}
        ]
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        expected_total = (1000 * 50.00) + (500 * 45.00)
        assert float(data["data"]["total_amount"]) == expected_total
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_create_pi_invalid_vendor(self, test_client, admin_headers, create_pi_payload):
        """Test PI creation with invalid vendor"""
        payload = create_pi_payload(partner_vendor_id=99999)
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 404
        assert response.json()["error_code"] == "ERR_NOT_FOUND"
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_create_pi_unauthorized(self, test_client, create_pi_payload):
        """Test PI creation without authentication"""
        payload = create_pi_payload()
        
        response = test_client.post("/api/pi/", json=payload)
        
        assert response.status_code == 403


class TestPIApproval:
    """Test PI approval workflow"""
    
    @pytest.mark.unit
    @pytest.mark.pi
    @pytest.mark.workflow
    def test_approve_pi_generates_eopas(self, test_client, admin_headers, sample_pi, test_db):
        """Test PI approval auto-generates EOPAs"""
        response = test_client.post(
            f"/api/pi/{sample_pi.id}/approve",
            json={"approved": True, "remarks": "Approved for procurement"},
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify EOPAs created
        eopas = test_db.query(EOPA).filter(EOPA.pi_id == sample_pi.id).all()
        assert len(eopas) > 0
        
        # Verify PI status updated
        test_db.refresh(sample_pi)
        assert sample_pi.status == PIStatus.APPROVED
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_reject_pi(self, test_client, admin_headers, sample_pi, test_db):
        """Test PI rejection"""
        response = test_client.post(
            f"/api/pi/{sample_pi.id}/approve",
            json={"approved": False, "remarks": "Pricing too high"},
            headers=admin_headers
        )
        
        assert response.status_code == 200
        
        # Verify PI status updated
        test_db.refresh(sample_pi)
        assert sample_pi.status == PIStatus.REJECTED
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_cannot_edit_approved_pi(self, test_client, admin_headers, sample_pi, test_db):
        """Test that approved PI cannot be edited"""
        # Approve PI first
        sample_pi.status = PIStatus.APPROVED
        test_db.commit()
        
        # Try to edit
        response = test_client.put(
            f"/api/pi/{sample_pi.id}",
            json={"remarks": "New remarks"},
            headers=admin_headers
        )
        
        # Should fail or return warning (depending on implementation)
        assert response.status_code in [400, 403]


class TestPIRetrieval:
    """Test PI retrieval endpoints"""
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_list_pis(self, test_client, admin_headers, sample_pi):
        """Test listing all PIs"""
        response = test_client.get("/api/pi/", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 1
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_get_pi_by_id(self, test_client, admin_headers, sample_pi):
        """Test retrieving single PI"""
        response = test_client.get(f"/api/pi/{sample_pi.id}", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == sample_pi.id
        assert data["data"]["pi_number"] == sample_pi.pi_number
        assert "items" in data["data"]
        assert "partner_vendor" in data["data"]
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_get_nonexistent_pi(self, test_client, admin_headers):
        """Test retrieving non-existent PI"""
        response = test_client.get("/api/pi/99999", headers=admin_headers)
        
        assert response.status_code == 404
        assert response.json()["error_code"] == "ERR_NOT_FOUND"


class TestPIDelete:
    """Test PI deletion"""
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_delete_pending_pi(self, test_client, admin_headers, sample_pi):
        """Test deleting pending PI"""
        pi_id = sample_pi.id
        
        response = test_client.delete(f"/api/pi/{pi_id}", headers=admin_headers)
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify deletion
        get_response = test_client.get(f"/api/pi/{pi_id}", headers=admin_headers)
        assert get_response.status_code == 404
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_cannot_delete_approved_pi(self, test_client, admin_headers, sample_pi, test_db):
        """Test that approved PI cannot be deleted"""
        sample_pi.status = PIStatus.APPROVED
        test_db.commit()
        
        response = test_client.delete(f"/api/pi/{sample_pi.id}", headers=admin_headers)
        
        # Should fail (depending on business rules)
        assert response.status_code in [400, 403]
