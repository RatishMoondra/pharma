from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.material_balance_service import get_material_balance_summary
from app.models.material_balance import MaterialBalance
from sqlalchemy.orm import joinedload
from app.schemas.material_balance import MaterialBalanceLedgerRow
from app.schemas.material_balance import MaterialBalanceSummary

router = APIRouter(prefix="/api/material-balance", tags=["Material Balance"])


@router.get("/summary/{raw_material_id}/{vendor_id}", response_model=MaterialBalanceSummary)
def material_balance_summary(raw_material_id: int, vendor_id: int, db: Session = Depends(get_db)):
    return get_material_balance_summary(db, raw_material_id, vendor_id)

# New endpoint: get all material balance rows

@router.get("/all", response_model=list[MaterialBalanceLedgerRow])
def get_all_material_balance(db: Session = Depends(get_db)):
    rows = db.query(MaterialBalance).options(
        joinedload(MaterialBalance.po),
        joinedload(MaterialBalance.invoice),
        joinedload(MaterialBalance.vendor),
        joinedload(MaterialBalance.raw_material),
        joinedload(MaterialBalance.packing_material)
    ).order_by(MaterialBalance.last_updated.desc()).all()
    return [MaterialBalanceLedgerRow.from_orm(row) for row in rows]
