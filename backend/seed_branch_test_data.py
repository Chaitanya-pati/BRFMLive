from database import SessionLocal
import models

def seed_branch_test_data():
    db = SessionLocal()
    try:
        # Get branches
        branches = db.query(models.Branch).all()
        if not branches:
            print("❌ No branches found. Please run seed_users_branches.py first")
            return
        
        main_branch = next((b for b in branches if "Main" in b.name), branches[0])
        north_branch = next((b for b in branches if "North" in b.name), None)
        south_branch = next((b for b in branches if "South" in b.name), None)
        
        print(f"📍 Main Branch ID: {main_branch.id}")
        if north_branch:
            print(f"📍 North Branch ID: {north_branch.id}")
        if south_branch:
            print(f"📍 South Branch ID: {south_branch.id}")
        
        # Create suppliers for each branch
        suppliers_data = [
            {"supplier_name": "Main Supplier 1", "city": "Mumbai", "state": "Maharashtra", "branch_id": main_branch.id},
            {"supplier_name": "Main Supplier 2", "city": "Pune", "state": "Maharashtra", "branch_id": main_branch.id},
        ]
        
        if north_branch:
            suppliers_data.extend([
                {"supplier_name": "North Supplier 1", "city": "Delhi", "state": "Delhi", "branch_id": north_branch.id},
                {"supplier_name": "North Supplier 2", "city": "Chandigarh", "state": "Punjab", "branch_id": north_branch.id},
            ])
        
        if south_branch:
            suppliers_data.extend([
                {"supplier_name": "South Supplier 1", "city": "Chennai", "state": "Tamil Nadu", "branch_id": south_branch.id},
                {"supplier_name": "South Supplier 2", "city": "Bangalore", "state": "Karnataka", "branch_id": south_branch.id},
            ])
        
        for supplier_data in suppliers_data:
            existing = db.query(models.Supplier).filter(
                models.Supplier.supplier_name == supplier_data["supplier_name"]
            ).first()
            
            if not existing:
                supplier = models.Supplier(**supplier_data)
                db.add(supplier)
        
        db.commit()
        print(f"✅ Created {len(suppliers_data)} suppliers across branches")
        
        # Display summary
        print("\n" + "="*50)
        print("📊 SUPPLIER SUMMARY BY BRANCH")
        print("="*50)
        
        for branch in branches:
            suppliers = db.query(models.Supplier).filter(models.Supplier.branch_id == branch.id).all()
            print(f"\n🏢 {branch.name} (ID: {branch.id}):")
            for supplier in suppliers:
                print(f"   • {supplier.supplier_name} - {supplier.city}, {supplier.state}")
        
        print("\n" + "="*50)
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_branch_test_data()
