
from database import SessionLocal
import models
from datetime import datetime

def seed_master_data():
    db = SessionLocal()
    
    try:
        # Seed Suppliers
        print("Seeding Suppliers...")
        suppliers_data = [
            {
                "supplier_name": "Maharashtra Grain Traders",
                "contact_person": "Rajesh Kumar",
                "phone": "9876543210",
                "address": "123 Market Road, Pune",
                "state": "Maharashtra",
                "city": "Pune"
            },
            {
                "supplier_name": "Punjab Wheat Suppliers",
                "contact_person": "Harpreet Singh",
                "phone": "9876543211",
                "address": "456 Agricultural Plaza, Ludhiana",
                "state": "Punjab",
                "city": "Ludhiana"
            },
            {
                "supplier_name": "Karnataka Agro Products",
                "contact_person": "Suresh Reddy",
                "phone": "9876543212",
                "address": "789 Farm Road, Belgaum",
                "state": "Karnataka",
                "city": "Belgaum"
            },
            {
                "supplier_name": "Uttar Pradesh Grain House",
                "contact_person": "Amit Sharma",
                "phone": "9876543213",
                "address": "321 Mandi Chowk, Meerut",
                "state": "Uttar Pradesh",
                "city": "Meerut"
            },
            {
                "supplier_name": "Haryana Wheat Corporation",
                "contact_person": "Vijay Kumar",
                "phone": "9876543214",
                "address": "654 Industrial Area, Karnal",
                "state": "Haryana",
                "city": "Karnal"
            },
            {
                "supplier_name": "Madhya Pradesh Traders",
                "contact_person": "Ramesh Verma",
                "phone": "9876543215",
                "address": "987 Commerce Street, Indore",
                "state": "Madhya Pradesh",
                "city": "Indore"
            },
            {
                "supplier_name": "Rajasthan Grain Suppliers",
                "contact_person": "Mahesh Jain",
                "phone": "9876543216",
                "address": "147 Market Yard, Jaipur",
                "state": "Rajasthan",
                "city": "Jaipur"
            },
            {
                "supplier_name": "Gujarat Agri Exports",
                "contact_person": "Kiran Patel",
                "phone": "9876543217",
                "address": "258 GIDC Estate, Ahmedabad",
                "state": "Gujarat",
                "city": "Ahmedabad"
            },
            {
                "supplier_name": "West Bengal Food Grains",
                "contact_person": "Soumya Banerjee",
                "phone": "9876543218",
                "address": "369 Burrabazar, Kolkata",
                "state": "West Bengal",
                "city": "Kolkata"
            },
            {
                "supplier_name": "Tamil Nadu Agricultural Co-op",
                "contact_person": "Murugan Subramanian",
                "phone": "9876543219",
                "address": "741 Anna Nagar, Chennai",
                "state": "Tamil Nadu",
                "city": "Chennai"
            }
        ]
        
        suppliers_added = 0
        for supplier_data in suppliers_data:
            existing = db.query(models.Supplier).filter(
                models.Supplier.supplier_name == supplier_data["supplier_name"]
            ).first()
            if not existing:
                supplier = models.Supplier(**supplier_data)
                db.add(supplier)
                suppliers_added += 1
        
        db.commit()
        print(f"✅ Added {suppliers_added} new suppliers")
        
        # Seed Godowns
        print("\nSeeding Godowns...")
        godowns_data = [
            {"name": "Godown-G1", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-G2", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-G3", "type": "Silo", "current_storage": 0},
            {"name": "Godown-G4", "type": "Storage", "current_storage": 0},
            {"name": "Godown-G5", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-G6", "type": "Silo", "current_storage": 0},
            {"name": "Godown-G7", "type": "Warehouse", "current_storage": 0},
            {"name": "Godown-G8", "type": "Cold Storage", "current_storage": 0},
            {"name": "Godown-G9", "type": "Storage", "current_storage": 0},
            {"name": "Godown-G10", "type": "Warehouse", "current_storage": 0}
        ]
        
        godowns_added = 0
        for godown_data in godowns_data:
            existing = db.query(models.GodownMaster).filter(
                models.GodownMaster.name == godown_data["name"]
            ).first()
            if not existing:
                godown = models.GodownMaster(**godown_data)
                db.add(godown)
                godowns_added += 1
        
        db.commit()
        print(f"✅ Added {godowns_added} new godowns")
        
        # Seed Bins
        print("\nSeeding Bins...")
        bins_data = [
            {"bin_number": "Bin-001", "capacity": 2000, "current_quantity": 0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "Bin-002", "capacity": 2500, "current_quantity": 0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "Bin-003", "capacity": 1800, "current_quantity": 0, "material_type": "Rice", "status": "Active"},
            {"bin_number": "Bin-004", "capacity": 2200, "current_quantity": 0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "Bin-005", "capacity": 1500, "current_quantity": 0, "material_type": "Barley", "status": "Active"},
            {"bin_number": "Bin-006", "capacity": 2000, "current_quantity": 0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "Bin-007", "capacity": 1700, "current_quantity": 0, "material_type": "Corn", "status": "Active"},
            {"bin_number": "Bin-008", "capacity": 2400, "current_quantity": 0, "material_type": "Wheat", "status": "Active"},
            {"bin_number": "Bin-009", "capacity": 1900, "current_quantity": 0, "material_type": "Oats", "status": "Active"},
            {"bin_number": "Bin-010", "capacity": 2100, "current_quantity": 0, "material_type": "Wheat", "status": "Active"}
        ]
        
        bins_added = 0
        for bin_data in bins_data:
            existing = db.query(models.Bin).filter(
                models.Bin.bin_number == bin_data["bin_number"]
            ).first()
            if not existing:
                bin_obj = models.Bin(**bin_data)
                db.add(bin_obj)
                bins_added += 1
        
        db.commit()
        print(f"✅ Added {bins_added} new bins")
        
        # Seed Magnets
        print("\nSeeding Magnets...")
        magnets_data = [
            {"name": "Magnet-M1", "description": "High-intensity magnetic separator", "status": "Active"},
            {"name": "Magnet-M2", "description": "Drum magnetic separator", "status": "Active"},
            {"name": "Magnet-M3", "description": "Overhead magnetic separator", "status": "Active"},
            {"name": "Magnet-M4", "description": "Permanent magnetic separator", "status": "Active"},
            {"name": "Magnet-M5", "description": "Electromagnetic separator", "status": "Active"},
            {"name": "Magnet-M6", "description": "Cross-belt magnetic separator", "status": "Active"},
            {"name": "Magnet-M7", "description": "Wet magnetic separator", "status": "Active"},
            {"name": "Magnet-M8", "description": "Dry magnetic separator", "status": "Active"},
            {"name": "Magnet-M9", "description": "Suspended magnetic separator", "status": "Active"},
            {"name": "Magnet-M10", "description": "Rare-earth magnetic separator", "status": "Active"}
        ]
        
        magnets_added = 0
        for magnet_data in magnets_data:
            existing = db.query(models.Magnet).filter(
                models.Magnet.name == magnet_data["name"]
            ).first()
            if not existing:
                magnet = models.Magnet(**magnet_data)
                db.add(magnet)
                magnets_added += 1
        
        db.commit()
        print(f"✅ Added {magnets_added} new magnets")
        
        print("\n" + "="*50)
        print("✅ Master data seeding completed successfully!")
        print(f"   Suppliers: {suppliers_added} added")
        print(f"   Godowns: {godowns_added} added")
        print(f"   Bins: {bins_added} added")
        print(f"   Magnets: {magnets_added} added")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding master data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_master_data()
