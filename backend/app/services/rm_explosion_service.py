"""
Raw Material Explosion Service

Handles Bill of Materials (BOM) explosion for converting EOPA medicines into raw material requirements.
Groups raw materials by vendor for efficient PO generation.
"""
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Tuple
from decimal import Decimal
from collections import defaultdict
import logging

from app.models.eopa import EOPA, EOPAItem
from app.models.product import MedicineMaster
from app.models.raw_material import RawMaterialMaster, MedicineRawMaterial
from app.models.vendor import Vendor
from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


class RMExplosionService:
    """
    Service for exploding medicine requirements into raw material requirements.
    
    Key Responsibilities:
    1. Calculate total raw materials needed based on EOPA medicine quantities
    2. Group raw materials by vendor
    3. Apply wastage percentages
    4. Validate vendor mappings
    5. Generate vendor-grouped RM PO previews
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def explode_eopa_to_raw_materials(
        self,
        eopa_id: int,
        include_inactive: bool = False
    ) -> Dict:
        """
        Perform RM explosion for an EOPA.
        
        Args:
            eopa_id: EOPA ID to explode
            include_inactive: Include inactive raw materials (default False)
            
        Returns:
            Dict with structure:
            {
                "eopa_id": int,
                "eopa_number": str,
                "total_vendors": int,
                "grouped_by_vendor": [
                    {
                        "vendor_id": int,
                        "vendor_name": str,
                        "vendor_code": str,
                        "vendor_type": str,
                        "total_items": int,
                        "raw_materials": [
                            {
                                "raw_material_id": int,
                                "raw_material_code": str,
                                "raw_material_name": str,
                                "vendor_id": int,
                                "vendor_name": str,
                                "qty_required": Decimal,
                                "uom": str,
                                "hsn_code": str,
                                "gst_rate": Decimal,
                                "medicine_id": int,
                                "medicine_name": str,
                                "eopa_item_id": int,
                                "notes": str
                            }
                        ]
                    }
                ]
            }
        """
        # Load EOPA with all required relationships
        eopa = self.db.query(EOPA).options(
            joinedload(EOPA.items).joinedload(EOPAItem.pi_item).joinedload("medicine")
        ).filter(EOPA.id == eopa_id).first()
        
        if not eopa:
            raise AppException(f"EOPA with ID {eopa_id} not found", "ERR_NOT_FOUND", 404)
        
        logger.info({
            "event": "RM_EXPLOSION_STARTED",
            "eopa_id": eopa_id,
            "eopa_number": eopa.eopa_number,
            "total_eopa_items": len(eopa.items)
        })
        
        # Explode each EOPA item into raw materials
        raw_material_requirements = []
        
        for eopa_item in eopa.items:
            pi_item = eopa_item.pi_item
            medicine = pi_item.medicine
            
            if not medicine:
                logger.warning({
                    "event": "RM_EXPLOSION_SKIPPED_NO_MEDICINE",
                    "eopa_item_id": eopa_item.id,
                    "pi_item_id": pi_item.id
                })
                continue
            
            # Get medicine raw materials (BOM)
            medicine_rms = self.db.query(MedicineRawMaterial).options(
                joinedload(MedicineRawMaterial.raw_material).joinedload(RawMaterialMaster.default_vendor),
                joinedload(MedicineRawMaterial.vendor)
            ).filter(
                MedicineRawMaterial.medicine_id == medicine.id,
                MedicineRawMaterial.is_active == True
            ).all()
            
            if not medicine_rms:
                logger.warning({
                    "event": "RM_EXPLOSION_NO_BOM",
                    "medicine_id": medicine.id,
                    "medicine_name": medicine.medicine_name,
                    "eopa_item_id": eopa_item.id
                })
                # Don't skip - raise error to ensure BOM is defined
                raise AppException(
                    f"No Bill of Materials defined for medicine '{medicine.medicine_name}'. "
                    f"Please add raw material mappings in Medicine Master.",
                    "ERR_BOM_NOT_DEFINED",
                    400
                )
            
            # Calculate raw material requirements for this medicine
            for med_rm in medicine_rms:
                if not include_inactive and not med_rm.raw_material.is_active:
                    continue
                
                # Determine vendor (priority: medicine_rm.vendor > raw_material.default_vendor)
                vendor = med_rm.vendor or med_rm.raw_material.default_vendor
                
                if not vendor:
                    raise AppException(
                        f"No vendor assigned for raw material '{med_rm.raw_material.rm_name}' "
                        f"in medicine '{medicine.medicine_name}'. "
                        f"Please assign a vendor in Medicine Master or Raw Material Master.",
                        "ERR_VENDOR_NOT_MAPPED",
                        400
                    )
                
                # Calculate total quantity needed
                # Formula: (EOPA quantity) × (qty_required_per_unit) × (1 + wastage_percentage/100)
                base_qty = Decimal(str(eopa_item.quantity)) * med_rm.qty_required_per_unit
                wastage_multiplier = Decimal("1") + (med_rm.wastage_percentage / Decimal("100"))
                total_qty = base_qty * wastage_multiplier
                
                # HSN and GST (priority: medicine_rm > raw_material)
                hsn_code = med_rm.hsn_code or med_rm.raw_material.hsn_code
                gst_rate = med_rm.gst_rate or med_rm.raw_material.gst_rate
                
                raw_material_requirements.append({
                    "raw_material_id": med_rm.raw_material.id,
                    "raw_material_code": med_rm.raw_material.rm_code,
                    "raw_material_name": med_rm.raw_material.rm_name,
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.vendor_name,
                    "vendor_code": vendor.vendor_code,
                    "vendor_type": vendor.vendor_type.value,
                    "qty_required": total_qty,
                    "uom": med_rm.uom,
                    "hsn_code": hsn_code,
                    "gst_rate": gst_rate,
                    "medicine_id": medicine.id,
                    "medicine_name": medicine.medicine_name,
                    "eopa_item_id": eopa_item.id,
                    "notes": med_rm.notes,
                    "is_critical": med_rm.is_critical
                })
        
        # Group by vendor
        grouped_by_vendor = self._group_by_vendor(raw_material_requirements)
        
        logger.info({
            "event": "RM_EXPLOSION_COMPLETED",
            "eopa_id": eopa_id,
            "total_raw_materials": len(raw_material_requirements),
            "total_vendors": len(grouped_by_vendor)
        })
        
        return {
            "eopa_id": eopa.id,
            "eopa_number": eopa.eopa_number,
            "total_vendors": len(grouped_by_vendor),
            "grouped_by_vendor": grouped_by_vendor
        }
    
    def _group_by_vendor(self, raw_materials: List[Dict]) -> List[Dict]:
        """
        Group raw materials by vendor.
        
        Consolidates duplicate raw materials from the same vendor by summing quantities.
        
        Args:
            raw_materials: List of raw material requirements
            
        Returns:
            List of vendor groups with consolidated raw materials
        """
        vendor_groups = defaultdict(list)
        
        # First pass: group by vendor
        for rm in raw_materials:
            vendor_id = rm["vendor_id"]
            vendor_groups[vendor_id].append(rm)
        
        # Second pass: consolidate duplicates within each vendor
        result = []
        for vendor_id, rms in vendor_groups.items():
            # Consolidate duplicate raw materials
            consolidated = {}
            vendor_info = None
            
            for rm in rms:
                if vendor_info is None:
                    vendor_info = {
                        "vendor_id": rm["vendor_id"],
                        "vendor_name": rm["vendor_name"],
                        "vendor_code": rm["vendor_code"],
                        "vendor_type": rm["vendor_type"]
                    }
                
                # Use raw_material_id as consolidation key
                rm_key = rm["raw_material_id"]
                
                if rm_key in consolidated:
                    # Sum quantities for duplicate raw materials
                    consolidated[rm_key]["qty_required"] += rm["qty_required"]
                    # Append notes if different
                    if rm["notes"] and rm["notes"] not in (consolidated[rm_key]["notes"] or ""):
                        existing_notes = consolidated[rm_key]["notes"] or ""
                        consolidated[rm_key]["notes"] = f"{existing_notes}; {rm['notes']}" if existing_notes else rm["notes"]
                else:
                    consolidated[rm_key] = rm
            
            result.append({
                **vendor_info,
                "total_items": len(consolidated),
                "raw_materials": list(consolidated.values())
            })
        
        # Sort by vendor name
        result.sort(key=lambda x: x["vendor_name"])
        
        return result
    
    def validate_bom_completeness(self, medicine_id: int) -> Tuple[bool, List[str]]:
        """
        Validate that a medicine has a complete BOM definition.
        
        Args:
            medicine_id: Medicine ID to validate
            
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        medicine = self.db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
        if not medicine:
            return False, ["Medicine not found"]
        
        # Check if BOM exists
        bom_count = self.db.query(MedicineRawMaterial).filter(
            MedicineRawMaterial.medicine_id == medicine_id,
            MedicineRawMaterial.is_active == True
        ).count()
        
        if bom_count == 0:
            issues.append(f"No Bill of Materials defined for medicine '{medicine.medicine_name}'")
        
        # Check vendor mappings
        bom_items = self.db.query(MedicineRawMaterial).options(
            joinedload(MedicineRawMaterial.raw_material).joinedload(RawMaterialMaster.default_vendor),
            joinedload(MedicineRawMaterial.vendor)
        ).filter(
            MedicineRawMaterial.medicine_id == medicine_id,
            MedicineRawMaterial.is_active == True
        ).all()
        
        for bom_item in bom_items:
            vendor = bom_item.vendor or bom_item.raw_material.default_vendor
            if not vendor:
                issues.append(
                    f"Raw material '{bom_item.raw_material.rm_name}' has no vendor assigned"
                )
        
        return len(issues) == 0, issues
    
    def get_po_preview(self, eopa_id: int) -> List[Dict]:
        """
        Generate PO preview for RM explosion (before actual PO creation).
        
        Args:
            eopa_id: EOPA ID
            
        Returns:
            List of PO previews grouped by vendor
        """
        explosion_result = self.explode_eopa_to_raw_materials(eopa_id)
        
        po_previews = []
        for vendor_group in explosion_result["grouped_by_vendor"]:
            po_previews.append({
                "vendor_id": vendor_group["vendor_id"],
                "vendor_name": vendor_group["vendor_name"],
                "vendor_code": vendor_group["vendor_code"],
                "po_type": "RM",
                "total_line_items": vendor_group["total_items"],
                "items": vendor_group["raw_materials"],
                "editable": True  # User can edit quantities/vendors before final PO creation
            })
        
        return po_previews
