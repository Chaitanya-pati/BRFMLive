from database import get_db
from models import MasterBranch
from datetime import datetime

def seed_branches():
    db = next(get_db())
    
    # Check if branches already exist
    existing = db.query(MasterBranch).first()
    if existing:
        print("Branches already exist. Skipping seed.")
        return
    
    branches = [
        {
            "branch_name": "Main Branch",
            "branch_code": "MAIN",
            "address": "123 Main Street",
            "city": "Delhi",
            "state": "Delhi",
            "phone": "011-12345678",
            "email": "main@brfm.com",
            "is_active": 1
        },
        {
            "branch_name": "North Branch",
            "branch_code": "NORTH",
            "address": "456 North Avenue",
            "city": "Chandigarh",
            "state": "Punjab",
            "phone": "0172-2345678",
            "email": "north@brfm.com",
            "is_active": 1
        },
        {
            "branch_name": "South Branch",
            "branch_code": "SOUTH",
            "address": "789 South Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "phone": "080-12345678",
            "email": "south@brfm.com",
            "is_active": 1
        }
    ]
    
    for branch_data in branches:
        branch = MasterBranch(**branch_data)
        db.add(branch)
    
    db.commit()
    print(f"✅ Seeded {len(branches)} branches successfully!")
    db.close()

if __name__ == "__main__":
    seed_branches()
