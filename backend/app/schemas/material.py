from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class MaterialReceiptBase(BaseModel):
    receipt_date: date
    po_id: int
    medicine_id: int
    quantity_received: float = Field(..., gt=0)
    batch_number: Optional[str] = None
    remarks: Optional[str] = None


class MaterialReceiptCreate(MaterialReceiptBase):
    pass


class MaterialReceiptResponse(MaterialReceiptBase):
    id: int
    receipt_number: str
    received_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class MaterialBalanceResponse(BaseModel):
    id: int
    medicine_id: int
    available_quantity: float
    last_updated: datetime
    
    class Config:
        from_attributes = True


class DispatchAdviceBase(BaseModel):
    dispatch_date: date
    medicine_id: int
    quantity_dispatched: float = Field(..., gt=0)
    destination: str
    remarks: Optional[str] = None


class DispatchAdviceCreate(DispatchAdviceBase):
    pass


class DispatchAdviceResponse(DispatchAdviceBase):
    id: int
    dispatch_number: str
    dispatched_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class WarehouseGRNBase(BaseModel):
    grn_date: date
    dispatch_advice_id: int
    quantity_received: float = Field(..., gt=0)
    remarks: Optional[str] = None


class WarehouseGRNCreate(WarehouseGRNBase):
    pass


class WarehouseGRNResponse(WarehouseGRNBase):
    id: int
    grn_number: str
    received_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True
