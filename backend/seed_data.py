from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_godowns_and_bins():
    db = SessionLocal()
    try:
        print("Starting to seed godowns, bins, and magnets...")

        # Seed 10 Godowns (expanded from 5)
        godowns_data = [
            {"name": "Godown-A", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-B", "type": "Silo", "current_storage": 0},
            {"name": "Godown-C", "type": "Storage", "current_storage": 0},
            {"name": "Godown-D", "type": "Cold Storage", "current_storage": 0},
            {"name": "Godown-E", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-F", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-G", "type": "Silo", "current_storage": 0},
            {"name": "Godown-H", "type": "Storage", "current_storage": 0},
            {"name": "Godown-I", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-J", "type": "Cold Storage", "current_storage": 0},
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

        # Seed 30 Bins (expanded from 20)
        bins_data = [
            {"bin_number": "BIN-001", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-002", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-003", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-004", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-005", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-006", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-007", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-008", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-009", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-010", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-011", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-012", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-013", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-014", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-015", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-016", "capacity": 750.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-017", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-018", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-019", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-020", "capacity": 500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-021", "capacity": 600.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-022", "capacity": 600.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-023", "capacity": 800.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-024", "capacity": 800.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-025", "capacity": 1200.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-026", "capacity": 1200.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-027", "capacity": 600.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-028", "capacity": 800.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-029", "capacity": 1000.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "BIN-030", "capacity": 1500.0, "current_quantity": 0.0, "material_type": "Wheat", "status": "Active"},
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

        # Seed 10 Magnets (expanded from 10)
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
            {"name": "Magnet-M11", "description": "Eddy current separator", "status": "Active"},
            {"name": "Magnet-M12", "description": "Magnetic pulley for conveyor belts", "status": "Active"},
            {"name": "Magnet-M13", "description": "Self-cleaning magnetic separator", "status": "Active"},
            {"name": "Magnet-M14", "description": "Rare earth magnet", "status": "Active"},
            {"name": "Magnet-M15", "description": "Electromagnetic separator", "status": "Active"},
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