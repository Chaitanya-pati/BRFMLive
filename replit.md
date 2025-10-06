# Gate Entry & Lab Testing Application

## Overview

This is a full-stack, cross-platform Gate Entry and Lab Testing application designed for managing supplier information, vehicle entries, and laboratory quality testing for raw wheat. The application provides a unified codebase that runs on Android, iOS, and Web platforms, with a REST API backend for data management.

The system handles:
- Supplier master data management
- Vehicle entry registration with photo capture
- Lab test recording for wheat quality parameters
- Image storage directly in PostgreSQL database

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React Native with Expo framework for cross-platform development
- react-native-web enables web deployment from the same codebase
- React Navigation for screen routing and navigation
- React Hook Form for form state management
- Functional components with React Hooks pattern

**Key Design Decisions:**
- **Cross-Platform Strategy**: Single codebase targets Android, iOS, and Web using Expo and react-native-web. This reduces maintenance overhead and ensures feature parity across platforms.
- **Mobile-First Design**: UI components are designed primarily for mobile screens with responsive layouts that adapt to web viewports.
- **Image Handling**: Uses Expo ImagePicker and Camera APIs for capturing or selecting photos. Images are converted to base64 or multipart form data for upload to backend.
- **Navigation Pattern**: Native stack navigation provides platform-appropriate transitions and navigation behavior.

**Screen Structure:**
- HomeScreen: Professional dashboard with stats cards, quick actions, and recent activity
- SupplierMasterScreen: Data table view with Add/Edit modal forms for supplier records
- VehicleEntryScreen: Data table view with modal form for vehicle entries and photo capture
- LabTestScreen: Data table view with comprehensive modal form for lab test data entry

