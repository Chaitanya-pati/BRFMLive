# Manufacturing & Logistics Management System

## Overview
This full-stack, cross-platform application manages a food/grain processing facility. It covers the full production lifecycle: supplier/vehicle/lab entry, production orders, 24-hour and 12-hour transfers, grinding, dispatch, and live monitoring. It provides a unified codebase for Android, iOS, and Web platforms, backed by a REST API. The system focuses on managing supplier master data, vehicle entry registration with photo capture, and comprehensive lab test recording for wheat quality, including an integrated system for Godown (warehouse) management, unloading entries, and quality claim tracking. The project aims to streamline operations, enhance data accuracy, and provide robust reporting for agricultural supply chain management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React Native (Expo framework) for cross-platform compatibility (Android, iOS, Web via `react-native-web`). It follows a mobile-first design philosophy with responsive layouts. Key features include React Navigation for routing, React Hook Form for state management, and functional components with React Hooks. UI/UX emphasizes a professional ERP layout with a collapsible sidebar, a blue-themed top bar, data tables with search and action buttons, and modal forms for Add/Edit operations. The application is fully responsive with mobile breakpoint at width < 768px. Image handling uses Expo APIs for capturing/selecting photos, uploaded as base64 or multipart data. A cross-platform branch selection system is implemented, allowing users to select an active branch after login, with session persistence.

### Backend Architecture
The backend is a REST API developed with FastAPI, using SQLAlchemy ORM for database abstraction and Alembic for migrations. PostgreSQL is the primary database. Architectural decisions include RESTful API design, database-first migrations, and a hybrid image storage approach (some images as BYTEA in DB, newer features like Unloading Entry images as files in a `/uploads` directory with paths stored in the DB). FastAPI serves static files for uploaded images. Data models include Supplier, VehicleEntry, LabTest, Claim, GodownMaster, UnloadingEntry, Machine, RouteConfiguration, and RouteStage, all with proper relationships and audit trails. A dynamic workflow system is implemented for managing machines and flexible route configurations with multiple stages.

### Data Storage
PostgreSQL serves as the primary data store, utilizing relational structures with foreign key constraints. It supports binary image storage for older features and file path storage for newer image-heavy features. Tables include `suppliers`, `vehicle_entries`, `lab_tests`, `claims`, `godown_master`, `unloading_entries`, `machines`, `route_configurations`, `route_stages`, `bins`, `magnets`, `transfer_sessions`, `magnet_cleaning_records`, `route_magnet_mappings`, `branches`, `users`, and `user_branches`, all featuring `created_at` and `updated_at` timestamps.

### System Design Choices
- **Cross-Platform**: Single codebase for Android, iOS, and Web using Expo.
- **Image Storage**: Hybrid approach; older image features store images as BYTEA in PostgreSQL, newer features store them as files in `backend/uploads`.
- **Warehouse Management**: Comprehensive `GodownMaster` and `UnloadingEntry` system, including real-time capacity tracking and automated net weight calculation.
- **Quality Claims**: Integrated `Claim` model linked to `LabTest` results, with status tracking.
- **Dynamic Workflow System**: Flexible machine management and configurable routes with multiple stages (Godown, Magnet, Machine, Bin).
- **Multi-Branch Support**: Users can be associated with multiple branches, with a dedicated branch selection mechanism.
- **UI/UX**: Professional ERP-style interface with a collapsible sidebar, data tables, and modal forms, adapting to mobile and desktop views.
- **Reliability**: Implemented static fallback data for external API dependencies (e.g., CoWIN API) to ensure continuous operation.

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
- `@react-native-async-storage/async-storage`: Cross-platform session storage.

### Backend Libraries
- `FastAPI`: Web framework.
- `SQLAlchemy`: ORM and database toolkit.
- `Alembic`: Database migration tool.
- `Pydantic`: Data validation.
- `psycopg2-binary`: PostgreSQL adapter.

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string.
- `EXPO_PUBLIC_API_URL`: Frontend API endpoint (configured in `frontend/.env`).

## Test Users & Login Credentials

