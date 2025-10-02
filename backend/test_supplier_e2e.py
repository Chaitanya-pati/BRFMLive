
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

def test_create_supplier():
    """Test creating a new supplier"""
    print("\n=== Testing CREATE Supplier ===")
    
    payload = {
        "supplier_name": "Test Supplier E2E",
        "contact_person": "John Doe",
        "phone": "9876543210",
        "address": "123 Test Street, Test City",
        "state": "Maharashtra",
        "city": "Mumbai"
    }
    
    response = requests.post(f"{BASE_URL}/suppliers", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["supplier_name"] == payload["supplier_name"]
    assert data["state"] == payload["state"]
    assert data["city"] == payload["city"]
    
    print("✓ CREATE test passed")
    return data["id"]

def test_read_suppliers(supplier_id=None):
    """Test reading all suppliers and a specific supplier"""
    print("\n=== Testing READ Suppliers ===")
    
    # Get all suppliers
    response = requests.get(f"{BASE_URL}/suppliers")
    print(f"GET All - Status Code: {response.status_code}")
    print(f"Total Suppliers: {len(response.json())}")
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    
    # Get specific supplier if ID provided
    if supplier_id:
        response = requests.get(f"{BASE_URL}/suppliers/{supplier_id}")
        print(f"GET One - Status Code: {response.status_code}")
        print(f"Supplier: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200
        assert response.json()["id"] == supplier_id
    
    print("✓ READ test passed")

def test_update_supplier(supplier_id):
    """Test updating a supplier"""
    print("\n=== Testing UPDATE Supplier ===")
    
    payload = {
        "supplier_name": "Updated Test Supplier",
        "contact_person": "Jane Smith",
        "phone": "9999999999",
        "address": "456 Updated Avenue",
        "state": "Karnataka",
        "city": "Bangalore"
    }
    
    response = requests.put(f"{BASE_URL}/suppliers/{supplier_id}", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["supplier_name"] == payload["supplier_name"]
    assert data["state"] == payload["state"]
    assert data["city"] == payload["city"]
    assert data["contact_person"] == payload["contact_person"]
    
    print("✓ UPDATE test passed")

def test_delete_supplier(supplier_id):
    """Test deleting a supplier"""
    print("\n=== Testing DELETE Supplier ===")
    
    response = requests.delete(f"{BASE_URL}/suppliers/{supplier_id}")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    assert response.json()["message"] == "Supplier deleted successfully"
    
    # Verify deletion
    response = requests.get(f"{BASE_URL}/suppliers/{supplier_id}")
    assert response.status_code == 404
    
    print("✓ DELETE test passed")

def test_validation():
    """Test validation for required fields"""
    print("\n=== Testing Validation ===")
    
    # Missing required fields
    invalid_payloads = [
        {"contact_person": "Test", "phone": "123"},  # Missing supplier_name, state, city
        {"supplier_name": "Test", "contact_person": "Test"},  # Missing state, city
        {"supplier_name": "Test", "state": "Maharashtra"}  # Missing city
    ]
    
    for payload in invalid_payloads:
        response = requests.post(f"{BASE_URL}/suppliers", json=payload)
        print(f"Invalid payload status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422 for invalid data, got {response.status_code}"
    
    print("✓ VALIDATION test passed")

def run_all_tests():
    """Run all E2E tests in sequence"""
    print("=" * 60)
    print("SUPPLIER MANAGEMENT E2E TESTING")
    print("=" * 60)
    
    try:
        # Check if backend is running
        response = requests.get("http://127.0.0.1:8000/")
        print(f"Backend Status: {response.json()}")
        
        # Run tests
        supplier_id = test_create_supplier()
        test_read_suppliers(supplier_id)
        test_update_supplier(supplier_id)
        test_delete_supplier(supplier_id)
        test_validation()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend API at http://127.0.0.1:8000")
        print("Please ensure the backend is running: cd backend && uv run uvicorn main:app --host 127.0.0.1 --port 8000")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")

if __name__ == "__main__":
    run_all_tests()
