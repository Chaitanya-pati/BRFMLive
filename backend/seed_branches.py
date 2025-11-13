
from database import get_db
from models import MasterBranch
from datetime import datetime

def seed_branches():
    db = next(get_db())
    
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
        },
        {
            "branch_name": "East Branch",
            "branch_code": "EAST",
            "address": "321 East Boulevard",
            "city": "Kolkata",
            "state": "West Bengal",
            "phone": "033-12345678",
            "email": "east@brfm.com",
            "is_active": 1
        }
    ]
    
    # Check which branches already exist
    existing_codes = [b.branch_code for b in db.query(MasterBranch).all()]
    
    added_count = 0
    for branch_data in branches:
        if branch_data['branch_code'] not in existing_codes:
            branch = MasterBranch(**branch_data)
            db.add(branch)
            added_count += 1
            print(f"➕ Adding: {branch_data['branch_name']} ({branch_data['branch_code']})")
        else:
            print(f"⏭️  Skipping: {branch_data['branch_name']} (already exists)")
    
    if added_count > 0:
        db.commit()
        print(f"\n✅ Successfully added {added_count} new branch(es)!")
    else:
        print(f"\n✅ All branches already exist in the database.")
    
    db.close()

if __name__ == "__main__":
    seed_branches()
