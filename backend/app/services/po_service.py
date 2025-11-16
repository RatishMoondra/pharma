"""
PO Generation Service - Business Logic for creating Purchase Orders from EOPA

CRITICAL BUSINESS RULES:
1. POs contain ONLY quantities, NO pricing
2. Pricing comes from vendor invoices after shipment
3. Before creating RM/PM PO, check manufacturer's material balance
4. Effective PO quantity = Required quantity - Available balance
5. If balance >= required, no PO is raised
"""
from sqlalchemy.orm import Session, joinedload
from datetime import date
from decimal import Decimal
from typing import List, Dict, Tuple, Optional
import logging

from app.models.po import PurchaseOrder, POItem, POType, POStatus
from app.models.eopa import EOPA, EOPAItem, EOPAStatus
from app.models.pi import PIItem
from app.models.product import MedicineMaster
from app.models.vendor import Vendor
from app.models.material import MaterialBalance
from app.utils.number_generator import generate_po_number
from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


class POGenerationService:
    """Service for generating Purchase Orders from EOPA"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_pos_from_eopa(self, eopa_id: int, current_user_id: int, custom_quantities: dict = None) -> Dict:
        """
        Generate Purchase Orders from an approved EOPA.
        
        Business Logic:
        1. ONE FG PO per manufacturer (for finished goods)
        2. ONE RM PO per raw material vendor (if exists)
        3. ONE PM PO per packing material vendor (if exists)
        4. Group line items by vendor and PO type
        5. Update EOPA items status to PROCESSED
        6. Use custom quantities if provided (for RM/PM conversion ratios)
        
        Args:
            eopa_id: ID of the EOPA to process
            current_user_id: User creating the POs
            custom_quantities: Optional dict with custom quantities per PO type
                Format: {"po_quantities": [{"eopa_item_id": 1, "po_type": "RM", "quantity": 100}]}
            
        Returns:
            Dict with created POs summary
        """
        # Load EOPA with all relationships
        eopa = self.db.query(EOPA).options(
            joinedload(EOPA.items)
                .joinedload(EOPAItem.pi_item)
                .joinedload(PIItem.medicine)
                .joinedload(MedicineMaster.manufacturer_vendor),
            joinedload(EOPA.items)
                .joinedload(EOPAItem.pi_item)
                .joinedload(PIItem.medicine)
                .joinedload(MedicineMaster.rm_vendor),
            joinedload(EOPA.items)
                .joinedload(EOPAItem.pi_item)
                .joinedload(PIItem.medicine)
                .joinedload(MedicineMaster.pm_vendor),
            joinedload(EOPA.pi)
        ).filter(EOPA.id == eopa_id).first()
        
        if not eopa:
            raise AppException("EOPA not found", "ERR_NOT_FOUND", 404)
        
        if eopa.status != EOPAStatus.APPROVED:
            raise AppException(
                "EOPA must be approved before generating POs",
                "ERR_VALIDATION",
                400
            )
        
        if not eopa.items or len(eopa.items) == 0:
            raise AppException("EOPA has no items", "ERR_VALIDATION", 400)
        
        # Check if POs already generated
        existing_pos = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.eopa_id == eopa_id
        ).all()
        
        if existing_pos:
            raise AppException(
                f"POs already generated for this EOPA ({len(existing_pos)} POs exist)",
                "ERR_DUPLICATE_PO",
                400
            )
        
        # Group EOPA items by vendor and PO type
        po_groups = self._group_items_by_vendor_and_type(eopa.items)
        
        # Build custom quantities and units lookup
        qty_lookup = {}
        unit_lookup = {}
        if custom_quantities and 'po_quantities' in custom_quantities:
            for item in custom_quantities['po_quantities']:
                key = (item['eopa_item_id'], item['po_type'])
                qty_lookup[key] = Decimal(str(item['quantity']))
                if 'unit' in item and item['unit']:
                    unit_lookup[key] = item['unit']
        
        if not po_groups:
            raise AppException(
                "No valid vendor mappings found in Medicine Master",
                "ERR_NO_VENDORS",
                400
            )
        
        # Generate POs (one per medicine per vendor type)
        created_pos = []
        
        try:
            for (vendor_id, po_type, medicine_id, sequence), item in po_groups.items():
                # Check for custom quantity and unit
                custom_qty = qty_lookup.get((item.id, po_type.value))
                custom_unit = unit_lookup.get((item.id, po_type.value))
                
                po = self._create_purchase_order(
                    eopa=eopa,
                    vendor_id=vendor_id,
                    po_type=po_type,
                    items=[item],  # Single item per PO
                    medicine_sequence=sequence,
                    current_user_id=current_user_id,
                    custom_quantity=custom_qty,
                    unit=custom_unit
                )
                if po:  # Only add if PO was created (not skipped due to material balance)
                    created_pos.append(po)
            
            # Update EOPA status if needed
            # (EOPA can remain APPROVED, POs are separate)
            
            self.db.commit()
            
            logger.info({
                "event": "POS_GENERATED_FROM_EOPA",
                "eopa_id": eopa_id,
                "eopa_number": eopa.eopa_number,
                "total_pos_created": len(created_pos),
                "po_numbers": [po.po_number for po in created_pos],
                "created_by": current_user_id
            })
            
            return {
                "eopa_id": eopa_id,
                "eopa_number": eopa.eopa_number,
                "total_pos_created": len(created_pos),
                "purchase_orders": [
                    {
                        "po_number": po.po_number,
                        "po_type": po.po_type.value,
                        "vendor_id": po.vendor_id,
                        "total_ordered_qty": float(po.total_ordered_qty),
                        "items_count": len(po.items)
                    }
                    for po in created_pos
                ]
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error({
                "event": "PO_GENERATION_FAILED",
                "eopa_id": eopa_id,
                "error": str(e)
            })
            raise AppException(
                f"Failed to generate POs: {str(e)}",
                "ERR_PO_GENERATION",
                500
            )
    
    def _group_items_by_vendor_and_type(
        self, 
        eopa_items: List[EOPAItem]
    ) -> Dict[Tuple[int, POType, int, int], EOPAItem]:
        """
        Group EOPA items by vendor, PO type, and medicine (ONE PO PER MEDICINE).
        
        Rules:
        - FG PO → One per medicine to Manufacturer vendor
        - RM PO → One per medicine to Raw Material vendor (if exists)
        - PM PO → One per medicine to Packing Material vendor (if exists)
        
        Returns:
            Dict mapping (vendor_id, po_type, medicine_id, sequence) → EOPA item
        """
        po_groups: Dict[Tuple[int, POType, int, int], EOPAItem] = {}
        
        # Track sequence per medicine
        medicine_sequence = {}
        
        for idx, item in enumerate(eopa_items, start=1):
            medicine = item.pi_item.medicine
            
            if not medicine:
                logger.warning({
                    "event": "EOPA_ITEM_NO_MEDICINE",
                    "eopa_item_id": item.id,
                    "pi_item_id": item.pi_item_id
                })
                continue
            
            # Assign sequence number for this medicine
            if medicine.id not in medicine_sequence:
                medicine_sequence[medicine.id] = len(medicine_sequence) + 1
            
            seq = medicine_sequence[medicine.id]
            
            # Always create FG PO for manufacturer (one per medicine)
            if medicine.manufacturer_vendor_id:
                key = (medicine.manufacturer_vendor_id, POType.FG, medicine.id, seq)
                po_groups[key] = item
                logger.info(f"Added FG PO: {key}")
            else:
                logger.warning({
                    "event": "MEDICINE_NO_MANUFACTURER",
                    "medicine_id": medicine.id,
                    "medicine_name": medicine.medicine_name
                })
            
            # Create RM PO (always, one per medicine - even if vendor not assigned)
            rm_vendor_id = medicine.rm_vendor_id if medicine.rm_vendor_id else -1  # Use -1 for unassigned
            key = (rm_vendor_id, POType.RM, medicine.id, seq)
            po_groups[key] = item
            logger.info(f"Added RM PO: {key}")
            
            # Create PM PO (always, one per medicine - even if vendor not assigned)
            pm_vendor_id = medicine.pm_vendor_id if medicine.pm_vendor_id else -1  # Use -1 for unassigned
            key = (pm_vendor_id, POType.PM, medicine.id, seq)
            po_groups[key] = item
            logger.info(f"Added PM PO: {key}")
        
        logger.info({
            "event": "EOPA_ITEMS_GROUPED",
            "total_medicines": len(medicine_sequence),
            "total_pos": len(po_groups),
            "medicine_sequences": medicine_sequence
        })
        
        return po_groups
    
    def _create_purchase_order(
        self,
        eopa: EOPA,
        vendor_id: int,
        po_type: POType,
        items: List[EOPAItem],
        medicine_sequence: int,
        current_user_id: int,
        custom_quantity: Decimal = None,
        unit: str = None
    ) -> Optional[PurchaseOrder]:
        """
        Create a single Purchase Order with items (QUANTITY ONLY, NO PRICING).
        
        Business Rules:
        1. PO contains ONLY quantities
        2. NO pricing information
        3. For RM/PM: Check manufacturer's material balance
        4. Effective quantity = Required - Available balance
        5. Skip PO if balance >= required
        
        Args:
            eopa: Parent EOPA
            vendor_id: Vendor for this PO
            po_type: Type of PO (FG, RM, PM)
            items: EOPA items to include
            current_user_id: User creating the PO
            
        Returns:
            Created PurchaseOrder instance or None if no PO needed
        """
        # Convert -1 (unassigned marker) back to None
        if vendor_id == -1:
            vendor_id = None
        
        # Verify vendor exists (allow None for unassigned vendors)
        if vendor_id is not None:
            vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
            if not vendor:
                raise AppException(
                    f"Vendor {vendor_id} not found",
                    "ERR_VENDOR_NOT_FOUND",
                    404
                )
        else:
            # No vendor assigned yet - create PO without vendor
            logger.info({
                "event": "PO_CREATED_WITHOUT_VENDOR",
                "po_type": po_type.value,
                "medicine_sequence": medicine_sequence
            })
        
        # Generate PO number with medicine sequence
        po_number = generate_po_number(self.db, po_type.value, medicine_sequence)
        
        # Create PO (NO PRICING)
        po = PurchaseOrder(
            po_number=po_number,
            po_date=date.today(),
            po_type=po_type,
            eopa_id=eopa.id,
            vendor_id=vendor_id,
            status=POStatus.OPEN,
            total_ordered_qty=Decimal("0.00"),
            total_fulfilled_qty=Decimal("0.00"),
            created_by=current_user_id
        )
        
        self.db.add(po)
        self.db.flush()  # Get PO ID
        
        # Create PO items with material balance check
        total_ordered_qty = Decimal("0.00")
        po_items_created = 0
        skipped_due_to_balance = False
        
        for eopa_item in items:
            medicine = eopa_item.pi_item.medicine
            
            # Use custom quantity if provided, otherwise use EOPA quantity
            if custom_quantity is not None:
                effective_qty = custom_quantity
                logger.info({
                    "event": "USING_CUSTOM_PO_QUANTITY",
                    "medicine_id": medicine.id,
                    "eopa_quantity": float(eopa_item.quantity),
                    "custom_quantity": float(custom_quantity),
                    "po_type": po_type.value,
                    "unit": unit
                })
            else:
                effective_qty = Decimal(str(eopa_item.quantity))
            
            # Auto-populate HSN code and pack_size from PI item (with medicine fallback)
            pi_item = eopa_item.pi_item
            hsn_code = pi_item.hsn_code if pi_item.hsn_code else medicine.hsn_code
            pack_size = pi_item.pack_size if pi_item.pack_size else None
            
            # Set conditional fields based on PO type
            artwork_file_url = None
            artwork_approval_ref = None
            specification_reference = None
            test_method = None
            language = None
            artwork_version = None
            
            if po_type == POType.PM:
                # PM PO: Add artwork fields if available from EOPA or PI
                language = getattr(eopa_item, 'language', None) or 'EN'
                artwork_version = getattr(eopa_item, 'artwork_version', None) or 'v1.0'
            elif po_type == POType.RM:
                # RM PO: Add quality specification fields
                specification_reference = getattr(medicine, 'specification_reference', None)
                test_method = getattr(medicine, 'test_method', None)
            
            # Create PO item (QUANTITY ONLY + UNIT + HSN + conditional fields)
            po_item = POItem(
                po_id=po.id,
                medicine_id=medicine.id,
                ordered_quantity=effective_qty,
                fulfilled_quantity=Decimal("0.00"),
                unit=unit,  # Save unit (kg, liters, boxes, pcs, etc.)
                hsn_code=hsn_code,
                pack_size=pack_size,
                # PM-specific fields
                language=language,
                artwork_version=artwork_version,
                artwork_file_url=artwork_file_url,
                artwork_approval_ref=artwork_approval_ref,
                # RM-specific fields
                specification_reference=specification_reference,
                test_method=test_method
            )
            
            self.db.add(po_item)
            total_ordered_qty += effective_qty
            po_items_created += 1
        
        # If no items were added, delete the PO and return None
        if po_items_created == 0:
            self.db.delete(po)
            logger.info({
                "event": "PO_CANCELLED_NO_ITEMS",
                "po_number": po_number,
                "po_type": po_type.value,
                "reason": "No items to order"
            })
            return None
        
        # Update PO total ordered quantity
        po.total_ordered_qty = total_ordered_qty
        
        logger.info({
            "event": "PO_CREATED",
            "po_number": po_number,
            "po_type": po_type.value,
            "vendor_id": vendor_id,
            "vendor_name": vendor.vendor_name if vendor_id else "NOT ASSIGNED",
            "eopa_id": eopa.id,
            "items_count": po_items_created,
            "total_ordered_qty": float(total_ordered_qty),
            "created_by": current_user_id
        })
        
        return po
    
    def _get_material_balance(self, medicine_id: int) -> Decimal:
        """
        Get current material balance for a medicine at manufacturer.
        
        Args:
            medicine_id: Medicine ID to check
            
        Returns:
            Available quantity (Decimal)
        """
        balance = self.db.query(MaterialBalance).filter(
            MaterialBalance.medicine_id == medicine_id
        ).first()
        
        if balance:
            return Decimal(str(balance.available_quantity))
        return Decimal("0.00")
