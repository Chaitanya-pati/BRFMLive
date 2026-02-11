from database import SessionLocal
from models import GodownMaster, Bin

db = SessionLocal()

try:
    # Create test godown
    existing_godown = db.query(GodownMaster).filter(GodownMaster.name == "lowmill_Godown").first()
    if not existing_godown:
        godown = GodownMaster(
            name="lowmill_Godown",
            type="Storage",
            current_storage=0.0,
            branch_id=1
        )
        db.add(godown)
        db.commit()
        db.refresh(godown)
        print(f"✅ Created godown: {godown.name} (ID: {godown.id})")
    else:
        print(f"✅ Godown already exists: {existing_godown.name} (ID: {existing_godown.id})")
    
    # Create test bins
    for bin_num in ["102", "103"]:
        existing_bin = db.query(Bin).filter(Bin.bin_number == f"Bin {bin_num}").first()
        if not existing_bin:
            bin = Bin(
                bin_number=f"Bin {bin_num}",
                capacity=50.0,
                current_quantity=0.0,
                material_type="Wheat",
                bin_type="Storage",
                status="Active",
                branch_id=1
            )
            db.add(bin)
            db.commit()
            print(f"✅ Created bin: Bin {bin_num}")
        else:
            print(f"✅ Bin already exists: Bin {bin_num} (ID: {existing_bin.id})")
    
    print("\n✅ Test data creation complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
