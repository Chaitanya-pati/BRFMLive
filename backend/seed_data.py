from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_godowns_and_bins():
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_godowns = db.query(models.GodownMaster).count()
        existing_bins = db.query(models.Bin).count()
        
        print(f"Existing godowns: {existing_godowns}")
        print(f"Existing bins: {existing_bins}")
        
        # Add 10 Godowns with different types from godown_types.json
        godowns_data = [
            {"name": "Godown Mill-1", "capacity": 10000, "type": "Mill", "current_storage": 0.0},
            {"name": "Godown Mill-2", "capacity": 15000, "type": "Mill", "current_storage": 0.0},
            {"name": "Godown Low Mill-1", "capacity": 12000, "type": "Low Mill", "current_storage": 0.0},
            {"name": "Godown Low Mill-2", "capacity": 8000, "type": "Low Mill", "current_storage": 0.0},
            {"name": "Godown HD-1", "capacity": 20000, "type": "HD", "current_storage": 0.0},
            {"name": "Godown HD-2", "capacity": 18000, "type": "HD", "current_storage": 0.0},
            {"name": "Godown Mill-3", "capacity": 10000, "type": "Mill", "current_storage": 0.0},
            {"name": "Godown Low Mill-3", "capacity": 14000, "type": "Low Mill", "current_storage": 0.0},
            {"name": "Godown HD-3", "capacity": 16000, "type": "HD", "current_storage": 0.0},
            {"name": "Godown Mill-4", "capacity": 22000, "type": "Mill", "current_storage": 0.0},
        ]
        
        godowns_added = 0
        for godown_data in godowns_data:
            # Check if godown already exists
            existing = db.query(models.GodownMaster).filter(
                models.GodownMaster.name == godown_data["name"]
            ).first()
            if not existing:
                godown = models.GodownMaster(**godown_data)
                db.add(godown)
                godowns_added += 1
        
        db.commit()
        print(f"Added {godowns_added} new godowns")
        
        # Add 10 Bins
        bins_data = [
            {"bin_number": "BIN-001", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-002", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-003", "capacity": 600.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-004", "capacity": 800.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-005", "capacity": 550.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-006", "capacity": 700.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-007", "capacity": 650.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-008", "capacity": 900.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-009", "capacity": 850.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-010", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
        ]
        
        bins_added = 0
        for bin_data in bins_data:
            # Check if bin already exists
            existing = db.query(models.Bin).filter(
                models.Bin.bin_number == bin_data["bin_number"]
            ).first()
            if not existing:
                bin_obj = models.Bin(**bin_data)
                db.add(bin_obj)
                bins_added += 1
        
        db.commit()
        print(f"Added {bins_added} new bins")
        
        print("Seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_godowns_and_bins()