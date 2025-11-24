from app.exceptions.base import AppException

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.material_balance_service import get_material_balance_summary, get_packing_balance_summary
from app.models.material_balance import MaterialBalance
from sqlalchemy.orm import joinedload
from app.schemas.material_balance import MaterialBalanceLedgerRow
from app.schemas.material_balance import MaterialBalanceSummary

router = APIRouter(prefix="/api/material-balance", tags=["Material Balance"])


@router.delete('/{id}', response_model=dict)
def delete_material_balance(id: int, db: Session = Depends(get_db)):
    row = db.query(MaterialBalance).filter(MaterialBalance.id == id).first()
    if not row:
        raise AppException('Material balance record not found', 'ERR_NOT_FOUND', 404)
    db.delete(row)
    db.commit()
    return {
        'success': True,
        'message': 'Material balance record deleted successfully',
        'id': id
    }
@router.get("/summary/{raw_material_id}", response_model=MaterialBalanceSummary)
def material_balance_summary(raw_material_id: int, db: Session = Depends(get_db)):
    return get_material_balance_summary(db, raw_material_id)

@router.get("/pmsummary/{packing_material_id}", response_model=MaterialBalanceSummary)
def packing_material_balance_summary(packing_material_id: int, db: Session = Depends(get_db)):
    return get_packing_balance_summary(db, packing_material_id)
# New endpoint: get all material balance rows

@router.get("/all")
def get_all_material_balance(db: Session = Depends(get_db)):
    rows = db.query(MaterialBalance).options(
        joinedload(MaterialBalance.po),
        joinedload(MaterialBalance.invoice),
        joinedload(MaterialBalance.vendor),
        joinedload(MaterialBalance.raw_material),
        joinedload(MaterialBalance.packing_material)
    ).order_by(MaterialBalance.last_updated.desc()).all()
    
    result = []
    for row in rows:
        # Convert ORM object to dict with computed fields
        row_dict = {
            "id": row.id,
            "raw_material_id": row.raw_material_id,
            "packing_material_id": row.packing_material_id,
            "vendor_id": row.vendor_id,
            "po_id": row.po_id,
            "invoice_id": row.invoice_id,
            "ordered_qty": float(row.ordered_qty),
            "received_qty": float(row.received_qty),
            "balance_qty": float(row.balance_qty),
            "last_updated": row.last_updated,
            # Nested objects
            "po": {"id": row.po.id, "po_number": row.po.po_number} if row.po else None,
            "invoice": {"id": row.invoice.id, "invoice_number": row.invoice.invoice_number} if row.invoice else None,
            "vendor": {"id": row.vendor.id, "vendor_name": row.vendor.vendor_name, "vendor_code": row.vendor.vendor_code} if row.vendor else None,
            "raw_material": {"id": row.raw_material.id, "rm_name": row.raw_material.rm_name} if row.raw_material else None,
            "packing_material": {"id": row.packing_material.id, "pm_name": row.packing_material.pm_name} if row.packing_material else None,
            # Computed fields for frontend
            "material_code": f"RM-{row.raw_material_id}" if row.raw_material_id else f"PM-{row.packing_material_id}" if row.packing_material_id else "N/A",
            "material_name": row.raw_material.rm_name if row.raw_material and row.raw_material.rm_name else (row.packing_material.pm_name if row.packing_material and row.packing_material.pm_name else "Unknown Material"),
            "material_type": "RM" if row.raw_material_id else "PM",
            "reference_document": f"{row.po.po_number if row.po else 'PO-' + str(row.po_id)} / {row.invoice.invoice_number if row.invoice else 'INV-' + str(row.invoice_id)}"
        }
        result.append(row_dict)
    
    return result
