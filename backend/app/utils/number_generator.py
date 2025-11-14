from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func


def get_financial_year():
    """Get current financial year in YY-YY format (e.g., 24-25)"""
    now = datetime.now()
    if now.month >= 4:  # April onwards
        return f"{now.year % 100:02d}-{(now.year + 1) % 100:02d}"
    else:  # January to March
        return f"{(now.year - 1) % 100:02d}-{now.year % 100:02d}"


def generate_pi_number(db: Session) -> str:
    """Generate PI number: PI/YY-YY/0001"""
    from app.models.pi import PI
    
    fy = get_financial_year()
    prefix = f"PI/{fy}/"
    
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
    """Generate EOPA number: EOPA/YY-YY/0001"""
    from app.models.eopa import EOPA
    
    fy = get_financial_year()
    prefix = f"EOPA/{fy}/"
    
    last_eopa = db.query(EOPA).filter(
        EOPA.eopa_number.like(f"{prefix}%")
    ).order_by(EOPA.eopa_number.desc()).first()
    
    if last_eopa:
        last_num = int(last_eopa.eopa_number.split("/")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:04d}"


def generate_po_number(db: Session, po_type: str) -> str:
    """Generate PO number: PO/{TYPE}/YY-YY/0001"""
    from app.models.po import PurchaseOrder
    
    fy = get_financial_year()
    prefix = f"PO/{po_type}/{fy}/"
    
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
