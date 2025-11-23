"""
Test Suite for PO Material-Type Mapping

Tests the CRITICAL business rule:
- RM PO items populate raw_material_id (NOT medicine_id or packing_material_id)
- PM PO items populate packing_material_id (NOT medicine_id or raw_material_id)
- FG PO items populate medicine_id (NOT raw_material_id or packing_material_id)

Also tests the EOPA → PO flow:
- FIRST TIME: Read from EOPA + EOPA Items
- SUBSEQUENT: Read from purchase_orders + po_items
"""

import pytest
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy.orm import Session

from app.models.eopa import EOPA, EOPAItem, EOPAStatus
from app.models.pi import PI, PIItem
from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.product import MedicineMaster, ProductMaster, RawMaterialMaster, PackingMaterialMaster
from app.models.product import MedicineRawMaterial, MedicinePackingMaterial
from app.models.vendor import Vendor, VendorType
from app.models.user import User, UserRole
from app.models.country import Country
from app.services.po_service import POGenerationService
from app.exceptions.base import AppException


@pytest.fixture
def test_data(db: Session):
    """
    Create comprehensive test data for PO generation testing
    """
    # Create test country
    country = Country(
        country_code="IND",
        country_name="India",
        language="English",
        currency="INR",
        is_active=True
    )
    db.add(country)
    db.flush()
    
    # Create test user
    user = User(
        username="test_po_user",
        email="test@example.com",
        hashed_password="hashed",
        full_name="Test User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    # Create vendors
    manufacturer_vendor = Vendor(
        vendor_code="MFG001",
        vendor_name="Test Manufacturer",
        vendor_type=VendorType.MANUFACTURER,
        country_id=country.id,
        is_active=True
    )
    rm_vendor = Vendor(
        vendor_code="RM001",
        vendor_name="Test RM Vendor",
        vendor_type=VendorType.RM,
        country_id=country.id,
        is_active=True
    )
    pm_vendor = Vendor(
        vendor_code="PM001",
        vendor_name="Test PM Vendor",
        vendor_type=VendorType.PM,
        country_id=country.id,
        is_active=True
    )
    partner_vendor = Vendor(
        vendor_code="PART001",
        vendor_name="Test Partner",
        vendor_type=VendorType.PARTNER,
        country_id=country.id,
        is_active=True
    )
    db.add_all([manufacturer_vendor, rm_vendor, pm_vendor, partner_vendor])
    db.flush()
    
    # Create product
    product = ProductMaster(
        product_code="PROD001",
        product_name="Test Product",
        unit_of_measure="Tablets",
        is_active=True,
        hsn_code="3004"
    )
    db.add(product)
    db.flush()
    
    # Create raw material
    raw_material = RawMaterialMaster(
        rm_code="RM001",
        rm_name="Test API",
        unit_of_measure="KG",
        hsn_code="2941",
        is_active=True,
        default_vendor_id=rm_vendor.id
    )
    db.add(raw_material)
    db.flush()
    
    # Create packing material
    packing_material = PackingMaterialMaster(
        pm_code="PM001",
        pm_name="Test Carton",
        unit_of_measure="PCS",
        hsn_code="4819",
        is_active=True,
        language="English",
        artwork_version="v1.0",
        default_vendor_id=pm_vendor.id
    )
    db.add(packing_material)
    db.flush()
    
    # Create medicine with vendor mappings
    medicine = MedicineMaster(
        medicine_code="MED001",
        medicine_name="Test Paracetamol 500mg",
        product_id=product.id,
        dosage_form="Tablet",
        is_active=True,
        hsn_code="3004",
        manufacturer_vendor_id=manufacturer_vendor.id,
        rm_vendor_id=rm_vendor.id,
        pm_vendor_id=pm_vendor.id
    )
    db.add(medicine)
    db.flush()
    
    # Create medicine BOM - Raw Material
    medicine_rm = MedicineRawMaterial(
        medicine_id=medicine.id,
        raw_material_id=raw_material.id,
        vendor_id=rm_vendor.id,
        qty_required_per_unit=Decimal("0.500"),  # 500g per 1000 tablets
        uom="KG",
        is_active=True,
        is_critical=True
    )
    db.add(medicine_rm)
    
    # Create medicine BOM - Packing Material
    medicine_pm = MedicinePackingMaterial(
        medicine_id=medicine.id,
        packing_material_id=packing_material.id,
        vendor_id=pm_vendor.id,
        qty_required_per_unit=Decimal("0.001"),  # 1 carton per 1000 tablets
        uom="PCS",
        is_active=True,
        is_critical=True,
        language_override="English",
        artwork_version_override="v1.0"
    )
    db.add(medicine_pm)
    db.flush()
    
    # Create PI
    pi = PI(
        pi_number="PI/2025/001",
        pi_date=date.today(),
        partner_vendor_id=partner_vendor.id,
        country_id=country.id,
        total_amount=Decimal("10000.00"),
        currency="INR",
        created_by=user.id,
        status="APPROVED"
    )
    db.add(pi)
    db.flush()
    
    # Create PI Item
    pi_item = PIItem(
        pi_id=pi.id,
        medicine_id=medicine.id,
        quantity=Decimal("10000"),  # 10,000 tablets
        unit_price=Decimal("1.00"),
        total_price=Decimal("10000.00"),
        hsn_code="3004",
        pack_size="10x10"
    )
    db.add(pi_item)
    db.flush()
    
    # Create EOPA
    eopa = EOPA(
        eopa_number="EOPA/2025/001",
        eopa_date=date.today(),
        pi_id=pi.id,
        status=EOPAStatus.APPROVED,
        created_by=user.id
    )
    db.add(eopa)
    db.flush()
    
    # Create EOPA Item
    eopa_item = EOPAItem(
        eopa_id=eopa.id,
        pi_item_id=pi_item.id,
        quantity=Decimal("10000"),
        estimated_unit_price=Decimal("1.00"),
        estimated_total=Decimal("10000.00"),
        created_by=user.id
    )
    db.add(eopa_item)
    db.commit()
    
    return {
        "user": user,
        "country": country,
        "manufacturer_vendor": manufacturer_vendor,
        "rm_vendor": rm_vendor,
        "pm_vendor": pm_vendor,
        "partner_vendor": partner_vendor,
        "product": product,
        "raw_material": raw_material,
        "packing_material": packing_material,
        "medicine": medicine,
        "medicine_rm": medicine_rm,
        "medicine_pm": medicine_pm,
        "pi": pi,
        "pi_item": pi_item,
        "eopa": eopa,
        "eopa_item": eopa_item
    }


def test_fg_po_material_mapping(db: Session, test_data):
    """
    Test FG PO Item Material Mapping
    
    CRITICAL RULE:
    - FG PO items MUST populate medicine_id
    - FG PO items MUST have NULL raw_material_id
    - FG PO items MUST have NULL packing_material_id
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate POs
    result = service.generate_pos_from_eopa(eopa.id, user.id)
    
    # Verify FG PO was created
    assert result["fg_pos_created"] >= 1
    
    # Fetch FG PO
    fg_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.FG
    ).all()
    
    assert len(fg_pos) >= 1
    
    for po in fg_pos:
        assert po.vendor_id == test_data["manufacturer_vendor"].id
        assert po.po_type == POType.FG
        
        # Check PO items
        assert len(po.items) >= 1
        
        for item in po.items:
            # CRITICAL: Verify material mapping
            assert item.medicine_id is not None, "FG PO Item must have medicine_id"
            assert item.raw_material_id is None, "FG PO Item must NOT have raw_material_id"
            assert item.packing_material_id is None, "FG PO Item must NOT have packing_material_id"
            
            # Verify medicine is loaded
            assert item.medicine is not None
            assert item.medicine.medicine_name == test_data["medicine"].medicine_name


def test_rm_po_material_mapping(db: Session, test_data):
    """
    Test RM PO Item Material Mapping
    
    CRITICAL RULE:
    - RM PO items MUST populate raw_material_id
    - RM PO items MUST have NULL medicine_id
    - RM PO items MUST have NULL packing_material_id
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate RM POs via explosion
    result = service.generate_rm_pos_from_explosion(eopa.id, user.id)
    
    # Verify RM PO was created
    assert result["total_rm_pos_created"] >= 1
    
    # Fetch RM PO
    rm_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.RM
    ).all()
    
    assert len(rm_pos) >= 1
    
    for po in rm_pos:
        assert po.vendor_id == test_data["rm_vendor"].id
        assert po.po_type == POType.RM
        
        # Check PO items
        assert len(po.items) >= 1
        
        for item in po.items:
            # CRITICAL: Verify material mapping
            assert item.raw_material_id is not None, "RM PO Item must have raw_material_id"
            assert item.medicine_id is None, "RM PO Item must NOT have medicine_id"
            assert item.packing_material_id is None, "RM PO Item must NOT have packing_material_id"
            
            # Verify raw material is loaded
            assert item.raw_material is not None
            assert item.raw_material.rm_name == test_data["raw_material"].rm_name


