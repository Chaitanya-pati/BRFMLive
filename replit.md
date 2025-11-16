# Gate Entry and Lab Testing System

## Overview
A multi-branch gate entry and laboratory testing management system built with:
- **Backend**: FastAPI (Python) with PostgreSQL database
- **Frontend**: React Native (Expo) for web
- **Database**: PostgreSQL with Alembic migrations

## Current State (Updated: November 16, 2025)
✅ Fully functional application with permanent CORS fix implemented
✅ Backend API running on port 8000
✅ Frontend running on port 5000 (production build served via Express)
✅ Database seeded with 6 test users and 5 branches
✅ Login functionality fully operational

## Critical CORS Fix
**PERMANENT SOLUTION IMPLEMENTED**: We no longer use Expo's development server, which had CORS middleware blocking requests. Instead:
1. Expo app is pre-built to static files: `cd frontend && npx expo export --platform web`
2. Express server (`production-server.js`) serves the static files from `dist/`
3. Express proxies `/api/*` requests to backend on port 8000
4. **Result**: No more CORS errors, ever. See `CORS_SOLUTION.md` for details.

## Project Architecture

### Backend (Port 8000)
- **Framework**: FastAPI with Uvicorn
- **Database**: PostgreSQL (managed by Replit)
- **Migrations**: Alembic
- **Models**: Users, Branches, Suppliers, Vehicles, Lab Tests, User-Branch associations
- **Key Endpoints**:
  - `POST /api/login` - User authentication
  - `GET /api/suppliers` - List suppliers
  - `GET /api/vehicles` - List vehicles
  - `GET /api/lab-tests` - List lab tests

### Frontend (Port 5000)
- **Framework**: React Native (Expo) for web
- **Build**: Pre-compiled static files served by Express
- **Server**: `frontend/production-server.js` (Express with API proxy)
- **Navigation**: React Navigation
- **State**: React hooks and AsyncStorage
- **API Client**: Axios with `/api` base URL (proxied to backend)

### Database Schema
- `users` - User authentication and profiles
- `branches` - Multi-branch support
- `user_branches` - User-to-branch associations (many-to-many)
- `suppliers` - Supplier management
- `vehicles` - Vehicle tracking
- `lab_tests` - Laboratory test records

## Test Users and Credentials
See `TEST_USERS.md` for complete list. Quick reference:
- **Admin**: `admin` / `admin123` (all branches)
- **Manager**: `manager` / `manager123` (Main, North)
- **Operator**: `operator` / `operator123` (Main)
- **Supervisor**: `supervisor` / `super123` (South, East)
- **User1**: `user1` / `password123` (Main)
- **User2**: `user2` / `password123` (North)

## Workflows

### Backend API
```bash
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend && node production-server.js
```
**Note**: After making frontend code changes, rebuild with:
```bash
cd frontend && npx expo export --platform web
```

## Development Workflow

### Making Frontend Changes
1. Edit files in `frontend/src/`
2. Rebuild: `cd frontend && npx expo export --platform web`
3. Restart the Frontend workflow
4. Changes will appear immediately

### Making Backend Changes
1. Edit files in `backend/`
2. Restart the Backend API workflow
3. Changes will appear immediately (FastAPI auto-reloads in dev mode)

### Database Migrations
```bash
cd backend
# Create migration
alembic revision --autogenerate -m "description"
# Apply migration
alembic upgrade head
```

## User Preferences
- **Approach**: Permanent, production-ready solutions over temporary fixes
- **CORS**: Must work reliably without repeated failures
- **Database**: PostgreSQL (not SQLite) managed by Replit
- **Testing**: All 6 users must be able to login across 5 branches

## Recent Changes (Nov 16, 2025)
1. **PERMANENT CORS FIX**: Switched from Expo dev server to production build approach
   - Built static files with `npx expo export --platform web`
   - Created `production-server.js` to serve static files and proxy API
   - Completely eliminated Expo's CORS middleware from the runtime
   - See `CORS_SOLUTION.md` for technical details

2. **Express Server Update**: Fixed Express 5 compatibility
   - Changed catch-all route from `app.get('*', ...)` to `app.use(...)`
   - Fixed PathError with wildcard routes

3. **Workflow Configuration**: Updated Frontend workflow to use production server
   - Command: `cd frontend && node production-server.js`
   - Serves pre-built files, no more Expo dev server at runtime

## Important Files
- `backend/main.py` - FastAPI application entry point
- `backend/models.py` - Database models
- `backend/seed_users_branches.py` - Test data seeding script
- `frontend/production-server.js` - Express server for static files + API proxy
- `frontend/src/screens/LoginScreen.js` - Login UI
- `frontend/src/api/client.js` - API client configuration
- `TEST_USERS.md` - Complete test user reference
- `CORS_SOLUTION.md` - Technical explanation of CORS fix

## Troubleshooting

### CORS Errors
If you see any CORS errors, ensure:
1. Frontend workflow is using `production-server.js`
2. Static files exist in `frontend/dist/` directory
3. If not, rebuild: `cd frontend && npx expo export --platform web`

### Login Fails
1. Check backend is running on port 8000
2. Check database contains test users
3. Verify API proxy is working: check Frontend workflow logs for "📡 Proxying" messages

### Database Issues
1. Ensure DATABASE_URL environment variable is set
2. Run migrations: `cd backend && alembic upgrade head`
3. Reseed test data: `cd backend && python seed_users_branches.py`

## Next Steps / Future Enhancements
- Implement branch selection screen for users with multiple branches
- Add vehicle entry/exit tracking
- Implement lab test management features
- Add reporting and analytics
- Implement role-based access control for different features
