from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.product import ProductMasterCreate, ProductMasterResponse, MedicineMasterCreate, MedicineMasterResponse
from app.models.product import ProductMaster, MedicineMaster
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/product-master/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_product_master(
    product_data: ProductMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create product master"""
    existing = db.query(ProductMaster).filter(ProductMaster.product_code == product_data.product_code).first()
    if existing:
        raise AppException("Product code already exists", "ERR_VALIDATION", 400)
    
    product = ProductMaster(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    
    logger.info({
        "event": "PRODUCT_CREATED",
        "product_id": product.id,
        "product_code": product.product_code,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Product created successfully",
        "data": ProductMasterResponse.model_validate(product).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict)
async def list_products(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List product masters"""
    products = db.query(ProductMaster).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Products retrieved successfully",
        "data": [ProductMasterResponse.model_validate(p).model_dump() for p in products],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/medicines", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def create_medicine_master(
    medicine_data: MedicineMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create medicine master"""
    # Generate medicine code
    max_code = db.query(MedicineMaster).order_by(MedicineMaster.id.desc()).first()
    if max_code:
        last_num = int(max_code.medicine_code.split('-')[1])
        medicine_code = f"MED-{str(last_num + 1).zfill(3)}"
    else:
        medicine_code = "MED-001"
    
    # Validate product exists
    product = db.query(ProductMaster).filter(ProductMaster.id == medicine_data.product_id).first()
    if not product:
        raise AppException("Product not found. Please select a valid product.", "ERR_VALIDATION", 400)
    
    # Create medicine
    medicine = MedicineMaster(
        medicine_code=medicine_code,
        product_id=medicine_data.product_id,
        medicine_name=medicine_data.medicine_name,
        composition=medicine_data.composition,
        dosage_form=medicine_data.dosage_form,
        strength=medicine_data.strength,
        pack_size=medicine_data.pack_size,
        manufacturer_vendor_id=medicine_data.manufacturer_vendor_id,
        rm_vendor_id=medicine_data.rm_vendor_id,
        pm_vendor_id=medicine_data.pm_vendor_id
    )
    
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    
    logger.info({
        "event": "MEDICINE_CREATED",
        "medicine_id": medicine.id,
        "medicine_code": medicine.medicine_code,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine created successfully",
        "data": MedicineMasterResponse.model_validate(medicine).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/medicines", response_model=dict)
async def list_medicines(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List medicine masters"""
    medicines = db.query(MedicineMaster).options(
        joinedload(MedicineMaster.manufacturer_vendor),
        joinedload(MedicineMaster.rm_vendor),
        joinedload(MedicineMaster.pm_vendor)
    ).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Medicines retrieved successfully",
        "data": [MedicineMasterResponse.model_validate(m).model_dump() for m in medicines],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/medicines/{medicine_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER]))])
async def update_medicine(
    medicine_id: int,
    medicine_data: MedicineMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update medicine master"""
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found", "ERR_NOT_FOUND", 404)
    
    # Validate product exists
    if medicine_data.product_id:
        product = db.query(ProductMaster).filter(ProductMaster.id == medicine_data.product_id).first()
        if not product:
            raise AppException("Product not found. Please select a valid product.", "ERR_VALIDATION", 400)
    
    # Update fields
    medicine.product_id = medicine_data.product_id
    medicine.medicine_name = medicine_data.medicine_name
    medicine.composition = medicine_data.composition
    medicine.dosage_form = medicine_data.dosage_form
    medicine.strength = medicine_data.strength
    medicine.pack_size = medicine_data.pack_size
    medicine.manufacturer_vendor_id = medicine_data.manufacturer_vendor_id
    medicine.rm_vendor_id = medicine_data.rm_vendor_id
    medicine.pm_vendor_id = medicine_data.pm_vendor_id
    medicine.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(medicine)
    
    logger.info({
        "event": "MEDICINE_UPDATED",
        "medicine_id": medicine.id,
        "updated_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine updated successfully",
        "data": MedicineMasterResponse.model_validate(medicine).model_dump(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.delete("/medicines/{medicine_id}", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def delete_medicine(
    medicine_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete medicine master"""
    medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
    if not medicine:
        raise AppException("Medicine not found", "ERR_NOT_FOUND", 404)
    
    db.delete(medicine)
    db.commit()
    
    logger.info({
        "event": "MEDICINE_DELETED",
        "medicine_id": medicine_id,
        "deleted_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "Medicine deleted successfully",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