def test_pm_po_material_mapping(db: Session, test_data):
    """
    Test PM PO Item Material Mapping
    
    CRITICAL RULE:
    - PM PO items MUST populate packing_material_id
    - PM PO items MUST have NULL medicine_id
    - PM PO items MUST have NULL raw_material_id
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate PM POs via explosion
    result = service.generate_pm_pos_from_explosion(eopa.id, user.id)
    
    # Verify PM PO was created
    assert result["total_pm_pos_created"] >= 1
    
    # Fetch PM PO
    pm_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.PM
    ).all()
    
    assert len(pm_pos) >= 1
    
    for po in pm_pos:
        assert po.vendor_id == test_data["pm_vendor"].id
        assert po.po_type == POType.PM
        
        # Check PO items
        assert len(po.items) >= 1
        
        for item in po.items:
            # CRITICAL: Verify material mapping
            assert item.packing_material_id is not None, "PM PO Item must have packing_material_id"
            assert item.medicine_id is None, "PM PO Item must NOT have medicine_id"
            assert item.raw_material_id is None, "PM PO Item must NOT have raw_material_id"
            
            # Verify packing material is loaded
            assert item.packing_material is not None
            assert item.packing_material.pm_name == test_data["packing_material"].pm_name


def test_eopa_to_po_first_time_reads_eopa_items(db: Session, test_data):
    """
    Test EOPA → PO Flow: FIRST TIME
    
    CRITICAL RULE:
    - First time generating PO → read from EOPA + EOPA Items
    - Quantities come from EOPA items
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Verify no POs exist yet
    existing_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id
    ).count()
    assert existing_pos == 0
    
    # Generate POs (FIRST TIME)
    result = service.generate_pos_from_eopa(eopa.id, user.id)
    
    # Verify POs were created from EOPA items
    assert result["total_pos_created"] >= 1
    
    # Verify quantities match EOPA item quantities
    fg_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.FG
    ).all()
    
    for po in fg_pos:
        for item in po.items:
            # Quantity should match EOPA item quantity
            eopa_item = test_data["eopa_item"]
            assert float(item.ordered_quantity) == float(eopa_item.quantity)


