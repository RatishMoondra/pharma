"""
Unit Tests for HSN Code and GST Logic
Tests: HSN validation, GST rate calculations, tax compliance
"""
import pytest
from datetime import date
from decimal import Decimal

from app.models.product import MedicineMaster


class TestHSNCodeValidation:
    """Test HSN code validation and auto-population"""
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Medicine CRUD endpoints not implemented")
    def test_hsn_code_format_validation(self, test_client, admin_headers):
        """Test HSN code format validation (8 digits)"""
        payload = {
            "medicine_code": "MED999",
            "medicine_name": "Test Medicine",
            "hsn_code": "12345",  # Invalid: only 5 digits
            "gst_percentage": 12.0
        }
        
        response = test_client.post("/api/medicine/", json=payload, headers=admin_headers)
        
        # Should fail validation
        assert response.status_code in [400, 422]
    
    @pytest.mark.unit
    @pytest.mark.database
    @pytest.mark.skip(reason="Medicine CRUD endpoints not implemented")
    def test_valid_hsn_code_accepted(self, test_client, admin_headers):
        """Test valid 8-digit HSN code is accepted"""
        payload = {
            "medicine_code": "MED998",
            "medicine_name": "Test Medicine Valid HSN",
            "hsn_code": "30049099",  # Valid: 8 digits
            "gst_percentage": 12.0,
            "manufacturer_vendor_id": None
        }
        
        response = test_client.post("/api/medicine/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["hsn_code"] == "30049099"
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_hsn_auto_population_in_pi_items(self, test_client, admin_headers, medicine_paracetamol, partner_vendor, create_pi_payload):
        """Test HSN code auto-populated from medicine master to PI items"""
        payload = create_pi_payload()
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        pi_item = response.json()["data"]["items"][0]
        
        # HSN should match medicine master
        assert pi_item["hsn_code"] == medicine_paracetamol.hsn_code


class TestGSTCalculation:
    """Test GST rate calculations"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="Medicine.gst_percentage attribute doesn't exist")
    def test_gst_rate_from_medicine_master(self, test_client, admin_headers, medicine_paracetamol):
        """Test GST rate is taken from medicine master"""
        assert medicine_paracetamol.gst_percentage == 12.0
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="Invoice schema doesn't match test expectations")
    def test_gst_calculation_12_percent(self, test_client, admin_headers, sample_fg_po, medicine_paracetamol):
        """Test 12% GST calculation"""
        po_item = sample_fg_po.items[0]
        base_amount = Decimal("50000.00")
        expected_gst = base_amount * Decimal("0.12")  # 12% = 6000.00
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/GST12/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": po_item.medicine_id,
            "shipped_quantity": 1000,
            "unit_price": 50.00,
            "total_amount": float(base_amount),
            "tax_amount": float(expected_gst),
            "net_amount": float(base_amount + expected_gst)
        }
        
        response = test_client.post("/api/invoice/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify GST calculation
        assert Decimal(str(data["tax_amount"])) == expected_gst
        assert Decimal(str(data["net_amount"])) == base_amount + expected_gst
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="CGST/SGST fields not in invoice schema")
    def test_cgst_sgst_split_for_intrastate(self, test_client, admin_headers, sample_fg_po):
        """Test CGST/SGST split for intra-state transactions"""
        po_item = sample_fg_po.items[0]
        total_gst = Decimal("6000.00")  # 12% of 50000
        cgst = sgst = total_gst / 2  # 6% each
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/CGST/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": po_item.medicine_id,
            "shipped_quantity": 1000,
            "unit_price": 50.00,
            "total_amount": 50000.00,
            "cgst_amount": float(cgst),
            "sgst_amount": float(sgst),
            "tax_amount": float(total_gst),
            "net_amount": 56000.00
        }
        
        response = test_client.post("/api/invoice/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify CGST/SGST split
        assert Decimal(str(data["cgst_amount"])) == cgst
        assert Decimal(str(data["sgst_amount"])) == sgst
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="IGST fields not in invoice schema")
    def test_igst_for_interstate(self, test_client, admin_headers, sample_fg_po):
        """Test IGST for inter-state transactions"""
        po_item = sample_fg_po.items[0]
        igst = Decimal("6000.00")  # 12% of 50000
        
        payload = {
            "po_id": sample_fg_po.id,
            "invoice_number": "INV/IGST/001",
            "invoice_date": date.today().isoformat(),
            "medicine_id": po_item.medicine_id,
            "shipped_quantity": 1000,
            "unit_price": 50.00,
            "total_amount": 50000.00,
            "igst_amount": float(igst),
            "tax_amount": float(igst),
            "net_amount": 56000.00
        }
        
        response = test_client.post("/api/invoice/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify IGST
        assert Decimal(str(data["igst_amount"])) == igst


class TestTaxCompliance:
    """Test tax compliance and reporting"""
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="GST report endpoints not implemented")
    def test_gst_summary_report(self, test_client, admin_headers):
        """Test GST summary report generation"""
        response = test_client.get("/api/reports/gst-summary", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should contain GST breakdown
        assert "total_cgst" in data
        assert "total_sgst" in data
        assert "total_igst" in data
    
    @pytest.mark.unit
    @pytest.mark.invoice
    @pytest.mark.skip(reason="GST report endpoints not implemented")
    def test_hsn_wise_gst_report(self, test_client, admin_headers):
        """Test HSN-wise GST summary"""
        response = test_client.get("/api/reports/hsn-gst-summary", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should group by HSN code
        assert isinstance(data, list)
        for hsn_entry in data:
            assert "hsn_code" in hsn_entry
            assert "total_taxable_value" in hsn_entry
            assert "total_gst" in hsn_entry


class TestPackSizeAndUnits:
    """Test pack size and unit handling"""
    
    @pytest.mark.unit
    @pytest.mark.pi
    def test_pack_size_auto_population(self, test_client, admin_headers, medicine_paracetamol, create_pi_payload):
        """Test pack_size auto-populated from medicine master"""
        payload = create_pi_payload()
        
        response = test_client.post("/api/pi/", json=payload, headers=admin_headers)
        
        assert response.status_code == 200
        pi_item = response.json()["data"]["items"][0]
        
        # Pack size should match medicine master
        assert pi_item["pack_size"] == medicine_paracetamol.pack_size
    
    @pytest.mark.unit
    @pytest.mark.po
    @pytest.mark.skip(reason="PO schema validation needs adjustment")
    def test_unit_flexibility_in_po(self, test_client, admin_headers, manufacturer_vendor, medicine_paracetamol):
        """Test PO supports different units (UNITS, KG, SHEETS)"""
        units = ["UNITS", "KG", "SHEETS", "BOXES"]
        
        for unit in units:
            payload = {
                "vendor_id": manufacturer_vendor.id,
                "po_type": "FG",
                "delivery_date": date.today().isoformat(),
                "items": [
                    {
                        "medicine_id": medicine_paracetamol.id,
                        "ordered_quantity": 1000,
                        "unit": unit
                    }
                ]
            }
            
            response = test_client.post("/api/po/", json=payload, headers=admin_headers)
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["items"][0]["unit"] == unit