**UI/UX Design:**
- **Professional ERP Layout**: Collapsible sidebar navigation with menu items and icons
- **Top Bar**: Blue header with system title and "ERP Management" subtitle
- **Data Tables**: Professional grid views with search functionality and action buttons (Edit/Delete)
- **Modal Forms**: Add/Edit operations displayed in overlay modal dialogs instead of full-screen forms
- **Responsive Design**: Clean, modern styling with proper spacing, shadows, and color scheme
- **Color Palette**: Blue primary (#3b82f6), dark sidebar (#1e293b), green success (#10b981), red delete (#ef4444)

### Backend Architecture

**Technology Stack:**
- FastAPI framework for REST API
- SQLAlchemy ORM for database abstraction
- Alembic for database migrations
- PostgreSQL as the relational database

**Key Design Decisions:**
- **No File Storage**: Images are stored directly in PostgreSQL as BYTEA (binary) columns instead of file system storage. This simplifies deployment, eliminates file path management issues, and ensures data integrity through database transactions.
- **RESTful API Design**: Standard REST endpoints following resource-oriented patterns (GET, POST, PUT, DELETE operations on resources).
- **Database-First Migrations**: Alembic manages schema versioning, allowing controlled database evolution and rollback capability.
- **CORS Enabled**: Wildcard CORS policy allows frontend to call API from any origin (suitable for development; should be restricted in production).

**Data Models:**
- **Supplier**: Master data for suppliers with location information (state/city)
- **VehicleEntry**: Records vehicle arrivals with foreign key to Supplier, includes binary fields for photos
- **LabTest**: Quality test results linked to VehicleEntry, stores multiple wheat quality parameters (moisture, protein, gluten, impurities, etc.)
- **Claim**: Quality claim records linked to LabTest via foreign key, tracks issues found during quality testing with category detection and remarks

**Architectural Patterns:**
- Dependency Injection: FastAPI's Depends() for database session management
- Repository Pattern: Database access through SQLAlchemy ORM sessions
- Schema Validation: Pydantic models for request/response validation

### Data Storage

**PostgreSQL Database:**
- Primary data store for all application data
- Binary image storage using LargeBinary (BYTEA) column type
- Relational structure with foreign key constraints maintaining referential integrity

**Schema Design:**
- suppliers table: supplier master data
- vehicle_entries table: vehicle entry records with supplier foreign key
- lab_tests table: test results with vehicle_entry foreign key
- claims table: quality claims linked to lab_tests with foreign key
- Timestamps (created_at, updated_at) on all tables for audit trail

### External Dependencies

**Third-Party APIs:**
- **CoWIN API** (https://cdn-api.co-vin.in): Free public API for fetching Indian states and cities (districts). Used for dependent dropdown functionality where city selection depends on state selection.
  - **Fallback Strategy**: Static data provided for 33 Indian states and districts for UP, Maharashtra, and Delhi when API is unavailable
  - **Flexible City Input**: Form automatically switches to text input when no city dropdown data is available, allowing manual entry

**Frontend Libraries:**
- @react-navigation/native & native-stack: Navigation framework
- @react-native-picker/picker: Dropdown selection component
- @react-native-community/datetimepicker: Date/time selection
- expo-camera & expo-image-picker: Camera and photo library access
- axios: HTTP client for API communication
- react-hook-form: Form state and validation management

**Backend Libraries:**
- FastAPI: Web framework with automatic OpenAPI documentation
- SQLAlchemy: ORM and database toolkit
- Alembic: Database migration tool
- Pydantic: Data validation using Python type annotations

**Environment Configuration:**
- DATABASE_URL environment variable for PostgreSQL connection string
- Default connection: postgresql://localhost/gateentry
- Connection pooling configured with pre-ping and recycle for reliability

## Recent Changes

**October 6, 2025 - Claim Tracking Feature**
- **Claim Status Management**: Added comprehensive claim tracking and status update functionality
  - Added claim_status field to Claim model with enum values (Open, In Progress, Closed)
  - Created database migration to add claim_status column with default "Open" status
  - PATCH /api/claims/{id} endpoint for updating claim status and remarks
  - ClaimTrackingScreen.js with professional table interface
  - Status filter dropdown to filter by All/Open/In Progress/Closed
  - Color-coded status indicators: 🟢 Closed (green), 🟠 In Progress (orange), 🔴 Open (red)
  - Update modal to change claim status and add/edit remarks
  - Navigation integration with new menu item in sidebar
- **Technical Implementation**:
  - Backend: SQLAlchemy Enum type for claim_status, Pydantic schemas for validation
  - Frontend: React Native screen following existing patterns with responsive design
  - API Client: Extended claimApi with update method

**October 6, 2025 - Raise Claim Feature**
- **Quality Claims Management**: Added comprehensive claim raising functionality for lab test results
  - New Claim model with foreign key relationship to lab_tests table
  - POST /api/claims/create endpoint for claim submission
  - "Raise Claim" action button in Lab Tests data table
  - Modal form with auto-filled fields (Vehicle ID, Supplier Name, Category Detected, Claim Date)
  - Required validation for issue description
  - Optional remarks field for additional notes
  - Success feedback and modal closure after claim submission
- **Database Migration**: Created claims table with proper foreign key constraints
- **Frontend Integration**: Extended DataTable component to support custom action buttons
- **API Client**: Added claimApi.create() function for claim submission

**October 2, 2025 - Professional ERP UI Transformation**
- **Complete UI/UX Overhaul**: Transformed application into professional ERP-style interface
  - Implemented sidebar navigation with collapsible menu and icons
  - Added professional top bar with system branding
  - Created reusable Layout, DataTable, and Modal components
  - Replaced card-based screens with professional data table views
  - Converted forms to modal-based Add/Edit dialogs
- **Enhanced User Experience**:
  - Added search functionality to all data tables
  - Implemented Edit and Delete actions with confirmation dialogs
  - Created professional dashboard with stats cards and quick actions
  - Applied consistent color scheme and modern styling throughout
- **Reliability Improvements**:
  - Added static fallback data for Indian states and cities
  - Implemented flexible city input (dropdown or text) for resilient data entry
  - Ensured all CRUD operations work regardless of external API availability

**September 30, 2025**
- Initial implementation completed with all three core modules:
  - Supplier Master with dependent State/City dropdowns using CoWIN API
  - Vehicle Entry with camera/image picker integration for bill and vehicle photos
  - Lab Test form with auto-calculation of total impurities and dockage
- Backend API running on port 8000 with all CRUD endpoints functional
- Frontend web app running on port 5000 with React Native + Expo + react-native-web
- Database migrations applied successfully
- Image storage implemented directly in PostgreSQL as BYTEA columns
- Auto-fetch of bill number when vehicle is selected in lab test form

## Current Status

The application is fully functional with professional ERP-style interface:
- **Backend API**: FastAPI server on port 8000 with all CRUD endpoints
- **Frontend Web**: Professional Expo web app on port 5000 with ERP layout
- **Database**: PostgreSQL with all tables and relationships configured
- **UI/UX**: Complete professional transformation with sidebar navigation, data tables, and modal forms
- **Features**: All CRUD operations (Create, Read, Update, Delete) working across all modules:
  - Supplier Master: Add/Edit/Delete with flexible state/city input (✅ Fully tested and verified)
  - Vehicle Entry: Add entries with photo capture (bill and vehicle photos)
  - Lab Test: Add comprehensive test data with auto-calculations
  - Raise Claim: Quality claims linked to lab test results with auto-filled context and validation (✅ October 6, 2025)
- **Reliability**: Static fallback data ensures functionality even when external APIs are unavailable

## Replit Environment Configuration

**October 4, 2025 - Deployment Configuration Complete**

The application has been successfully imported from GitHub and configured to run in the Replit environment with all deployment issues resolved.

### Backend Configuration
- Python dependencies managed with `uv` (pyproject.toml)
- FastAPI backend running on `0.0.0.0:8000`
- External Neon PostgreSQL database (hardcoded DATABASE_URL in database.py)
- All CRUD endpoints operational with CORS enabled for cross-origin requests

### Frontend Configuration
- Node.js dependencies installed via npm
- Expo web server configured with webpack to listen on all interfaces (0.0.0.0)
- Running on port 5000 for Replit webview compatibility
- Environment variable `EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0` set for proper proxy handling
- **Custom webpack.config.js** with `allowedHosts: 'all'` for Replit iframe/proxy support
- **Dynamic API URL**: Frontend detects hostname and uses appropriate backend URL:
  - Development: `http://localhost:8000/api`
  - Deployment: `https://[replit-domain]:8000/api`

### Workflows
- **Backend API**: `cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000` (console output)
- **Frontend**: `cd frontend && EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --web --port 5000` (webview output)

### Deployment Issues Resolved (October 4, 2025)
1. **CORS Error from cdn-api.co-vin.in**: External API CORS errors are handled gracefully with static fallback data - no impact on functionality
2. **Connection Refused to Backend**: Fixed by:
   - Installing all frontend npm dependencies
   - Creating custom webpack.config.js with `allowedHosts: 'all'` for Replit proxy
   - Configuring dynamic API URL that adapts to deployment environment
   - Properly setting up both backend and frontend workflows

### Import Status
- ✅ Frontend npm dependencies installed successfully
- ✅ Both workflows configured and running properly
- ✅ Webpack configured for Replit iframe compatibility
- ✅ API connection working between frontend and backend
- ✅ Application fully functional in development and ready for deployment