import requests
import json

BASE_URL = "http://0.0.0.0:8000/api"

# 5 new bins to add
bins = [
    {
        "bin_number": "BIN-PC-001",
        "capacity": 500.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "ACTIVE"
    },
    {
        "bin_number": "BIN-PC-002",
        "capacity": 750.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "ACTIVE"
    },
    {
        "bin_number": "BIN-PC-003",
        "capacity": 600.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "ACTIVE"
    },
    {
        "bin_number": "BIN-PC-004",
        "capacity": 850.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "ACTIVE"
    },
    {
        "bin_number": "BIN-PC-005",
        "capacity": 700.0,
        "current_quantity": 0.0,
        "material_type": "Wheat",
        "status": "ACTIVE"
    }
]

# 5 new magnets to add
magnets = [
    {
        "name": "Magnet-PC-M1",
        "description": "High-intensity electromagnetic separator for precleaning line 1",
        "status": "ACTIVE"
    },
    {
        "name": "Magnet-PC-M2",
        "description": "Permanent rare-earth magnet for precleaning line 2",
        "status": "ACTIVE"
    },
    {
        "name": "Magnet-PC-M3",
        "description": "Drum magnet with automatic cleaning system",
        "status": "ACTIVE"
    },
    {
        "name": "Magnet-PC-M4",
        "description": "Overhead suspension magnet for metal detection",
        "status": "ACTIVE"
    },
    {
        "name": "Magnet-PC-M5",
        "description": "Grate magnet for fine particle separation",
        "status": "ACTIVE"
    }
]

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

def seed_magnets():
    print("\nAdding magnets...")
    for magnet_data in magnets:
        try:
            response = requests.post(f"{BASE_URL}/magnets", json=magnet_data)
            if response.status_code == 200:
                print(f"✓ Added magnet: {magnet_data['name']}")
            else:
                print(f"✗ Failed to add magnet {magnet_data['name']}: {response.text}")
        except Exception as e:
            print(f"✗ Error adding magnet {magnet_data['name']}: {str(e)}")

if __name__ == "__main__":
    print("Seeding magnets and bins...\n")
    seed_magnets()
    seed_bins()
    print("\n✓ Seeding completed!")