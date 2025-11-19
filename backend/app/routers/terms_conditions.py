"""
API Router for Terms & Conditions Management
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.session import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.terms_conditions import (
    TermsConditionsMasterCreate,
    TermsConditionsMasterUpdate,
    TermsConditionsMasterResponse,
    VendorTermsCreate,
    VendorTermsUpdate,
    VendorTermsResponse,
    PartnerMedicineCreate,
    PartnerMedicineUpdate,
    PartnerMedicineResponse,
    VendorTermsBatchCreate,
    PartnerMedicinesBatchCreate,
)
from app.services.terms_conditions_service import (
    TermsConditionsService,
    VendorTermsService,
    PartnerMedicinesService,
)
from app.exceptions.base import AppException
import logging

logger = logging.getLogger("pharma")

router = APIRouter(prefix="/api/terms", tags=["Terms & Conditions"])


# ===========================
# Terms Conditions Master Endpoints
# ===========================

@router.get(
    "/",
    response_model=dict,
    summary="Get all terms & conditions from master library",
)
async def get_all_terms(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in term text"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all terms from master library with optional filters.
    
    **Filters:**
    - category: Filter by category (PAYMENT, DELIVERY, WARRANTY, QUALITY, LEGAL, GENERAL, OTHER)
    - is_active: Filter by active status (true/false)
    - search: Search in term text (case-insensitive)
    
    **Returns:**
    - List of terms ordered by priority (lower = higher priority)
    """
    try:
        terms = TermsConditionsService.get_all_terms(
            db=db,
            category=category,
            is_active=is_active,
            search=search,
        )

        return {
            "success": True,
            "data": [TermsConditionsMasterResponse.model_validate(term) for term in terms],
            "message": f"Retrieved {len(terms)} terms",
        }

    except AppException as e:
        logger.error({
            "event": "GET_TERMS_ERROR",
            "error": str(e),
            "error_code": e.error_code,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "GET_TERMS_UNEXPECTED_ERROR",
            "error": str(e),
        })
        raise AppException(
            f"Failed to retrieve terms: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.get(
    "/{term_id}",
    response_model=dict,
    summary="Get a specific term by ID",
)
async def get_term_by_id(
    term_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific term by ID from the master library.
    """
    try:
        term = TermsConditionsService.get_term_by_id(db=db, term_id=term_id)

        return {
            "success": True,
            "data": TermsConditionsMasterResponse.model_validate(term),
            "message": "Term retrieved successfully",
        }

    except AppException as e:
        logger.error({
            "event": "GET_TERM_ERROR",
            "term_id": term_id,
            "error": str(e),
            "error_code": e.error_code,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "GET_TERM_UNEXPECTED_ERROR",
            "term_id": term_id,
            "error": str(e),
        })
        raise AppException(
            f"Failed to retrieve term: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.post(
    "/",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Create a new term in master library",
)
async def create_term(
    term_data: TermsConditionsMasterCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new term in the master library.
    
    **Required Fields:**
    - term_text: The text of the term
    - category: Category of the term (PAYMENT, DELIVERY, WARRANTY, QUALITY, LEGAL, GENERAL, OTHER)
    - priority: Priority (1-999, lower = higher priority)
    - is_active: Whether the term is active
    
    **Access:** ADMIN only
    """
    try:
        new_term = TermsConditionsService.create_term(
            db=db,
            term_data=term_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": TermsConditionsMasterResponse.model_validate(new_term),
            "message": "Term created successfully",
        }

    except AppException as e:
        logger.error({
            "event": "CREATE_TERM_ERROR",
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "CREATE_TERM_UNEXPECTED_ERROR",
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to create term: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.put(
    "/{term_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Update a term in master library",
)
async def update_term(
    term_id: int,
    term_data: TermsConditionsMasterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update an existing term in the master library.
    
    **Access:** ADMIN only
    """
    try:
        updated_term = TermsConditionsService.update_term(
            db=db,
            term_id=term_id,
            term_data=term_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": TermsConditionsMasterResponse.model_validate(updated_term),
            "message": "Term updated successfully",
        }

    except AppException as e:
        logger.error({
            "event": "UPDATE_TERM_ERROR",
            "term_id": term_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "UPDATE_TERM_UNEXPECTED_ERROR",
            "term_id": term_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to update term: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.delete(
    "/{term_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Delete a term from master library",
)
async def delete_term(
    term_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a term from the master library.
    
    **Note:** Cannot delete terms that are assigned to vendors.
    
    **Access:** ADMIN only
    """
    try:
        TermsConditionsService.delete_term(
            db=db,
            term_id=term_id,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": None,
            "message": "Term deleted successfully",
        }

    except AppException as e:
        logger.error({
            "event": "DELETE_TERM_ERROR",
            "term_id": term_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "DELETE_TERM_UNEXPECTED_ERROR",
            "term_id": term_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to delete term: {str(e)}",
            "ERR_SERVER",
            500,
        )


# ===========================
# Vendor Terms Endpoints
# ===========================

@router.get(
    "/vendor-terms/",
    response_model=dict,
    summary="Get vendor term assignments",
)
async def get_vendor_terms(
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    category: Optional[str] = Query(None, description="Filter by term category"),
    is_active: Optional[bool] = Query(None, description="Filter by active terms only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve vendor term assignments with optional filters.
    
    **Filters:**
    - vendor_id: Filter by specific vendor
    - category: Filter by term category
    - is_active: Filter to show only active terms
    
    **Returns:**
    - List of vendor term assignments ordered by effective priority
    """
    try:
        vendor_terms = VendorTermsService.get_vendor_terms(
            db=db,
            vendor_id=vendor_id,
            category=category,
            is_active=is_active,
        )

        return {
            "success": True,
            "data": [VendorTermsResponse.model_validate(vt) for vt in vendor_terms],
            "message": f"Retrieved {len(vendor_terms)} vendor term assignments",
        }

    except AppException as e:
        logger.error({
            "event": "GET_VENDOR_TERMS_ERROR",
            "error": str(e),
            "error_code": e.error_code,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "GET_VENDOR_TERMS_UNEXPECTED_ERROR",
            "error": str(e),
        })
        raise AppException(
            f"Failed to retrieve vendor terms: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.post(
    "/vendor-terms/",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Assign a term to a vendor",
)
async def assign_term_to_vendor(
    assignment_data: VendorTermsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assign a term from the master library to a vendor.
    
    **Required Fields:**
    - vendor_id: ID of the vendor
    - term_id: ID of the term from master library
    - priority_override: Optional priority override (1-999)
    - notes: Optional vendor-specific notes
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        new_assignment = VendorTermsService.assign_term_to_vendor(
            db=db,
            assignment_data=assignment_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": VendorTermsResponse.model_validate(new_assignment),
            "message": "Term assigned to vendor successfully",
        }

    except AppException as e:
        logger.error({
            "event": "ASSIGN_VENDOR_TERM_ERROR",
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "ASSIGN_VENDOR_TERM_UNEXPECTED_ERROR",
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to assign term to vendor: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.post(
    "/vendor-terms/batch",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Assign multiple terms to a vendor at once",
)
async def batch_assign_vendor_terms(
    batch_data: VendorTermsBatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assign multiple terms to a vendor in a single operation.
    
    **Required Fields:**
    - vendor_id: ID of the vendor
    - term_ids: List of term IDs to assign
    - default_notes: Optional notes applied to all assignments
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        created_assignments = VendorTermsService.batch_assign_terms(
            db=db,
            batch_data=batch_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": [VendorTermsResponse.model_validate(vt) for vt in created_assignments],
            "message": f"Assigned {len(created_assignments)} terms to vendor",
        }

    except AppException as e:
        logger.error({
            "event": "BATCH_ASSIGN_VENDOR_TERMS_ERROR",
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "BATCH_ASSIGN_VENDOR_TERMS_UNEXPECTED_ERROR",
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to batch assign terms: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.put(
    "/vendor-terms/{assignment_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Update a vendor term assignment",
)
async def update_vendor_term(
    assignment_id: int,
    update_data: VendorTermsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a vendor term assignment (priority override or notes).
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        updated_assignment = VendorTermsService.update_vendor_term(
            db=db,
            assignment_id=assignment_id,
            update_data=update_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": VendorTermsResponse.model_validate(updated_assignment),
            "message": "Vendor term assignment updated successfully",
        }

    except AppException as e:
        logger.error({
            "event": "UPDATE_VENDOR_TERM_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "UPDATE_VENDOR_TERM_UNEXPECTED_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to update vendor term: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.delete(
    "/vendor-terms/{assignment_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Remove a term assignment from a vendor",
)
async def remove_vendor_term(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a term assignment from a vendor.
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        VendorTermsService.remove_vendor_term(
            db=db,
            assignment_id=assignment_id,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": None,
            "message": "Vendor term assignment removed successfully",
        }

    except AppException as e:
        logger.error({
            "event": "REMOVE_VENDOR_TERM_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "REMOVE_VENDOR_TERM_UNEXPECTED_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to remove vendor term: {str(e)}",
            "ERR_SERVER",
            500,
        )


# ===========================
# Partner Medicines Endpoints
# ===========================

@router.get(
    "/partner-medicines/",
    response_model=dict,
    summary="Get partner vendor medicine assignments",
)
async def get_partner_medicines(
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    medicine_id: Optional[int] = Query(None, description="Filter by medicine ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve partner vendor medicine assignments with optional filters.
    
    **Filters:**
    - vendor_id: Filter by specific partner vendor
    - medicine_id: Filter by specific medicine
    
    **Returns:**
    - List of partner medicine assignments
    """
    try:
        partner_medicines = PartnerMedicinesService.get_partner_medicines(
            db=db,
            vendor_id=vendor_id,
            medicine_id=medicine_id,
        )

        return {
            "success": True,
            "data": [PartnerMedicineResponse.model_validate(pm) for pm in partner_medicines],
            "message": f"Retrieved {len(partner_medicines)} partner medicine assignments",
        }

    except AppException as e:
        logger.error({
            "event": "GET_PARTNER_MEDICINES_ERROR",
            "error": str(e),
            "error_code": e.error_code,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "GET_PARTNER_MEDICINES_UNEXPECTED_ERROR",
            "error": str(e),
        })
        raise AppException(
            f"Failed to retrieve partner medicines: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.post(
    "/partner-medicines/",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Assign a medicine to a partner vendor",
)
async def assign_medicine_to_partner(
    assignment_data: PartnerMedicineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assign a medicine to a partner vendor (whitelist).
    
    **Required Fields:**
    - vendor_id: ID of the partner vendor (must be vendor_type=PARTNER)
    - medicine_id: ID of the medicine to allow
    - notes: Optional notes about this assignment
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        new_assignment = PartnerMedicinesService.assign_medicine_to_partner(
            db=db,
            assignment_data=assignment_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": PartnerMedicineResponse.model_validate(new_assignment),
            "message": "Medicine assigned to partner vendor successfully",
        }

    except AppException as e:
        logger.error({
            "event": "ASSIGN_PARTNER_MEDICINE_ERROR",
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "ASSIGN_PARTNER_MEDICINE_UNEXPECTED_ERROR",
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to assign medicine to partner: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.post(
    "/partner-medicines/batch",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Assign multiple medicines to a partner vendor at once",
)
async def batch_assign_partner_medicines(
    batch_data: PartnerMedicinesBatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Assign multiple medicines to a partner vendor in a single operation.
    
    **Required Fields:**
    - vendor_id: ID of the partner vendor
    - medicine_ids: List of medicine IDs to assign
    - default_notes: Optional notes applied to all assignments
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        created_assignments = PartnerMedicinesService.batch_assign_medicines(
            db=db,
            batch_data=batch_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": [PartnerMedicineResponse.model_validate(pm) for pm in created_assignments],
            "message": f"Assigned {len(created_assignments)} medicines to partner vendor",
        }

    except AppException as e:
        logger.error({
            "event": "BATCH_ASSIGN_PARTNER_MEDICINES_ERROR",
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "BATCH_ASSIGN_PARTNER_MEDICINES_UNEXPECTED_ERROR",
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to batch assign medicines: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.put(
    "/partner-medicines/{assignment_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Update a partner medicine assignment",
)
async def update_partner_medicine(
    assignment_id: int,
    update_data: PartnerMedicineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a partner medicine assignment (notes).
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        updated_assignment = PartnerMedicinesService.update_partner_medicine(
            db=db,
            assignment_id=assignment_id,
            update_data=update_data,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": PartnerMedicineResponse.model_validate(updated_assignment),
            "message": "Partner medicine assignment updated successfully",
        }

    except AppException as e:
        logger.error({
            "event": "UPDATE_PARTNER_MEDICINE_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "UPDATE_PARTNER_MEDICINE_UNEXPECTED_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to update partner medicine: {str(e)}",
            "ERR_SERVER",
            500,
        )


@router.delete(
    "/partner-medicines/{assignment_id}",
    response_model=dict,
    dependencies=[Depends(require_role(["ADMIN", "PROCUREMENT_OFFICER"]))],
    summary="Remove a medicine assignment from a partner vendor",
)
async def remove_partner_medicine(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a medicine assignment from a partner vendor.
    
    **Access:** ADMIN, PROCUREMENT_OFFICER
    """
    try:
        PartnerMedicinesService.remove_partner_medicine(
            db=db,
            assignment_id=assignment_id,
            current_user_id=current_user.id,
        )

        return {
            "success": True,
            "data": None,
            "message": "Partner medicine assignment removed successfully",
        }

    except AppException as e:
        logger.error({
            "event": "REMOVE_PARTNER_MEDICINE_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "error_code": e.error_code,
            "user_id": current_user.id,
        })
        raise e
    except Exception as e:
        logger.error({
            "event": "REMOVE_PARTNER_MEDICINE_UNEXPECTED_ERROR",
            "assignment_id": assignment_id,
            "error": str(e),
            "user_id": current_user.id,
        })
        raise AppException(
            f"Failed to remove partner medicine: {str(e)}",
            "ERR_SERVER",
            500,
        )
