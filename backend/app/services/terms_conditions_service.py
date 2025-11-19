"""
Service layer for Terms & Conditions management
"""
import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from app.models.terms_conditions import (
    TermsConditionsMaster,
    VendorTermsConditions,
    PartnerVendorMedicines,
)
from app.models.vendor import Vendor
from app.models.product import MedicineMaster
from app.schemas.terms_conditions import (
    TermsConditionsMasterCreate,
    TermsConditionsMasterUpdate,
    VendorTermsCreate,
    VendorTermsUpdate,
    PartnerMedicineCreate,
    PartnerMedicineUpdate,
    VendorTermsBatchCreate,
    PartnerMedicinesBatchCreate,
)
from app.exceptions.base import AppException

logger = logging.getLogger("pharma")


# ===========================
# Terms Conditions Master Service
# ===========================

class TermsConditionsService:
    """Service for managing Terms & Conditions master library"""

    @staticmethod
    def get_all_terms(
        db: Session,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[TermsConditionsMaster]:
        """
        Retrieve all terms from master library with optional filters
        
        Args:
            db: Database session
            category: Filter by category (optional)
            is_active: Filter by active status (optional)
            search: Search in term_text (optional)
        
        Returns:
            List of TermsConditionsMaster records
        """
        query = db.query(TermsConditionsMaster)

        # Apply filters
        if category:
            query = query.filter(TermsConditionsMaster.category == category)
        if is_active is not None:
            query = query.filter(TermsConditionsMaster.is_active == is_active)
        if search:
            query = query.filter(TermsConditionsMaster.term_text.ilike(f"%{search}%"))

        # Order by priority (lower = higher priority), then by ID
        terms = query.order_by(TermsConditionsMaster.priority, TermsConditionsMaster.id).all()

        logger.info({
            "event": "TERMS_RETRIEVED",
            "count": len(terms),
            "filters": {"category": category, "is_active": is_active, "search": search},
        })

        return terms

    @staticmethod
    def get_term_by_id(db: Session, term_id: int) -> TermsConditionsMaster:
        """
        Retrieve a specific term by ID
        
        Args:
            db: Database session
            term_id: ID of the term
        
        Returns:
            TermsConditionsMaster record
        
        Raises:
            AppException: If term not found
        """
        term = db.query(TermsConditionsMaster).filter(TermsConditionsMaster.id == term_id).first()
        if not term:
            raise AppException(
                f"Term with ID {term_id} not found",
                "ERR_NOT_FOUND",
                404,
            )
        return term

    @staticmethod
    def create_term(
        db: Session,
        term_data: TermsConditionsMasterCreate,
        current_user_id: int,
    ) -> TermsConditionsMaster:
        """
        Create a new term in master library
        
        Args:
            db: Database session
            term_data: Term creation data
            current_user_id: ID of user creating the term
        
        Returns:
            Created TermsConditionsMaster record
        """
        # Validate category
        valid_categories = ["PAYMENT", "DELIVERY", "WARRANTY", "QUALITY", "LEGAL", "GENERAL", "OTHER"]
        if term_data.category.upper() not in valid_categories:
            raise AppException(
                f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                "ERR_VALIDATION",
                400,
            )

        new_term = TermsConditionsMaster(
            term_text=term_data.term_text,
            category=term_data.category.upper(),
            priority=term_data.priority,
            is_active=term_data.is_active,
        )

        db.add(new_term)
        db.commit()
        db.refresh(new_term)

        logger.info({
            "event": "TERM_CREATED",
            "term_id": new_term.id,
            "category": new_term.category,
            "user_id": current_user_id,
        })

        return new_term

    @staticmethod
    def update_term(
        db: Session,
        term_id: int,
        term_data: TermsConditionsMasterUpdate,
        current_user_id: int,
    ) -> TermsConditionsMaster:
        """
        Update an existing term in master library
        
        Args:
            db: Database session
            term_id: ID of the term to update
            term_data: Updated term data
            current_user_id: ID of user updating the term
        
        Returns:
            Updated TermsConditionsMaster record
        """
        term = TermsConditionsService.get_term_by_id(db, term_id)

        # Update fields
        if term_data.term_text is not None:
            term.term_text = term_data.term_text
        if term_data.category is not None:
            valid_categories = ["PAYMENT", "DELIVERY", "WARRANTY", "QUALITY", "LEGAL", "GENERAL", "OTHER"]
            if term_data.category.upper() not in valid_categories:
                raise AppException(
                    f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                    "ERR_VALIDATION",
                    400,
                )
            term.category = term_data.category.upper()
        if term_data.priority is not None:
            term.priority = term_data.priority
        if term_data.is_active is not None:
            term.is_active = term_data.is_active

        db.commit()
        db.refresh(term)

        logger.info({
            "event": "TERM_UPDATED",
            "term_id": term.id,
            "user_id": current_user_id,
        })

        return term

    @staticmethod
    def delete_term(db: Session, term_id: int, current_user_id: int) -> None:
        """
        Delete a term from master library
        
        Args:
            db: Database session
            term_id: ID of the term to delete
            current_user_id: ID of user deleting the term
        
        Raises:
            AppException: If term is in use by vendors
        """
        term = TermsConditionsService.get_term_by_id(db, term_id)

        # Check if term is assigned to any vendors
        vendor_count = db.query(VendorTermsConditions).filter(
            VendorTermsConditions.term_id == term_id
        ).count()

        if vendor_count > 0:
            raise AppException(
                f"Cannot delete term. It is assigned to {vendor_count} vendor(s). Remove assignments first.",
                "ERR_VALIDATION",
                400,
            )

        db.delete(term)
        db.commit()

        logger.info({
            "event": "TERM_DELETED",
            "term_id": term_id,
            "user_id": current_user_id,
        })


# ===========================
# Vendor Terms Service
# ===========================

class VendorTermsService:
    """Service for managing vendor term assignments"""

    @staticmethod
    def get_vendor_terms(
        db: Session,
        vendor_id: Optional[int] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[VendorTermsConditions]:
        """
        Retrieve vendor term assignments with optional filters
        
        Args:
            db: Database session
            vendor_id: Filter by vendor ID (optional)
            category: Filter by term category (optional)
            is_active: Filter by active terms only (optional)
        
        Returns:
            List of VendorTermsConditions records with eager-loaded relationships
        """
        query = db.query(VendorTermsConditions).options(
            joinedload(VendorTermsConditions.term),
            joinedload(VendorTermsConditions.vendor),
        )

        # Apply filters
        if vendor_id:
            query = query.filter(VendorTermsConditions.vendor_id == vendor_id)
        if category:
            query = query.join(TermsConditionsMaster).filter(TermsConditionsMaster.category == category)
        if is_active is not None and is_active:
            query = query.join(TermsConditionsMaster).filter(TermsConditionsMaster.is_active == True)

        # Order by effective priority (override if exists, else master priority)
        vendor_terms = query.all()
        vendor_terms.sort(key=lambda vt: vt.priority_override if vt.priority_override else vt.term.priority)

        logger.info({
            "event": "VENDOR_TERMS_RETRIEVED",
            "count": len(vendor_terms),
            "filters": {"vendor_id": vendor_id, "category": category, "is_active": is_active},
        })

        return vendor_terms

    @staticmethod
    def assign_term_to_vendor(
        db: Session,
        assignment_data: VendorTermsCreate,
        current_user_id: int,
    ) -> VendorTermsConditions:
        """
        Assign a term to a vendor
        
        Args:
            db: Database session
            assignment_data: Assignment data
            current_user_id: ID of user creating the assignment
        
        Returns:
            Created VendorTermsConditions record
        
        Raises:
            AppException: If vendor or term not found, or duplicate assignment
        """
        # Validate vendor exists
        vendor = db.query(Vendor).filter(Vendor.id == assignment_data.vendor_id).first()
        if not vendor:
            raise AppException(
                f"Vendor with ID {assignment_data.vendor_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        # Validate term exists
        term = db.query(TermsConditionsMaster).filter(
            TermsConditionsMaster.id == assignment_data.term_id
        ).first()
        if not term:
            raise AppException(
                f"Term with ID {assignment_data.term_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        # Check for duplicate assignment
        existing = db.query(VendorTermsConditions).filter(
            and_(
                VendorTermsConditions.vendor_id == assignment_data.vendor_id,
                VendorTermsConditions.term_id == assignment_data.term_id,
            )
        ).first()
        if existing:
            raise AppException(
                f"Term '{term.term_text}' is already assigned to vendor '{vendor.vendor_name}'",
                "ERR_VALIDATION",
                400,
            )

        # Create assignment
        new_assignment = VendorTermsConditions(
            vendor_id=assignment_data.vendor_id,
            term_id=assignment_data.term_id,
            priority_override=assignment_data.priority_override,
            notes=assignment_data.notes,
        )

        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)

        # Eager load relationships
        db.refresh(new_assignment, attribute_names=['term', 'vendor'])

        logger.info({
            "event": "VENDOR_TERM_ASSIGNED",
            "vendor_id": assignment_data.vendor_id,
            "term_id": assignment_data.term_id,
            "user_id": current_user_id,
        })

        return new_assignment

    @staticmethod
    def batch_assign_terms(
        db: Session,
        batch_data: VendorTermsBatchCreate,
        current_user_id: int,
    ) -> List[VendorTermsConditions]:
        """
        Assign multiple terms to a vendor at once
        
        Args:
            db: Database session
            batch_data: Batch assignment data
            current_user_id: ID of user creating the assignments
        
        Returns:
            List of created VendorTermsConditions records
        """
        # Validate vendor exists
        vendor = db.query(Vendor).filter(Vendor.id == batch_data.vendor_id).first()
        if not vendor:
            raise AppException(
                f"Vendor with ID {batch_data.vendor_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        created_assignments = []
        for term_id in batch_data.term_ids:
            # Skip if already assigned
            existing = db.query(VendorTermsConditions).filter(
                and_(
                    VendorTermsConditions.vendor_id == batch_data.vendor_id,
                    VendorTermsConditions.term_id == term_id,
                )
            ).first()
            if existing:
                continue

            # Validate term exists
            term = db.query(TermsConditionsMaster).filter(TermsConditionsMaster.id == term_id).first()
            if not term:
                logger.warning({
                    "event": "BATCH_ASSIGN_TERM_NOT_FOUND",
                    "term_id": term_id,
                    "vendor_id": batch_data.vendor_id,
                })
                continue

            # Create assignment
            new_assignment = VendorTermsConditions(
                vendor_id=batch_data.vendor_id,
                term_id=term_id,
                notes=batch_data.default_notes,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(new_assignment)
            db.flush()  # Flush to get ID before next iteration
            created_assignments.append(new_assignment)

        db.commit()

        # Eager load relationships
        for assignment in created_assignments:
            db.refresh(assignment, attribute_names=['term', 'vendor'])

        logger.info({
            "event": "VENDOR_TERMS_BATCH_ASSIGNED",
            "vendor_id": batch_data.vendor_id,
            "term_count": len(created_assignments),
            "user_id": current_user_id,
        })

        return created_assignments

    @staticmethod
    def update_vendor_term(
        db: Session,
        assignment_id: int,
        update_data: VendorTermsUpdate,
        current_user_id: int,
    ) -> VendorTermsConditions:
        """
        Update a vendor term assignment
        
        Args:
            db: Database session
            assignment_id: ID of the assignment to update
            update_data: Updated assignment data
            current_user_id: ID of user updating the assignment
        
        Returns:
            Updated VendorTermsConditions record
        """
        assignment = db.query(VendorTermsConditions).filter(
            VendorTermsConditions.id == assignment_id
        ).first()
        if not assignment:
            raise AppException(
                f"Vendor term assignment with ID {assignment_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        # Update fields
        if update_data.priority_override is not None:
            assignment.priority_override = update_data.priority_override
        if update_data.notes is not None:
            assignment.notes = update_data.notes

        db.commit()
        db.refresh(assignment)

        logger.info({
            "event": "VENDOR_TERM_UPDATED",
            "assignment_id": assignment_id,
            "user_id": current_user_id,
        })

        return assignment

    @staticmethod
    def remove_vendor_term(
        db: Session,
        assignment_id: int,
        current_user_id: int,
    ) -> None:
        """
        Remove a term assignment from a vendor
        
        Args:
            db: Database session
            assignment_id: ID of the assignment to remove
            current_user_id: ID of user removing the assignment
        """
        assignment = db.query(VendorTermsConditions).filter(
            VendorTermsConditions.id == assignment_id
        ).first()
        if not assignment:
            raise AppException(
                f"Vendor term assignment with ID {assignment_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        vendor_id = assignment.vendor_id
        term_id = assignment.term_id

        db.delete(assignment)
        db.commit()

        logger.info({
            "event": "VENDOR_TERM_REMOVED",
            "vendor_id": vendor_id,
            "term_id": term_id,
            "user_id": current_user_id,
        })


# ===========================
# Partner Medicines Service
# ===========================

class PartnerMedicinesService:
    """Service for managing partner vendor medicine assignments"""

    @staticmethod
    def get_partner_medicines(
        db: Session,
        vendor_id: Optional[int] = None,
        medicine_id: Optional[int] = None,
    ) -> List[PartnerVendorMedicines]:
        """
        Retrieve partner medicine assignments with optional filters
        
        Args:
            db: Database session
            vendor_id: Filter by vendor ID (optional)
            medicine_id: Filter by medicine ID (optional)
        
        Returns:
            List of PartnerVendorMedicines records with eager-loaded relationships
        """
        query = db.query(PartnerVendorMedicines).options(
            joinedload(PartnerVendorMedicines.medicine),
            joinedload(PartnerVendorMedicines.vendor),
        )

        # Apply filters
        if vendor_id:
            query = query.filter(PartnerVendorMedicines.vendor_id == vendor_id)
        if medicine_id:
            query = query.filter(PartnerVendorMedicines.medicine_id == medicine_id)

        partner_medicines = query.all()

        logger.info({
            "event": "PARTNER_MEDICINES_RETRIEVED",
            "count": len(partner_medicines),
            "filters": {"vendor_id": vendor_id, "medicine_id": medicine_id},
        })

        return partner_medicines

    @staticmethod
    def assign_medicine_to_partner(
        db: Session,
        assignment_data: PartnerMedicineCreate,
        current_user_id: int,
    ) -> PartnerVendorMedicines:
        """
        Assign a medicine to a partner vendor
        
        Args:
            db: Database session
            assignment_data: Assignment data
            current_user_id: ID of user creating the assignment
        
        Returns:
            Created PartnerVendorMedicines record
        
        Raises:
            AppException: If vendor is not PARTNER type, medicine not found, or duplicate assignment
        """
        # Validate vendor exists and is PARTNER type
        vendor = db.query(Vendor).filter(Vendor.id == assignment_data.vendor_id).first()
        if not vendor:
            raise AppException(
                f"Vendor with ID {assignment_data.vendor_id} not found",
                "ERR_NOT_FOUND",
                404,
            )
        if vendor.vendor_type != "PARTNER":
            raise AppException(
                f"Vendor '{vendor.vendor_name}' is not a PARTNER vendor. Only PARTNER vendors can have medicine assignments.",
                "ERR_VALIDATION",
                400,
            )

        # Validate medicine exists
        medicine = db.query(MedicineMaster).filter(
            MedicineMaster.id == assignment_data.medicine_id
        ).first()
        if not medicine:
            raise AppException(
                f"Medicine with ID {assignment_data.medicine_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        # Check for duplicate assignment
        existing = db.query(PartnerVendorMedicines).filter(
            and_(
                PartnerVendorMedicines.vendor_id == assignment_data.vendor_id,
                PartnerVendorMedicines.medicine_id == assignment_data.medicine_id,
            )
        ).first()
        if existing:
            raise AppException(
                f"Medicine '{medicine.medicine_name}' is already assigned to partner '{vendor.vendor_name}'",
                "ERR_VALIDATION",
                400,
            )

        # Create assignment
        new_assignment = PartnerVendorMedicines(
            vendor_id=assignment_data.vendor_id,
            medicine_id=assignment_data.medicine_id,
            notes=assignment_data.notes,
        )

        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)

        # Eager load relationships
        db.refresh(new_assignment, attribute_names=['medicine', 'vendor'])

        logger.info({
            "event": "PARTNER_MEDICINE_ASSIGNED",
            "vendor_id": assignment_data.vendor_id,
            "medicine_id": assignment_data.medicine_id,
            "user_id": current_user_id,
        })

        return new_assignment

    @staticmethod
    def batch_assign_medicines(
        db: Session,
        batch_data: PartnerMedicinesBatchCreate,
        current_user_id: int,
    ) -> List[PartnerVendorMedicines]:
        """
        Assign multiple medicines to a partner vendor at once
        
        Args:
            db: Database session
            batch_data: Batch assignment data
            current_user_id: ID of user creating the assignments
        
        Returns:
            List of created PartnerVendorMedicines records
        """
        # Validate vendor exists and is PARTNER type
        vendor = db.query(Vendor).filter(Vendor.id == batch_data.vendor_id).first()
        if not vendor:
            raise AppException(
                f"Vendor with ID {batch_data.vendor_id} not found",
                "ERR_NOT_FOUND",
                404,
            )
        if vendor.vendor_type != "PARTNER":
            raise AppException(
                f"Vendor '{vendor.vendor_name}' is not a PARTNER vendor. Only PARTNER vendors can have medicine assignments.",
                "ERR_VALIDATION",
                400,
            )

        created_assignments = []
        for medicine_id in batch_data.medicine_ids:
            # Skip if already assigned
            existing = db.query(PartnerVendorMedicines).filter(
                and_(
                    PartnerVendorMedicines.vendor_id == batch_data.vendor_id,
                    PartnerVendorMedicines.medicine_id == medicine_id,
                )
            ).first()
            if existing:
                continue

            # Validate medicine exists
            medicine = db.query(MedicineMaster).filter(MedicineMaster.id == medicine_id).first()
            if not medicine:
                logger.warning({
                    "event": "BATCH_ASSIGN_MEDICINE_NOT_FOUND",
                    "medicine_id": medicine_id,
                    "vendor_id": batch_data.vendor_id,
                })
                continue

            # Create assignment
            new_assignment = PartnerVendorMedicines(
                vendor_id=batch_data.vendor_id,
                medicine_id=medicine_id,
                notes=batch_data.default_notes,
            )
            db.add(new_assignment)
            db.flush()  # Flush to get ID before next iteration
            created_assignments.append(new_assignment)

        db.commit()

        # Eager load relationships
        for assignment in created_assignments:
            db.refresh(assignment, attribute_names=['medicine', 'vendor'])

        logger.info({
            "event": "PARTNER_MEDICINES_BATCH_ASSIGNED",
            "vendor_id": batch_data.vendor_id,
            "medicine_count": len(created_assignments),
            "user_id": current_user_id,
        })

        return created_assignments

    @staticmethod
    def update_partner_medicine(
        db: Session,
        assignment_id: int,
        update_data: PartnerMedicineUpdate,
        current_user_id: int,
    ) -> PartnerVendorMedicines:
        """
        Update a partner medicine assignment
        
        Args:
            db: Database session
            assignment_id: ID of the assignment to update
            update_data: Updated assignment data
            current_user_id: ID of user updating the assignment
        
        Returns:
            Updated PartnerVendorMedicines record
        """
        assignment = db.query(PartnerVendorMedicines).filter(
            PartnerVendorMedicines.id == assignment_id
        ).first()
        if not assignment:
            raise AppException(
                f"Partner medicine assignment with ID {assignment_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        # Update fields
        if update_data.notes is not None:
            assignment.notes = update_data.notes

        db.commit()
        db.refresh(assignment)

        logger.info({
            "event": "PARTNER_MEDICINE_UPDATED",
            "assignment_id": assignment_id,
            "user_id": current_user_id,
        })

        return assignment

    @staticmethod
    def remove_partner_medicine(
        db: Session,
        assignment_id: int,
        current_user_id: int,
    ) -> None:
        """
        Remove a medicine assignment from a partner vendor
        
        Args:
            db: Database session
            assignment_id: ID of the assignment to remove
            current_user_id: ID of user removing the assignment
        """
        assignment = db.query(PartnerVendorMedicines).filter(
            PartnerVendorMedicines.id == assignment_id
        ).first()
        if not assignment:
            raise AppException(
                f"Partner medicine assignment with ID {assignment_id} not found",
                "ERR_NOT_FOUND",
                404,
            )

        vendor_id = assignment.vendor_id
        medicine_id = assignment.medicine_id

        db.delete(assignment)
        db.commit()

        logger.info({
            "event": "PARTNER_MEDICINE_REMOVED",
            "vendor_id": vendor_id,
            "medicine_id": medicine_id,
            "user_id": current_user_id,
        })
