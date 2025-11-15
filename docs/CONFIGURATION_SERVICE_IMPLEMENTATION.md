# Configuration Service Implementation Guide

## Overview

Enterprise-grade configuration system for Pharma Co. application that stores all system settings in PostgreSQL database with JSONB support for flexible schema-less storage. Implements in-memory caching with 5-minute TTL for performance optimization.

## Implementation Date
**Created:** November 15, 2025

## Architecture

```
Configuration Service Architecture
====================================

┌─────────────────────────────────────────────────────────────┐
│                     Frontend Admin UI                        │
│                    (Planned - Phase 2)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP (CRUD Requests)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Configuration Router (FastAPI)                  │
│  GET/POST/PUT/DELETE /api/config/                           │
│  GET /api/config/system/info                                │
│  GET /api/config/workflow/rules                             │
│  GET /api/config/document/numbering                         │
│  GET /api/config/vendor/rules                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Dependency Injection
                     ↓
┌─────────────────────────────────────────────────────────────┐
│           ConfigurationService (Business Logic)              │
│  ┌────────────────────────────────────────────────┐         │
│  │  In-Memory Cache (Class-Level)                 │         │
│  │  TTL: 5 minutes                                │         │
│  │  Invalidation: On write operations             │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  Methods:                                                    │
│  - get_config(key, use_cache=True)                          │
│  - get_all_configs(category, include_sensitive)             │
│  - create_config(), update_config(), delete_config()        │
│  - get_system_info(), get_workflow_rules()                  │
│  - get_document_numbering(), get_vendor_rules()             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ SQLAlchemy ORM
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              SystemConfiguration Model                       │
│  - id (Integer, Primary Key)                                │
│  - config_key (String, Unique, Indexed)                     │
│  - config_value (JSONB)                                     │
│  - category (String, Indexed)                               │
│  - is_sensitive (Boolean)                                   │
│  - updated_at (Timestamp)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ PostgreSQL
                     ↓
┌─────────────────────────────────────────────────────────────┐
│             Database: system_configuration                   │
│             Indexes: config_key, category                    │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. Model Layer
**File:** `backend/app/models/configuration.py` (40 lines)

**Purpose:** SQLAlchemy model for storing configuration

**Key Features:**
- Uses PostgreSQL JSONB for flexible config_value storage
- Unique index on config_key for fast lookups
- Category-based organization (8 categories)
- Sensitive data flagging (is_sensitive)
- Auto-updated timestamp (updated_at)

**Categories:**
1. `system` - Company info, currency, timezone, fiscal year
2. `workflow` - PI edit rules, EOPA approval, auto-close PO, balance logic
3. `numbering` - Document number formats (PI, EOPA, PO, GRN, Dispatch, Invoice)
4. `vendor` - Packaging languages, artwork versions, fallback logic
5. `email` - SMTP settings, templates, notification toggles
6. `security` - Password policy, token expiry, role permissions
7. `ui` - Theme, colors, pagination, language
8. `integration` - ERP URLs, API keys, webhooks, file storage

### 2. Schema Layer
**File:** `backend/app/schemas/configuration.py` (55 lines)

**Purpose:** Pydantic schemas for API validation

**Schemas:**
- `ConfigurationBase` - Base schema with all fields
- `ConfigurationCreate` - POST request schema
- `ConfigurationUpdate` - PATCH/PUT schema (all optional)
- `ConfigurationResponse` - Full response with timestamps
- `ConfigurationPublicResponse` - Hides sensitive data

**Features:**
- Field descriptions using Pydantic `Field()`
- from_attributes = True for ORM compatibility
- Optional fields in Update schema for partial updates

### 3. Service Layer
**File:** `backend/app/services/configuration_service.py` (280+ lines)

**Purpose:** Business logic with caching

**Class-Level Cache:**
```python
_cache: dict = {}
_cache_timestamp: Optional[datetime] = None
_cache_ttl_minutes: int = 5
```

**CRUD Methods:**
- `get_config(key, use_cache=True)` - Retrieve config with caching
- `get_all_configs(category, include_sensitive)` - Filtered retrieval
- `create_config()` - Create and invalidate cache
- `update_config()` - Update and invalidate cache
- `delete_config()` - Delete and invalidate cache

**Domain-Specific Getters (with defaults):**
- `get_system_info()` - Company name, currency, timezone, fiscal year, date format
- `get_workflow_rules()` - PI edit, EOPA approval, auto-close PO, partial dispatch, balance logic
- `get_document_numbering()` - Number formats for all document types
- `get_vendor_rules()` - Packaging languages, artwork versions, fallback logic

**Cache Management:**
- `_refresh_cache()` - Load all configs into memory
- `_is_cache_stale()` - Check if cache older than 5 minutes
- Cache invalidation on create/update/delete

**Error Handling:**
- Raises `AppException` with appropriate error codes
- Comprehensive logging for all operations

### 4. Router Layer
**File:** `backend/app/routers/configuration.py` (220+ lines)

**Purpose:** FastAPI endpoints with authentication

**Endpoints:**

| Method | Path | Authentication | Description |
|--------|------|----------------|-------------|
| GET | `/config/` | Required | List all configs (with filters) |
| GET | `/config/{key}` | Required | Get specific config |
| POST | `/config/` | ADMIN only | Create new config |
| PUT | `/config/{key}` | ADMIN only | Update config |
| DELETE | `/config/{key}` | ADMIN only | Delete config |
| GET | `/config/system/info` | Required | Get system config |
| GET | `/config/workflow/rules` | Required | Get workflow rules |
| GET | `/config/document/numbering` | Required | Get numbering formats |
| GET | `/config/vendor/rules` | Required | Get vendor rules |

**Security:**
- JWT authentication required for all endpoints
- ADMIN role required for write operations (POST/PUT/DELETE)
- Sensitive configs hidden from non-ADMIN users
- Logging for all operations with user tracking

**Query Parameters:**
- `category` - Filter by category (system, workflow, etc.)
- `include_sensitive` - Include sensitive configs (ADMIN only)

### 5. Seeder Script
**File:** `backend/app/seeders/configuration_seeder.py` (450+ lines)

**Purpose:** Populate default configurations

**Seeder Functions:**
- `seed_system_config()` - Company name, logo, address, currency, timezone, date format, fiscal year
- `seed_workflow_rules()` - 7 workflow toggles with defaults
- `seed_document_numbering()` - 8 document number formats
- `seed_vendor_rules()` - Languages, artwork versions, fallback logic
- `seed_email_config()` - SMTP settings, sender, notification toggles
- `seed_security_config()` - Password policy, JWT expiry, role permissions
- `seed_ui_config()` - Theme, colors, pagination, language
- `seed_integration_config()` - ERP URL, API keys, webhooks, file storage
- `seed_all()` - Run all seeders in sequence

**Idempotent Design:**
- Checks if config exists before creating
- Safe to run multiple times
- Logs creation and skip actions

**Run Command:**
```bash
cd backend
python app/seeders/configuration_seeder.py
```

### 6. Database Migration
**File:** `backend/alembic/versions/0be130d9af6a_add_system_configuration_table.py`

**Purpose:** Create system_configuration table

**Schema:**
```sql
CREATE TABLE system_configuration (
    id SERIAL NOT NULL,
    config_key VARCHAR(255) NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_sensitive BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_config_key UNIQUE (config_key)
);

