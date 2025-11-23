"""
Test Suite for PO Commercial Fields Implementation

Tests:
1. Database schema validation
2. Auto-calculation functions
3. Material type validation (one-of constraint)
4. Recalculate endpoint
5. PO creation with commercial fields
"""
import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.eopa import EOPA, EOPAStatus
from app.models.vendor import Vendor
from app.models.product import MedicineMaster
from app.models.raw_material import RawMaterialMaster
from app.models.packing_material import PackingMaterialMaster
from app.services.po_service import (
    calculate_po_item_amounts,
    calculate_po_totals,
    validate_po_item_material_type
)
from app.exceptions.base import AppException


class TestCommercialFieldsSchema:
    """Test database schema has all commercial fields"""
    
    def test_po_item_has_commercial_fields(self, db: Session):
        """Test POItem model has all new commercial fields"""
        # Create a test PO item
        po_item = POItem(
            po_id=1,
            medicine_id=1,
            ordered_quantity=100,
            rate_per_unit=Decimal('1500.00'),
            value_amount=Decimal('150000.00'),
            gst_rate=Decimal('18.00'),
            gst_amount=Decimal('27000.00'),
            total_amount=Decimal('177000.00'),
            delivery_schedule='Immediately',
            delivery_location='Warehouse A'
        )
        
        assert hasattr(po_item, 'rate_per_unit')
        assert hasattr(po_item, 'value_amount')
        assert hasattr(po_item, 'gst_amount')
        assert hasattr(po_item, 'total_amount')
        assert hasattr(po_item, 'delivery_schedule')
        assert hasattr(po_item, 'delivery_location')
    
    def test_purchase_order_has_totals(self, db: Session):
        """Test PurchaseOrder model has all total fields"""
        po = PurchaseOrder(
            po_number='PO/TEST/001',
            po_date=date.today(),
            po_type=POType.RM,
            eopa_id=1,
            status=POStatus.DRAFT,
            created_by=1,
            total_value_amount=Decimal('150000.00'),
            total_gst_amount=Decimal('27000.00'),
            total_invoice_amount=Decimal('177000.00'),
            ship_to_manufacturer_id=2,
            ship_to_address='Test Address',
            amendment_reason='Initial PO',
            currency_exchange_rate=Decimal('1.0000')
        )
        
        assert hasattr(po, 'total_value_amount')
        assert hasattr(po, 'total_gst_amount')
        assert hasattr(po, 'total_invoice_amount')
        assert hasattr(po, 'ship_to_manufacturer_id')
        assert hasattr(po, 'ship_to_address')
        assert hasattr(po, 'amendment_reason')
        assert hasattr(po, 'currency_exchange_rate')


class TestAutoCalculations:
    """Test auto-calculation functions"""
    
    def test_calculate_item_amounts_basic(self):
        """Test basic amount calculation"""
        item = POItem(
            po_id=1,
            medicine_id=1,
            ordered_quantity=Decimal('100'),
            rate_per_unit=Decimal('1500.00'),
            gst_rate=Decimal('18.00')
        )
        
        calculated = calculate_po_item_amounts(item)
        
        assert calculated.value_amount == Decimal('150000.00')
        assert calculated.gst_amount == Decimal('27000.00')
        assert calculated.total_amount == Decimal('177000.00')
    
    def test_calculate_item_amounts_with_decimal_quantities(self):
        """Test calculation with decimal quantities"""
        item = POItem(
            po_id=1,
            raw_material_id=1,
            ordered_quantity=Decimal('225.500'),
            rate_per_unit=Decimal('1675.00'),
            gst_rate=Decimal('18.00')
        )
        
        calculated = calculate_po_item_amounts(item)
        
        expected_value = Decimal('225.500') * Decimal('1675.00')
        expected_gst = expected_value * (Decimal('18.00') / Decimal('100'))
        expected_total = expected_value + expected_gst
        
        assert calculated.value_amount == expected_value
        assert calculated.gst_amount == expected_gst
        assert calculated.total_amount == expected_total
    
    def test_calculate_item_amounts_zero_gst(self):
        """Test calculation with zero GST"""
        item = POItem(
            po_id=1,
            medicine_id=1,
            ordered_quantity=Decimal('100'),
            rate_per_unit=Decimal('1000.00'),
            gst_rate=Decimal('0.00')
        )
        
        calculated = calculate_po_item_amounts(item)
        
        assert calculated.value_amount == Decimal('100000.00')
        assert calculated.gst_amount == Decimal('0.00')
        assert calculated.total_amount == Decimal('100000.00')
    
    def test_calculate_item_amounts_no_rate(self):
        """Test calculation when rate is not set"""
        item = POItem(
            po_id=1,
            medicine_id=1,
            ordered_quantity=Decimal('100'),
            rate_per_unit=None,
            gst_rate=Decimal('18.00')
        )
        
        calculated = calculate_po_item_amounts(item)
        
        assert calculated.value_amount == Decimal('0')
        assert calculated.gst_amount == Decimal('0')
        assert calculated.total_amount == Decimal('0')
    
    def test_calculate_po_totals(self):
        """Test PO totals calculation from items"""
        po = PurchaseOrder(
            po_number='PO/TEST/001',
            po_date=date.today(),
            po_type=POType.RM,
            eopa_id=1,
            status=POStatus.DRAFT,
            created_by=1
        )
        
        # Add items
        item1 = POItem(
            po_id=1,
            raw_material_id=1,
            ordered_quantity=100,
            value_amount=Decimal('150000.00'),
            gst_amount=Decimal('27000.00'),
            total_amount=Decimal('177000.00')
        )
        
        item2 = POItem(
            po_id=1,
            raw_material_id=2,
            ordered_quantity=50,
            value_amount=Decimal('75000.00'),
            gst_amount=Decimal('13500.00'),
            total_amount=Decimal('88500.00')
        )
        
        po.items = [item1, item2]
        
        calculated = calculate_po_totals(po)
        
        assert calculated.total_value_amount == Decimal('225000.00')
        assert calculated.total_gst_amount == Decimal('40500.00')
        assert calculated.total_invoice_amount == Decimal('265500.00')