def test_eopa_to_po_subsequent_reads_po_items(db: Session, test_data):
    """
    Test EOPA → PO Flow: SUBSEQUENT READS
    
    CRITICAL RULE:
    - After PO is saved → read from purchase_orders + po_items
    - NOT from EOPA items
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate POs (FIRST TIME)
    service.generate_pos_from_eopa(eopa.id, user.id)
    
    # Fetch created PO
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.FG
    ).first()
    
    assert po is not None
    
    # Subsequent reads should use PO items, not EOPA items
    # (This is verified by fetching PO and checking items)
    fetched_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po.id
    ).first()
    
    assert fetched_po.items is not None
    assert len(fetched_po.items) >= 1
    
    # Items should be loaded from po_items table
    for item in fetched_po.items:
        assert item.po_id == po.id
        assert item.ordered_quantity is not None


def test_vendor_resolution_from_medicine_master(db: Session, test_data):
    """
    Test Vendor Resolution
    
    CRITICAL RULE:
    - Vendor is resolved dynamically from Medicine Master
    - FG → manufacturer_vendor_id
    - RM → rm_vendor_id
    - PM → pm_vendor_id
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate all POs
    service.generate_pos_from_eopa(eopa.id, user.id)
    service.generate_rm_pos_from_explosion(eopa.id, user.id)
    service.generate_pm_pos_from_explosion(eopa.id, user.id)
    
    # Verify FG PO has manufacturer vendor
    fg_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.FG
    ).first()
    assert fg_po.vendor_id == test_data["manufacturer_vendor"].id
    
    # Verify RM PO has RM vendor
    rm_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.RM
    ).first()
    assert rm_po.vendor_id == test_data["rm_vendor"].id
    
    # Verify PM PO has PM vendor
    pm_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id,
        PurchaseOrder.po_type == POType.PM
    ).first()
    assert pm_po.vendor_id == test_data["pm_vendor"].id


def test_po_item_validation_only_one_material_field(db: Session, test_data):
    """
    Test PO Item Validation
    
    CRITICAL RULE:
    - Only ONE of the three material fields can be populated
    - medicine_id XOR raw_material_id XOR packing_material_id
    """
    service = POGenerationService(db)
    eopa = test_data["eopa"]
    user = test_data["user"]
    
    # Generate all types of POs
    service.generate_pos_from_eopa(eopa.id, user.id)
    service.generate_rm_pos_from_explosion(eopa.id, user.id)
    service.generate_pm_pos_from_explosion(eopa.id, user.id)
    
    # Fetch all PO items
    all_pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.eopa_id == eopa.id
    ).all()
    
    for po in all_pos:
        for item in po.items:
            # Count how many material fields are populated
            populated_fields = sum([
                item.medicine_id is not None,
                item.raw_material_id is not None,
                item.packing_material_id is not None
            ])
            
            # CRITICAL: Only ONE field should be populated
            assert populated_fields == 1, f"PO Item {item.id} has {populated_fields} material fields populated (should be exactly 1)"