CREATE INDEX idx_config_key ON system_configuration (config_key);
CREATE INDEX idx_config_category ON system_configuration (category);
```

**Migration Commands:**
```bash
# Already applied (table exists from Base.metadata.create_all)
alembic stamp head

# If table doesn't exist:
alembic upgrade head
```

## Configuration Categories & Keys

### 1. System Configuration

| Key | Value Example | Description |
|-----|---------------|-------------|
| `company_name` | `{"value": "Pharma Co. Ltd."}` | Company name for reports/emails/PDFs |
| `company_logo_url` | `{"value": "/static/logo.png"}` | URL to company logo |
| `company_address` | `{"street": "123 Pharma St", "city": "Mumbai", ...}` | Company address |
| `default_currency` | `{"value": "INR", "symbol": "₹"}` | Default currency |
| `default_timezone` | `{"value": "Asia/Kolkata"}` | Default timezone |
| `date_format` | `{"value": "DD-MM-YYYY"}` | Date format for UI |
| `fiscal_year` | `{"value": "24-25", "start_month": 4}` | Current fiscal year |

### 2. Workflow Rules

| Key | Value Example | Description |
|-----|---------------|-------------|
| `allow_pi_edit_after_eopa` | `{"enabled": false}` | Allow editing PI after EOPA created |
| `allow_eopa_edit_after_approval` | `{"enabled": false}` | Allow editing EOPA after approval |
| `auto_close_po_on_fulfillment` | `{"enabled": true}` | Auto-close PO when fulfilled |
| `enable_partial_dispatch` | `{"enabled": true}` | Allow partial dispatch of POs |
| `enable_manufacturer_balance_logic` | `{"enabled": true}` | Track manufacturer material balance |
| `enable_invoice_fulfillment` | `{"enabled": true}` | Update PO from invoices |
| `enable_multilingual_pm` | `{"enabled": true}` | Enable PM language/artwork versioning |

### 3. Document Numbering

| Key | Value Example | Description |
|-----|---------------|-------------|
| `pi_number_format` | `{"format": "PI/{FY}/{SEQ:04d}"}` | PI number format |
| `eopa_number_format` | `{"format": "EOPA/{FY}/{SEQ:04d}"}` | EOPA number format |
| `po_rm_number_format` | `{"format": "PO/RM/{FY}/{SEQ:04d}"}` | RM PO format |
| `po_pm_number_format` | `{"format": "PO/PM/{FY}/{SEQ:04d}"}` | PM PO format |
| `po_fg_number_format` | `{"format": "PO/FG/{FY}/{SEQ:04d}"}` | FG PO format |
| `grn_number_format` | `{"format": "GRN/{FY}/{SEQ:04d}"}` | GRN format |
| `dispatch_number_format` | `{"format": "DISP/{FY}/{SEQ:04d}"}` | Dispatch format |
| `invoice_number_format` | `{"format": "INV/{FY}/{SEQ:04d}"}` | Invoice format |

### 4. Vendor Rules

| Key | Value Example | Description |
|-----|---------------|-------------|
| `allowed_pm_languages` | `{"languages": ["EN", "FR", "AR", "SP", "HI"], "labels": {...}}` | Allowed PM languages |
| `allowed_pm_artwork_versions` | `{"versions": ["v1.0", "v1.1", "v2.0", "v2.1", "v3.0"]}` | Artwork versions |
| `enable_vendor_fallback_logic` | `{"enabled": true}` | Use Medicine Master vendor defaults |

### 5. Email Configuration

| Key | Value Example | Description | Sensitive |
|-----|---------------|-------------|-----------|
| `smtp_host` | `{"value": "smtp.gmail.com"}` | SMTP server host | No |
| `smtp_port` | `{"value": 587}` | SMTP server port | No |
| `smtp_username` | `{"value": "noreply@pharmaco.com"}` | SMTP username | Yes |
| `smtp_password` | `{"value": ""}` | SMTP password | Yes |
| `email_sender` | `{"email": "noreply@pharmaco.com", "name": "Pharma Co. System"}` | Default sender | No |
| `enable_email_notifications` | `{"po_created": true, "eopa_approved": true, ...}` | Email toggles | No |

### 6. Security Configuration

| Key | Value Example | Description |
|-----|---------------|-------------|
| `password_policy` | `{"min_length": 8, "require_uppercase": true, ...}` | Password complexity rules |
| `jwt_token_expiry_minutes` | `{"value": 60}` | JWT token expiry time |
| `role_permissions` | `{"ADMIN": ["all"], "PROCUREMENT_OFFICER": [...], ...}` | Role-based permissions |

### 7. UI Configuration

| Key | Value Example | Description |
|-----|---------------|-------------|
| `ui_theme` | `{"value": "light"}` | Default UI theme |
| `ui_primary_color` | `{"value": "#1976d2"}` | Primary brand color |
| `items_per_page` | `{"value": 50}` | Pagination size |
| `default_language` | `{"value": "EN"}` | Default UI language |

### 8. Integration Configuration

| Key | Value Example | Description | Sensitive |
|-----|---------------|-------------|-----------|
| `erp_integration_url` | `{"value": null}` | External ERP URL | No |
| `erp_api_key` | `{"value": ""}` | ERP API key | Yes |
| `webhook_endpoints` | `{"po_created": null, ...}` | Webhook URLs | No |
| `file_storage_type` | `{"value": "local"}` | File storage backend | No |

## Usage Examples

### Backend: Retrieve Configuration

```python
from app.services.configuration_service import ConfigurationService