class TestMaterialTypeValidation:
    """Test one-of material type constraint"""
    
    def test_validate_exactly_one_material_type_medicine(self):
        """Test validation passes with only medicine_id"""
        item_data = {
            'medicine_id': 1,
            'raw_material_id': None,
            'packing_material_id': None
        }
        
        # Should not raise exception
        validate_po_item_material_type(item_data)
    
    def test_validate_exactly_one_material_type_raw_material(self):
        """Test validation passes with only raw_material_id"""
        item_data = {
            'medicine_id': None,
            'raw_material_id': 1,
            'packing_material_id': None
        }
        
        # Should not raise exception
        validate_po_item_material_type(item_data)
    
    def test_validate_exactly_one_material_type_packing_material(self):
        """Test validation passes with only packing_material_id"""
        item_data = {
            'medicine_id': None,
            'raw_material_id': None,
            'packing_material_id': 1
        }
        
        # Should not raise exception
        validate_po_item_material_type(item_data)
    
    def test_validate_no_material_type_fails(self):
        """Test validation fails when no material type specified"""
        item_data = {
            'medicine_id': None,
            'raw_material_id': None,
            'packing_material_id': None
        }
        
        with pytest.raises(AppException) as exc_info:
            validate_po_item_material_type(item_data)
        
        assert exc_info.value.error_code == "ERR_VALIDATION"
        assert "at least one material type" in exc_info.value.message
    
    def test_validate_multiple_material_types_fails(self):
        """Test validation fails when multiple material types specified"""
        item_data = {
            'medicine_id': 1,
            'raw_material_id': 2,
            'packing_material_id': None
        }
        
        with pytest.raises(AppException) as exc_info:
            validate_po_item_material_type(item_data)
        
        assert exc_info.value.error_code == "ERR_VALIDATION"
        assert "only have ONE material type" in exc_info.value.message
    
    def test_database_constraint_prevents_multiple_materials(self, db: Session, test_po):
        """Test database constraint prevents inserting item with multiple materials"""
        # This test requires a real database connection
        # Skip if using in-memory SQLite
        if db.bind.dialect.name == 'sqlite':
            pytest.skip("SQLite does not support CHECK constraints fully")
        
        item = POItem(
            po_id=test_po.id,
            medicine_id=1,
            raw_material_id=2,  # INVALID: Two material types
            ordered_quantity=100
        )
        
        db.add(item)
        
        with pytest.raises(IntegrityError):
            db.commit()
        
        db.rollback()


class TestPOItemAmountCalculations:
    """Integration tests for PO item calculations"""
    
    def test_create_po_item_with_auto_calculation(self, db: Session, test_po):
        """Test creating PO item and calculating amounts"""
        item = POItem(
            po_id=test_po.id,
            raw_material_id=1,
            ordered_quantity=Decimal('225'),
            unit='KG',
            hsn_code='30049099',
            rate_per_unit=Decimal('1675.00'),
            gst_rate=Decimal('18.00')
        )
        
        # Calculate amounts
        item = calculate_po_item_amounts(item)
        
        assert item.value_amount == Decimal('376875.00')
        assert item.gst_amount == Decimal('67837.50')
        assert item.total_amount == Decimal('444712.50')
    
    def test_update_rate_recalculates_amounts(self, db: Session, test_po):
        """Test updating rate recalculates all amounts"""
        item = POItem(
            po_id=test_po.id,
            raw_material_id=1,
            ordered_quantity=Decimal('100'),
            rate_per_unit=Decimal('1000.00'),
            gst_rate=Decimal('18.00')
        )
        
        # Initial calculation
        item = calculate_po_item_amounts(item)
        assert item.value_amount == Decimal('100000.00')
        
        # Update rate
        item.rate_per_unit = Decimal('1500.00')
        item = calculate_po_item_amounts(item)
        
        assert item.value_amount == Decimal('150000.00')
        assert item.gst_amount == Decimal('27000.00')
        assert item.total_amount == Decimal('177000.00')
    
    def test_update_quantity_recalculates_amounts(self, db: Session, test_po):
        """Test updating quantity recalculates all amounts"""
        item = POItem(
            po_id=test_po.id,
            raw_material_id=1,
            ordered_quantity=Decimal('100'),
            rate_per_unit=Decimal('1000.00'),
            gst_rate=Decimal('18.00')
        )
        
        # Initial calculation
        item = calculate_po_item_amounts(item)
        assert item.value_amount == Decimal('100000.00')
        
        # Update quantity
        item.ordered_quantity = Decimal('200')
        item = calculate_po_item_amounts(item)
        
        assert item.value_amount == Decimal('200000.00')
        assert item.gst_amount == Decimal('36000.00')
        assert item.total_amount == Decimal('236000.00')


# Fixtures
@pytest.fixture
def test_po(db: Session):
    """Create a test PO"""
    po = PurchaseOrder(
        po_number='PO/TEST/001',
        po_date=date.today(),
        po_type=POType.RM,
        eopa_id=1,
        vendor_id=1,
        status=POStatus.DRAFT,
        created_by=1
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
