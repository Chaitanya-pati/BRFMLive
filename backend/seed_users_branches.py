import bcrypt
from database import SessionLocal
import models

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_data():
    db = SessionLocal()
    try:
        # Check if branches already exist
        existing_branches = db.query(models.Branch).count()
        if existing_branches > 0:
            print(f"✅ Found {existing_branches} existing branches")
        else:
            # Create branches
            branches_data = [
                {"name": "Main Branch", "description": "Main headquarters branch"},
                {"name": "North Branch", "description": "Northern region branch"},
                {"name": "South Branch", "description": "Southern region branch"},
                {"name": "East Branch", "description": "Eastern region branch"},
                {"name": "West Branch", "description": "Western region branch"}
            ]
            
            for branch_data in branches_data:
                branch = models.Branch(**branch_data)
                db.add(branch)
            
            db.commit()
            print(f"✅ Created {len(branches_data)} branches")
        
        # Get all branches
        branches = db.query(models.Branch).all()
        branch_dict = {b.name: b for b in branches}
        
        # Check if users already exist
        existing_users = db.query(models.User).count()
        if existing_users > 0:
            print(f"✅ Found {existing_users} existing users")
        else:
            # Create users
            users_data = [
                {
                    "username": "admin",
                    "email": "admin@example.com",
                    "full_name": "Administrator",
                    "password": "admin123",
                    "role": "admin",
                    "branches": ["Main Branch", "North Branch", "South Branch", "East Branch", "West Branch"]
                },
                {
                    "username": "manager",
                    "email": "manager@example.com",
                    "full_name": "Manager User",
                    "password": "manager123",
                    "role": "manager",
                    "branches": ["Main Branch", "North Branch"]
                },
                {
                    "username": "operator",
                    "email": "operator@example.com",
                    "full_name": "Operator User",
                    "password": "operator123",
                    "role": "operator",
                    "branches": ["Main Branch"]
                },
                {
                    "username": "user1",
                    "email": "user1@example.com",
                    "full_name": "Test User 1",
                    "password": "password123",
                    "role": "user",
                    "branches": ["Main Branch"]
                },
                {
                    "username": "user2",
                    "email": "user2@example.com",
                    "full_name": "Test User 2",
                    "password": "password123",
                    "role": "user",
                    "branches": ["North Branch"]
                },
                {
                    "username": "supervisor",
                    "email": "supervisor@example.com",
                    "full_name": "Supervisor User",
                    "password": "super123",
                    "role": "supervisor",
                    "branches": ["South Branch", "East Branch"]
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
                
                # Link user to branches using SQLAlchemy relationship
                for branch_name in branch_names:
                    if branch_name in branch_dict:
                        user.branches.append(branch_dict[branch_name])
                
                db.add(user)
            
            db.commit()
            print(f"✅ Created {len(users_data)} users with branch associations")
            
            # Verify branch associations by re-querying from database
            print("\n🔍 Verifying branch associations...")
            expected_associations = {
                "admin": ["Main Branch", "North Branch", "South Branch", "East Branch", "West Branch"],
                "manager": ["Main Branch", "North Branch"],
                "operator": ["Main Branch"],
                "user1": ["Main Branch"],
                "user2": ["North Branch"],
                "supervisor": ["South Branch", "East Branch"]
            }
            
            verification_passed = True
            for username, expected_branches in expected_associations.items():
                # Re-query user to ensure fresh state from database
                user = db.query(models.User).filter(models.User.username == username).first()
                if not user:
                    print(f"   ❌ {username}: User not found in database!")
                    verification_passed = False
                    continue
                
                # Refresh to ensure we get latest relationship state
                db.refresh(user)
                actual_branches = set([b.name for b in user.branches])
                expected_set = set(expected_branches)
                
                if expected_set != actual_branches:
                    print(f"   ❌ {username}: Expected {expected_set}, got {actual_branches}")
                    verification_passed = False
            
            if not verification_passed:
                raise Exception("Branch association verification failed! Database state does not match expected associations.")
            
            print("   ✅ All branch associations verified correctly!")
        
        # Display summary
        print("\n" + "="*50)
        print("📊 DATABASE SUMMARY")
        print("="*50)
        
        print("\n🏢 BRANCHES:")
        for branch in branches:
            user_count = len(branch.users)
            print(f"   • {branch.name}: {user_count} users")
        
        print("\n👥 USERS:")
        all_users = db.query(models.User).all()
        for user in all_users:
            branch_names = [b.name for b in user.branches]
            print(f"   • {user.username} ({user.role})")
            print(f"     Email: {user.email}")
            print(f"     Full Name: {user.full_name}")
            print(f"     Branches: {', '.join(branch_names)}")
        
        print("\n" + "="*50)
        print("✅ SEED DATA COMPLETE!")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