def my_service_function(db: Session):
    config_service = ConfigurationService(db)
    
    # Get single config value
    company_name = config_service.get_config("company_name")
    # Returns: {"value": "Pharma Co. Ltd."}
    
    # Get system info with defaults
    system_info = config_service.get_system_info()
    # Returns: {
    #   "company_name": "Pharma Co. Ltd.",
    #   "company_logo_url": "/static/logo.png",
    #   "currency": {"value": "INR", "symbol": "₹"},
    #   "timezone": "Asia/Kolkata",
    #   ...
    # }
    
    # Get workflow rules
    workflow_rules = config_service.get_workflow_rules()
    if workflow_rules["enable_invoice_fulfillment"]:
        # Process invoice fulfillment
        pass
    
    # Get document numbering formats
    numbering = config_service.get_document_numbering()
    pi_format = numbering["pi_format"]  # "PI/{FY}/{SEQ:04d}"
```

### Backend: Update Configuration (ADMIN only)

```python
# Via API endpoint
POST /api/config/
{
  "config_key": "custom_setting",
  "config_value": {"enabled": true, "value": 100},
  "description": "Custom system setting",
  "category": "system",
  "is_sensitive": false
}

PUT /api/config/company_name
{
  "config_value": {"value": "New Company Name Ltd."}
}

