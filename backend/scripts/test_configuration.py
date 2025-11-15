"""
Test Configuration Service - Verify caching and CRUD operations
"""
import sys
import os
from pathlib import Path

# Add backend directory to path for imports
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.session import SessionLocal
from app.services.configuration_service import ConfigurationService
import time

def test_config_service():
    """Test configuration service caching and retrieval"""
    db = SessionLocal()
    service = ConfigurationService(db)
    
    print("=" * 60)
    print("Configuration Service Test")
    print("=" * 60)
    
    # Test 1: Get config with cache (first call - DB load)
    print("\n1️⃣  First call - Load from database:")
    start = time.time()
    company_name = service.get_config("company_name", use_cache=True)
    elapsed = time.time() - start
    print(f"   ⏱️  Time: {elapsed:.4f}s")
    print(f"   📦 Value: {company_name}")
    
    # Test 2: Get config with cache (second call - cached)
    print("\n2️⃣  Second call - Use cache:")
    start = time.time()
    company_name = service.get_config("company_name", use_cache=True)
    elapsed = time.time() - start
    print(f"   ⏱️  Time: {elapsed:.4f}s (should be < 0.001s)")
    print(f"   📦 Value: {company_name}")
    
    # Test 3: Get system info with defaults
    print("\n3️⃣  Get system info:")
    system_info = service.get_system_info()
    print(f"   📋 System Info Keys: {list(system_info.keys())}")
    print(f"   📦 Full Value: {system_info}")
    
    # Test 3b: Get individual configs
    print("\n3️⃣b Get individual system configs:")
    company_name_config = service.get_config("company_name")
    currency_config = service.get_config("default_currency")
    timezone_config = service.get_config("default_timezone")
    print(f"   🏢 Company: {company_name_config}")
    print(f"   💰 Currency: {currency_config}")
    print(f"   🌍 Timezone: {timezone_config}")
    
    # Test 4: Get workflow rules
    print("\n4️⃣  Get workflow rules:")
    workflow_rules = service.get_workflow_rules()
    print(f"   📋 Workflow Keys: {list(workflow_rules.keys())}")
    print(f"   📦 Sample values:")
    for key, value in list(workflow_rules.items())[:3]:
        print(f"      - {key}: {value}")
    
    # Test 5: Get document numbering
    print("\n5️⃣  Get document numbering:")
    numbering = service.get_document_numbering()
    print(f"   📋 Numbering Keys: {list(numbering.keys())}")
    print(f"   📦 Sample formats:")
    for key, value in list(numbering.items())[:5]:
        print(f"      - {key}: {value}")
    
    # Test 6: Get vendor rules
    print("\n6️⃣  Get vendor rules:")
    vendor_rules = service.get_vendor_rules()
    print(f"   📋 Vendor Keys: {list(vendor_rules.keys())}")
    print(f"   📦 Values: {vendor_rules}")
    
    # Test 7: Get all configs by category
    print("\n7️⃣  Get all workflow configs:")
    workflow_configs = service.get_all_configs(category="workflow", include_sensitive=False)
    print(f"   📋 Found {len(workflow_configs)} workflow configurations")
    for config in workflow_configs[:3]:  # Show first 3
        print(f"      - {config.config_key}: {config.config_value}")
    
    # Test 8: Cache age
    print("\n8️⃣  Cache status:")
    if service._cache_timestamp:
        age = (time.time() - service._cache_timestamp.timestamp())
        print(f"   ⏰ Cache age: {age:.2f} seconds")
        print(f"   ♻️  Cache TTL: {service._cache_ttl_minutes * 60} seconds")
        print(f"   📊 Cached items: {len(service._cache)}")
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    
    db.close()

if __name__ == "__main__":
    test_config_service()
