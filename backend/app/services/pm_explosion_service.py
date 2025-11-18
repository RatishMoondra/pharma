"""
Packing Material Explosion Service

Handles Bill of Materials (BOM) explosion for converting EOPA medicines into packing material requirements.
Groups packing materials by vendor for efficient PO generation.
"""
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Tuple
from decimal import Decimal
from collections import defaultdict
import logging

from app.models.eopa import EOPA, EOPAItem
from app.models.product import MedicineMaster
from app.models.packing_material import PackingMaterialMaster, MedicinePackingMaterial
from app.models.vendor import Vendor
from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


class PMExplosionService:
    """
    Service for exploding medicine requirements into packing material requirements.
    
    Key Responsibilities:
    1. Calculate total packing materials needed based on EOPA medicine quantities
    2. Group packing materials by vendor
    3. Apply wastage percentages
    4. Validate vendor mappings
    5. Generate vendor-grouped PM PO previews
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def explode_eopa_to_packing_materials(
        self,
        eopa_id: int,
        include_inactive: bool = False
    ) -> Dict:
        """
        Perform PM explosion for an EOPA.
        
        Args:
            eopa_id: EOPA ID to explode
            include_inactive: Include inactive packing materials (default False)
            
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
                        "packing_materials": [
                            {
                                "packing_material_id": int,
                                "packing_material_code": str,
                                "packing_material_name": str,
                                "pm_type": str,
                                "language": str,
                                "artwork_version": str,
                                "gsm": Decimal,
                                "ply": int,
                                "dimensions": str,
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
            "event": "PM_EXPLOSION_STARTED",
            "eopa_id": eopa_id,
            "eopa_number": eopa.eopa_number,
            "total_eopa_items": len(eopa.items)
        })
        
        # Explode each EOPA item into packing materials
        packing_material_requirements = []
        
        for eopa_item in eopa.items:
            pi_item = eopa_item.pi_item
            medicine = pi_item.medicine
            
            if not medicine:
                logger.warning({
                    "event": "PM_EXPLOSION_SKIPPED_NO_MEDICINE",
                    "eopa_item_id": eopa_item.id,
                    "pi_item_id": pi_item.id
                })
                continue
            
            # Get medicine packing materials (BOM)
            medicine_pms = self.db.query(MedicinePackingMaterial).options(
                joinedload(MedicinePackingMaterial.packing_material).joinedload(PackingMaterialMaster.default_vendor),
                joinedload(MedicinePackingMaterial.vendor)
            ).filter(
                MedicinePackingMaterial.medicine_id == medicine.id,
                MedicinePackingMaterial.is_active == True
            ).all()
            
            if not medicine_pms:
                logger.warning({
                    "event": "PM_EXPLOSION_NO_BOM",
                    "medicine_id": medicine.id,
                    "medicine_name": medicine.medicine_name,
                    "eopa_item_id": eopa_item.id
                })
                # Don't skip - raise error to ensure BOM is defined
                raise AppException(
                    f"No Packing Material BOM defined for medicine '{medicine.medicine_name}'. "
                    f"Please add packing material mappings in Medicine Master.",
                    "ERR_BOM_NOT_DEFINED",
                    400
                )
            
            # Calculate packing material requirements for this medicine
            for med_pm in medicine_pms:
                if not include_inactive and not med_pm.packing_material.is_active:
                    continue
                
                # Determine vendor (priority: medicine_pm.vendor > packing_material.default_vendor)
                vendor = med_pm.vendor or med_pm.packing_material.default_vendor
                
                if not vendor:
                    raise AppException(
                        f"No vendor assigned for packing material '{med_pm.packing_material.pm_name}' "
                        f"in medicine '{medicine.medicine_name}'. "
                        f"Please assign a vendor in Medicine Master or Packing Material Master.",
                        "ERR_VENDOR_NOT_MAPPED",
                        400
                    )
                
                # Calculate total quantity needed
                # Formula: (EOPA quantity) × (qty_required_per_unit) × (1 + wastage_percentage/100)
                base_qty = Decimal(str(eopa_item.quantity)) * med_pm.qty_required_per_unit
                wastage_multiplier = Decimal("1") + (med_pm.wastage_percentage / Decimal("100"))
                total_qty = base_qty * wastage_multiplier
                
                # HSN and GST (priority: medicine_pm > packing_material)
                hsn_code = med_pm.hsn_code or med_pm.packing_material.hsn_code
                gst_rate = med_pm.gst_rate or med_pm.packing_material.gst_rate
                
                # Artwork and language (priority: medicine_pm override > packing_material default)
                language = med_pm.language_override or med_pm.packing_material.language
                artwork_version = med_pm.artwork_version_override or med_pm.packing_material.artwork_version
                
                packing_material_requirements.append({
                    "packing_material_id": med_pm.packing_material.id,
                    "packing_material_code": med_pm.packing_material.pm_code,
                    "packing_material_name": med_pm.packing_material.pm_name,
                    "pm_type": med_pm.packing_material.pm_type,
                    "language": language,
                    "artwork_version": artwork_version,
                    "gsm": med_pm.packing_material.gsm,
                    "ply": med_pm.packing_material.ply,
                    "dimensions": med_pm.packing_material.dimensions,
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.vendor_name,
                    "vendor_code": vendor.vendor_code,
                    "vendor_type": vendor.vendor_type.value,
                    "qty_required": total_qty,
                    "uom": med_pm.uom,
                    "hsn_code": hsn_code,
                    "gst_rate": gst_rate,
                    "medicine_id": medicine.id,
                    "medicine_name": medicine.medicine_name,
                    "eopa_item_id": eopa_item.id,
                    "notes": med_pm.notes,
                    "is_critical": med_pm.is_critical
                })
        
        # Group by vendor
        grouped_by_vendor = self._group_by_vendor(packing_material_requirements)
        
        logger.info({
            "event": "PM_EXPLOSION_COMPLETED",
            "eopa_id": eopa_id,
            "total_packing_materials": len(packing_material_requirements),
            "total_vendors": len(grouped_by_vendor)
        })
        
        return {
            "eopa_id": eopa.id,
            "eopa_number": eopa.eopa_number,
            "total_vendors": len(grouped_by_vendor),
            "grouped_by_vendor": grouped_by_vendor
        }
    
    def _group_by_vendor(self, packing_materials: List[Dict]) -> List[Dict]:
        """
        Group packing materials by vendor.
        
        Consolidates duplicate packing materials from the same vendor by summing quantities.
        
        Args:
            packing_materials: List of packing material requirements
            
        Returns:
            List of vendor groups with consolidated packing materials
        """
        vendor_groups = defaultdict(list)
        
        # First pass: group by vendor
        for pm in packing_materials:
            vendor_id = pm["vendor_id"]
            vendor_groups[vendor_id].append(pm)
        
        # Second pass: consolidate duplicates within each vendor
        result = []
        for vendor_id, pms in vendor_groups.items():
            # Consolidate duplicate packing materials (same PM + language + artwork version)
            consolidated = {}
            vendor_info = None
            
            for pm in pms:
                if vendor_info is None:
                    vendor_info = {
                        "vendor_id": pm["vendor_id"],
                        "vendor_name": pm["vendor_name"],
                        "vendor_code": pm["vendor_code"],
                        "vendor_type": pm["vendor_type"]
                    }
                
                # Use packing_material_id + language + artwork_version as consolidation key
                pm_key = (pm["packing_material_id"], pm["language"], pm["artwork_version"])
                
                if pm_key in consolidated:
                    # Sum quantities for duplicate packing materials
                    consolidated[pm_key]["qty_required"] += pm["qty_required"]
                    # Append notes if different
                    if pm["notes"] and pm["notes"] not in (consolidated[pm_key]["notes"] or ""):
                        existing_notes = consolidated[pm_key]["notes"] or ""
                        consolidated[pm_key]["notes"] = f"{existing_notes}; {pm['notes']}" if existing_notes else pm["notes"]
                else:
                    consolidated[pm_key] = pm
            
            result.append({
                **vendor_info,
                "total_items": len(consolidated),
                "packing_materials": list(consolidated.values())
            })
        
        # Sort by vendor name
        result.sort(key=lambda x: x["vendor_name"])
        
        return result
    
    def validate_bom_completeness(self, medicine_id: int) -> Tuple[bool, List[str]]:
        """
        Validate that a medicine has a complete PM BOM definition.
        
        Args:
            medicine_id: Medicine ID to validate
            
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        medicine = self.db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
        if not medicine:
            return False, ["Medicine not found"]
        
        # Check if PM BOM exists
        bom_count = self.db.query(MedicinePackingMaterial).filter(
            MedicinePackingMaterial.medicine_id == medicine_id,
            MedicinePackingMaterial.is_active == True
        ).count()
        
        if bom_count == 0:
            issues.append(f"No Packing Material BOM defined for medicine '{medicine.medicine_name}'")
        
        # Check vendor mappings
        bom_items = self.db.query(MedicinePackingMaterial).options(
            joinedload(MedicinePackingMaterial.packing_material).joinedload(PackingMaterialMaster.default_vendor),
            joinedload(MedicinePackingMaterial.vendor)
        ).filter(
            MedicinePackingMaterial.medicine_id == medicine_id,
            MedicinePackingMaterial.is_active == True
        ).all()
        
        for bom_item in bom_items:
            vendor = bom_item.vendor or bom_item.packing_material.default_vendor
            if not vendor:
                issues.append(
                    f"Packing material '{bom_item.packing_material.pm_name}' has no vendor assigned"
                )
        
        return len(issues) == 0, issues
    
    def get_po_preview(self, eopa_id: int) -> List[Dict]:
        """
        Generate PO preview for PM explosion (before actual PO creation).
        
        Args:
            eopa_id: EOPA ID
            
        Returns:
            List of PO previews grouped by vendor
        """
        explosion_result = self.explode_eopa_to_packing_materials(eopa_id)
        
        po_previews = []
        for vendor_group in explosion_result["grouped_by_vendor"]:
            po_previews.append({
                "vendor_id": vendor_group["vendor_id"],
                "vendor_name": vendor_group["vendor_name"],
                "vendor_code": vendor_group["vendor_code"],
                "po_type": "PM",
                "total_line_items": vendor_group["total_items"],
                "items": vendor_group["packing_materials"],
                "editable": True  # User can edit quantities/vendors before final PO creation
            })
        
        return po_previews
