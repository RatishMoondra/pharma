"""
Pytest Configuration and Fixtures
Provides test database, test client, and authentication helpers
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date, timedelta
from decimal import Decimal
import os

from app.main import app
from app.database.session import get_db
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorType
from app.models.product import MedicineMaster, ProductMaster
from app.models.country import Country
from app.models.pi import PI, PIItem, PIStatus
from app.models.eopa import EOPA, EOPAStatus
from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.invoice import VendorInvoice, VendorInvoiceItem, InvoiceType, InvoiceStatus
from app.auth.utils import hash_password


# ============================================================================
# DATABASE FIXTURES - POSTGRESQL
# ============================================================================

@pytest.fixture(scope="session")
def test_engine():
    """
    Create PostgreSQL test database engine
    Uses pharma_test database (separate from pharma_db production)
    """
    # PostgreSQL connection URL for test database
    TEST_DATABASE_URL = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:Ratcat79@localhost:5432/pharma_test"
    )
    
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup: Drop all tables after all tests complete
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_engine):
    """
    Create a new database session for each test with transaction rollback
    Each test runs in isolation with a clean database state
    """
    # Create a connection
    connection = test_engine.connect()
    
    # Begin a transaction
    transaction = connection.begin()
    
    # Create a session bound to the connection
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    db = TestingSessionLocal()
    
    # Truncate all tables before each test for clean state
    with db.begin_nested():
        db.execute(text("TRUNCATE TABLE warehouse_grn, dispatch_advice, material_receipts, vendor_invoice_items, vendor_invoices, po_items, po_terms_conditions, purchase_orders, eopa_items, eopa, pi_items, pi, medicine_master, product_master, vendors, countries, users, system_configuration RESTART IDENTITY CASCADE"))
    
    try:
        yield db
    finally:
        db.close()
        # Rollback transaction to clean up test data
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def test_client(test_db):
    """Create FastAPI test client with test database"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ============================================================================
# USER & AUTH FIXTURES
# ============================================================================

