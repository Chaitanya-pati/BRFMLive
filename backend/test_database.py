
import requests
import json

BASE_URL = "http://0.0.0.0:8000/api"

def test_database():
    print("=" * 60)
    print("DATABASE CONNECTION TEST")
    print("=" * 60)
    
    # Test 1: Create multiple suppliers
    print("\n1. Creating sample suppliers...")
    suppliers_data = [
        {
            "supplier_name": "ABC Traders",
            "contact_person": "Rajesh Kumar",
            "phone": "9876543210",
            "address": "123 Main Street, Industrial Area",
            "state": "Maharashtra",
            "city": "Mumbai"
        },
        {
            "supplier_name": "XYZ Suppliers",
            "contact_person": "Priya Sharma",
            "phone": "9988776655",
            "address": "456 Park Avenue, Sector 5",
            "state": "Karnataka",
            "city": "Bangalore"
        },
        {
            "supplier_name": "Global Imports",
            "contact_person": "Amit Patel",
            "phone": "8877665544",
            "address": "789 Trade Center",
            "state": "Gujarat",
            "city": "Ahmedabad"
        }
    ]
    
    created_ids = []
    for supplier in suppliers_data:
        try:
            response = requests.post(f"{BASE_URL}/suppliers", json=supplier)
            if response.status_code == 200:
                data = response.json()
                created_ids.append(data['id'])
                print(f"   ✓ Created: {supplier['supplier_name']} (ID: {data['id']})")
            else:
                print(f"   ✗ Failed: {supplier['supplier_name']} - Status {response.status_code}")
                print(f"      Error: {response.text}")
        except Exception as e:
            print(f"   ✗ Error creating {supplier['supplier_name']}: {str(e)}")
    
    # Test 2: Retrieve all suppliers
    print(f"\n2. Retrieving all suppliers from database...")
    try:
        response = requests.get(f"{BASE_URL}/suppliers")
        if response.status_code == 200:
            suppliers = response.json()
            print(f"   ✓ Found {len(suppliers)} suppliers in database")
            for s in suppliers:
                print(f"      - {s['supplier_name']} | {s['state']}, {s['city']}")
        else:
            print(f"   ✗ Failed to retrieve suppliers - Status {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error retrieving suppliers: {str(e)}")
    
    # Test 3: Update a supplier
    if created_ids:
        print(f"\n3. Updating supplier ID {created_ids[0]}...")
        update_data = {
            "supplier_name": "ABC Traders (Updated)",
            "contact_person": "Rajesh Kumar",
            "phone": "9876543210",
            "address": "123 Main Street, New Industrial Area",
            "state": "Maharashtra",
            "city": "Pune"
        }
        try:
            response = requests.put(f"{BASE_URL}/suppliers/{created_ids[0]}", json=update_data)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ Updated successfully")
                print(f"      New name: {data['supplier_name']}")
                print(f"      New city: {data['city']}")
            else:
                print(f"   ✗ Failed to update - Status {response.status_code}")
        except Exception as e:
            print(f"   ✗ Error updating supplier: {str(e)}")
    
    # Test 4: Test validation (should fail)
    print(f"\n4. Testing validation (missing required fields)...")
    invalid_data = {
        "supplier_name": "Invalid Supplier",
        "contact_person": "John Doe"
        # Missing state and city
    }
    try:
        response = requests.post(f"{BASE_URL}/suppliers", json=invalid_data)
        if response.status_code == 422:
            print(f"   ✓ Validation working correctly (rejected invalid data)")
        else:
            print(f"   ✗ Validation failed - Expected 422, got {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error testing validation: {str(e)}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Open the frontend at the web URL shown above")
    print("2. Navigate to 'Supplier Master'")
    print("3. You should see all the suppliers created in this test")
    print("4. Try adding, editing, and deleting suppliers through the UI")
    print("=" * 60)

if __name__ == "__main__":
    print("\nMake sure the backend is running on 0.0.0.0:8000")
    print("Waiting 2 seconds before starting tests...\n")
    import time
    time.sleep(2)
    test_database()
