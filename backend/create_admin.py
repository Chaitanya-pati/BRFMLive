import sys
from database import SessionLocal
from auth import get_password_hash
import models

def create_admin_user():
    db = SessionLocal()
    try:
        existing_admin = db.query(models.User).filter(models.User.username == "admin").first()
        if existing_admin:
            print("Admin user already exists")
            return
        
        admin_user = models.User(
            username="admin",
            email="admin@gateentry.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
        print("Please change the password after first login")
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