The application is seeded with the following test users for different roles:

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin
- **Branches**: All branches (Main, North, South, East, West)

### Manager User
- **Username**: `manager`
- **Password**: `manager123`
- **Role**: Manager
- **Branches**: Main Branch, North Branch

### Operator User
- **Username**: `operator`
- **Password**: `operator123`
- **Role**: Operator
- **Branches**: Main Branch

### Supervisor User
- **Username**: `supervisor`
- **Password**: `super123`
- **Role**: Supervisor
- **Branches**: South Branch, East Branch

### Test Users
- **Username**: `user1` / Password: `password123` (Main Branch)
- **Username**: `user2` / Password: `password123` (North Branch)

## Recent Changes

### April 24, 2026
- **Magnet cleaning – production order & transfer-stage tracking**:
  - Added 3 new nullable columns to `magnet_cleaning_records`: `production_order_id`, `source_bin_id`, `destination_bin_id` (with indexes). Safely added via startup `ALTER TABLE IF NOT EXISTS` migration so existing data is untouched.
  - Updated `MagnetCleaningRecordBase` schema and the `POST /api/magnet-cleaning-records` endpoint to accept the three new optional fields. All existing callers continue to work since the fields are optional.
  - 24h vs 12h transfer stage is **derived** at read/report time from the destination bin's role (no `transfer_type` enum, no polymorphic FK).
- **Route Configuration – multi-source / multi-destination**:
  - Same `route_stages` table; no schema change. Routes can now have multiple leading source rows (all of the same source type) and multiple trailing bin rows (destinations).
  - New backend helper `split_route_stages(route)` derives sources / middle / destinations purely by sequence position + component type.
  - New endpoint `GET /api/route-configurations/match?destination_bin_id=&source_godown_id=|source_bin_id=` — returns the matching route + the magnets between the source and destination (most recently created route wins on ties).
  - `RouteConfigurationScreen.js` rewritten to support the new structure: separate **+ Source**, **+ Magnet/Machine**, **+ Destination Bin** buttons; coloured left border per role (blue / green / orange); per-row remove allowed when more than one of that role exists; source-type picker rewrites all source rows in place.

### April 20, 2026 (updated)
- Added **"Return Journey Started"** step to **Driver View** (`DriverViewScreen.js`):
  - After all delivery stops are completed, driver first taps a green **"RETURN JOURNEY STARTED"** button, which records `return_journey_at` on the `dispatch_delivery_stops` table.
  - Only after that step is confirmed does the KM reading input and orange **"RETURN TO FACTORY"** button appear, enforcing the correct two-step return flow.

### April 20, 2026
- Implemented **Driver View** (`DriverViewScreen.js`) — a dedicated, driver-friendly sequential workflow screen:
  - **Stage 1 — Start Trip**: Driver sees their assigned dispatch cards, taps "Open Trip", enters start KM reading, taps "START TRIP" → creates trip sheet with `factory_exit_at` and `factory_exit_km`.
  - **Stage 2 — Delivering**: For each customer stop (1 or multiple), driver taps sequential large buttons: "WE ARRIVED" → "UNLOADING STARTED" → "UNLOADING DONE" → photo capture → customer signature → driver signature. "Return to Factory" button appears only when ALL stops have `unloading_end` recorded. Driver enters end KM and taps "RETURN TO FACTORY" → sets `factory_return_at`/`factory_return_km` and marks dispatch as DELIVERED.
  - **Stage 3 — Returned**: Shows trip summary with total KM driven. Driver's work is complete.
  - Handles single and multi-customer dispatches. Status derived from existing DB fields (no schema changes).
- Redesigned **Trip Sheet screen** (`TripSheetScreen.js`) as admin/supervisor-only view:
  - Removed all duplicate journey entry fields. Journey tab is now read-only, showing milestones captured by driver.
  - Summary tab: dispatch info, products, KM summary, D Note and Freight Amount editable.
  - Sign-Off tab: freight received, Excel updated Y/N, supervisor/driver sign dates, remarks.
