from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_godowns_and_bins():
    db = SessionLocal()
    try:
        print("Starting to seed godowns, bins, and magnets...")

        # Seed 10 Godowns
        godowns_data = [
            {"name": "Godown-G1", "capacity": 10000, "type": "Warehouse"},
            {"name": "Godown-G2", "capacity": 15000, "type": "Silo"},
            {"name": "Godown-G3", "capacity": 8000, "type": "Warehouse"},
            {"name": "Godown-G4", "capacity": 12000, "type": "Silo"},
            {"name": "Godown-G5", "capacity": 20000, "type": "Warehouse"},
            {"name": "Godown-G6", "capacity": 18000, "type": "Silo"},
            {"name": "Godown-G7", "capacity": 9000, "type": "Warehouse"},
            {"name": "Godown-G8", "capacity": 14000, "type": "Silo"},
            {"name": "Godown-G9", "capacity": 11000, "type": "Warehouse"},
            {"name": "Godown-G10", "capacity": 16000, "type": "Silo"},
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

        # Seed 10 Bins
        bins_data = [
            {"bin_number": "Bin-001", "capacity": 1000.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-002", "capacity": 1500.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-003", "capacity": 2000.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-004", "capacity": 1200.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-005", "capacity": 1800.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-006", "capacity": 2200.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-007", "capacity": 1300.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-008", "capacity": 1700.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-009", "capacity": 2500.0, "current_quantity": 0.0, "status": "Active"},
            {"bin_number": "Bin-010", "capacity": 1900.0, "current_quantity": 0.0, "status": "Active"},
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

        # Seed 10 Magnets (already has 10 magnets)
        magnets_data = [
            {"name": "Magnet-M1", "description": "High-intensity magnetic separator", "status": "Active"},
            {"name": "Magnet-M2", "description": "Permanent drum magnet", "status": "Active"},
            {"name": "Magnet-M3", "description": "Overhead suspension magnet", "status": "Active"},
            {"name": "Magnet-M4", "description": "Plate magnet for grain cleaning", "status": "Active"},
            {"name": "Magnet-M5", "description": "Tube magnet for fine separation", "status": "Active"},
            {"name": "Magnet-M6", "description": "Cross-belt magnetic separator", "status": "Active"},
            {"name": "Magnet-M7", "description": "Rotating drum magnet cleaner", "status": "Active"},
            {"name": "Magnet-M8", "description": "Belt-type magnetic separator", "status": "Active"},
            {"name": "Magnet-M9", "description": "Grate magnet for bin entry", "status": "Active"},
            {"name": "Magnet-M10", "description": "Drawer magnet for transfer points", "status": "Active"},
        ]

        magnets_added = 0
        for magnet_data in magnets_data:
            # Check if magnet already exists
            existing = db.query(models.Magnet).filter(
                models.Magnet.name == magnet_data["name"]
            ).first()
            if not existing:
                magnet = models.Magnet(**magnet_data)
                db.add(magnet)
                magnets_added += 1

        db.commit()
        print(f"Added {magnets_added} new magnets")

        print("Seeding completed successfully!")
        print(f"Total godowns in database: {db.query(models.GodownMaster).count()}")
        print(f"Total bins in database: {db.query(models.Bin).count()}")
        print(f"Total magnets in database: {db.query(models.Magnet).count()}")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_godowns_and_bins()