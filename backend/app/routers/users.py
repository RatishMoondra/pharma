from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, require_role
from app.auth.utils import hash_password
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)"""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise AppException("Username already exists", "ERR_VALIDATION", 400)
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise AppException("Email already exists", "ERR_VALIDATION", 400)
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role=user_data.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info({
        "event": "USER_CREATED",
        "user_id": user.id,
        "username": user.username,
        "created_by": current_user.username
    })
    
    return {
        "success": True,
        "message": "User created successfully",
        "data": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/", response_model=dict, dependencies=[Depends(require_role([UserRole.ADMIN]))])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all users (Admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "message": "Users retrieved successfully",
        "data": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat()
            }
            for user in users
        ],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "success": True,
        "message": "User information retrieved",
        "data": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role.value,
            "is_active": current_user.is_active
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
