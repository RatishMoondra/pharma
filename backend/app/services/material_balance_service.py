from sqlalchemy.orm import Session
from app.models.material_balance import MaterialBalance
from app.schemas.material_balance import MaterialBalanceSummary, MaterialBalanceLedgerRow
from sqlalchemy import func

def insert_material_balance_ledger(db: Session, po_id: int, invoice_id: int, vendor_id: int, ordered_qty: float, received_qty: float, raw_material_id: int = None, packing_material_id: int = None):
    balance_qty = ordered_qty - received_qty
    # Try to find existing row for same PO, invoice, vendor, and material
    ledger = db.query(MaterialBalance).filter_by(
        po_id=po_id,
        invoice_id=invoice_id,
        vendor_id=vendor_id,
        raw_material_id=raw_material_id,
        packing_material_id=packing_material_id
    ).first()
    if ledger:
        ledger.ordered_qty = ordered_qty
        ledger.received_qty = received_qty
        ledger.balance_qty = balance_qty
        db.commit()
        db.refresh(ledger)
        return ledger
    else:
        ledger = MaterialBalance(
            raw_material_id=raw_material_id,
            packing_material_id=packing_material_id,
            vendor_id=vendor_id,
            po_id=po_id,
            invoice_id=invoice_id,
            ordered_qty=ordered_qty,
            received_qty=received_qty,
            balance_qty=balance_qty
        )
        db.add(ledger)
        db.commit()
        db.refresh(ledger)
        return ledger

def get_material_balance_summary(db: Session, raw_material_id: int, vendor_id: int):
    query = db.query(MaterialBalance).filter_by(
        raw_material_id=raw_material_id,
        vendor_id=vendor_id,
    )
    total_ordered = query.with_entities(func.sum(MaterialBalance.ordered_qty)).scalar() or 0.0
    total_received = query.with_entities(func.sum(MaterialBalance.received_qty)).scalar() or 0.0
    total_balance = query.with_entities(func.sum(MaterialBalance.balance_qty)).scalar() or 0.0
    recent_transactions = query.order_by(MaterialBalance.last_updated.desc()).limit(10).all()
    return MaterialBalanceSummary(
        total_ordered=total_ordered,
        total_received=total_received,
        total_balance=total_balance,
        recent_transactions=[MaterialBalanceLedgerRow.from_orm(row) for row in recent_transactions]
    )
