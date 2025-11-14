
from database import SessionLocal
import models

def seed_default_user():
    db = SessionLocal()
    try:
        # Check if default user already exists
        existing_user = db.query(models.User).filter(models.User.username == "admin").first()
        if existing_user:
            print("✅ Default admin user already exists")
            print(f"   Username: admin")
            print(f"   Password: admin123")
            return
        
        # Create default admin user
        admin_user = models.User(
            username="admin",
            password="admin123"  # In production, you should hash this!
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Default admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Password: admin123")
        print(f"   User ID: {admin_user.id}")
        
    except Exception as e:
        print(f"❌ Error creating default user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_default_user()
