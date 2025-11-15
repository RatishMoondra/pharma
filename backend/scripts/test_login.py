"""
Test login API endpoint directly
"""

import requests
import json


def test_login():
    url = "http://localhost:8000/api/auth/login"
    
    credentials = {
        "username": "admin",
        "password": "admin123"
    }
    
    print("="*60)
    print("TESTING LOGIN API ENDPOINT")
    print("="*60)
    print(f"URL: {url}")
    print(f"Credentials: {json.dumps(credentials, indent=2)}")
    print("="*60)
    print()
    
    try:
        response = requests.post(url, json=credentials)
        
        print(f"Status Code: {response.status_code}")
        print()
        print("Response:")
        print(json.dumps(response.json(), indent=2))
        print()
        
        if response.status_code == 200:
            print("✅ LOGIN SUCCESSFUL!")
        else:
            print("❌ LOGIN FAILED!")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to backend server!")
        print("Make sure the backend is running at http://localhost:8000")
    except Exception as e:
        print(f"❌ ERROR: {e}")


if __name__ == "__main__":
    test_login()