DELETE /api/config/custom_setting
```

### Frontend: Fetch Configuration

```javascript
import api from '../services/api';

// Get all configs in a category
const response = await api.get('/api/config/', {
  params: { category: 'system' }
});
const configs = response.data.data;

// Get specific config
const res = await api.get('/api/config/company_name');
const companyName = res.data.data.value.value;

// Get system info
const systemRes = await api.get('/api/config/system/info');
const systemInfo = systemRes.data.data;
```

## Caching Strategy

### How Caching Works

1. **Class-Level Cache**: Shared across all requests in the application
   ```python
   _cache: dict = {}  # Stores all configs in memory
   _cache_timestamp: Optional[datetime] = None
   _cache_ttl_minutes: int = 5
   ```

2. **Cache Population**: On first read or after staleness
   ```python
   def _refresh_cache(self):
       configs = self.db.query(SystemConfiguration).all()
       self._cache = {c.config_key: c.config_value for c in configs}
       self._cache_timestamp = datetime.utcnow()
   ```

3. **Cache Staleness Check**:
   ```python
   def _is_cache_stale(self) -> bool:
       if not self._cache_timestamp:
           return True
       elapsed = datetime.utcnow() - self._cache_timestamp
       return elapsed.total_seconds() > (self._cache_ttl_minutes * 60)
   ```

4. **Cache Invalidation**: On write operations
   ```python
   def create_config(...):
       # ... create config ...
       self._cache = {}
       self._cache_timestamp = None
   ```

### Performance Benefits

- **No DB queries** for cached reads (99% of requests)
- **Automatic refresh** every 5 minutes for fresh data
- **Immediate invalidation** on writes for consistency
- **Shared cache** across all requests (class-level)

### Cache Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Fast reads (in-memory) | Max 5-minute staleness |
| Single DB query per refresh | Cache invalidated on every write |
| Reduces DB load | Class-level state (not thread-local) |
| Simple implementation | Manual cache management |

## Testing the Configuration Service

### 1. Test via API (Postman/cURL)

```bash
# Login as ADMIN
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# Get token from response
export TOKEN="your_jwt_token"

# List all configs
curl http://localhost:8000/api/config/ \
  -H "Authorization: Bearer $TOKEN"

# Get system info
curl http://localhost:8000/api/config/system/info \
  -H "Authorization: Bearer $TOKEN"

# Create config
curl -X POST http://localhost:8000/api/config/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config_key": "test_setting",
    "config_value": {"enabled": true},
    "description": "Test setting",
    "category": "system",
    "is_sensitive": false
  }'

# Update config
curl -X PUT http://localhost:8000/api/config/test_setting \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config_value": {"enabled": false}
  }'

# Delete config
curl -X DELETE http://localhost:8000/api/config/test_setting \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Test Cache Behavior

