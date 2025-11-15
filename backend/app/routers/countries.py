from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database.session import get_db
from app.schemas.country import CountryCreate, CountryUpdate, CountryResponse, CountryBasic
from app.models.country import Country
from app.auth.dependencies import get_current_user, require_role
from app.exceptions.base import AppException
import logging

router = APIRouter(prefix="/api/countries", tags=["Countries"])
logger = logging.getLogger("pharma")


@router.get("/", response_model=dict)
async def get_countries(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all countries"""
    try:
        countries = db.query(Country).all()
        return {
            "success": True,
            "message": "Countries retrieved successfully",
            "data": [CountryResponse.model_validate(c).model_dump() for c in countries],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        logger.error(f"Error fetching countries: {str(e)}")
        raise AppException("Failed to fetch countries", "ERR_DB", 500)


@router.get("/active", response_model=dict)
async def get_active_countries(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all active countries for dropdown selection"""
    try:
        countries = db.query(Country).filter(Country.is_active == True).all()
        return {
            "success": True,
            "message": "Active countries retrieved successfully",
            "data": [CountryBasic.model_validate(c).model_dump() for c in countries],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        logger.error(f"Error fetching active countries: {str(e)}")
        raise AppException("Failed to fetch active countries", "ERR_DB", 500)


@router.get("/{country_id}", response_model=dict)
async def get_country(
    country_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific country by ID"""
    try:
        country = db.query(Country).filter(Country.id == country_id).first()
        if not country:
            raise AppException("Country not found", "ERR_NOT_FOUND", 404)
        return {
            "success": True,
            "message": "Country retrieved successfully",
            "data": CountryResponse.model_validate(country).model_dump(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error fetching country {country_id}: {str(e)}")
        raise AppException("Failed to fetch country", "ERR_DB", 500)


@router.post("/", response_model=dict, dependencies=[Depends(require_role(["ADMIN"]))])
async def create_country(
    country_data: CountryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new country (Admin only)"""
    try:
        # Check if country code already exists
        existing = db.query(Country).filter(Country.country_code == country_data.country_code).first()
        if existing:
            raise AppException(f"Country with code '{country_data.country_code}' already exists", "ERR_VALIDATION", 400)
        
        # Check if country name already exists
        existing_name = db.query(Country).filter(Country.country_name == country_data.country_name).first()
        if existing_name:
            raise AppException(f"Country with name '{country_data.country_name}' already exists", "ERR_VALIDATION", 400)
        
        country = Country(**country_data.dict())
        db.add(country)
        db.commit()
        db.refresh(country)
        
        logger.info({
            "event": "COUNTRY_CREATED",
            "country_id": country.id,
            "country_code": country.country_code,
            "country_name": country.country_name,
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": "Country created successfully",
            "data": CountryResponse.model_validate(country).model_dump(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating country: {str(e)}")
        raise AppException("Failed to create country", "ERR_DB", 500)


@router.put("/{country_id}", response_model=dict, dependencies=[Depends(require_role(["ADMIN"]))])
async def update_country(
    country_id: int,
    country_data: CountryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a country (Admin only)"""
    try:
        country = db.query(Country).filter(Country.id == country_id).first()
        if not country:
            raise AppException("Country not found", "ERR_NOT_FOUND", 404)
        
        # Check for duplicate country code if being updated
        if country_data.country_code and country_data.country_code != country.country_code:
            existing = db.query(Country).filter(Country.country_code == country_data.country_code).first()
            if existing:
                raise AppException(f"Country with code '{country_data.country_code}' already exists", "ERR_VALIDATION", 400)
        
        # Check for duplicate country name if being updated
        if country_data.country_name and country_data.country_name != country.country_name:
            existing_name = db.query(Country).filter(Country.country_name == country_data.country_name).first()
            if existing_name:
                raise AppException(f"Country with name '{country_data.country_name}' already exists", "ERR_VALIDATION", 400)
        
        # Update fields
        update_data = country_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(country, field, value)
        
        db.commit()
        db.refresh(country)
        
        logger.info({
            "event": "COUNTRY_UPDATED",
            "country_id": country.id,
            "country_code": country.country_code,
            "user": current_user.username
        })
        
        return {
            "success": True,
            "message": "Country updated successfully",
            "data": CountryResponse.model_validate(country).model_dump(),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except AppException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating country {country_id}: {str(e)}")
        raise AppException("Failed to update country", "ERR_DB", 500)


@router.delete("/{country_id}", dependencies=[Depends(require_role(["ADMIN"]))])
async def delete_country(
    country_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a country (Admin only)"""
    try:
        country = db.query(Country).filter(Country.id == country_id).first()
        if not country:
            raise AppException("Country not found", "ERR_NOT_FOUND", 404)
        
        # Check if country has associated vendors
        if country.vendors:
            raise AppException(
                "Cannot delete country with associated vendors. Please deactivate or reassign vendors first.",
                "ERR_VALIDATION",
                400
            )
        
        # Check if country has associated PIs
        if country.pis:
            raise AppException(
                "Cannot delete country with associated Proforma Invoices. Please deactivate instead.",
                "ERR_VALIDATION",
                400
            )
        
        db.delete(country)
        db.commit()
        
        logger.info({
            "event": "COUNTRY_DELETED",
            "country_id": country_id,
            "country_code": country.country_code,
            "user": current_user.username
        })
        
        return {"success": True, "message": "Country deleted successfully"}
    except AppException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting country {country_id}: {str(e)}")
        raise AppException("Failed to delete country", "ERR_DB", 500)
