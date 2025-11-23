from database import SessionLocal
from models import User, Branch, UserBranch

db = SessionLocal()

try:
    # Create a test branch
    branch = Branch(name="Main Branch", description="Main testing branch")
    db.add(branch)
    db.commit()
    db.refresh(branch)
    print(f"✅ Created branch: {branch.name} (ID: {branch.id})")

    # Create a test user with plain text password
    password = "admin123"
    hashed_password = password
    
    user = User(
        username="admin",
        email="admin@example.com",
        full_name="Administrator",
        hashed_password=hashed_password,
        role="admin",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✅ Created user: {user.username} (ID: {user.id})")
    
    # Link user to branch
    user_branch = UserBranch(user_id=user.id, branch_id=branch.id)
    db.add(user_branch)
    db.commit()
    print(f"✅ Linked user to branch")
    
    print("\n" + "="*50)
    print("Test credentials created successfully!")
    print("="*50)
    print(f"Username: admin")
    print(f"Password: admin123")
    print(f"Branch: Main Branch")
    print("="*50)
    
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