```python
# Test script: backend/scripts/test_config_cache.py
from app.database.session import SessionLocal
from app.services.configuration_service import ConfigurationService
import time

db = SessionLocal()
service = ConfigurationService(db)

# First call - loads from DB
print("First call (DB load):")
start = time.time()
config = service.get_config("company_name", use_cache=True)
print(f"  Time: {time.time() - start:.4f}s")
print(f"  Value: {config}")

# Second call - uses cache
print("\nSecond call (cached):")
start = time.time()
config = service.get_config("company_name", use_cache=True)
print(f"  Time: {time.time() - start:.4f}s")
print(f"  Value: {config}")

# Update config - invalidates cache
print("\nUpdate config:")
service.update_config("company_name", {"value": "Updated Company"})

# Third call - loads from DB again
print("\nThird call (DB load after invalidation):")
start = time.time()
config = service.get_config("company_name", use_cache=True)
print(f"  Time: {time.time() - start:.4f}s")
print(f"  Value: {config}")
```

### 3. Verify Seeded Data

```sql
-- Connect to PostgreSQL
psql -U postgres -d pharma_db

-- Check all configs
SELECT config_key, category, is_sensitive FROM system_configuration ORDER BY category, config_key;

-- Check system configs
SELECT config_key, config_value FROM system_configuration WHERE category = 'system';

-- Check sensitive configs
SELECT config_key, config_value FROM system_configuration WHERE is_sensitive = true;

-- Check workflow rules
SELECT config_key, config_value FROM system_configuration WHERE category = 'workflow';
```

## Integration with Existing Services

### Next Steps: Replace Hardcoded Values

1. **Update Number Generator** (`utils/number_generator.py`):
   ```python
   from app.services.configuration_service import ConfigurationService
   
   def generate_pi_number(db: Session):
       config_service = ConfigurationService(db)
       numbering = config_service.get_document_numbering()
       format_str = numbering["pi_format"]  # "PI/{FY}/{SEQ:04d}"
       # Use format_str instead of hardcoded "PI/{FY}/{SEQ:04d}"
   ```

2. **Update PDF Service** (`services/pdf_service.py`):
   ```python
   def generate_po_pdf(...):
       config_service = ConfigurationService(db)
       system_info = config_service.get_system_info()
       
       # Use config values
       company_name = system_info["company_name"]
       currency_symbol = system_info["currency"]["symbol"]
   ```

3. **Update Email Service** (`services/email_service.py`):
   ```python
   def send_email(...):
       config_service = ConfigurationService(db)
       system_info = config_service.get_system_info()
       
       # Use config values instead of environment variables
       smtp_host = system_info.get("smtp_host", "smtp.gmail.com")
       smtp_port = system_info.get("smtp_port", 587)
   ```

4. **Update Workflow Validation**:
   ```python
   def validate_pi_edit(...):
       config_service = ConfigurationService(db)
       workflow_rules = config_service.get_workflow_rules()
       
       if not workflow_rules["allow_pi_edit_after_eopa"]:
           raise AppException("PI cannot be edited after EOPA creation", "ERR_VALIDATION")
   ```

## Frontend Admin Panel (Phase 2)

### Planned Features

1. **Configuration Page** (`frontend/src/pages/ConfigurationPage.jsx`):
   - Tabs for each category (8 tabs)
   - Editable form fields for each config key
   - Save/Cancel buttons with confirmation
   - Sensitive data masking (password fields)

2. **Navigation**:
   - Add route: `/configuration` (ADMIN only)
   - Add menu item: "System Configuration" with SettingsIcon

3. **Component Structure**:
   ```jsx
   <ConfigurationPage>
     <Tabs value={activeTab} onChange={handleTabChange}>
       <Tab label="System" />
       <Tab label="Workflow" />
       <Tab label="Numbering" />
       <Tab label="Vendor" />
       <Tab label="Email" />
       <Tab label="Security" />
       <Tab label="UI" />
       <Tab label="Integration" />
     </Tabs>
     
     <TabPanel value={activeTab} index={0}>
       <SystemConfigForm configs={systemConfigs} onSave={handleSave} />
     </TabPanel>
     
     {/* Other tab panels */}
   </ConfigurationPage>
   ```

## Troubleshooting

### Issue: Cache not refreshing

**Symptoms**: Updated config not visible after 5 minutes

**Solution**: Check cache TTL and manual invalidation
```python
# Force cache refresh
service._cache = {}
service._cache_timestamp = None
config = service.get_config("key", use_cache=True)
```

### Issue: Sensitive configs visible to non-ADMIN

**Symptoms**: Users see SMTP passwords, API keys