@pytest.fixture
def admin_user(test_db):
    """Create admin user"""
    user = User(
        username="admin",
        email="admin@pharmaco.com",
        hashed_password=hash_password("admin123"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def procurement_user(test_db):
    """Create procurement officer user"""
    user = User(
        username="procurement",
        email="procurement@pharmaco.com",
        hashed_password=hash_password("proc123"),
        full_name="Procurement Officer",
        role=UserRole.PROCUREMENT_OFFICER,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def warehouse_user(test_db):
    """Create warehouse manager user"""
    user = User(
        username="warehouse",
        email="warehouse@pharmaco.com",
        hashed_password=hash_password("wh123"),
        full_name="Warehouse Manager",
        role=UserRole.WAREHOUSE_MANAGER,
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def admin_token(test_client, admin_user):
    """Get JWT token for admin user"""
    response = test_client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    """Get authorization headers for admin"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def procurement_token(test_client, procurement_user):
    """Get JWT token for procurement user"""
    response = test_client.post("/api/auth/login", json={
        "username": "procurement",
        "password": "proc123"
    })
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.fixture
def procurement_headers(procurement_token):
    """Get authorization headers for procurement user"""
    return {"Authorization": f"Bearer {procurement_token}"}


# ============================================================================
# VENDOR FIXTURES
# ============================================================================

@pytest.fixture
def partner_vendor(test_db, india_country):
    """Create partner vendor (customer)"""
    vendor = Vendor(
        vendor_code="PART001",
        vendor_name="Global Pharma Partners",
        vendor_type=VendorType.PARTNER,
        country_id=india_country.id,
        contact_person="John Doe",
        email="john@globalpartners.com",
        phone="+1-555-1234",
        address="123 Pharma Street",
        is_active=True
    )
    test_db.add(vendor)
    test_db.commit()
    test_db.refresh(vendor)
    return vendor


@pytest.fixture
def manufacturer_vendor(test_db, india_country):
    """Create manufacturer vendor"""
    vendor = Vendor(
        vendor_code="MFG001",
        vendor_name="Premium Manufacturers Ltd",
        vendor_type=VendorType.MANUFACTURER,
        country_id=india_country.id,
        contact_person="Jane Smith",
        email="jane@premiumfg.com",
        phone="+91-22-12345678",
        address="456 Manufacturing Hub",
        is_active=True
    )
    test_db.add(vendor)
    test_db.commit()
    test_db.refresh(vendor)
    return vendor


@pytest.fixture
def rm_vendor(test_db, india_country):
    """Create raw material vendor"""
    vendor = Vendor(
        vendor_code="RM001",
        vendor_name="Quality Raw Materials Inc",
        vendor_type=VendorType.RM,
        country_id=india_country.id,
        contact_person="Bob Johnson",
        email="bob@qualityrm.com",
        phone="+91-22-87654321",
        address="789 Chemical Park",
        is_active=True
    )
    test_db.add(vendor)
    test_db.commit()
    test_db.refresh(vendor)
    return vendor


@pytest.fixture
def pm_vendor(test_db, india_country):
    """Create packing material vendor"""
    vendor = Vendor(
        vendor_code="PM001",
        vendor_name="Packaging Solutions Co",
        vendor_type=VendorType.PM,
        country_id=india_country.id,
        contact_person="Alice Williams",
        email="alice@packsolutions.com",
        phone="+91-22-11223344",
        address="321 Packaging Avenue",
        is_active=True
    )
    test_db.add(vendor)
    test_db.commit()
    test_db.refresh(vendor)
    return vendor


# ============================================================================
# COUNTRY FIXTURE
# ============================================================================

@pytest.fixture
def india_country(test_db):
    """Create India country record"""
    country = Country(
        country_code="IND",
        country_name="India",
        language="English",
        currency="INR",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    test_db.add(country)
    test_db.commit()
    test_db.refresh(country)
    return country


# ============================================================================
# MEDICINE FIXTURES
# ============================================================================

@pytest.fixture
def product_paracetamol(test_db):
    """Create Product Master for Paracetamol"""
    product = ProductMaster(
        product_code="PROD001",
        product_name="Paracetamol Tablet",
        description="Paracetamol pain reliever tablet",
        unit_of_measure="NOS",
        hsn_code="30049099",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    test_db.add(product)
    test_db.commit()
    test_db.refresh(product)
    return product


@pytest.fixture
def medicine_paracetamol(test_db, manufacturer_vendor, rm_vendor, pm_vendor, product_paracetamol):
    """Create Paracetamol medicine with vendor mappings"""
    medicine = MedicineMaster(
        medicine_code="MED001",
        medicine_name="Paracetamol 500mg Tablets",
        product_id=product_paracetamol.id,
        composition="Paracetamol 500mg",
        dosage_form="Tablet",
        strength="500mg",
        pack_size="10x10",
        manufacturer_vendor_id=manufacturer_vendor.id,
        rm_vendor_id=rm_vendor.id,
        pm_vendor_id=pm_vendor.id,
        hsn_code="30049099",
        primary_unit="Tablet",
        secondary_unit="Strip",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    test_db.add(medicine)
    test_db.commit()
    test_db.refresh(medicine)
    return medicine


@pytest.fixture
def medicine_amoxicillin(test_db, manufacturer_vendor, rm_vendor, pm_vendor):
    """Create Amoxicillin medicine with vendor mappings"""
    medicine = MedicineMaster(
        medicine_code="MED002",
        medicine_name="Amoxicillin 250mg Capsules",
        description="Antibiotic for bacterial infections",
        unit="Box of 10 strips",
        manufacturer_vendor_id=manufacturer_vendor.id,
        rm_vendor_id=rm_vendor.id,
        pm_vendor_id=pm_vendor.id,
        hsn_code="30042010",
        gst_rate=Decimal("12.00"),
        pack_size="10x10",
        is_active=True
    )
    test_db.add(medicine)
    test_db.commit()
    test_db.refresh(medicine)
    return medicine


# ============================================================================
# PI FIXTURES
# ============================================================================

@pytest.fixture
def sample_pi(test_db, partner_vendor, medicine_paracetamol, admin_user, india_country):
    """Create sample PI with items"""
    pi = PI(
        pi_number="PI/24-25/0001",
        pi_date=date.today(),
        partner_vendor_id=partner_vendor.id,
        country_id=india_country.id,
        total_amount=Decimal("50000.00"),
        currency="INR",
        status=PIStatus.PENDING,
        created_by=admin_user.id
    )
    test_db.add(pi)
    test_db.flush()
    
    # Add PI item
    pi_item = PIItem(
        pi_id=pi.id,
        medicine_id=medicine_paracetamol.id,
        quantity=Decimal("1000"),
        unit_price=Decimal("50.00"),
        total_price=Decimal("50000.00"),
        hsn_code=medicine_paracetamol.hsn_code,
        pack_size=medicine_paracetamol.pack_size
    )
    test_db.add(pi_item)
    test_db.commit()
    test_db.refresh(pi)
    return pi


# ============================================================================
# EOPA FIXTURES
# ============================================================================

@pytest.fixture
def sample_eopa(test_db, sample_pi, admin_user):
    """Create sample EOPA (PI-level) with EOPA items"""
    from app.models.eopa import EOPAItem
    
    eopa = EOPA(
        eopa_number="EOPA/24-25/0001",
        eopa_date=date.today(),
        pi_id=sample_pi.id,
        status=EOPAStatus.APPROVED,
        approved_by=admin_user.id,
        approved_at=datetime.utcnow(),
        created_by=admin_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    test_db.add(eopa)
    test_db.flush()  # Get EOPA ID
    
    # Create EOPA items for each PI item
    for pi_item in sample_pi.items:
        eopa_item = EOPAItem(
            eopa_id=eopa.id,
            pi_item_id=pi_item.id,
            quantity=Decimal(str(pi_item.quantity)),
            estimated_unit_price=Decimal(str(pi_item.unit_price)),
            estimated_total=Decimal(str(pi_item.total_price)),
            created_by=admin_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        test_db.add(eopa_item)
    
    test_db.commit()
    test_db.refresh(eopa)
    return eopa


# ============================================================================
# PO FIXTURES
# ============================================================================

@pytest.fixture
def sample_fg_po(test_db, sample_eopa, manufacturer_vendor, medicine_paracetamol, admin_user):
    """Create sample FG (Finished Goods) PO"""
    po = PurchaseOrder(
        po_number="PO/FG/24-25/0001",
        po_date=date.today(),
        po_type=POType.FG,
        eopa_id=sample_eopa.id,
        vendor_id=manufacturer_vendor.id,
        status=POStatus.DRAFT,
        total_ordered_qty=Decimal("1000"),
        total_fulfilled_qty=Decimal("0"),
        delivery_date=date.today() + timedelta(days=30),
        payment_terms="NET 30",
        currency_code="INR",
        created_by=admin_user.id
    )
    test_db.add(po)
    test_db.flush()
    
    # Add PO item
    po_item = POItem(
        po_id=po.id,
        medicine_id=medicine_paracetamol.id,
        ordered_quantity=Decimal("1000"),
        fulfilled_quantity=Decimal("0"),
        unit="Boxes",
        hsn_code=medicine_paracetamol.hsn_code,
        gst_rate=Decimal("12.00"),  # Fixed: GST rate is not on MedicineMaster, use standard 12%
        pack_size=medicine_paracetamol.pack_size
    )
    test_db.add(po_item)
    test_db.commit()
    test_db.refresh(po)
    return po


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

@pytest.fixture
def create_pi_payload(partner_vendor, medicine_paracetamol, india_country):
    """Factory for creating PI request payload"""
    def _create_payload(**kwargs):
        default_payload = {
            "pi_date": date.today().isoformat(),
            "partner_vendor_id": partner_vendor.id,
            "country_id": india_country.id,
            "currency": "INR",
            "remarks": "Test PI",
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "quantity": 1000,
                    "unit_price": 50.00
                }
            ]
        }
        default_payload.update(kwargs)
        return default_payload
    return _create_payload


@pytest.fixture
def create_invoice_payload(sample_fg_po, medicine_paracetamol):
    """Factory for creating invoice request payload"""
    def _create_payload(**kwargs):
        default_payload = {
            "invoice_number": "INV/2024/001",
            "invoice_date": date.today().isoformat(),
            "invoice_type": "FG",
            "subtotal": 45000.00,
            "tax_amount": 5400.00,
            "total_amount": 50400.00,
            "currency_code": "INR",
            "items": [
                {
                    "medicine_id": medicine_paracetamol.id,
                    "shipped_quantity": 1000,
                    "unit_price": 45.00,
                    "total_price": 45000.00,
                    "tax_rate": 12.00,
                    "tax_amount": 5400.00,
                    "hsn_code": "30049099",
                    "gst_rate": 12.00,
                    "gst_amount": 5400.00,
                    "batch_number": "BATCH001",
                    "manufacturing_date": date.today().isoformat(),
                    "expiry_date": (date.today() + timedelta(days=730)).isoformat()
                }
            ]
        }
        default_payload.update(kwargs)
        return default_payload
    return _create_payload
