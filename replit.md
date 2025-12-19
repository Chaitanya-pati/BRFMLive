# Gate Entry & Lab Testing Application

## Overview
This full-stack, cross-platform application manages supplier information, vehicle entries, and laboratory quality testing for raw wheat. It provides a unified codebase for Android, iOS, and Web platforms, backed by a REST API. The system focuses on managing supplier master data, vehicle entry registration with photo capture, and comprehensive lab test recording for wheat quality, including an integrated system for Godown (warehouse) management, unloading entries, and quality claim tracking. The project aims to streamline operations, enhance data accuracy, and provide robust reporting for agricultural supply chain management.

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