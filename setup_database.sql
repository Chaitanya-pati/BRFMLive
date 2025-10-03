-- Gate Entry & Lab Testing Database Setup Script
-- This script creates all tables and inserts sample data
-- Usage: psql $DATABASE_URL -f setup_database.sql

-- Drop existing tables if they exist (optional - uncomment if you want to reset)
-- DROP TABLE IF EXISTS lab_tests CASCADE;
-- DROP TABLE IF EXISTS vehicle_entries CASCADE;
-- DROP TABLE IF EXISTS suppliers CASCADE;

-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Vehicle Entries Table
CREATE TABLE IF NOT EXISTS vehicle_entries (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    bill_no VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    arrival_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_bill_photo BYTEA,
    vehicle_photo BYTEA,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Lab Tests Table
CREATE TABLE IF NOT EXISTS lab_tests (
    id SERIAL PRIMARY KEY,
    vehicle_entry_id INTEGER NOT NULL REFERENCES vehicle_entries(id) ON DELETE CASCADE,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Basic Tests
    moisture FLOAT,
    test_weight FLOAT,
    protein_percent FLOAT,
    wet_gluten FLOAT,
    dry_gluten FLOAT,
    falling_number INTEGER,
    
    -- Impurities
    chaff_husk FLOAT,
    straws_sticks FLOAT,
    other_foreign_matter FLOAT,
    mudballs FLOAT,
    stones FLOAT,
    dust_sand FLOAT,
    total_impurities FLOAT,
    
    -- Dockage
    shriveled_wheat FLOAT,
    insect_damage FLOAT,
    blackened_wheat FLOAT,
    sprouted_grains FLOAT,
    other_grain_damage FLOAT,
    total_dockage FLOAT,
    
    remarks TEXT,
    tested_by VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_entries_supplier_id ON vehicle_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_vehicle_entry_id ON lab_tests(vehicle_entry_id);

-- Insert Sample Data

-- Insert Suppliers
INSERT INTO suppliers (supplier_name, contact_person, phone, address, state, city) VALUES
('ABC Wheat Suppliers', 'Rajesh Kumar', '9876543210', '123 Main Street, Industrial Area', 'Uttar Pradesh', 'Lucknow'),
('Golden Grains Co.', 'Amit Sharma', '9876543211', '456 Market Road', 'Punjab', 'Ludhiana'),
('Farm Fresh Wheat', 'Priya Singh', '9876543212', '789 Agricultural Zone', 'Haryana', 'Karnal');

-- Insert Vehicle Entries
INSERT INTO vehicle_entries (vehicle_number, supplier_id, bill_no, driver_name, driver_phone, arrival_time, notes) VALUES
('UP-32-AB-1234', 1, 'BILL-2025-001', 'Ramesh Singh', '9123456789', CURRENT_TIMESTAMP - INTERVAL '2 days', 'First delivery of the month'),
('PB-10-CD-5678', 2, 'BILL-2025-002', 'Harpreet Kaur', '9123456788', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Premium quality wheat'),
('HR-26-EF-9012', 3, 'BILL-2025-003', 'Suresh Patel', '9123456787', CURRENT_TIMESTAMP, 'Regular weekly delivery');

-- Insert Lab Tests
INSERT INTO lab_tests (
    vehicle_entry_id, test_date, 
    moisture, test_weight, protein_percent, wet_gluten, dry_gluten, falling_number,
    chaff_husk, straws_sticks, other_foreign_matter, mudballs, stones, dust_sand, total_impurities,
    shriveled_wheat, insect_damage, blackened_wheat, sprouted_grains, other_grain_damage, total_dockage,
    remarks, tested_by
) VALUES
(1, CURRENT_TIMESTAMP - INTERVAL '2 days',
 12.5, 78.5, 11.8, 28.5, 10.2, 350,
 0.5, 0.3, 0.2, 0.1, 0.0, 0.4, 1.5,
 1.2, 0.3, 0.2, 0.1, 0.2, 2.0,
 'Good quality wheat, meets specifications', 'Dr. Sunil Mehta'),

(2, CURRENT_TIMESTAMP - INTERVAL '1 day',
 11.8, 80.2, 12.5, 30.1, 11.0, 380,
 0.3, 0.2, 0.1, 0.0, 0.0, 0.2, 0.8,
 0.8, 0.1, 0.1, 0.0, 0.1, 1.1,
 'Premium quality, excellent for milling', 'Dr. Sunil Mehta'),

(3, CURRENT_TIMESTAMP,
 13.0, 77.8, 11.2, 27.5, 9.8, 340,
 0.6, 0.4, 0.3, 0.2, 0.1, 0.5, 2.1,
 1.5, 0.4, 0.3, 0.2, 0.3, 2.7,
 'Acceptable quality, within tolerance', 'Dr. Anjali Verma');

-- Display summary
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_suppliers FROM suppliers;
SELECT COUNT(*) AS total_vehicle_entries FROM vehicle_entries;
SELECT COUNT(*) AS total_lab_tests FROM lab_tests;
