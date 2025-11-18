from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

logger = logging.getLogger("pharma")


def get_financial_year(db: Session = None):
    """
    Get current financial year in YY-YY format (e.g., 24-25)
    
    If db session provided, reads fiscal year config from database.
    Otherwise, calculates from current date (April = start of FY).
    """
    if db:
        try:
            # Lazy import to avoid circular dependency
            from app.services.configuration_service import ConfigurationService
            config_service = ConfigurationService(db)
            fiscal_year_config = config_service.get_config("fiscal_year")
            return fiscal_year_config.get("value", "24-25")
        except Exception as e:
            logger.warning(f"Failed to get fiscal year from config, using calculated: {e}")
    
    # Fallback: calculate from current date
    now = datetime.now()
    if now.month >= 4:  # April onwards
        return f"{now.year % 100:02d}-{(now.year + 1) % 100:02d}"
    else:  # January to March
        return f"{(now.year - 1) % 100:02d}-{now.year % 100:02d}"


def generate_pi_number(db: Session) -> str:
    """Generate PI number using configured format: PI/{FY}/{SEQ:04d}"""
    from app.models.pi import PI
    from app.services.configuration_service import ConfigurationService  # Lazy import
    
    config_service = ConfigurationService(db)
    numbering = config_service.get_document_numbering()
    format_template = numbering.get("pi_format", "PI/{FY}/{SEQ:04d}")
    
    fy = get_financial_year(db)
    prefix = format_template.replace("{FY}", fy).split("{SEQ")[0]
    
    # Get last number for this financial year
    last_pi = db.query(PI).filter(
        PI.pi_number.like(f"{prefix}%")
    ).order_by(PI.pi_number.desc()).first()
    
    if last_pi:
        last_num = int(last_pi.pi_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_eopa_number(db: Session) -> str:
    """Generate EOPA number using configured format: EOPA/{FY}/{SEQ:04d}"""
    from app.models.eopa import EOPA
    from app.services.configuration_service import ConfigurationService  # Lazy import
    
    config_service = ConfigurationService(db)
    numbering = config_service.get_document_numbering()
    format_template = numbering.get("eopa_format", "EOPA/{FY}/{SEQ:04d}")
    
    fy = get_financial_year(db)
    prefix = format_template.replace("{FY}", fy).split("{SEQ")[0]
    
    last_eopa = db.query(EOPA).filter(
        EOPA.eopa_number.like(f"{prefix}%")
    ).order_by(EOPA.eopa_number.desc()).first()
    
    if last_eopa:
        last_num = int(last_eopa.eopa_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_po_number(db: Session, po_type: str, medicine_sequence: int = None, is_draft: bool = True) -> str:
    """
    Generate PO number using configured format
    Draft PO formats:
    - RM: PO/{FY}/RM/DRAFT/{SEQ:04d}
    - PM: PO/{FY}/PM/DRAFT/{SEQ:04d}
    - FG: PO/{FY}/FG/DRAFT/{SEQ:04d}
    
    Final PO formats (after approval):
    - RM: PO/{FY}/RM/{SEQ:04d}
    - PM: PO/{FY}/PM/{SEQ:04d}
    - FG: PO/{FY}/FG/{SEQ:04d}
    
    Args:
        db: Database session
        po_type: Type of PO (FG, RM, PM)
        medicine_sequence: Sequence number of medicine in EOPA (optional, for future use)
        is_draft: Whether this is a draft PO (default True)
    """
    from app.models.po import PurchaseOrder
    from app.services.configuration_service import ConfigurationService  # Lazy import
    
    config_service = ConfigurationService(db)
    numbering = config_service.get_document_numbering()
    
    fy = get_financial_year(db)
    
    if medicine_sequence:
        # New format with medicine sequence: PO/YY-YY/TYPE/SEQ/0001
        prefix = f"PO/{fy}/{po_type}/{medicine_sequence}/"
    elif is_draft:
        # Draft format: PO/YY-YY/TYPE/DRAFT/0001
        prefix = f"PO/{fy}/{po_type}/DRAFT/"
    else:
        # Use configured format for final POs
        format_key = f"po_{po_type.lower()}_format"
        format_template = numbering.get(format_key, f"PO/{po_type}/{{FY}}/{{SEQ:04d}}")
        prefix = format_template.replace("{FY}", fy).split("{SEQ")[0]
    
    last_po = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{prefix}%")
    ).order_by(PurchaseOrder.po_number.desc()).first()
    
    if last_po:
        last_num = int(last_po.po_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_receipt_number(db: Session) -> str:
    """Generate Material Receipt number: MR/YY-YY/0001"""
    from app.models.material import MaterialReceipt
    
    fy = get_financial_year()
    prefix = f"MR/{fy}/"
    
    last_receipt = db.query(MaterialReceipt).filter(
        MaterialReceipt.receipt_number.like(f"{prefix}%")
    ).order_by(MaterialReceipt.receipt_number.desc()).first()
    
    if last_receipt:
        last_num = int(last_receipt.receipt_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_dispatch_number(db: Session) -> str:
    """Generate Dispatch Advice number: DA/YY-YY/0001"""
    from app.models.material import DispatchAdvice
    
    fy = get_financial_year()
    prefix = f"DA/{fy}/"
    
    last_dispatch = db.query(DispatchAdvice).filter(
        DispatchAdvice.dispatch_number.like(f"{prefix}%")
    ).order_by(DispatchAdvice.dispatch_number.desc()).first()
    
    if last_dispatch:
        last_num = int(last_dispatch.dispatch_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_grn_number(db: Session) -> str:
    """Generate Warehouse GRN number: GRN/YY-YY/0001"""
    from app.models.material import WarehouseGRN
    
    fy = get_financial_year()
    prefix = f"GRN/{fy}/"
    
    last_grn = db.query(WarehouseGRN).filter(
        WarehouseGRN.grn_number.like(f"{prefix}%")
    ).order_by(WarehouseGRN.grn_number.desc()).first()
    
    if last_grn:
        last_num = int(last_grn.grn_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_rm_code(db: Session) -> str:
    """Generate Raw Material code: RM-0001"""
    from app.models.raw_material import RawMaterialMaster
    
    prefix = "RM-"
    
    last_rm = db.query(RawMaterialMaster).filter(
        RawMaterialMaster.rm_code.like(f"{prefix}%")
    ).order_by(RawMaterialMaster.rm_code.desc()).first()
    
    if last_rm:
        try:
            last_num = int(last_rm.rm_code.replace(prefix, ""))
            new_num = last_num + 1
        except ValueError:
            # If existing codes don't follow pattern, start from 1
            new_num = 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_pm_code(db: Session) -> str:
    """Generate Packing Material code: PM-0001"""
    from app.models.packing_material import PackingMaterialMaster
    
    prefix = "PM-"
    
    last_pm = db.query(PackingMaterialMaster).filter(
        PackingMaterialMaster.pm_code.like(f"{prefix}%")
    ).order_by(PackingMaterialMaster.pm_code.desc()).first()
    
    if last_pm:
        try:
            last_num = int(last_pm.pm_code.replace(prefix, ""))
            new_num = last_num + 1
        except ValueError:
            # If existing codes don't follow pattern, start from 1
            new_num = 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"
