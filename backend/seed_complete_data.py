
from database import SessionLocal
import models
from datetime import datetime, timedelta
import random

def seed_all_tables():
    db = SessionLocal()
    
    try:
        print("="*60)
        print("Starting comprehensive database seeding...")
        print("="*60)
        
        # 1. Seed Suppliers
        print("\n[1/8] Seeding Suppliers...")
        suppliers_data = [
            {
                "supplier_name": "Maharashtra Grain Traders",
                "contact_person": "Rajesh Kumar",
                "phone": "9876543210",
                "email": "rajesh@maharashtragrains.com",
                "address": "123 Market Road",
                "street": "Market Road",
                "city": "Pune",
                "district": "Pune",
                "state": "Maharashtra",
                "zip_code": "411001",
                "gstin": "27ABCDE1234F1Z5"
            },
            {
                "supplier_name": "Punjab Wheat Suppliers",
                "contact_person": "Harpreet Singh",
                "phone": "9876543211",
                "email": "harpreet@punjabwheat.com",
                "address": "456 Agricultural Plaza",
                "street": "Agricultural Plaza",
                "city": "Ludhiana",
                "district": "Ludhiana",
                "state": "Punjab",
                "zip_code": "141001",
                "gstin": "03FGHIJ5678K2L1"
            },
            {
                "supplier_name": "Karnataka Agro Products",
                "contact_person": "Suresh Reddy",
                "phone": "9876543212",
                "email": "suresh@karnatakaagro.com",
                "address": "789 Farm Road",
                "street": "Farm Road",
                "city": "Belgaum",
                "district": "Belgaum",
                "state": "Karnataka",
                "zip_code": "590001",
                "gstin": "29MNOPQ9012R3S4"
            },
            {
                "supplier_name": "Uttar Pradesh Grain House",
                "contact_person": "Amit Sharma",
                "phone": "9876543213",
                "email": "amit@upgrainhouse.com",
                "address": "321 Mandi Chowk",
                "street": "Mandi Chowk",
                "city": "Meerut",
                "district": "Meerut",
                "state": "Uttar Pradesh",
                "zip_code": "250001",
                "gstin": "09STUVW3456X7Y8"
            },
            {
                "supplier_name": "Haryana Wheat Corporation",
                "contact_person": "Vijay Kumar",
                "phone": "9876543214",
                "email": "vijay@haryanawheat.com",
                "address": "654 Industrial Area",
                "street": "Industrial Area",
                "city": "Karnal",
                "district": "Karnal",
                "state": "Haryana",
                "zip_code": "132001",
                "gstin": "06YZABC7890D1E2"
            }
        ]
        
        supplier_ids = []
        for supplier_data in suppliers_data:
            existing = db.query(models.Supplier).filter(
                models.Supplier.supplier_name == supplier_data["supplier_name"]
            ).first()
            if not existing:
                supplier = models.Supplier(**supplier_data)
                db.add(supplier)
                db.flush()
                supplier_ids.append(supplier.id)
            else:
                supplier_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Suppliers: {len(supplier_ids)} records")
        
        # 2. Seed Vehicle Entries
        print("\n[2/8] Seeding Vehicle Entries...")
        vehicles_data = [
            {
                "vehicle_number": "MH-12-AB-1234",
                "supplier_id": supplier_ids[0] if len(supplier_ids) > 0 else 1,
                "bill_no": "BILL-2025-001",
                "driver_name": "Ramesh Patil",
                "driver_phone": "9123456789",
                "arrival_time": datetime.utcnow() - timedelta(days=10),
                "empty_weight": 5000.0,
                "gross_weight": 25000.0,
                "notes": "First delivery - premium wheat"
            },
            {
                "vehicle_number": "PB-03-CD-5678",
                "supplier_id": supplier_ids[1] if len(supplier_ids) > 1 else 2,
                "bill_no": "BILL-2025-002",
                "driver_name": "Gurpreet Singh",
                "driver_phone": "9123456788",
                "arrival_time": datetime.utcnow() - timedelta(days=8),
                "empty_weight": 4800.0,
                "gross_weight": 24800.0,
                "notes": "High quality Punjab wheat"
            },
            {
                "vehicle_number": "KA-29-EF-9012",
                "supplier_id": supplier_ids[2] if len(supplier_ids) > 2 else 3,
                "bill_no": "BILL-2025-003",
                "driver_name": "Venkatesh Rao",
                "driver_phone": "9123456787",
                "arrival_time": datetime.utcnow() - timedelta(days=6),
                "empty_weight": 5200.0,
                "gross_weight": 26200.0,
                "notes": "Organic wheat from Karnataka"
            },
            {
                "vehicle_number": "UP-09-GH-3456",
                "supplier_id": supplier_ids[3] if len(supplier_ids) > 3 else 4,
                "bill_no": "BILL-2025-004",
                "driver_name": "Rakesh Verma",
                "driver_phone": "9123456786",
                "arrival_time": datetime.utcnow() - timedelta(days=4),
                "empty_weight": 4900.0,
                "gross_weight": 24900.0,
                "notes": "Regular weekly delivery"
            },
            {
                "vehicle_number": "HR-06-IJ-7890",
                "supplier_id": supplier_ids[4] if len(supplier_ids) > 4 else 5,
                "bill_no": "BILL-2025-005",
                "driver_name": "Sunil Kumar",
                "driver_phone": "9123456785",
                "arrival_time": datetime.utcnow() - timedelta(days=2),
                "empty_weight": 5100.0,
                "gross_weight": 25100.0,
                "notes": "Premium grade wheat"
            }
        ]
        
        vehicle_ids = []
        for vehicle_data in vehicles_data:
            existing = db.query(models.VehicleEntry).filter(
                models.VehicleEntry.bill_no == vehicle_data["bill_no"]
            ).first()
            if not existing:
                vehicle = models.VehicleEntry(**vehicle_data)
                db.add(vehicle)
                db.flush()
                vehicle_ids.append(vehicle.id)
            else:
                vehicle_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Vehicle Entries: {len(vehicle_ids)} records")
        
        # 3. Seed Lab Tests
        print("\n[3/8] Seeding Lab Tests...")
        lab_tests_data = [
            {
                "vehicle_entry_id": vehicle_ids[0] if len(vehicle_ids) > 0 else 1,
                "wheat_variety": "PBW-343",
                "bill_number": "BILL-2025-001",
                "moisture": 12.5,
                "test_weight": 78.5,
                "protein_percent": 11.8,
                "wet_gluten": 28.5,
                "dry_gluten": 10.2,
                "falling_number": 350,
                "chaff_husk": 0.5,
                "straws_sticks": 0.3,
                "other_foreign_matter": 0.2,
                "mudballs": 0.1,
                "stones": 0.0,
                "dust_sand": 0.4,
                "total_impurities": 1.5,
                "shriveled_wheat": 1.2,
                "insect_damage": 0.3,
                "blackened_wheat": 0.2,
                "sprouted_grains": 0.1,
                "other_grain_damage": 0.2,
                "total_dockage": 2.0,
                "category": "Grade A",
                "remarks": "Excellent quality wheat",
                "tested_by": "Dr. Sunil Mehta",
                "raise_claim": 0
            },
            {
                "vehicle_entry_id": vehicle_ids[1] if len(vehicle_ids) > 1 else 2,
                "wheat_variety": "HD-2967",
                "bill_number": "BILL-2025-002",
                "moisture": 11.8,
                "test_weight": 80.2,
                "protein_percent": 12.5,
                "wet_gluten": 30.1,
                "dry_gluten": 11.0,
                "falling_number": 380,
                "chaff_husk": 0.3,
                "straws_sticks": 0.2,
                "other_foreign_matter": 0.1,
                "mudballs": 0.0,
                "stones": 0.0,
                "dust_sand": 0.2,
                "total_impurities": 0.8,
                "shriveled_wheat": 0.8,
                "insect_damage": 0.1,
                "blackened_wheat": 0.1,
                "sprouted_grains": 0.0,
                "other_grain_damage": 0.1,
                "total_dockage": 1.1,
                "category": "Grade A+",
                "remarks": "Premium quality",
                "tested_by": "Dr. Sunil Mehta",
                "raise_claim": 0
            },
            {
                "vehicle_entry_id": vehicle_ids[2] if len(vehicle_ids) > 2 else 3,
                "wheat_variety": "Lok-1",
                "bill_number": "BILL-2025-003",
                "moisture": 13.0,
                "test_weight": 77.8,
                "protein_percent": 11.2,
                "wet_gluten": 27.5,
                "dry_gluten": 9.8,
                "falling_number": 340,
                "chaff_husk": 0.6,
                "straws_sticks": 0.4,
                "other_foreign_matter": 0.3,
                "mudballs": 0.2,
                "stones": 0.1,
                "dust_sand": 0.5,
                "total_impurities": 2.1,
                "shriveled_wheat": 1.5,
                "insect_damage": 0.4,
                "blackened_wheat": 0.3,
                "sprouted_grains": 0.2,
                "other_grain_damage": 0.3,
                "total_dockage": 2.7,
                "category": "Grade B",
                "remarks": "Acceptable quality",
                "tested_by": "Dr. Anjali Verma",
                "raise_claim": 1
            },
            {
                "vehicle_entry_id": vehicle_ids[3] if len(vehicle_ids) > 3 else 4,
                "wheat_variety": "WH-1105",
                "bill_number": "BILL-2025-004",
                "moisture": 12.0,
                "test_weight": 79.0,
                "protein_percent": 12.0,
                "wet_gluten": 29.0,
                "dry_gluten": 10.5,
                "falling_number": 360,
                "chaff_husk": 0.4,
                "straws_sticks": 0.3,
                "other_foreign_matter": 0.2,
                "mudballs": 0.1,
                "stones": 0.0,
                "dust_sand": 0.3,
                "total_impurities": 1.3,
                "shriveled_wheat": 1.0,
                "insect_damage": 0.2,
                "blackened_wheat": 0.1,
                "sprouted_grains": 0.1,
                "other_grain_damage": 0.2,
                "total_dockage": 1.6,
                "category": "Grade A",
                "remarks": "Good quality wheat",
                "tested_by": "Dr. Sunil Mehta",
                "raise_claim": 0
            },
            {
                "vehicle_entry_id": vehicle_ids[4] if len(vehicle_ids) > 4 else 5,
                "wheat_variety": "DBW-17",
                "bill_number": "BILL-2025-005",
                "moisture": 12.8,
                "test_weight": 78.0,
                "protein_percent": 11.5,
                "wet_gluten": 28.0,
                "dry_gluten": 10.0,
                "falling_number": 345,
                "chaff_husk": 0.5,
                "straws_sticks": 0.3,
                "other_foreign_matter": 0.2,
                "mudballs": 0.1,
                "stones": 0.05,
                "dust_sand": 0.4,
                "total_impurities": 1.55,
                "shriveled_wheat": 1.1,
                "insect_damage": 0.3,
                "blackened_wheat": 0.2,
                "sprouted_grains": 0.1,
                "other_grain_damage": 0.2,
                "total_dockage": 1.9,
                "category": "Grade A",
                "remarks": "Standard quality",
                "tested_by": "Dr. Anjali Verma",
                "raise_claim": 0
            }
        ]
        
        lab_test_ids = []
        for lab_data in lab_tests_data:
            existing = db.query(models.LabTest).filter(
                models.LabTest.vehicle_entry_id == lab_data["vehicle_entry_id"]
            ).first()
            if not existing:
                lab_test = models.LabTest(**lab_data)
                db.add(lab_test)
                db.flush()
                lab_test_ids.append(lab_test.id)
            else:
                lab_test_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Lab Tests: {len(lab_test_ids)} records")
        
        # 4. Seed Claims
        print("\n[4/8] Seeding Claims...")
        if len(lab_test_ids) > 2:
            claims_data = [
                {
                    "lab_test_id": lab_test_ids[2],
                    "description": "High moisture content detected - 13% (threshold: 12.5%)",
                    "claim_type": models.ClaimType.PERCENTAGE,
                    "claim_amount": 2.5,
                    "claim_status": models.ClaimStatus.OPEN,
                    "claim_date": datetime.utcnow() - timedelta(days=5)
                },
                {
                    "lab_test_id": lab_test_ids[2],
                    "description": "Total impurities exceed acceptable limit - 2.1% (threshold: 2.0%)",
                    "claim_type": models.ClaimType.PER_KG,
                    "claim_amount": 5.0,
                    "claim_status": models.ClaimStatus.IN_PROGRESS,
                    "claim_date": datetime.utcnow() - timedelta(days=5)
                }
            ]
            
            for claim_data in claims_data:
                existing = db.query(models.Claim).filter(
                    models.Claim.lab_test_id == claim_data["lab_test_id"],
                    models.Claim.description == claim_data["description"]
                ).first()
                if not existing:
                    claim = models.Claim(**claim_data)
                    db.add(claim)
            
            db.commit()
            print(f"✅ Claims: {len(claims_data)} records")
        else:
            print("⚠️  Claims: Skipped (insufficient lab tests)")
        
        # 5. Seed Godowns
        print("\n[5/8] Seeding Godowns...")
        godowns_data = [
            {"name": "Mill", "type": "Mill", "current_storage": 5000.0},
            {"name": "Low Mill", "type": "Low Mill", "current_storage": 3500.0},
            {"name": "HD-1", "type": "HD", "current_storage": 8000.0},
            {"name": "HD-2", "type": "HD", "current_storage": 6500.0},
            {"name": "HD-3", "type": "HD", "current_storage": 7200.0}
        ]
        
        godown_ids = []
        for godown_data in godowns_data:
            existing = db.query(models.GodownMaster).filter(
                models.GodownMaster.name == godown_data["name"]
            ).first()
            if not existing:
                godown = models.GodownMaster(**godown_data)
                db.add(godown)
                db.flush()
                godown_ids.append(godown.id)
            else:
                godown_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Godowns: {len(godown_ids)} records")
        
        # 6. Seed Bins
        print("\n[6/8] Seeding Bins...")
        bins_data = []
        for i in range(1, 21):
            bins_data.append({
                "bin_number": f"BIN-{i:03d}",
                "capacity": random.choice([500.0, 750.0, 1000.0, 1200.0]),
                "current_quantity": random.uniform(0, 500),
                "material_type": "Wheat",
                "status": "Active"
            })
        
        bin_ids = []
        for bin_data in bins_data:
            existing = db.query(models.Bin).filter(
                models.Bin.bin_number == bin_data["bin_number"]
            ).first()
            if not existing:
                bin_obj = models.Bin(**bin_data)
                db.add(bin_obj)
                db.flush()
                bin_ids.append(bin_obj.id)
            else:
                bin_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Bins: {len(bin_ids)} records")
        
        # 7. Seed Magnets
        print("\n[7/8] Seeding Magnets...")
        magnets_data = [
            {"name": "Magnet-M1", "description": "High-intensity magnetic separator", "status": "Active"},
            {"name": "Magnet-M2", "description": "Drum magnetic separator", "status": "Active"},
            {"name": "Magnet-M3", "description": "Overhead magnetic separator", "status": "Active"},
            {"name": "Magnet-M4", "description": "Permanent magnetic separator", "status": "Active"},
            {"name": "Magnet-M5", "description": "Electromagnetic separator", "status": "Active"}
        ]
        
        magnet_ids = []
        for magnet_data in magnets_data:
            existing = db.query(models.Magnet).filter(
                models.Magnet.name == magnet_data["name"]
            ).first()
            if not existing:
                magnet = models.Magnet(**magnet_data)
                db.add(magnet)
                db.flush()
                magnet_ids.append(magnet.id)
            else:
                magnet_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Magnets: {len(magnet_ids)} records")
        
        # 8. Seed Unloading Entries
        print("\n[8/8] Seeding Unloading Entries...")
        if len(vehicle_ids) > 0 and len(godown_ids) > 0:
            unloading_data = []
            for i, vehicle_id in enumerate(vehicle_ids[:3]):
                unloading_data.append({
                    "vehicle_entry_id": vehicle_id,
                    "godown_id": godown_ids[i % len(godown_ids)],
                    "gross_weight": 25000.0 + (i * 500),
                    "empty_vehicle_weight": 5000.0,
                    "net_weight": 20000.0 + (i * 500),
                    "unloading_start_time": datetime.utcnow() - timedelta(days=10-i*2, hours=2),
                    "unloading_end_time": datetime.utcnow() - timedelta(days=10-i*2),
                    "notes": f"Unloading completed successfully for vehicle {i+1}"
                })
            
            for unload_data in unloading_data:
                existing = db.query(models.UnloadingEntry).filter(
                    models.UnloadingEntry.vehicle_entry_id == unload_data["vehicle_entry_id"]
                ).first()
                if not existing:
                    unloading = models.UnloadingEntry(**unload_data)
                    db.add(unloading)
            
            db.commit()
            print(f"✅ Unloading Entries: {len(unloading_data)} records")
        else:
            print("⚠️  Unloading Entries: Skipped (missing vehicles or godowns)")
        
        # Final Summary
        print("\n" + "="*60)
        print("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"Total Suppliers: {db.query(models.Supplier).count()}")
        print(f"Total Vehicle Entries: {db.query(models.VehicleEntry).count()}")
        print(f"Total Lab Tests: {db.query(models.LabTest).count()}")
        print(f"Total Claims: {db.query(models.Claim).count()}")
        print(f"Total Godowns: {db.query(models.GodownMaster).count()}")
        print(f"Total Bins: {db.query(models.Bin).count()}")
        print(f"Total Magnets: {db.query(models.Magnet).count()}")
        print(f"Total Unloading Entries: {db.query(models.UnloadingEntry).count()}")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_all_tables()
