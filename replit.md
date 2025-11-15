# Gate Entry & Lab Testing Application

## Overview
This full-stack, cross-platform application manages supplier information, vehicle entries, and laboratory quality testing for raw wheat. It provides a unified codebase for Android, iOS, and Web platforms, backed by a REST API. The system focuses on managing supplier master data, vehicle entry registration with photo capture, comprehensive lab test recording for wheat quality, integrated Godown (warehouse) management, unloading entries, and quality claim tracking.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 15, 2025)

### Import Migration Completion
Successfully imported and configured the Gate Entry & Lab Testing application in the Replit environment:

1. **Backend Workflow**: Configured as a long-running service on port 8000 (`uvicorn main:app --host 0.0.0.0 --port 8000`)
2. **Frontend Workflow**: Configured with Express proxy server and Expo Metro bundler on port 5000 (`node combined-server.js`)
3. **CORS Fix**: Implemented proper CORS handling through Express middleware in `frontend/combined-server.js` using the cors package with `origin: true` and `credentials: true` to support authenticated API requests
4. **Database Setup**: Manually created missing database tables (branches, users, user_branches) and seeded with test data
5. **Test Data**: Created 5 branches (Main, North, South, East, West) and 6 test users with various roles and permissions

### Technical Implementation Details
- **Proxy Configuration**: All frontend API calls use `/api/*` path which is proxied to backend on port 8000
- **Security Settings**: Disabled Expo dev server security for HTTP mode with environment variables (EXPO_NO_DEV_SERVER_SECURITY=1, EXPO_NO_HTTPS=1)
- **Metro Config**: Cleaned and simplified to default configuration, removing ineffective CORS middleware (Expo Web uses Webpack, not Metro)
- **Dependencies**: Added `cors` package to frontend for proper CORS handling in the Express proxy server

## System Architecture

### Frontend Architecture
The frontend uses React Native (Expo framework) for cross-platform compatibility (Android, iOS, Web via `react-native-web`). It follows a mobile-first design with responsive layouts, React Navigation for routing, React Hook Form for state management, and functional components. The UI/UX features a professional ERP layout with a collapsible sidebar, blue-themed top bar, data tables with search and action buttons, and modal forms for Add/Edit operations. It's fully responsive, adapting for mobile devices with horizontally scrollable tabs, compact spacing, and full-screen modals. Image handling uses Expo APIs for capture/selection, uploaded as base64 or multipart data.

### Backend Architecture
The backend is a FastAPI REST API, using SQLAlchemy ORM for database abstraction and Alembic for migrations. PostgreSQL is the primary database. It features RESTful API design, database-first migrations, and a hybrid image storage approach (some images as BYTEA in DB, newer features store files in a `/uploads` directory with paths in DB). FastAPI serves static files for uploaded images. Data models include Supplier, VehicleEntry, LabTest, Claim, GodownMaster, and UnloadingEntry, with relationships and audit trails. The application includes an automatic database migration system that runs `alembic upgrade head` on startup.

### Data Storage
PostgreSQL is the primary data store, utilizing relational structures with foreign key constraints. It supports binary image storage for older features and file path storage for newer image-heavy features. Tables include `suppliers`, `vehicle_entries`, `lab_tests`, `claims`, `godown_master`, and `unloading_entries`, all with `created_at` and `updated_at` timestamps.

### System Design Choices
- **Cross-Platform**: Single codebase for Android, iOS, and Web using Expo.
- **Image Storage**: Hybrid approach; older features store images as BYTEA in PostgreSQL, newer features store them as files in `backend/uploads`.
- **Warehouse Management**: Comprehensive `GodownMaster` and `UnloadingEntry` system with real-time capacity tracking and automated net weight calculation.
- **Quality Claims**: Integrated `Claim` model linked to `LabTest` results, with status tracking.
- **UI/UX**: Professional ERP-style interface with a collapsible sidebar, data tables, and modal forms.
- **Reliability**: Implemented static fallback data for external API dependencies (e.g., CoWIN API) to ensure continuous operation.
- **Branch Selection**: A complete branch selection system after login, with auto-selection for single-branch users and a selection screen for multiple branches. Active branch is stored cross-platform using AsyncStorage.

## External Dependencies

### Third-Party APIs
- **CoWIN API** (https://cdn-api.co-vin.in): Used for fetching Indian states and cities, with static data fallback.

### Frontend Libraries
- `@react-navigation/native`, `@react-navigation/native-stack`: Navigation.
- `@react-native-picker/picker`: Dropdown selection.
- `@react-native-community/datetimepicker`: Date/time selection.
- `expo-camera`, `expo-image-picker`: Camera and photo library access.
- `axios`: HTTP client.
- `react-hook-form`: Form state and validation.
- `@react-native-async-storage/async-storage`: Cross-platform persistent storage.

### Backend Libraries
- `FastAPI`: Web framework.
- `SQLAlchemy`: ORM and database toolkit.
- `Alembic`: Database migration tool.
- `Pydantic`: Data validation.

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string.
- `EXPO_PUBLIC_API_URL`: Frontend API endpoint (configured in `frontend/.env`).
- Connection pooling for database reliability.