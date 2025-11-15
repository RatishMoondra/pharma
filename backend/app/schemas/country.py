from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Base Schema
class CountryBase(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=3, description="ISO 3166-1 alpha-3 country code")
    country_name: str = Field(..., min_length=1, max_length=100, description="Country name")
    language: str = Field(..., min_length=1, max_length=50, description="Primary language for printing materials")
    currency: Optional[str] = Field(None, max_length=3, description="ISO 4217 currency code (e.g., USD, EUR, INR)")
    is_active: bool = Field(True, description="Whether the country is active")


# Schema for creating a country
class CountryCreate(CountryBase):
    pass


# Schema for updating a country
class CountryUpdate(BaseModel):
    country_code: Optional[str] = Field(None, min_length=2, max_length=3)
    country_name: Optional[str] = Field(None, min_length=1, max_length=100)
    language: Optional[str] = Field(None, min_length=1, max_length=50)
    currency: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = None


# Schema for response
class CountryResponse(CountryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Minimal schema for dropdowns
class CountryBasic(BaseModel):
    id: int
    country_code: str
    country_name: str
    language: str
    currency: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
