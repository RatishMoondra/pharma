"""
Configuration Seeder - Populate default system configurations
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.configuration import SystemConfiguration
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pharma.seeder")


def seed_system_config(db: Session):
    """Seed system-level configuration"""
    configs = [
        {
            "config_key": "company_name",
            "config_value": {"value": "Pharma Co. Ltd."},
            "description": "Company name displayed in reports, emails, and PDFs",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "company_logo_url",
            "config_value": {"value": "/static/logo.png"},
            "description": "URL to company logo for PDFs and emails",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "company_address",
            "config_value": {
                "street": "123 Pharma Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "country": "India"
            },
            "description": "Company address for invoices and correspondence",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "default_currency",
            "config_value": {"value": "INR", "symbol": "₹"},
            "description": "Default currency for all transactions",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "default_timezone",
            "config_value": {"value": "Asia/Kolkata"},
            "description": "Default timezone for timestamps",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "date_format",
            "config_value": {"value": "DD-MM-YYYY"},
            "description": "Date format for UI and reports",
            "category": "system",
            "is_sensitive": False
        },
        {
            "config_key": "fiscal_year",
            "config_value": {"value": "24-25", "start_month": 4},
            "description": "Current fiscal year and start month (1=January)",
            "category": "system",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_workflow_rules(db: Session):
    """Seed workflow configuration rules"""
    configs = [
        {
            "config_key": "allow_pi_edit_after_eopa",
            "config_value": {"enabled": False},
            "description": "Allow editing PI after EOPA is created",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "allow_eopa_edit_after_approval",
            "config_value": {"enabled": False},
            "description": "Allow editing EOPA after approval",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "auto_close_po_on_fulfillment",
            "config_value": {"enabled": True},
            "description": "Automatically close PO when fulfilled_qty == ordered_qty",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "enable_partial_dispatch",
            "config_value": {"enabled": True},
            "description": "Allow partial dispatch of POs",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "enable_manufacturer_balance_logic",
            "config_value": {"enabled": True},
            "description": "Track manufacturer material balance for RM/PM",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "enable_invoice_fulfillment",
            "config_value": {"enabled": True},
            "description": "Update PO fulfillment from vendor invoices",
            "category": "workflow",
            "is_sensitive": False
        },
        {
            "config_key": "enable_multilingual_pm",
            "config_value": {"enabled": True},
            "description": "Enable packaging material language/artwork versioning",
            "category": "workflow",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_document_numbering(db: Session):
    """Seed document numbering formats"""
    configs = [
        {
            "config_key": "pi_number_format",
            "config_value": {"format": "PI/{FY}/{SEQ:04d}"},
            "description": "Proforma Invoice number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "eopa_number_format",
            "config_value": {"format": "EOPA/{FY}/{SEQ:04d}"},
            "description": "EOPA number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "po_rm_number_format",
            "config_value": {"format": "PO/RM/{FY}/{SEQ:04d}"},
            "description": "Raw Material PO number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "po_pm_number_format",
            "config_value": {"format": "PO/PM/{FY}/{SEQ:04d}"},
            "description": "Packaging Material PO number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "po_fg_number_format",
            "config_value": {"format": "PO/FG/{FY}/{SEQ:04d}"},
            "description": "Finished Goods PO number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "grn_number_format",
            "config_value": {"format": "GRN/{FY}/{SEQ:04d}"},
            "description": "Goods Receipt Note number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "dispatch_number_format",
            "config_value": {"format": "DISP/{FY}/{SEQ:04d}"},
            "description": "Dispatch Advice number format",
            "category": "numbering",
            "is_sensitive": False
        },
        {
            "config_key": "invoice_number_format",
            "config_value": {"format": "INV/{FY}/{SEQ:04d}"},
            "description": "Vendor Invoice number format",
            "category": "numbering",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_vendor_rules(db: Session):
    """Seed vendor and medicine master rules"""
    configs = [
        {
            "config_key": "allowed_pm_languages",
            "config_value": {
                "languages": ["EN", "FR", "AR", "SP", "HI"],
                "labels": {
                    "EN": "English",
                    "FR": "French",
                    "AR": "Arabic",
                    "SP": "Spanish",
                    "HI": "Hindi"
                }
            },
            "description": "Allowed packaging material languages",
            "category": "vendor",
            "is_sensitive": False
        },
        {
            "config_key": "allowed_pm_artwork_versions",
            "config_value": {
                "versions": ["v1.0", "v1.1", "v2.0", "v2.1", "v3.0"]
            },
            "description": "Allowed packaging material artwork versions",
            "category": "vendor",
            "is_sensitive": False
        },
        {
            "config_key": "enable_vendor_fallback_logic",
            "config_value": {"enabled": True},
            "description": "Use Medicine Master vendor defaults when creating EOPAs",
            "category": "vendor",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_email_config(db: Session):
    """Seed email configuration"""
    configs = [
        {
            "config_key": "smtp_host",
            "config_value": {"value": "smtp.gmail.com"},
            "description": "SMTP server host",
            "category": "email",
            "is_sensitive": False
        },
        {
            "config_key": "smtp_port",
            "config_value": {"value": 587},
            "description": "SMTP server port",
            "category": "email",
            "is_sensitive": False
        },
        {
            "config_key": "smtp_username",
            "config_value": {"value": "noreply@pharmaco.com"},
            "description": "SMTP authentication username",
            "category": "email",
            "is_sensitive": True
        },
        {
            "config_key": "smtp_password",
            "config_value": {"value": ""},
            "description": "SMTP authentication password (configure in production)",
            "category": "email",
            "is_sensitive": True
        },
        {
            "config_key": "email_sender",
            "config_value": {
                "email": "noreply@pharmaco.com",
                "name": "Pharma Co. System"
            },
            "description": "Default sender for system emails",
            "category": "email",
            "is_sensitive": False
        },
        {
            "config_key": "enable_email_notifications",
            "config_value": {
                "po_created": True,
                "eopa_approved": True,
                "invoice_received": True,
                "dispatch_created": True
            },
            "description": "Enable/disable email notifications by event type",
            "category": "email",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_security_config(db: Session):
    """Seed security configuration"""
    configs = [
        {
            "config_key": "password_policy",
            "config_value": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_number": True,
                "require_special": False
            },
            "description": "Password complexity requirements",
            "category": "security",
            "is_sensitive": False
        },
        {
            "config_key": "jwt_token_expiry_minutes",
            "config_value": {"value": 60},
            "description": "JWT access token expiry time in minutes",
            "category": "security",
            "is_sensitive": False
        },
        {
            "config_key": "role_permissions",
            "config_value": {
                "ADMIN": ["all"],
                "PROCUREMENT_OFFICER": ["pi:create", "eopa:create", "po:create", "reports:view"],
                "WAREHOUSE_MANAGER": ["material:receive", "dispatch:create", "grn:create", "inventory:view"],
                "ACCOUNTANT": ["view_only"]
            },
            "description": "Role-based permissions matrix",
            "category": "security",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_ui_config(db: Session):
    """Seed UI/UX configuration"""
    configs = [
        {
            "config_key": "ui_theme",
            "config_value": {"value": "light"},
            "description": "Default UI theme (light/dark)",
            "category": "ui",
            "is_sensitive": False
        },
        {
            "config_key": "ui_primary_color",
            "config_value": {"value": "#1976d2"},
            "description": "Primary brand color for UI",
            "category": "ui",
            "is_sensitive": False
        },
        {
            "config_key": "items_per_page",
            "config_value": {"value": 50},
            "description": "Default pagination size for tables",
            "category": "ui",
            "is_sensitive": False
        },
        {
            "config_key": "default_language",
            "config_value": {"value": "EN"},
            "description": "Default UI language",
            "category": "ui",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_integration_config(db: Session):
    """Seed integration configuration"""
    configs = [
        {
            "config_key": "erp_integration_url",
            "config_value": {"value": None},
            "description": "External ERP system URL (configure in production)",
            "category": "integration",
            "is_sensitive": False
        },
        {
            "config_key": "erp_api_key",
            "config_value": {"value": ""},
            "description": "ERP API authentication key",
            "category": "integration",
            "is_sensitive": True
        },
        {
            "config_key": "webhook_endpoints",
            "config_value": {
                "po_created": None,
                "invoice_received": None,
                "dispatch_created": None
            },
            "description": "Webhook URLs for event notifications",
            "category": "integration",
            "is_sensitive": False
        },
        {
            "config_key": "file_storage_type",
            "config_value": {"value": "local"},
            "description": "File storage backend (local, s3, azure)",
            "category": "integration",
            "is_sensitive": False
        }
    ]
    
    for config_data in configs:
        existing = db.query(SystemConfiguration).filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(**config_data)
            db.add(config)
            logger.info(f"✅ Created config: {config_data['config_key']}")
        else:
            logger.info(f"⏭️  Config already exists: {config_data['config_key']}")
    
    db.commit()


def seed_all():
    """Run all seeders"""
    db = SessionLocal()
    
    try:
        logger.info("🌱 Starting configuration seeding...")
        
        logger.info("\n📌 Seeding System Configuration...")
        seed_system_config(db)
        
        logger.info("\n📌 Seeding Workflow Rules...")
        seed_workflow_rules(db)
        
        logger.info("\n📌 Seeding Document Numbering...")
        seed_document_numbering(db)
        
        logger.info("\n📌 Seeding Vendor Rules...")
        seed_vendor_rules(db)
        
        logger.info("\n📌 Seeding Email Configuration...")
        seed_email_config(db)
        
        logger.info("\n📌 Seeding Security Configuration...")
        seed_security_config(db)
        
        logger.info("\n📌 Seeding UI Configuration...")
        seed_ui_config(db)
        
        logger.info("\n📌 Seeding Integration Configuration...")
        seed_integration_config(db)
        
        logger.info("\n✅ Configuration seeding completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
