import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"
BRANCH_ID = "1"

def test_endpoint(method, endpoint, data=None, description=""):
    headers = {"X-Branch-ID": BRANCH_ID, "Content-Type": "application/json"}
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        
        status = "✅" if response.status_code < 400 else "❌"
        print(f"{status} {method} {endpoint} - {response.status_code} - {description}")
        
        if response.status_code >= 400:
            print(f"   Error: {response.text[:200]}")
        
        return response
    except Exception as e:
        print(f"❌ {method} {endpoint} - ERROR - {str(e)[:100]}")
        return None

print("=" * 70)
print("TESTING ALL CRUD OPERATIONS")
print("=" * 70)

# Test Branches
print("\n📁 BRANCHES:")
test_endpoint("GET", "/branches", description="List branches")

# Test Users
print("\n👤 USERS:")
test_endpoint("GET", "/users", description="List users")

# Test Suppliers
print("\n🏢 SUPPLIERS:")
suppliers_resp = test_endpoint("GET", "/suppliers", description="List suppliers")
test_endpoint("POST", "/suppliers", {
    "supplier_name": "Test Supplier",
    "contact_person": "John Doe",
    "phone": "1234567890",
    "city": "Mumbai",
    "state": "Maharashtra"
}, description="Create supplier")

# Test Godowns
print("\n🏗️ GODOWNS:")
godowns_resp = test_endpoint("GET", "/godowns", description="List godowns")

# Test Bins
print("\n📦 BINS:")
bins_resp = test_endpoint("GET", "/bins", description="List bins")

# Test Magnets
print("\n🧲 MAGNETS:")
magnets_resp = test_endpoint("GET", "/magnets", description="List magnets")

# Test Machines
print("\n⚙️ MACHINES:")
machines_resp = test_endpoint("GET", "/machines", description="List machines")

# Test Route Configurations
print("\n🛣️ ROUTE CONFIGURATIONS:")
routes_resp = test_endpoint("GET", "/route-configurations", description="List routes")

# Test Transfer Sessions
print("\n🔄 TRANSFER SESSIONS:")
test_endpoint("GET", "/transfer-sessions", description="List transfer sessions")
test_endpoint("GET", "/transfer-sessions/active", description="Get active transfer sessions")

# Test starting a transfer session
print("\n🚀 TESTING TRANSFER SESSION START:")
start_response = test_endpoint("POST", "/transfer-sessions/start", {
    "source_godown_id": 1,
    "destination_bin_id": 1
}, description="Start transfer session")

if start_response and start_response.status_code == 200:
    session_data = start_response.json()
    session_id = session_data.get("id")
    print(f"   ✅ Transfer session started with ID: {session_id}")
    
    # Test stopping the transfer session
    print("\n🛑 TESTING TRANSFER SESSION STOP:")
    test_endpoint("POST", f"/transfer-sessions/{session_id}/stop", {
        "transferred_quantity": 100.0
    }, description="Stop transfer session")

# Test Vehicles
print("\n🚗 VEHICLES:")
vehicles_resp = test_endpoint("GET", "/vehicles", description="List vehicles")

# Test Lab Tests
print("\n🔬 LAB TESTS:")
lab_tests_resp = test_endpoint("GET", "/lab-tests", description="List lab tests")

# Test Claims
print("\n📋 CLAIMS:")
claims_resp = test_endpoint("GET", "/claims", description="List claims")

print("\n" + "=" * 70)
print("✅ CRUD TESTING COMPLETE!")
print("=" * 70)
