"""
Create initial admin user
Run this script: python scripts/create_admin.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import SessionLocal
from app.models.user import User, UserRole
import bcrypt


def create_admin():
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("Admin user already exists!")
            return
        
        # Hash password using bcrypt directly
        password = "admin123"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create admin user
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
        
        print("Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print("IMPORTANT: Please change the password after first login!")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