- Sidebar updated: "Driver View" added under Dispatch & Orders; old "Driver Delivery" entry removed in favour of the new flow; "Trip Sheet" renamed to "Trip Sheet (Admin)".

### April 18, 2026
- Implemented **Trip Sheet** system end-to-end:
  - **Backend models**: Added `TripSheet` and `TripSheetSignoff` tables; added 6 journey-tracking columns to `dispatch_delivery_stops` (`factory_exit_at`, `factory_exit_km`, `factory_exit_signed`, `return_journey_at`, `factory_return_at`, `factory_return_km`).
  - **Startup migration handler**: `ALTER TABLE IF NOT EXISTS` columns added safely at app startup, no alembic chain conflict.
  - **Full CRUD API** at `/api/trip-sheets/*` including `/full` endpoint for print view aggregation (dispatch, driver, truck, customer, bill, stop, items in one call).
  - Auto-generated trip numbers in format `TRIP-YYYY-NNNN`.
  - **`TripSheetScreen.js`**: 3-tab form (Header / Journey Log / Sign-Off) with dispatch selector, save, and print navigation.
  - **`TripSheetPrintScreen.js`**: A4-formatted print view matching BRFM India layout — title row, info grid, color-coded journey milestone table, remarks/driver/supervisor sign-off section.
  - Registered `TripSheet` and `TripSheetPrint` routes in `App.js`.
  - Added "Trip Sheet" to sidebar under Dispatch & Orders section in `Layout.js`.

### April 17, 2026
- Added **`BinVisual` component** (`frontend/src/components/BinVisual.js`): reusable fill-level bin graphic with color coding (blue→amber→orange→red at 0/40/75/90% capacity), tap-to-select support, sizes xs/sm/md/lg.
- Added **`ProductionPipelineScreen`** (`frontend/src/screens/ProductionPipelineScreen.js`): unified 4-stage view (Raw Wheat → 24h Transfer → 12h Transfer → Grinding) per production order, with stage status badges and BinVisual cards. Registered as route `ProductionPipeline`, accessible from sidebar under Production → Pipeline View.
- Added backend endpoint `GET /api/production-orders/{order_id}/pipeline` returning all stage data in one call.
- **Production Planning screen**: bin chips replaced with `BinVisual` tap-to-add tiles; selected bins show mini BinVisual in the table row.
- **24h Transfer (start modal)**: native `<select>` replaced with horizontal `BinVisual` picker grid.
- **12h Transfer (configure bins)**: source and destination `SelectDropdown` replaced with horizontal `BinVisual` picker grids.
- **Live View**: added "Pipeline View" shortcut button navigating to `ProductionPipeline` with order pre-selected.

### January 28, 2026
- Implemented Dispatch Management system.
- Added backend CRUD endpoints for `Dispatch` in `main.py`.
- Created `DispatchManagementScreen.js` in the frontend with data table and modal forms.
- Integrated dispatch management with customer orders and driver data.
- Added dispatch management to the dashboard navigation.

### November 19, 2025
- Successfully imported and set up the project in Replit environment
- Installed all frontend dependencies (750 npm packages)
- Configured PostgreSQL database connection via DATABASE_URL environment variable
- Ran all Alembic migrations to head (4c3fda579a0a) - created 20 database tables
- Created default admin user for testing (username: admin, password: admin123)
- Created 5 default branches (Main, North, South, East, West) and associated all with admin user
- Fixed login redirection issue by ensuring users have branch associations
- Fixed Pre-Cleaning view blank screen error by adding default props and proper prop spreading in CleaningReminder component
- Configured frontend environment with proper API URL for Replit deployment
- Verified both Backend API (port 8000) and Frontend (Expo on port 5000) workflows are running
- Tested and confirmed login functionality is working end-to-end with proper branch selection

### November 18, 2025
- Set up PostgreSQL database with all required tables
- Created test users and branches for login functionality
- Configured Backend workflow (FastAPI on port 8000)
- Configured Frontend workflow (Expo on port 5000)
- Verified login system is working properly with backend connectivity