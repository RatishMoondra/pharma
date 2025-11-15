"""
Analytics Router - Business Intelligence & Insights Endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database.session import get_db
from app.services.analytics_service import AnalyticsService
from app.auth.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/invoice-po-matching", response_model=Dict[str, Any])
async def get_invoice_po_matching(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get invoice-PO matching status with visual indicators.
    
    Returns:
    - ✓ matched: Perfect match
    - ⚠ partial: Some discrepancies
    - ✗ mismatch: Significant issues
    """
    service = AnalyticsService(db)
    results = service.get_invoice_po_matching_status()
    
    return {
        "success": True,
        "data": results,
        "summary": {
            "total": len(results),
            "matched": len([r for r in results if r['status'] == 'matched']),
            "partial": len([r for r in results if r['status'] == 'partial']),
            "mismatch": len([r for r in results if r['status'] == 'mismatch'])
        }
    }


@router.get("/quantity-discrepancies", response_model=Dict[str, Any])
async def get_quantity_discrepancies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quantity discrepancies across all POs.
    
    Shows over-shipments and under-shipments.
    """
    service = AnalyticsService(db)
    results = service.get_quantity_discrepancies()
    
    return {
        "success": True,
        "data": results,
        "summary": {
            "total": len(results),
            "over_shipments": len([r for r in results if r['status'] == 'over_shipment']),
            "under_shipments": len([r for r in results if r['status'] == 'under_shipment']),
            "high_severity": len([r for r in results if r['severity'] == 'high'])
        }
    }


@router.get("/vendor-performance", response_model=Dict[str, Any])
async def get_vendor_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get vendor performance ratings.
    
    Ratings:
    - 🟢 Excellent (90-100%)
    - 🟡 Average (70-89%)
    - 🔴 Poor (<70%)
    """
    service = AnalyticsService(db)
    results = service.get_vendor_performance_ratings()
    
    return {
        "success": True,
        "data": results,
        "summary": {
            "total_vendors": len(results),
            "excellent": len([r for r in results if r['rating'] == 'Excellent']),
            "average": len([r for r in results if r['rating'] == 'Average']),
            "poor": len([r for r in results if r['rating'] == 'Poor'])
        }
    }
