#!/usr/bin/env python3
"""
End-to-end testing for Supplier Management
Tests: Create, Read, Update, Delete operations
"""

import requests
import json
import sys

# API base URL
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"ℹ️  {message}")

def test_api_connection():
    """Test if API is accessible"""
    print_section("TEST 1: API Connection")
    try:
        response = requests.get(BASE_URL)
        if response.status_code == 200:
            print_success(f"API is running: {response.json()}")
            return True
        else:
            print_error(f"API returned status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to API: {e}")
        return False

def test_create_supplier():
    """Test creating a new supplier"""
    print_section("TEST 2: Create New Supplier")
    
    supplier_data = {
        "supplier_name": "Test Supplier Ltd",
        "contact_person": "John Doe",
        "phone": "9876543210",
        "address": "123 Test Street, Industrial Area",
        "state": "Maharashtra",
        "city": "Mumbai"
    }
    
    print_info(f"Creating supplier: {supplier_data['supplier_name']}")
    
    try:
        response = requests.post(
            f"{API_URL}/suppliers",
            json=supplier_data
        )
        
        if response.status_code == 200:
            created_supplier = response.json()
            print_success("Supplier created successfully!")
            print(f"   ID: {created_supplier['id']}")
            print(f"   Name: {created_supplier['supplier_name']}")
            print(f"   Contact: {created_supplier['contact_person']}")
            print(f"   State: {created_supplier['state']}")
            print(f"   City: {created_supplier['city']}")
            return created_supplier['id']
        else:
            print_error(f"Failed to create supplier: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating supplier: {e}")
        return None

def test_get_all_suppliers():
    """Test retrieving all suppliers"""
    print_section("TEST 3: Get All Suppliers")
    
    try:
        response = requests.get(f"{API_URL}/suppliers")
        
        if response.status_code == 200:
            suppliers = response.json()
            print_success(f"Retrieved {len(suppliers)} supplier(s)")
            for supplier in suppliers:
                print(f"   - ID: {supplier['id']}, Name: {supplier['supplier_name']}, "
                      f"State: {supplier['state']}, City: {supplier['city']}")
            return suppliers
        else:
            print_error(f"Failed to get suppliers: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Error getting suppliers: {e}")
        return []

def test_get_supplier_by_id(supplier_id):
    """Test retrieving a specific supplier by ID"""
    print_section(f"TEST 4: Get Supplier by ID ({supplier_id})")
    
    try:
        response = requests.get(f"{API_URL}/suppliers/{supplier_id}")
        
        if response.status_code == 200:
            supplier = response.json()
            print_success("Supplier retrieved successfully!")
            print(f"   ID: {supplier['id']}")
            print(f"   Name: {supplier['supplier_name']}")
            print(f"   Contact: {supplier['contact_person']}")
            print(f"   Phone: {supplier['phone']}")
            print(f"   Address: {supplier['address']}")
            print(f"   State: {supplier['state']}")
            print(f"   City: {supplier['city']}")
            return supplier
        else:
            print_error(f"Failed to get supplier: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Error getting supplier: {e}")
        return None

def test_update_supplier(supplier_id):
    """Test updating an existing supplier"""
    print_section(f"TEST 5: Update Supplier (ID: {supplier_id})")
    
    update_data = {
        "supplier_name": "Updated Test Supplier Ltd",
        "contact_person": "Jane Smith",
        "phone": "9123456789",
        "address": "456 Updated Street, New Area",
        "state": "Karnataka",
        "city": "Bangalore"
    }
    
    print_info(f"Updating supplier to: {update_data['supplier_name']}")
    
    try:
        response = requests.put(
            f"{API_URL}/suppliers/{supplier_id}",
            json=update_data
        )
        
        if response.status_code == 200:
            updated_supplier = response.json()
            print_success("Supplier updated successfully!")
            print(f"   Name: {updated_supplier['supplier_name']}")
            print(f"   Contact: {updated_supplier['contact_person']}")
            print(f"   Phone: {updated_supplier['phone']}")
            print(f"   State: {updated_supplier['state']}")
            print(f"   City: {updated_supplier['city']}")
            return updated_supplier
        else:
            print_error(f"Failed to update supplier: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error updating supplier: {e}")
        return None

def test_delete_supplier(supplier_id):
    """Test deleting a supplier"""
    print_section(f"TEST 6: Delete Supplier (ID: {supplier_id})")
    
    print_info(f"Deleting supplier with ID: {supplier_id}")
    
    try:
        response = requests.delete(f"{API_URL}/suppliers/{supplier_id}")
        
        if response.status_code == 200:
            print_success("Supplier deleted successfully!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print_error(f"Failed to delete supplier: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Error deleting supplier: {e}")
        return False

def test_verify_deletion(supplier_id):
    """Verify that supplier was deleted"""
    print_section(f"TEST 7: Verify Deletion (ID: {supplier_id})")
    
    try:
        response = requests.get(f"{API_URL}/suppliers/{supplier_id}")
        
        if response.status_code == 404:
            print_success("Deletion verified - Supplier not found (as expected)")
            return True
        else:
            print_error(f"Deletion failed - Supplier still exists")
            return False
    except Exception as e:
        print_error(f"Error verifying deletion: {e}")
        return False

def run_all_tests():
    """Run all end-to-end tests"""
    print("\n")
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║     SUPPLIER MANAGEMENT - END-TO-END TESTING             ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    
    test_results = {
        "passed": 0,
        "failed": 0
    }
    
    # Test 1: API Connection
    if not test_api_connection():
        print_error("\nAPI is not accessible. Stopping tests.")
        sys.exit(1)
    test_results["passed"] += 1
    
    # Test 2: Create Supplier
    supplier_id = test_create_supplier()
    if supplier_id:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
        print_error("\nCannot proceed without supplier ID. Stopping tests.")
        sys.exit(1)
    
    # Test 3: Get All Suppliers
    suppliers = test_get_all_suppliers()
    if suppliers:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    # Test 4: Get Supplier by ID
    supplier = test_get_supplier_by_id(supplier_id)
    if supplier:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    # Test 5: Update Supplier
    updated_supplier = test_update_supplier(supplier_id)
    if updated_supplier:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    # Test 6: Delete Supplier
    if test_delete_supplier(supplier_id):
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    # Test 7: Verify Deletion
    if test_verify_deletion(supplier_id):
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
    
    # Print Summary
    print_section("TEST SUMMARY")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"📊 Total:  {test_results['passed'] + test_results['failed']}")
    
    if test_results['failed'] == 0:
        print("\n🎉 All tests passed successfully!")
        return 0
    else:
        print(f"\n⚠️  {test_results['failed']} test(s) failed.")
        return 1

if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
