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
- HomeScreen: Dashboard with navigation cards to main features
- SupplierMasterScreen: Form for creating/managing supplier records
- VehicleEntryScreen: Vehicle entry form with photo capture capability
- LabTestScreen: Lab testing data entry form

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
- Timestamps (created_at, updated_at) on all tables for audit trail

### External Dependencies

**Third-Party APIs:**
- **CoWIN API** (https://cdn-api.co-vin.in): Free public API for fetching Indian states and cities (districts). Used for dependent dropdown functionality where city selection depends on state selection.

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

The application is fully functional and running with:
- **Backend API**: FastAPI server on port 8000
- **Frontend Web**: Expo web app on port 5000
- **Database**: PostgreSQL with all tables and relationships configured
- **Features**: All three main workflows (Supplier Master, Vehicle Entry, Lab Test) working correctly