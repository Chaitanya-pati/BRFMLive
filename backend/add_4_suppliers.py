
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def add_suppliers():
    """Add 4 new suppliers to the database"""
    
    suppliers = [
        {
            "supplier_name": "Delhi Grain Traders",
            "contact_person": "Rakesh Kumar",
            "phone": "9876543215",
            "email": "rakesh@delhigrain.com",
            "address": "123 Grain Market, Azadpur",
            "street": "Grain Market Road",
            "city": "New Delhi",
            "district": "North Delhi",
            "state": "Delhi",
            "zip_code": "110033",
            "gstin": "07ABCDE1234F5G6"
        },
        {
            "supplier_name": "Rajasthan Wheat Suppliers",
            "contact_person": "Mahendra Singh",
            "phone": "9876543216",
            "email": "mahendra@rajwheat.com",
            "address": "456 Market Yard, Kota Road",
            "street": "Kota Road",
            "city": "Jaipur",
            "district": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302012",
            "gstin": "08GHIJK7890L1M2"
        },
        {
            "supplier_name": "Tamil Nadu Agro Products",
            "contact_person": "Suresh Babu",
            "phone": "9876543217",
            "email": "suresh@tnagro.com",
            "address": "789 Industrial Estate, Guindy",
            "street": "Industrial Estate Road",
            "city": "Chennai",
            "district": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600032",
            "gstin": "33NOPQR3456S7T8"
        },
        {
            "supplier_name": "West Bengal Rice Mills",
            "contact_person": "Debashish Roy",
            "phone": "9876543218",
            "email": "debashish@wbrice.com",
            "address": "101 Rice Mill Lane, Howrah",
            "street": "Rice Mill Lane",
            "city": "Kolkata",
            "district": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700001",
            "gstin": "19UVWXY9012Z3A4"
        }
    ]
    
    print("=" * 60)
    print("ADDING 4 NEW SUPPLIERS")
    print("=" * 60)
    
    created_suppliers = []
    
    for idx, supplier in enumerate(suppliers, 1):
        print(f"\n{idx}. Adding: {supplier['supplier_name']}")
        print(f"   Location: {supplier['city']}, {supplier['state']}")
        print(f"   Contact: {supplier['contact_person']} ({supplier['phone']})")
        
        try:
            response = requests.post(f"{BASE_URL}/suppliers", json=supplier)
            
            if response.status_code == 200:
                data = response.json()
                created_suppliers.append(data)
                print(f"   ✅ SUCCESS - Assigned ID: {data['id']}")
            else:
                print(f"   ❌ FAILED - Status {response.status_code}")
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"COMPLETED: {len(created_suppliers)}/4 suppliers added successfully")
    print("=" * 60)
    
    if created_suppliers:
        print("\n📋 Summary of Added Suppliers:")
        for supplier in created_suppliers:
            print(f"   • ID {supplier['id']}: {supplier['supplier_name']} ({supplier['city']}, {supplier['state']})")
    
    print("\n✨ You can now view these suppliers in the frontend UI!")
    print("   Navigate to: Supplier Master screen")
    
    return created_suppliers

if __name__ == "__main__":
    add_suppliers()
