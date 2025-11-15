
from database import SessionLocal
import models

def check_database():
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("DATABASE CONTENTS CHECK")
        print("=" * 60)
        
        # Check Suppliers
        suppliers_count = db.query(models.Supplier).count()
        print(f"\n📦 Suppliers: {suppliers_count} records")
        if suppliers_count > 0:
            print("   Sample records:")
            for supplier in db.query(models.Supplier).limit(3).all():
                print(f"   - {supplier.supplier_name} ({supplier.city}, {supplier.state})")
        
        # Check Vehicle Entries
        vehicles_count = db.query(models.VehicleEntry).count()
        print(f"\n🚛 Vehicle Entries: {vehicles_count} records")
        if vehicles_count > 0:
            print("   Sample records:")
            for vehicle in db.query(models.VehicleEntry).limit(3).all():
                print(f"   - {vehicle.vehicle_number} (Bill: {vehicle.bill_no})")
        
        # Check Lab Tests
        lab_tests_count = db.query(models.LabTest).count()
        print(f"\n🔬 Lab Tests: {lab_tests_count} records")
        if lab_tests_count > 0:
            print("   Sample records:")
            for test in db.query(models.LabTest).limit(3).all():
                print(f"   - Test ID: {test.id}, Variety: {test.wheat_variety or 'N/A'}")
        
        # Check Claims
        claims_count = db.query(models.Claim).count()
        print(f"\n📋 Claims: {claims_count} records")
        
        # Check Godowns
        godowns_count = db.query(models.GodownMaster).count()
        print(f"\n🏢 Godowns: {godowns_count} records")
        if godowns_count > 0:
            print("   Sample records:")
            for godown in db.query(models.GodownMaster).limit(3).all():
                print(f"   - {godown.name} ({godown.type})")
        
        # Check Bins
        bins_count = db.query(models.Bin).count()
        print(f"\n📦 Bins: {bins_count} records")
        if bins_count > 0:
            print("   Sample records:")
            for bin in db.query(models.Bin).limit(3).all():
                print(f"   - {bin.bin_number} (Capacity: {bin.capacity} kg)")
        
        # Check Magnets
        magnets_count = db.query(models.Magnet).count()
        print(f"\n🧲 Magnets: {magnets_count} records")
        if magnets_count > 0:
            print("   Sample records:")
            for magnet in db.query(models.Magnet).limit(3).all():
                print(f"   - {magnet.name}")
        
        # Check Users
        users_count = db.query(models.User).count()
        print(f"\n👤 Users: {users_count} records")
        if users_count > 0:
            print("   Sample records:")
            for user in db.query(models.User).limit(3).all():
                print(f"   - {user.username} ({user.role or 'No role'})")
        
        # Check Branches
        branches_count = db.query(models.Branch).count()
        print(f"\n🏬 Branches: {branches_count} records")
        
        # Summary
        print("\n" + "=" * 60)
        total_records = (suppliers_count + vehicles_count + lab_tests_count + 
                        claims_count + godowns_count + bins_count + 
                        magnets_count + users_count + branches_count)
        
        if total_records == 0:
            print("⚠️  DATABASE IS EMPTY - No data found!")
            print("\nTo seed sample data, run:")
            print("   cd backend && uv run python seed_complete_data.py")
        else:
            print(f"✅ DATABASE HAS DATA - Total: {total_records} records")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error checking database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_database()
