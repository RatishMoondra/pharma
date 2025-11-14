from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.material import (
    MaterialReceiptCreate, MaterialReceiptResponse,
    MaterialBalanceResponse,
    DispatchAdviceCreate, DispatchAdviceResponse,
    WarehouseGRNCreate, WarehouseGRNResponse
)
from app.models.material import MaterialReceipt, MaterialBalance, DispatchAdvice, WarehouseGRN
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.utils.number_generator import generate_receipt_number, generate_dispatch_number, generate_grn_number
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/receipt/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))])
async def create_material_receipt(
    receipt_data: MaterialReceiptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Material Receipt"""
    receipt_number = generate_receipt_number(db)
    
    receipt = MaterialReceipt(
        receipt_number=receipt_number,
        **receipt_data.model_dump(),
        received_by=current_user.id
    )
    
    db.add(receipt)
    
    # Update material balance
    balance = db.query(MaterialBalance).filter(MaterialBalance.medicine_id == receipt_data.medicine_id).first()
    if balance:
        balance.available_quantity += receipt_data.quantity_received
    else:
        balance = MaterialBalance(
            medicine_id=receipt_data.medicine_id,
            available_quantity=receipt_data.quantity_received
        )
        db.add(balance)
    
    db.commit()
    db.refresh(receipt)
    
    logger.info({
        "event": "MATERIAL_RECEIPT_CREATED",
        "receipt_number": receipt_number,
        "medicine_id": receipt_data.medicine_id,
        "quantity": float(receipt_data.quantity_received),
        "received_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Material Receipt created successfully",
        "data": MaterialReceiptResponse.model_validate(receipt).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/balance/", response_model=dict)
async def list_material_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List Material Balance"""
    balances = db.query(MaterialBalance).all()
    
    return {
        "success": True,
        "message": "Material balances retrieved successfully",
        "data": [MaterialBalanceResponse.model_validate(b).model_dump() for b in balances],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/dispatch/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))])
async def create_dispatch_advice(
    dispatch_data: DispatchAdviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Dispatch Advice"""
    # Check material balance
    balance = db.query(MaterialBalance).filter(MaterialBalance.medicine_id == dispatch_data.medicine_id).first()
    if not balance or balance.available_quantity < dispatch_data.quantity_dispatched:
        raise AppException("Insufficient material balance", "ERR_VALIDATION", 400)
    
    dispatch_number = generate_dispatch_number(db)
    
    dispatch = DispatchAdvice(
        dispatch_number=dispatch_number,
        **dispatch_data.model_dump(),
        dispatched_by=current_user.id
    )
    
    db.add(dispatch)
    
    # Update material balance
    balance.available_quantity -= dispatch_data.quantity_dispatched
    
    db.commit()
    db.refresh(dispatch)
    
    logger.info({
        "event": "DISPATCH_ADVICE_CREATED",
        "dispatch_number": dispatch_number,
        "medicine_id": dispatch_data.medicine_id,
        "quantity": float(dispatch_data.quantity_dispatched),
        "dispatched_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Dispatch Advice created successfully",
        "data": DispatchAdviceResponse.model_validate(dispatch).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
