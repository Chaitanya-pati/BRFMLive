import bcrypt
from database import SessionLocal
import models

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_minimal_test_data():
    """Seed minimal test data: 2 branches and 2 users"""
    db = SessionLocal()
    try:
        # Check if branches already exist
        existing_branches = db.query(models.Branch).count()
        if existing_branches > 0:
            print(f"✅ Found {existing_branches} existing branches, skipping branch creation")
            branches = db.query(models.Branch).limit(2).all()
        else:
            # Create 2 test branches
            branches_data = [
                {"name": "Main Branch", "description": "Main headquarters branch"},
                {"name": "North Branch", "description": "Northern region branch"}
            ]
            
            branches = []
            for branch_data in branches_data:
                branch = models.Branch(**branch_data)
                db.add(branch)
                branches.append(branch)
            
            db.commit()
            print(f"✅ Created 2 test branches")
        
        # Get branches for user association
        branch_dict = {b.name: b for b in branches}
        
        # Check if users already exist
        existing_users = db.query(models.User).count()
        if existing_users > 0:
            print(f"✅ Found {existing_users} existing users, skipping user creation")
        else:
            # Create 2 test users
            users_data = [
                {
                    "username": "admin",
                    "email": "admin@example.com",
                    "full_name": "Test Administrator",
                    "password": "admin123",
                    "role": "admin",
                    "branches": ["Main Branch", "North Branch"]
                },
                {
                    "username": "manager",
                    "email": "manager@example.com",
                    "full_name": "Test Manager",
                    "password": "manager123",
                    "role": "manager",
                    "branches": ["Main Branch"]
                }
            ]
            
            for user_data in users_data:
                # Extract branches and password
                branch_names = user_data.pop("branches")
                password = user_data.pop("password")
                
                # Create user with hashed password
                user = models.User(
                    **user_data,
                    hashed_password=hash_password(password)
                )
                
                # Link user to branches
                for branch_name in branch_names:
                    if branch_name in branch_dict:
                        user.branches.append(branch_dict[branch_name])
                
                db.add(user)
            
            db.commit()
            print(f"✅ Created 2 test users with branch associations")
        
        # Display summary
        print("\n" + "="*50)
        print("📊 TEST DATABASE SUMMARY")
        print("="*50)
        
        print("\n🏢 BRANCHES:")
        all_branches = db.query(models.Branch).all()
        for branch in all_branches[:2]:  # Show first 2 branches
            user_count = len(branch.users)
            print(f"   • {branch.name}: {user_count} users")
        
        print("\n👥 USERS:")
        all_users = db.query(models.User).all()
        for user in all_users[:2]:  # Show first 2 users
            branch_names = [b.name for b in user.branches]
            print(f"   • {user.username} ({user.role})")
            print(f"     Email: {user.email}")
            print(f"     Full Name: {user.full_name}")
            print(f"     Branches: {', '.join(branch_names)}")
            print(f"     Password: (use the password you set)")
        
        print("\n" + "="*50)
        print("✅ TEST DATA SEEDED!")
        print("="*50)
        print("\n📝 LOGIN CREDENTIALS:")
        print("   Admin  - Username: admin,   Password: admin123")
        print("   Manager- Username: manager, Password: manager123")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_minimal_test_data()
