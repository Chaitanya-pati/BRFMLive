# Manufacturing & Logistics Management System

## Overview
This full-stack, cross-platform application manages a food/grain processing facility, covering the entire production lifecycle from supplier entry and lab testing to production orders, grinding, dispatch, and live monitoring. It provides a unified codebase for Android, iOS, and Web platforms, supported by a REST API. The system focuses on managing supplier data, vehicle entry with photo capture, comprehensive wheat quality lab test recording, integrated Godown (warehouse) management, unloading entries, and quality claim tracking. The project aims to streamline operations, enhance data accuracy, and provide robust reporting for agricultural supply chain management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React Native (Expo framework) for cross-platform compatibility (Android, iOS, Web via `react-native-web`). It follows a mobile-first design philosophy with responsive layouts, utilizing React Navigation for routing and React Hook Form for state management. UI/UX emphasizes a professional ERP layout featuring a collapsible sidebar, a blue-themed top bar, data tables with search and action buttons, and modal forms for Add/Edit operations. The application is fully responsive with a mobile breakpoint at width < 768px. Image handling uses Expo APIs for capturing/selecting photos, uploaded as base64 or multipart data. A cross-platform branch selection system allows users to select an active branch after login, with session persistence. Key components include `BinVisual` for fill-level graphics and `ProductionPipelineScreen` for a unified production order view. Magnet cleaning records have their own dedicated screen (`MagnetCleaningScreen`), separated from the Raw Wheat Transfer flow, with a date/time picker so the user-selected cleaning timestamp is persisted to the database.

### Backend Architecture
The backend is a REST API developed with FastAPI, using SQLAlchemy ORM for database abstraction and Alembic for migrations. PostgreSQL is the primary database. Architectural decisions include RESTful API design, database-first migrations, and a hybrid image storage approach (some images as BYTEA in DB, newer features like Unloading Entry images as files in a `/uploads` directory with paths stored in the DB). FastAPI serves static files for uploaded images. Data models cover Supplier, VehicleEntry, LabTest, Claim, GodownMaster, UnloadingEntry, Machine, RouteConfiguration, RouteStage, Dispatch, TripSheet, and MagnetCleaningRecord, all with proper relationships and audit trails. A dynamic workflow system is implemented for managing machines and flexible route configurations with multiple stages. Magnet cleaning records now track production order and transfer-stage details. Dispatch management includes a dedicated driver view for sequential workflow and a comprehensive trip sheet system.

### Data Storage
PostgreSQL serves as the primary data store, utilizing relational structures with foreign key constraints. It supports binary image storage for older features and file path storage for newer image-heavy features. Tables include `suppliers`, `vehicle_entries`, `lab_tests`, `claims`, `godown_master`, `unloading_entries`, `machines`, `route_configurations`, `route_stages`, `bins`, `magnets`, `transfer_sessions`, `magnet_cleaning_records`, `route_magnet_mappings`, `branches`, `users`, `user_branches`, `dispatch_delivery_stops`, `trip_sheets`, `trip_sheet_signoffs`, and `hourly_production_bran`, all featuring `created_at` and `updated_at` timestamps.

### System Design Choices
- **Cross-Platform**: Single codebase for Android, iOS, and Web using Expo.
- **Image Storage**: Hybrid approach; older image features store images as BYTEA in PostgreSQL, newer features store them as files in `backend/uploads`.
- **Warehouse Management**: Comprehensive `GodownMaster` and `UnloadingEntry` system, including real-time capacity tracking and automated net weight calculation.
- **Quality Claims**: Integrated `Claim` model linked to `LabTest` results, with status tracking.
- **Dynamic Workflow System**: Flexible machine management and configurable routes with multiple stages (Godown, Magnet, Machine, Bin), now supporting multi-source and multi-destination configurations.
- **Multi-Branch Support**: Users can be associated with multiple branches, with a dedicated branch selection mechanism.
- **UI/UX**: Professional ERP-style interface with a collapsible sidebar, data tables, and modal forms, adapting to mobile and desktop views.
- **Reliability**: Implemented static fallback data for external API dependencies to ensure continuous operation.
- **Dispatch & Trip Sheet**: End-to-end system including driver-friendly views for trip progression, mileage tracking, customer signatures, and admin/supervisor trip sheet management with print views.
- **Production Tracking**: Enhanced grinding screen with bran tracking and a unified production pipeline view.

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
- `EXPO_PUBLIC_API_URL`: Frontend API endpoint.