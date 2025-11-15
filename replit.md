# Gate Entry & Lab Testing Application

## Overview
This full-stack, cross-platform application manages supplier information, vehicle entries, and laboratory quality testing for raw wheat. It provides a unified codebase for Android, iOS, and Web platforms, backed by a REST API. The system focuses on managing supplier master data, vehicle entry registration with photo capture, and comprehensive lab test recording for wheat quality, including an integrated system for Godown (warehouse) management, unloading entries, and quality claim tracking.

## 🚀 Quick Setup (After Cloning to New Replit)

When you clone this project to a new Replit, run this **one-time setup**:

```bash
bash setup_new_clone.sh
```

This script will:
- ✅ Wait for PostgreSQL to start
- ✅ Create the uploads directory
- ✅ Run all database migrations
- ✅ Optionally seed sample data

After setup completes, just click the **Run** button to start the application!

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React Native (Expo framework) for cross-platform compatibility (Android, iOS, Web via `react-native-web`). It follows a mobile-first design philosophy with responsive layouts. Key features include React Navigation for routing, React Hook Form for state management, and functional components with React Hooks. UI/UX emphasizes a professional ERP layout with a collapsible sidebar, a blue-themed top bar, data tables with search and action buttons, and modal forms for Add/Edit operations. The application is fully responsive with mobile breakpoint at width < 768px, featuring horizontally scrollable tabs, compact spacing, and shortened labels on mobile devices. Modals adapt to full-screen on mobile for better usability. Image handling uses Expo APIs for capturing/selecting photos, uploaded as base64 or multipart data.

### Backend Architecture
The backend is a REST API developed with FastAPI, using SQLAlchemy ORM for database abstraction and Alembic for migrations. PostgreSQL is the primary database. Architectural decisions include RESTful API design, database-first migrations, and a hybrid image storage approach (some images as BYTEA in DB, newer features like Unloading Entry images as files in a `/uploads` directory with paths stored in the DB). FastAPI serves static files for uploaded images. Data models include Supplier, VehicleEntry, LabTest, Claim, GodownMaster, and UnloadingEntry, all with proper relationships and audit trails.

### Data Storage
PostgreSQL serves as the primary data store, utilizing relational structures with foreign key constraints. It supports binary image storage for older features and file path storage for newer image-heavy features. Tables include `suppliers`, `vehicle_entries`, `lab_tests`, `claims`, `godown_master`, and `unloading_entries`, all featuring `created_at` and `updated_at` timestamps.

### System Design Choices
- **Cross-Platform**: Single codebase for Android, iOS, and Web using Expo.
- **Image Storage**: Hybrid approach; older image features store images as BYTEA in PostgreSQL, newer features store them as files in `backend/uploads` for better scalability.
- **Warehouse Management**: Comprehensive `GodownMaster` and `UnloadingEntry` system, including real-time capacity tracking and automated net weight calculation.
- **Quality Claims**: Integrated `Claim` model linked to `LabTest` results, with status tracking and update capabilities.
- **UI/UX**: Professional ERP-style interface with a collapsible sidebar, data tables, and modal forms.
- **Reliability**: Implemented static fallback data for external API dependencies (e.g., CoWIN API for states/cities) to ensure continuous operation.

## External Dependencies

