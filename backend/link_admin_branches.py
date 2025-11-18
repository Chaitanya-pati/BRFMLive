from database import SessionLocal
import models

db = SessionLocal()
try:
    # Get admin user
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    
    if not admin:
        print("❌ Admin user not found. Please run seed_default_user.py first.")
        db.close()
        exit(1)
    
    # Get all branches
    branches = db.query(models.Branch).all()
    
    if not branches:
        print("❌ No branches found. Please run seed_users_branches.py first.")
        db.close()
        exit(1)
    
    # Link admin to all branches
    admin.branches = branches
    db.commit()
    
    print(f"✅ Linked admin user to {len(branches)} branches")
    for branch in branches:
        print(f"   • {branch.name}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
