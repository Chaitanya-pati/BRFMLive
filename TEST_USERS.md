# Test Users and Branches

## Database Status
✅ PostgreSQL database created and migrated successfully
✅ All tables created from models
✅ Test data seeded successfully

## Available Test Users

### 1. Admin User
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin
- **Email:** admin@example.com
- **Full Name:** Administrator
- **Branches:** All branches (Main, North, South, East, West)

### 2. Manager User
- **Username:** `manager`
- **Password:** `manager123`
- **Role:** Manager
- **Email:** manager@example.com
- **Full Name:** Manager User
- **Branches:** Main Branch, North Branch

### 3. Operator User
- **Username:** `operator`
- **Password:** `operator123`
- **Role:** Operator
- **Email:** operator@example.com
- **Full Name:** Operator User
- **Branches:** Main Branch

### 4. Supervisor User
- **Username:** `supervisor`
- **Password:** `super123`
- **Role:** Supervisor
- **Email:** supervisor@example.com
- **Full Name:** Supervisor User
- **Branches:** South Branch, East Branch

### 5. Test User 1
- **Username:** `user1`
- **Password:** `password123`
- **Role:** User
- **Email:** user1@example.com
- **Full Name:** Test User 1
- **Branches:** Main Branch

### 6. Test User 2
- **Username:** `user2`
- **Password:** `password123`
- **Role:** User
- **Email:** user2@example.com
- **Full Name:** Test User 2
- **Branches:** North Branch

## Available Branches

1. **Main Branch** - Main headquarters branch
2. **North Branch** - Northern region branch
3. **South Branch** - Southern region branch
4. **East Branch** - Eastern region branch
5. **West Branch** - Western region branch

## Testing Login

### Via API (Backend)
```bash
curl -X POST http://0.0.0.0:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Via Frontend
1. Open the application in your browser
2. Enter one of the test usernames
3. Enter the corresponding password
4. Click the Login button
5. If the user has multiple branches, you'll be prompted to select one
6. If the user has only one branch, you'll be redirected directly to the home screen

## Login Flow
1. User enters credentials
2. System validates against the database
3. Returns user data with assigned branches
4. User selects a branch (if multiple)
5. User is redirected to the main application

## API Endpoints Verified
- ✅ `POST /api/login` - User authentication
- ✅ `GET /` - Health check
- ✅ `GET /api/suppliers` - List suppliers
- ✅ `GET /api/vehicles` - List vehicles
- ✅ `GET /api/lab-tests` - List lab tests

## System Status
- ✅ Backend API running on port 8000
- ✅ Frontend running on port 5000 (with API proxy)
- ✅ Database migrations applied
- ✅ Test data seeded
- ✅ CORS configured properly
- ✅ All workflows running
