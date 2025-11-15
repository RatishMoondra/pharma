from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.database.session import get_db
from app.schemas.user import LoginSchema, TokenResponse, UserResponse
from app.models.user import User
from app.auth.utils import verify_password, create_access_token
from app.exceptions.base import AppException

router = APIRouter()
logger = logging.getLogger("pharma")


@router.post("/login", response_model=dict)
async def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    """User login"""
    logger.info({
        "event": "LOGIN_ATTEMPT", 
        "username": credentials.username,
        "username_length": len(credentials.username),
        "password_length": len(credentials.password)
    })
    
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user:
        logger.warning({
            "event": "LOGIN_FAILED", 
            "reason": "USER_NOT_FOUND",
            "username": credentials.username
        })
        raise AppException("Invalid credentials", "ERR_AUTH_FAILED", 401)
    
    password_match = verify_password(credentials.password, user.hashed_password)
    logger.info({
        "event": "PASSWORD_VERIFICATION",
        "username": credentials.username,
        "password_match": password_match,
        "user_active": user.is_active
    })
    
    if not password_match:
        logger.warning({
            "event": "LOGIN_FAILED",
            "reason": "INVALID_PASSWORD",
            "username": credentials.username
        })
        raise AppException("Invalid credentials", "ERR_AUTH_FAILED", 401)
    
    if not user.is_active:
        raise AppException("User account is inactive", "ERR_FORBIDDEN", 403)
    
    access_token = create_access_token({"sub": user.username, "role": user.role.value})
    
    logger.info({"event": "LOGIN_SUCCESS", "username": user.username, "role": user.role.value})
    
    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "is_active": user.is_active
            }
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
