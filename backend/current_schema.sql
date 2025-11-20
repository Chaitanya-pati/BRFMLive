
-- PostgreSQL Database Schema
-- Generated from current application state

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    street VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20),
    gstin VARCHAR(15),
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_suppliers_id ON suppliers(id);

-- Create vehicle_entries table
CREATE TABLE IF NOT EXISTS vehicle_entries (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    bill_no VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    empty_weight FLOAT DEFAULT 0.0,
    gross_weight FLOAT DEFAULT 0.0,
    supplier_bill_photo BYTEA,
    vehicle_photo BYTEA,
    vehicle_photo_front BYTEA,
    vehicle_photo_back BYTEA,
    vehicle_photo_side BYTEA,
    internal_weighment_slip BYTEA,
    client_weighment_slip BYTEA,
    transportation_copy BYTEA,
    notes TEXT,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_vehicle_entries_id ON vehicle_entries(id);

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
    id SERIAL PRIMARY KEY,
    vehicle_entry_id INTEGER NOT NULL REFERENCES vehicle_entries(id),
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    wheat_variety VARCHAR(100),
    bill_number VARCHAR(100),
    department VARCHAR(50),
    moisture FLOAT,
    test_weight FLOAT,
    hectoliter_weight FLOAT,
    protein_percent FLOAT,
    wet_gluten FLOAT,
    dry_gluten FLOAT,
    sedimentation_value FLOAT,
    falling_number INTEGER,
    chaff_husk FLOAT,
    straws_sticks FLOAT,
    other_foreign_matter FLOAT,
    mudballs FLOAT,
    stones FLOAT,
    dust_sand FLOAT,
    total_impurities FLOAT,
    shriveled_wheat FLOAT,
    insect_damage FLOAT,
    blackened_wheat FLOAT,
    sprouted_grains FLOAT,
    other_grain_damage FLOAT,
    other_grains FLOAT,
    soft_wheat FLOAT,
    heat_damaged FLOAT,
    immature_wheat FLOAT,
    broken_wheat FLOAT,
    total_dockage FLOAT,
    category VARCHAR(50),
    remarks TEXT,
    comments_action TEXT,
    approved BOOLEAN DEFAULT FALSE,
    tested_by VARCHAR(255),
    raise_claim INTEGER DEFAULT 0,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_lab_tests_id ON lab_tests(id);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    lab_test_id INTEGER NOT NULL REFERENCES lab_tests(id),
    description TEXT NOT NULL,
    claim_type VARCHAR(20),
    claim_amount FLOAT,
    claim_status VARCHAR(20) DEFAULT 'Open' NOT NULL,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_claims_id ON claims(id);

-- Create godown_master table
CREATE TABLE IF NOT EXISTS godown_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    current_storage FLOAT DEFAULT 0.0,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_godown_master_id ON godown_master(id);

-- Create unloading_entries table
CREATE TABLE IF NOT EXISTS unloading_entries (
    id SERIAL PRIMARY KEY,
    vehicle_entry_id INTEGER NOT NULL REFERENCES vehicle_entries(id),
    godown_id INTEGER NOT NULL REFERENCES godown_master(id),
    gross_weight FLOAT NOT NULL,
    empty_vehicle_weight FLOAT NOT NULL,
    net_weight FLOAT NOT NULL,
    before_unloading_image VARCHAR(500),
    after_unloading_image VARCHAR(500),
    unloading_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unloading_end_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_unloading_entries_id ON unloading_entries(id);

-- Create bins table
CREATE TABLE IF NOT EXISTS bins (
    id SERIAL PRIMARY KEY,
    bin_number VARCHAR(100) NOT NULL UNIQUE,
    capacity FLOAT NOT NULL,
    current_quantity FLOAT DEFAULT 0.0,
    material_type VARCHAR(100),
    bin_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active' NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_bins_id ON bins(id);

-- Create magnets table
CREATE TABLE IF NOT EXISTS magnets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_magnets_id ON magnets(id);

-- Create machines table
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    machine_type VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    serial_number VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_machines_id ON machines(id);

-- Create route_configurations table
CREATE TABLE IF NOT EXISTS route_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_route_configurations_id ON route_configurations(id);

-- Create route_stages table
CREATE TABLE IF NOT EXISTS route_stages (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES route_configurations(id) ON DELETE CASCADE,
    sequence_no INTEGER NOT NULL,
    component_type VARCHAR(20) NOT NULL,
    component_id INTEGER NOT NULL,
    interval_hours FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_route_stages_id ON route_stages(id);

-- Create route_magnet_mappings table
CREATE TABLE IF NOT EXISTS route_magnet_mappings (
    id SERIAL PRIMARY KEY,
    magnet_id INTEGER NOT NULL REFERENCES magnets(id),
    source_godown_id INTEGER REFERENCES godown_master(id),
    source_bin_id INTEGER REFERENCES bins(id),
    destination_bin_id INTEGER NOT NULL REFERENCES bins(id),
    cleaning_interval_hours INTEGER DEFAULT 3 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_route_magnet_mappings_id ON route_magnet_mappings(id);

-- Create transfer_sessions table
CREATE TABLE IF NOT EXISTS transfer_sessions (
    id SERIAL PRIMARY KEY,
    source_godown_id INTEGER NOT NULL REFERENCES godown_master(id),
    destination_bin_id INTEGER NOT NULL REFERENCES bins(id),
    current_bin_id INTEGER REFERENCES bins(id),
    magnet_id INTEGER REFERENCES magnets(id),
    start_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_bin_start_timestamp TIMESTAMP,
    stop_timestamp TIMESTAMP,
    transferred_quantity FLOAT,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    cleaning_interval_hours INTEGER DEFAULT 3 NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_transfer_sessions_id ON transfer_sessions(id);

-- Create transfer_session_magnets table
CREATE TABLE IF NOT EXISTS transfer_session_magnets (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL REFERENCES transfer_sessions(id) ON DELETE CASCADE,
    magnet_id INTEGER NOT NULL REFERENCES magnets(id),
    cleaning_interval_hours FLOAT NOT NULL,
    sequence_no INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bin_transfers table
CREATE TABLE IF NOT EXISTS bin_transfers (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL REFERENCES transfer_sessions(id) ON DELETE CASCADE,
    bin_id INTEGER NOT NULL REFERENCES bins(id),
    start_timestamp TIMESTAMP NOT NULL,
    end_timestamp TIMESTAMP,
    quantity FLOAT,
    sequence INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create magnet_cleaning_records table
CREATE TABLE IF NOT EXISTS magnet_cleaning_records (
    id SERIAL PRIMARY KEY,
    magnet_id INTEGER NOT NULL REFERENCES magnets(id) ON DELETE CASCADE,
    transfer_session_id INTEGER REFERENCES transfer_sessions(id) ON DELETE SET NULL,
    cleaning_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    before_cleaning_photo VARCHAR(500),
    after_cleaning_photo VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_magnet_cleaning_records_id ON magnet_cleaning_records(id);
CREATE INDEX IF NOT EXISTS ix_magnet_cleaning_records_magnet_id ON magnet_cleaning_records(magnet_id);
CREATE INDEX IF NOT EXISTS ix_magnet_cleaning_records_transfer_session_id ON magnet_cleaning_records(transfer_session_id);

-- Create waste_entries table
CREATE TABLE IF NOT EXISTS waste_entries (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL REFERENCES transfer_sessions(id),
    godown_id INTEGER NOT NULL REFERENCES godown_master(id),
    waste_weight FLOAT NOT NULL,
    waste_type VARCHAR(100),
    recorded_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recorded_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_waste_entries_transfer_session_id ON waste_entries(transfer_session_id);

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_branches_id ON branches(id);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);

-- Create user_branches table
CREATE TABLE IF NOT EXISTS user_branches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Summary
SELECT 'Database schema creation script complete!' AS status;
