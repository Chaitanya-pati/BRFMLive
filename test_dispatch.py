
import sys
import os
import requests
import time

# Ensure we can import models from backend
sys.path.append(os.path.abspath('backend'))

def test_dispatch_extension():
    base_url = "http://localhost:8000/api"
    
    # 1. Create a customer
    customer_resp = requests.post(f"{base_url}/suppliers", json={
        "supplier_name": "Test Customer",
        "city": "Test City",
        "state": "Test State",
        "branch_id": 1
    })
    # Note: Use customer endpoints if available, but suppliers is used for demo in some parts.
    # Actually, customer_orders uses customers table. Let's create a real customer.
    
    # Since I'm in a script, I'll just try to use existing data or create via requests
    print("Fetching branches...")
    branches = requests.get(f"{base_url}/api/branches", headers={"X-Branch-Id": "1"}).json()
    branch_id = branches[0]['id'] if branches else 1

    print(f"Using branch_id: {branch_id}")

    # Create Customer
    customer = requests.post(f"{base_url}/api/customers", json={
        "customer_name": "Test Dispatch Customer",
        "city": "Mumbai",
        "state": "Maharashtra",
        "branch_id": branch_id
    }).json()
    customer_id = customer['customer_id']
    print(f"Created Customer: {customer_id}")

    # Create Finished Good
    fg = requests.post(f"{base_url}/api/finished-goods", json={
        "product_name": "Test Flour",
        "product_initial": "TF",
        "branch_id": branch_id
    }).json()
    fg_id = fg['id']
    print(f"Created Finished Good: {fg_id}")

    # Create Order
    order = requests.post(f"{base_url}/api/customer-orders", json={
        "order_code": f"ORD-{int(time.time())}",
        "customer_id": customer_id,
        "branch_id": branch_id,
        "items": [
            {
                "finished_good_id": fg_id,
                "quantity_ton": 10.0,
                "price_per_ton": 30000
            }
        ]
    }).json()
    order_id = order['order_id']
    order_item_id = order['items'][0]['order_item_id']
    print(f"Created Order: {order_id}, Item: {order_item_id}")

    # Create Driver
    driver = requests.post(f"{base_url}/api/drivers", json={
        "driver_name": "John Doe",
        "phone": "1234567890",
        "branch_id": branch_id
    }).json()
    driver_id = driver['driver_id']
    print(f"Created Driver: {driver_id}")

    # 2. Test Partial Dispatch
    print("\nTesting Partial Dispatch...")
    dispatch_payload = {
        "order_id": order_id,
        "driver_id": driver_id,
        "actual_dispatch_date": datetime.now().isoformat(),
        "branch_id": branch_id,
        "dispatch_items": [
            {
                "order_item_id": order_item_id,
                "finished_good_id": fg_id,
                "dispatched_qty_ton": 4.0
            }
        ]
    }
    from datetime import datetime
    dispatch_payload["actual_dispatch_date"] = datetime.now().isoformat()
    
    dispatch_resp = requests.post(f"{base_url}/dispatches", json=dispatch_payload)
    print(f"Dispatch Status: {dispatch_resp.status_code}")
    if dispatch_resp.status_code != 200:
        print(dispatch_resp.text)
        return

    # Check Order Status (Should be PARTIAL)
    order_after = requests.get(f"{base_url}/api/customer-orders/{order_id}").json()
    print(f"Order Status after 4t dispatch: {order_after['order_status']}")
    print(f"Item 0: Dispatched={order_after['items'][0]['dispatched_qty']}, Remaining={order_after['items'][0]['remaining_qty']}")

    # 3. Test Full Dispatch
    print("\nTesting Full Dispatch...")
    dispatch_payload_2 = {
        "order_id": order_id,
        "driver_id": driver_id,
        "actual_dispatch_date": datetime.now().isoformat(),
        "branch_id": branch_id,
        "dispatch_items": [
            {
                "order_item_id": order_item_id,
                "finished_good_id": fg_id,
                "dispatched_qty_ton": 6.0
            }
        ]
    }
    requests.post(f"{base_url}/dispatches", json=dispatch_payload_2)
    
    order_final = requests.get(f"{base_url}/api/customer-orders/{order_id}").json()
    print(f"Order Status after 10t total: {order_final['order_status']}")
    print(f"Item 0: Dispatched={order_final['items'][0]['dispatched_qty']}, Remaining={order_final['items'][0]['remaining_qty']}")

    # 4. Test Over Dispatch (Validation)
    print("\nTesting Over Dispatch Validation...")
    dispatch_payload_3 = {
        "order_id": order_id,
        "driver_id": driver_id,
        "actual_dispatch_date": datetime.now().isoformat(),
        "branch_id": branch_id,
        "dispatch_items": [
            {
                "order_item_id": order_item_id,
                "finished_good_id": fg_id,
                "dispatched_qty_ton": 1.0
            }
        ]
    }
    over_resp = requests.post(f"{base_url}/dispatches", json=dispatch_payload_3)
    print(f"Over dispatch status (expected 400): {over_resp.status_code}")
    print(f"Error detail: {over_resp.json().get('detail')}")

if __name__ == "__main__":
    try:
        test_dispatch_extension()
    except Exception as e:
        print(f"Error during testing: {e}")