### Third-Party APIs
- **CoWIN API** (https://cdn-api.co-vin.in): Used for fetching Indian states and cities, with static data fallback for resilience.

### Frontend Libraries
- `@react-navigation/native`, `@react-navigation/native-stack`: Navigation.
- `@react-native-picker/picker`: Dropdown selection.
- `@react-native-community/datetimepicker`: Date/time selection.
- `expo-camera`, `expo-image-picker`: Camera and photo library access.
- `axios`: HTTP client.
- `react-hook-form`: Form state and validation.

### Backend Libraries
- `FastAPI`: Web framework.
- `SQLAlchemy`: ORM and database toolkit.
- `Alembic`: Database migration tool.
- `Pydantic`: Data validation.

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string.
- `EXPO_PUBLIC_API_URL`: Frontend API endpoint (configured in `frontend/.env`).
- Connection pooling for database reliability.

## Recent Changes (November 2025)

### API Connection Fix - PERMANENT SOLUTION (November 15, 2025)
- **Problem**: Every fresh clone showed "Failed to fetch" error on login due to frontend trying to connect to `localhost:8000` instead of the Replit domain
- **Root Cause**: The API client's URL detection logic was trying to replace port numbers in the hostname, but Replit domains don't include ports in the hostname
- **Permanent Solution**: Updated `frontend/src/api/client.js` to properly detect Replit domains and construct the correct backend URL
  - For Replit domains (*.replit.dev or *.repl.co): Uses `https://<hostname>:8000/api`
  - For localhost: Uses `http://localhost:8000/api`
  - The fix is in the code itself, so it works automatically on every clone
- **How It Works**: The frontend detects the Replit domain from `window.location.hostname` and appends port 8000 to connect to the backend
- **Visual Confirmation**: Login screen shows "✅ Connected to backend" in green when connection is successful
- **Files Modified**: `frontend/src/api/client.js` - Simplified `getCurrentAPIUrl()` function to properly handle Replit's URL format
- **Status**: This fix is permanent and requires no manual configuration on fresh clones

### Branch Selection System (November 15, 2025)
- **Branch Selection Flow**: Implemented complete branch selection system after login
  - Auto-selects if user has only 1 branch
  - Prompts selection screen if user has multiple branches
  - User cannot access dashboard until branch is selected
- **Cross-Platform Session Storage**: Using AsyncStorage for Web, Android, and iOS compatibility
  - Stores active branch across sessions
  - Persists until user logs out or switches branch
- **Branch Switcher**: Added branch switcher in header (top-right corner)
  - Shows current active branch name
  - Click to open branch selection modal
  - Switches branch and reloads dashboard
- **Logout Functionality**: Added logout button in header that clears all session data
- **Files Created**:
  - `frontend/src/utils/storage.js` - AsyncStorage wrapper for cross-platform storage
  - `frontend/src/context/BranchContext.js` - React Context for branch state management
  - `frontend/src/screens/BranchSelectionScreen.js` - Branch selection UI
- **Files Modified**:
  - `frontend/src/screens/LoginScreen.js` - Added branch selection logic after login
  - `frontend/App.js` - Added BranchProvider and BranchSelectionScreen route
  - `frontend/src/components/Layout.js` - Added branch switcher, logout button, replaced SVG with Unicode icons for cross-platform compatibility
- **Alembic Migration**: Updated Alembic head to e136788c1e5e to match current database state

### User Authentication System Update (November 14, 2025)
- **Updated User Model**: Modified the User model to match the database schema with fields: username, email, full_name, hashed_password, role, is_active
- **Enhanced Login Response**: Login now returns full user details including email, full_name, role, and associated branches
- **Sample Users Created**: Added 4 test users with different roles:
  - **admin** (password: admin123) - Admin role, access to all 3 branches
  - **manager** (password: manager123) - Manager role, access to Main and North branches
  - **operator** (password: operator123) - Operator role, access to Main branch
  - **user1** (password: password123) - User role, access to Main branch
- **Sample Branches Created**: Created 3 branches: Main Branch, North Branch, South Branch
- **Multi-Branch Support**: Users can now be assigned to multiple branches, with branch information returned in login response
- **Frontend Dependencies**: Installed all missing npm packages including Expo and AsyncStorage
- **Both Workflows Running**: Backend API (port 8000) and Frontend (port 5000) are both running successfully
- **Fixed Database Schema Mismatch**: Updated Supplier and VehicleEntry models to match actual database schema, removing non-existent columns
- **User Management Screen**: Enhanced with full name, email, and role fields. Users can now create/edit users with complete information
- **Fixed Blank Screen Issue**: Resolved API errors that were causing blank screen in User Management by aligning models with database schema

## Recent Changes (November 2025)

### Database Schema Updates (November 13, 2025)
- **Comprehensive Schema Migration**: Created Alembic migrations (280ef23ee020, c8c942541efa) to add all missing database columns
- **Suppliers Table**: Added columns: email, street, district, zip_code, gstin
- **Vehicle Entries Table**: Added columns: empty_weight, gross_weight, vehicle_photo_front, vehicle_photo_back, vehicle_photo_side, internal_weighment_slip, client_weighment_slip, transportation_copy
- **Lab Tests Table**: Added columns: wheat_variety, bill_number, category, raise_claim
- **Migration Status**: Database currently at version c8c942541efa (latest), all migrations applied successfully
- **Frontend Build Fix**: Resolved Metro bundler issues - frontend now builds successfully and serves on port 5000
- **Application Status**: Both Backend API and Frontend workflows running without errors, all API endpoints responding correctly with 200 OK
- **Note**: Migrations are designed for fresh database deployments; Alembic tracks applied migrations to prevent duplicate execution

### Bug Fixes (November 12, 2025)
- **Fixed Gate Entry Form Notifications**: Removed mock `showNotification` function in VehicleEntryScreen.js that was preventing user feedback. The form now properly displays error and success messages using the actual notification utility, making it clear when gate entries are saved successfully or when validation errors occur.
- **Added Sample Suppliers**: Manually added 3 supplier records to the database for testing (Rajasthan Grains Ltd, Punjab Wheat Suppliers, Maharashtra Agro Products).
- **Fixed Missing Database Columns**: Manually added missing columns to vehicle_entries, lab_tests, and suppliers tables that weren't created by migrations.

### Database Fixes (October 2025)
- Fixed Alembic migration conflicts by resolving multiple heads
- Added missing columns to `lab_tests` table (document_no, issue_no, issue_date, department, wheat_variety, bill_number, category)
- Changed Bin and Magnet status columns from Enum to String(20) to resolve enum type mismatches

### Model Changes
- `Bin.status` and `Magnet.status` changed from `Enum(BinStatus)` to `String(20)` to fix SQLAlchemy enum mapping issues
- Status values remain mixed-case ("Active", "Inactive", "Maintenance", "Full")

### Configuration
- Created `frontend/.env` with `EXPO_PUBLIC_API_URL` to ensure frontend connects to backend on Replit domain
- Frontend now correctly connects to backend API at port 8000

### Master Data
The system includes default master data (created during setup):
- **10 Godowns**: Godown-G1 to Godown-G10 (capacities: 8,000-20,000 kg, Warehouse and Silo types)
- **10 Bins**: Bin-001 to Bin-010 (capacities: 1,000-2,500 kg, various grain types)
- **10 Magnets**: Magnet-M1 to Magnet-M10 (different magnetic separator types)

All master data persists across clones and restarts.