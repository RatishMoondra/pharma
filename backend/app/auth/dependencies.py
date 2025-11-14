from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.user import User, UserRole
from app.auth.utils import decode_access_token
from app.exceptions.base import AppException

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise AppException("Invalid or expired token", "ERR_AUTH_FAILED", 401)
    
    username: str = payload.get("sub")
    if username is None:
        raise AppException("Invalid token payload", "ERR_AUTH_FAILED", 401)
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise AppException("User not found", "ERR_AUTH_FAILED", 401)
    
    if not user.is_active:
        raise AppException("User account is inactive", "ERR_FORBIDDEN", 403)
    
    return user


def require_role(allowed_roles: List[UserRole]):
    """Dependency to check if user has required role"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise AppException(
                f"Permission denied. Required roles: {', '.join([r.value for r in allowed_roles])}",
                "ERR_FORBIDDEN",
                403
            )
        return current_user
    
    return role_checker