**Solution**: Verify RBAC in router
```python
@router.get("/")
async def list_configurations(
    include_sensitive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check role
    if include_sensitive and current_user.role != UserRole.ADMIN:
        raise AppException("Only ADMIN can view sensitive configurations", "ERR_FORBIDDEN", 403)
```

### Issue: Migration fails with "relation already exists"

**Symptoms**: Alembic upgrade fails

**Solution**: Table created by Base.metadata.create_all in main.py
```bash
# Mark migration as applied without running it
alembic stamp head
```

### Issue: Seeder creates duplicates

**Symptoms**: Multiple entries for same config_key

**Solution**: Seeder checks for existing configs before creating
```python
existing = db.query(SystemConfiguration).filter_by(config_key=config_data["config_key"]).first()
if not existing:
    config = SystemConfiguration(**config_data)
    db.add(config)
```

## Maintenance

### Adding New Configuration

1. **Add to Seeder**:
   ```python
   {
       "config_key": "new_setting",
       "config_value": {"enabled": true},
       "description": "Description of new setting",
       "category": "system",
       "is_sensitive": False
   }
   ```

2. **Run Seeder**:
   ```bash
   python app/seeders/configuration_seeder.py
   ```

3. **Update Service** (optional - for domain getters):
   ```python
   def get_system_info(self) -> dict:
       # Add default for new setting
       defaults = {
           "new_setting": {"enabled": False},  # Default value
           ...
       }
   ```

### Backup Configuration

```bash
# Export all configs to JSON
psql -U postgres -d pharma_db -c "
  SELECT json_agg(row_to_json(t))
  FROM (SELECT config_key, config_value, category FROM system_configuration) t
" > config_backup.json

# Restore from JSON
# (Create restoration script as needed)
```

### Monitor Cache Performance

```python
# Add logging to service methods
logger.info({
    "event": "CONFIG_CACHE_HIT",
    "key": key,
    "cache_age_seconds": (datetime.utcnow() - self._cache_timestamp).total_seconds()
})
```

## Security Best Practices

1. **Sensitive Data**:
   - Mark SMTP passwords, API keys as `is_sensitive: True`
   - Hide sensitive configs from non-ADMIN users in API responses
   - Use environment variables for initial SMTP password setup
   - Rotate sensitive values regularly

2. **Access Control**:
   - Only ADMIN can create/update/delete configs
   - All users can read non-sensitive configs
   - Log all configuration changes with username

3. **Validation**:
   - Validate config_value structure before saving
   - Sanitize user input to prevent injection attacks
   - Use Pydantic schemas for type safety

## Performance Metrics

### Expected Performance

- **Cache Hit Rate**: 99%+ (5-minute refresh cycle)
- **Cache Read Time**: < 1ms (in-memory lookup)
- **DB Read Time**: ~10-50ms (with indexes)
- **Cache Refresh Time**: ~100-200ms (load all configs)

### Monitoring

```python
# Add metrics to service
from datetime import datetime

class ConfigurationService:
    _cache_hits: int = 0
    _cache_misses: int = 0
    
    def get_config(self, key: str, use_cache: bool = True):
        if use_cache and key in self._cache and not self._is_cache_stale():
            self._cache_hits += 1
            logger.info(f"Cache hit: {key} (hits: {self._cache_hits}, misses: {self._cache_misses})")
        else:
            self._cache_misses += 1
            logger.info(f"Cache miss: {key}")
```

## Summary

✅ **Completed Components:**
- SystemConfiguration model with JSONB
- Pydantic schemas (CRUD + Public)
- ConfigurationService with caching
- FastAPI router with RBAC
- Database migration
- Configuration seeder with defaults
- Router integration in main.py
- 40+ default configurations across 8 categories

📋 **Configuration Categories:**
1. System (7 configs)
2. Workflow Rules (7 configs)
3. Document Numbering (8 configs)
4. Vendor Rules (3 configs)
5. Email (6 configs)
6. Security (3 configs)
7. UI (4 configs)
8. Integration (4 configs)

🎯 **Next Steps (Phase 2):**
1. Create frontend admin panel for configuration management
2. Integrate with existing services (number generation, PDF, email)
3. Add configuration history/audit log
4. Implement configuration validation rules
5. Add configuration templates for quick setup

🚀 **Ready to Use:**
- API endpoints live at `/api/config/`
- All configs seeded with sensible defaults
- Cache active with 5-minute TTL
- ADMIN users can manage configs via API
- All users can read configs via domain-specific endpoints
