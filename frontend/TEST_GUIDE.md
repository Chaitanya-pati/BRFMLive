
# Supplier Management E2E Testing Guide

## Prerequisites
1. Backend API running on port 8000
2. Frontend running on port 5000
3. PostgreSQL database accessible

## Test Scenarios

### 1. CREATE - Add New Supplier

**Steps:**
1. Navigate to Supplier Master screen
2. Click "Add New" button
3. Fill in the form:
   - Supplier Name: "ABC Traders" (required)
   - Contact Person: "Rajesh Kumar"
   - Phone: "9876543210"
   - Address: "123 Main Street"
   - State: Select "Maharashtra" from dropdown (required)
   - City: Type "Pune" (required)
4. Click "Save" button

**Expected Results:**
- Success alert: "Supplier created successfully"
- Modal closes automatically
- New supplier appears in the table
- Form validation prevents submission if required fields are empty

**Edge Cases to Test:**
- Empty supplier name → should show error
- Empty state → should show error
- Empty city → should show error
- Very long supplier name (>255 chars)
- Special characters in name
- Invalid phone number format

---

### 2. READ - View Suppliers

**Steps:**
1. Navigate to Supplier Master screen
2. Observe the data table

**Expected Results:**
- All suppliers displayed in table with columns:
  - ID
  - Supplier Name
  - Contact Person
  - Phone
  - State
  - City
  - Created Date
- Data loads automatically on page load
- Table is sortable and searchable (if implemented)

---

### 3. UPDATE - Edit Supplier

**Steps:**
1. Click "Edit" button on any supplier row
2. Modal opens with pre-filled data
3. Modify fields:
   - Change Supplier Name to "ABC Traders Updated"
   - Change State to "Karnataka"
   - Change City to "Bangalore"
4. Click "Update" button

**Expected Results:**
- Success alert: "Supplier updated successfully"
- Modal closes
- Table refreshes with updated data
- Changes persist after page reload

**Edge Cases to Test:**
- Clear required fields → should prevent save
- Change state → city field should clear
- Cancel button should discard changes

---

### 4. DELETE - Remove Supplier

**Steps:**
1. Click "Delete" button on any supplier row
2. Confirmation dialog appears
3. Click "Delete" in confirmation

**Expected Results:**
- Success alert: "Supplier deleted successfully"
- Supplier removed from table
- Cannot be retrieved after deletion

**Edge Cases to Test:**
- Cancel deletion → supplier remains
- Delete supplier with associated vehicles → should handle gracefully

---

### 5. State/City Dropdown Behavior

**Steps:**
1. Open Add/Edit modal
2. Select different states from dropdown
3. Observe city field behavior

**Expected Results:**
- State dropdown loads with all Indian states
- City is now a text input (not dropdown)
- User can type any city name
- State selection updates formData.state correctly

---

## Network & API Testing

### Check Backend Connectivity
```bash
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/api/suppliers
```

### Check Frontend API Configuration
- Verify `frontend/src/api/client.js` has correct API_URL
- Should point to: `https://[repl-domain]:8000/api`

### Browser Console Checks
1. Open Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for API calls
4. Verify:
   - POST /api/suppliers (Create)
   - GET /api/suppliers (Read)
   - PUT /api/suppliers/{id} (Update)
   - DELETE /api/suppliers/{id} (Delete)

---

## Common Issues & Fixes

### Issue: "Network Error" when saving
**Solution:**
- Verify backend is running on port 8000
- Check API_URL in `frontend/src/api/client.js`
- Ensure CORS is enabled in backend

### Issue: State shows as empty even when selected
**Solution:**
- Already fixed in latest code
- State name is now properly set in formData

### Issue: Form not submitting
**Solution:**
- Check browser console for validation errors
- Ensure all required fields are filled
- Verify Save button is not disabled

---

## Automated Test Execution

Run the Python E2E test:
```bash
cd backend
uv run python test_supplier_e2e.py
```

This will test all CRUD operations programmatically.
