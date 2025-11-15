"""
Check admin user details and test password verification
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.user import User
from app.auth.utils import verify_password
import bcrypt


def check_admin():
    db = SessionLocal()
    
    try:
        # Find admin user
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("❌ Admin user not found in database!")
            return
        
        print("="*60)
        print("ADMIN USER DETAILS:")
        print("="*60)
        print(f"ID: {admin.id}")
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        print(f"Full Name: {admin.full_name}")
        print(f"Role: {admin.role}")
        print(f"Is Active: {admin.is_active}")
        print(f"Hashed Password (first 50 chars): {admin.hashed_password[:50]}...")
        print("="*60)
        print()
        
        # Test password verification
        print("TESTING PASSWORD VERIFICATION:")
        print("="*60)
        
        test_passwords = ["admin123", "admin 123", "admin", "Admin123"]
        
        for pwd in test_passwords:
            try:
                result = verify_password(pwd, admin.hashed_password)
                status = "✅ MATCH" if result else "❌ NO MATCH"
                print(f"Password '{pwd}': {status}")
            except Exception as e:
                print(f"Password '{pwd}': ❌ ERROR - {e}")
        
        print("="*60)
        print()
        
        # Manual bcrypt test
        print("MANUAL BCRYPT VERIFICATION:")
        print("="*60)
        try:
            manual_result = bcrypt.checkpw(
                "admin123".encode('utf-8'), 
                admin.hashed_password.encode('utf-8')
            )
            print(f"Direct bcrypt check for 'admin123': {'✅ MATCH' if manual_result else '❌ NO MATCH'}")
        except Exception as e:
            print(f"Direct bcrypt check failed: {e}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    check_admin()
