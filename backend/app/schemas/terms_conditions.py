"""
Pydantic schemas for Terms & Conditions management
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


# ===========================
# Terms Conditions Master Schemas
# ===========================

class TermsConditionsMasterCreate(BaseModel):
    """Schema for creating a new terms & conditions master record"""
    term_text: str = Field(..., description="The text of the terms & conditions")
    category: str = Field(..., description="Category of the term (e.g., PAYMENT, DELIVERY, WARRANTY, QUALITY, LEGAL)")
    priority: int = Field(default=100, ge=1, le=999, description="Priority of the term (lower = higher priority)")
    is_active: bool = Field(default=True, description="Whether this term is active")


class TermsConditionsMasterUpdate(BaseModel):
    """Schema for updating a terms & conditions master record"""
    term_text: Optional[str] = Field(None, description="Updated term text")
    category: Optional[str] = Field(None, description="Updated category")
    priority: Optional[int] = Field(None, ge=1, le=999, description="Updated priority")
    is_active: Optional[bool] = Field(None, description="Updated active status")


class TermsConditionsMasterResponse(BaseModel):
    """Schema for returning a terms & conditions master record"""
    id: int
    term_text: str
    category: str
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===========================
# Vendor Terms Conditions Schemas
# ===========================

class VendorTermsCreate(BaseModel):
    """Schema for assigning a term to a vendor"""
    vendor_id: int = Field(..., description="ID of the vendor")
    term_id: int = Field(..., description="ID of the term from master library")
    priority_override: Optional[int] = Field(None, ge=1, le=999, description="Override priority for this vendor (optional)")
    notes: Optional[str] = Field(None, description="Vendor-specific notes about this term")


class VendorTermsUpdate(BaseModel):
    """Schema for updating a vendor term assignment"""
    priority_override: Optional[int] = Field(None, ge=1, le=999, description="Updated priority override")
    notes: Optional[str] = Field(None, description="Updated notes")


class VendorTermsResponse(BaseModel):
    """Schema for returning a vendor term assignment"""
    id: int
    vendor_id: int
    term_id: int
    priority_override: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested term details
    term: Optional[TermsConditionsMasterResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ===========================
# Partner Vendor Medicines Schemas
# ===========================

class PartnerMedicineCreate(BaseModel):
    """Schema for assigning a medicine to a partner vendor"""
    vendor_id: int = Field(..., description="ID of the partner vendor (must be vendor_type=PARTNER)")
    medicine_id: int = Field(..., description="ID of the medicine to allow")
    notes: Optional[str] = Field(None, description="Notes about this medicine assignment")


class PartnerMedicineUpdate(BaseModel):
    """Schema for updating a partner medicine assignment"""
    notes: Optional[str] = Field(None, description="Updated notes")


class MedicineBasic(BaseModel):
    """Basic medicine information for nested display"""
    id: int
    medicine_code: str
    medicine_name: str

    model_config = ConfigDict(from_attributes=True)


class VendorBasic(BaseModel):
    """Basic vendor information for nested display"""
    id: int
    vendor_code: str
    vendor_name: str
    vendor_type: str

    model_config = ConfigDict(from_attributes=True)


class PartnerMedicineResponse(BaseModel):
    """Schema for returning a partner medicine assignment"""
    id: int
    vendor_id: int
    medicine_id: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested medicine details
    medicine: Optional[MedicineBasic] = None
    vendor: Optional[VendorBasic] = None

    model_config = ConfigDict(from_attributes=True)


# ===========================
# Batch Assignment Schemas
# ===========================

class VendorTermsBatchCreate(BaseModel):
    """Schema for assigning multiple terms to a vendor at once"""
    vendor_id: int = Field(..., description="ID of the vendor")
    term_ids: list[int] = Field(..., description="List of term IDs to assign")
    default_notes: Optional[str] = Field(None, description="Default notes applied to all assignments")


class PartnerMedicinesBatchCreate(BaseModel):
    """Schema for assigning multiple medicines to a partner vendor at once"""
    vendor_id: int = Field(..., description="ID of the partner vendor")
    medicine_ids: list[int] = Field(..., description="List of medicine IDs to assign")
    default_notes: Optional[str] = Field(None, description="Default notes applied to all assignments")


# ===========================
# Query/Filter Schemas
# ===========================

class TermsConditionsQueryParams(BaseModel):
    """Query parameters for filtering terms & conditions"""
    category: Optional[str] = Field(None, description="Filter by category")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    search: Optional[str] = Field(None, description="Search term text")


class VendorTermsQueryParams(BaseModel):
    """Query parameters for filtering vendor terms"""
    vendor_id: Optional[int] = Field(None, description="Filter by vendor ID")
    category: Optional[str] = Field(None, description="Filter by term category")
    is_active: Optional[bool] = Field(None, description="Filter by active terms only")


class PartnerMedicinesQueryParams(BaseModel):
    """Query parameters for filtering partner medicines"""
    vendor_id: Optional[int] = Field(None, description="Filter by vendor ID")
    medicine_id: Optional[int] = Field(None, description="Filter by medicine ID")
