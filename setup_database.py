#!/usr/bin/env python3
"""
Database Setup Script
Creates all tables and optionally inserts sample data
Usage: python setup_database.py
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database import engine, SessionLocal, Base
import models

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")

def insert_sample_data():
    """Insert sample data into the database"""
    db = SessionLocal()
    try:
        print("\nInserting sample data...")
        
        # Create sample suppliers
        suppliers = [
            models.Supplier(
                supplier_name="ABC Wheat Suppliers",
                contact_person="Rajesh Kumar",
                phone="9876543210",
                address="123 Main Street, Industrial Area",
                state="Uttar Pradesh",
                city="Lucknow"
            ),
            models.Supplier(
                supplier_name="Golden Grains Co.",
                contact_person="Amit Sharma",
                phone="9876543211",
                address="456 Market Road",
                state="Punjab",
                city="Ludhiana"
            ),
            models.Supplier(
                supplier_name="Farm Fresh Wheat",
                contact_person="Priya Singh",
                phone="9876543212",
                address="789 Agricultural Zone",
                state="Haryana",
                city="Karnal"
            )
        ]
        
        for supplier in suppliers:
            db.add(supplier)
        db.commit()
        print(f"✓ Inserted {len(suppliers)} suppliers")
        
        # Create sample vehicle entries
        vehicle_entries = [
            models.VehicleEntry(
                vehicle_number="UP-32-AB-1234",
                supplier_id=1,
                bill_no="BILL-2025-001",
                driver_name="Ramesh Singh",
                driver_phone="9123456789",
                arrival_time=datetime.now() - timedelta(days=2),
                notes="First delivery of the month"
            ),
            models.VehicleEntry(
                vehicle_number="PB-10-CD-5678",
                supplier_id=2,
                bill_no="BILL-2025-002",
                driver_name="Harpreet Kaur",
                driver_phone="9123456788",
                arrival_time=datetime.now() - timedelta(days=1),
                notes="Premium quality wheat"
            ),
            models.VehicleEntry(
                vehicle_number="HR-26-EF-9012",
                supplier_id=3,
                bill_no="BILL-2025-003",
                driver_name="Suresh Patel",
                driver_phone="9123456787",
                arrival_time=datetime.now(),
                notes="Regular weekly delivery"
            )
        ]
        
        for vehicle in vehicle_entries:
            db.add(vehicle)
        db.commit()
        print(f"✓ Inserted {len(vehicle_entries)} vehicle entries")
        
        # Create sample lab tests
        lab_tests = [
            models.LabTest(
                vehicle_entry_id=1,
                test_date=datetime.now() - timedelta(days=2),
                moisture=12.5,
                test_weight=78.5,
                protein_percent=11.8,
                wet_gluten=28.5,
                dry_gluten=10.2,
                falling_number=350,
                chaff_husk=0.5,
                straws_sticks=0.3,
                other_foreign_matter=0.2,
                mudballs=0.1,
                stones=0.0,
                dust_sand=0.4,
                total_impurities=1.5,
                shriveled_wheat=1.2,
                insect_damage=0.3,
                blackened_wheat=0.2,
                sprouted_grains=0.1,
                other_grain_damage=0.2,
                total_dockage=2.0,
                remarks="Good quality wheat, meets specifications",
                tested_by="Dr. Sunil Mehta"
            ),
            models.LabTest(
                vehicle_entry_id=2,
                test_date=datetime.now() - timedelta(days=1),
                moisture=11.8,
                test_weight=80.2,
                protein_percent=12.5,
                wet_gluten=30.1,
                dry_gluten=11.0,
                falling_number=380,
                chaff_husk=0.3,
                straws_sticks=0.2,
                other_foreign_matter=0.1,
                mudballs=0.0,
                stones=0.0,
                dust_sand=0.2,
                total_impurities=0.8,
                shriveled_wheat=0.8,
                insect_damage=0.1,
                blackened_wheat=0.1,
                sprouted_grains=0.0,
                other_grain_damage=0.1,
                total_dockage=1.1,
                remarks="Premium quality, excellent for milling",
                tested_by="Dr. Sunil Mehta"
            ),
            models.LabTest(
                vehicle_entry_id=3,
                test_date=datetime.now(),
                moisture=13.0,
                test_weight=77.8,
                protein_percent=11.2,
                wet_gluten=27.5,
                dry_gluten=9.8,
                falling_number=340,
                chaff_husk=0.6,
                straws_sticks=0.4,
                other_foreign_matter=0.3,
                mudballs=0.2,
                stones=0.1,
                dust_sand=0.5,
                total_impurities=2.1,
                shriveled_wheat=1.5,
                insect_damage=0.4,
                blackened_wheat=0.3,
                sprouted_grains=0.2,
                other_grain_damage=0.3,
                total_dockage=2.7,
                remarks="Acceptable quality, within tolerance",
                tested_by="Dr. Anjali Verma"
            )
        ]
        
        for lab_test in lab_tests:
            db.add(lab_test)
        db.commit()
        print(f"✓ Inserted {len(lab_tests)} lab tests")
        
        print("\n✓ Sample data inserted successfully!")
        
    except Exception as e:
        print(f"✗ Error inserting sample data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function to set up the database"""
    print("=" * 60)
    print("Gate Entry & Lab Testing - Database Setup")
    print("=" * 60)
    
    # Create tables
    create_tables()
    
    # Ask if user wants to insert sample data
    print("\nDo you want to insert sample data? (y/n): ", end="")
    response = input().strip().lower()
    
    if response in ['y', 'yes']:
        insert_sample_data()
    else:
        print("Skipping sample data insertion.")
    
    print("\n" + "=" * 60)
    print("Database setup complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
