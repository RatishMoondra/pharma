from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions"""
    logger.error({
        "event": "APP_EXCEPTION",
        "error_code": exc.error_code,
        "message": exc.message,
        "request_id": getattr(request.state, "request_id", None),
        "path": request.url.path
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "data": None,
            "error_code": exc.error_code,
            "errors": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning({
        "event": "VALIDATION_ERROR",
        "errors": errors,
        "request_id": getattr(request.state, "request_id", None),
        "path": request.url.path
    })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "data": None,
            "error_code": "ERR_VALIDATION",
            "errors": errors,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error({
        "event": "DATABASE_ERROR",
        "error": str(exc),
        "request_id": getattr(request.state, "request_id", None),
        "path": request.url.path
    })
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Database error occurred",
            "data": None,
            "error_code": "ERR_DB",
            "errors": None,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    )
