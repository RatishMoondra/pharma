"""
Reset admin password
Run this script: python scripts/reset_admin_password.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.user import User
import bcrypt


def reset_admin_password():
    db = SessionLocal()
    
    try:
        # Find admin user
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("❌ Admin user not found!")
            print("Creating admin user...")
            from app.models.user import UserRole
            
            password = "admin123"
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            admin = User(
                username="admin",
                email="admin@pharma.com",
                full_name="System Administrator",
                hashed_password=hashed.decode('utf-8'),
                role=UserRole.ADMIN,
                is_active=True
            )
            
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            print("✅ Admin user created successfully!")
        else:
            # Reset password
            password = "admin123"
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            admin.hashed_password = hashed.decode('utf-8')
            admin.is_active = True
            
            db.commit()
            
            print("✅ Admin password reset successfully!")
        
        print("\n" + "="*50)
        print("ADMIN CREDENTIALS:")
        print("="*50)
        print(f"Username: admin")
        print(f"Password: admin123")
        print("="*50)
        print("\nIMPORTANT: Please change the password after login!")
        print("\nYou can now login at: http://localhost:5173")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("="*50)
    print("ADMIN PASSWORD RESET UTILITY")
    print("="*50)
    print()
    reset_admin_password()
