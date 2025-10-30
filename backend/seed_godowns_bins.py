
import requests
import json

BASE_URL = "http://0.0.0.0:8000/api"

# Sample godowns to add
godowns = [
    {
        "name": "Godown A",
        "capacity": 1000,
        "type": "Covered Storage"
    },
    {
        "name": "Godown B",
        "capacity": 1500,
        "type": "Open Storage"
    },
    {
        "name": "Godown C",
        "capacity": 2000,
        "type": "Covered Storage"
    },
    {
        "name": "Godown D",
        "capacity": 800,
        "type": "Silo"
    }
]

# Sample bins to add
bins = [
    {
        "bin_number": "BIN-001",
        "capacity": 100.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "Active"
    },
    {
        "bin_number": "BIN-002",
        "capacity": 150.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "Active"
    },
    {
        "bin_number": "BIN-003",
        "capacity": 120.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "Active"
    },
    {
        "bin_number": "BIN-004",
        "capacity": 200.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "Active"
    },
    {
        "bin_number": "BIN-005",
        "capacity": 180.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "Active"
    }
]

def seed_godowns():
    print("Adding godowns...")
    for godown in godowns:
        try:
            response = requests.post(f"{BASE_URL}/godowns", json=godown)
            if response.status_code == 200:
                print(f"✓ Added godown: {godown['name']}")
            else:
                print(f"✗ Failed to add godown {godown['name']}: {response.text}")
        except Exception as e:
            print(f"✗ Error adding godown {godown['name']}: {str(e)}")

def seed_bins():
    print("\nAdding bins...")
    for bin_data in bins:
        try:
            response = requests.post(f"{BASE_URL}/bins", json=bin_data)
            if response.status_code == 200:
                print(f"✓ Added bin: {bin_data['bin_number']}")
            else:
                print(f"✗ Failed to add bin {bin_data['bin_number']}: {response.text}")
        except Exception as e:
            print(f"✗ Error adding bin {bin_data['bin_number']}: {str(e)}")

if __name__ == "__main__":
    print("Seeding godowns and bins...\n")
    seed_godowns()
    seed_bins()
    print("\n✓ Seeding completed!")
