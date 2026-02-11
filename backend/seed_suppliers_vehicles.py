
from database import SessionLocal
import models
from datetime import datetime, timedelta

def seed_suppliers_and_vehicles():
    db = SessionLocal()
    
    try:
        print("Seeding Suppliers and Vehicle Entries...")
        
        # Seed Suppliers
        suppliers_data = [
            {
                "supplier_name": "Maharashtra Grain Traders",
                "contact_person": "Rajesh Kumar",
                "phone": "9876543210",
                "email": "rajesh@maharashtragrains.com",
                "address": "123 Market Road, Pune",
                "city": "Pune",
                "state": "Maharashtra",
                "zip_code": "411001",
                "gstin": "27ABCDE1234F1Z5"
            },
            {
                "supplier_name": "Punjab Wheat Suppliers",
                "contact_person": "Harpreet Singh",
                "phone": "9876543211",
                "email": "harpreet@punjabwheat.com",
                "address": "456 Agricultural Plaza, Ludhiana",
                "city": "Ludhiana",
                "state": "Punjab",
                "zip_code": "141001",
                "gstin": "03FGHIJ5678K2L1"
            },
            {
                "supplier_name": "Karnataka Agro Products",
                "contact_person": "Suresh Reddy",
                "phone": "9876543212",
                "email": "suresh@karnatakaagro.com",
                "address": "789 Farm Road, Belgaum",
                "city": "Belgaum",
                "state": "Karnataka",
                "zip_code": "590001",
                "gstin": "29MNOPQ9012R3S4"
            },
            {
                "supplier_name": "Uttar Pradesh Grain House",
                "contact_person": "Amit Sharma",
                "phone": "9876543213",
                "email": "amit@upgrainhouse.com",
                "address": "321 Mandi Chowk, Meerut",
                "city": "Meerut",
                "state": "Uttar Pradesh",
                "zip_code": "250001",
                "gstin": "09STUVW3456X7Y8"
            },
            {
                "supplier_name": "Haryana Wheat Corporation",
                "contact_person": "Vijay Kumar",
                "phone": "9876543214",
                "email": "vijay@haryanawheat.com",
                "address": "654 Industrial Area, Karnal",
                "city": "Karnal",
                "state": "Haryana",
                "zip_code": "132001",
                "gstin": "06YZABC7890D1E2"
            }
        ]
        
        suppliers_added = 0
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
                suppliers_added += 1
            else:
                supplier_ids.append(existing.id)
        
        db.commit()
        print(f"✅ Added {suppliers_added} new suppliers")
        
        # Seed Vehicle Entries
        vehicles_data = [
            {
                "vehicle_number": "MH-12-AB-1234",
                "supplier_id": supplier_ids[0] if len(supplier_ids) > 0 else 1,
                "bill_no": "BILL-2025-001",
                "driver_name": "Ramesh Patil",
                "driver_phone": "9123456789",
                "arrival_time": datetime.utcnow() - timedelta(days=5),
                "notes": "First delivery of the month - premium wheat"
            },
            {
                "vehicle_number": "PB-03-CD-5678",
                "supplier_id": supplier_ids[1] if len(supplier_ids) > 1 else 2,
                "bill_no": "BILL-2025-002",
                "driver_name": "Gurpreet Singh",
                "driver_phone": "9123456788",
                "arrival_time": datetime.utcnow() - timedelta(days=4),
                "notes": "High quality Punjab wheat variety"
            },
            {
                "vehicle_number": "KA-29-EF-9012",
                "supplier_id": supplier_ids[2] if len(supplier_ids) > 2 else 3,
                "bill_no": "BILL-2025-003",
                "driver_name": "Venkatesh Rao",
                "driver_phone": "9123456787",
                "arrival_time": datetime.utcnow() - timedelta(days=3),
                "notes": "Organic wheat from Karnataka farms"
            },
            {
                "vehicle_number": "UP-09-GH-3456",
                "supplier_id": supplier_ids[3] if len(supplier_ids) > 3 else 4,
                "bill_no": "BILL-2025-004",
                "driver_name": "Rakesh Verma",
                "driver_phone": "9123456786",
                "arrival_time": datetime.utcnow() - timedelta(days=2),
                "notes": "Regular weekly delivery"
            },
            {
                "vehicle_number": "HR-06-IJ-7890",
                "supplier_id": supplier_ids[4] if len(supplier_ids) > 4 else 5,
                "bill_no": "BILL-2025-005",
                "driver_name": "Sunil Kumar",
                "driver_phone": "9123456785",
                "arrival_time": datetime.utcnow() - timedelta(days=1),
                "notes": "Premium grade wheat - certified quality"
            },
            {
                "vehicle_number": "MH-14-KL-2345",
                "supplier_id": supplier_ids[0] if len(supplier_ids) > 0 else 1,
                "bill_no": "BILL-2025-006",
                "driver_name": "Ashok Desai",
                "driver_phone": "9123456784",
                "arrival_time": datetime.utcnow() - timedelta(hours=12),
                "notes": "Second delivery this week"
            },
            {
                "vehicle_number": "PB-10-MN-6789",
                "supplier_id": supplier_ids[1] if len(supplier_ids) > 1 else 2,
                "bill_no": "BILL-2025-007",
                "driver_name": "Jaswinder Kaur",
                "driver_phone": "9123456783",
                "arrival_time": datetime.utcnow() - timedelta(hours=6),
                "notes": "Fresh harvest from Punjab fields"
            },
            {
                "vehicle_number": "KA-01-OP-1234",
                "supplier_id": supplier_ids[2] if len(supplier_ids) > 2 else 3,
                "bill_no": "BILL-2025-008",
                "driver_name": "Krishna Murthy",
                "driver_phone": "9123456782",
                "arrival_time": datetime.utcnow() - timedelta(hours=3),
                "notes": "Bulk order - 20 tons"
            },
            {
                "vehicle_number": "UP-14-QR-5678",
                "supplier_id": supplier_ids[3] if len(supplier_ids) > 3 else 4,
                "bill_no": "BILL-2025-009",
                "driver_name": "Manoj Singh",
                "driver_phone": "9123456781",
                "arrival_time": datetime.utcnow() - timedelta(hours=1),
                "notes": "Express delivery - priority processing"
            },
            {
                "vehicle_number": "HR-26-ST-9012",
                "supplier_id": supplier_ids[4] if len(supplier_ids) > 4 else 5,
                "bill_no": "BILL-2025-010",
                "driver_name": "Deepak Yadav",
                "driver_phone": "9123456780",
                "arrival_time": datetime.utcnow(),
                "notes": "Just arrived - awaiting quality check"
            }
        ]
        
        vehicles_added = 0
        for vehicle_data in vehicles_data:
            existing = db.query(models.VehicleEntry).filter(
                models.VehicleEntry.vehicle_number == vehicle_data["vehicle_number"],
                models.VehicleEntry.bill_no == vehicle_data["bill_no"]
            ).first()
            if not existing:
                vehicle = models.VehicleEntry(**vehicle_data)
                db.add(vehicle)
                vehicles_added += 1
        
        db.commit()
        print(f"✅ Added {vehicles_added} new vehicle entries")
        
        print("\n" + "="*50)
        print("✅ Seeding completed successfully!")
        print(f"   Total Suppliers: {db.query(models.Supplier).count()}")
        print(f"   Total Vehicle Entries: {db.query(models.VehicleEntry).count()}")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_suppliers_and_vehicles()
