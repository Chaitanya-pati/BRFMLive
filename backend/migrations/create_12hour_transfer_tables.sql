-- ============================================================================
-- 12-Hour Transfer Process - Complete Database Setup Script (PostgreSQL)
-- ============================================================================
-- Copy and paste this entire script into your PostgreSQL database console
-- This will create all necessary tables and modifications for 12-hour transfers
-- ============================================================================

-- Create ENUM types for transfer_type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_type_enum') THEN
        CREATE TYPE transfer_type_enum AS ENUM('NORMAL', 'SPECIAL');
    END IF;
END $$;

-- Create ENUM types for session_status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status_enum') THEN
        CREATE TYPE session_status_enum AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED');
    END IF;
END $$;

-- Create ENUM types for mapping_status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mapping_status_enum') THEN
        CREATE TYPE mapping_status_enum AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
    END IF;
END $$;

-- Create ENUM types for special_transfer_status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'special_transfer_status_enum') THEN
        CREATE TYPE special_transfer_status_enum AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- Create ENUM types for record_status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status_enum') THEN
        CREATE TYPE record_status_enum AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

-- ============================================================================
-- Table 1: 12hours_transfer_sessions
-- Main session record for each 12-hour transfer (Normal or Special type)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "12hours_transfer_sessions" (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL,
    transfer_type transfer_type_enum NOT NULL,
    status session_status_enum NOT NULL DEFAULT 'PLANNED',
    session_sequence INTEGER NOT NULL DEFAULT 1,
    start_timestamp TIMESTAMP,
    end_timestamp TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_sessions_prod_order ON "12hours_transfer_sessions"(production_order_id);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_status ON "12hours_transfer_sessions"(status);

-- ============================================================================
-- Table 2: 12hours_transfer_bins_mapping
-- Maps source (24-hour) and destination (12-hour) bins with their sequences
-- ============================================================================
CREATE TABLE IF NOT EXISTS "12hours_transfer_bins_mapping" (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL,
    source_bin_id INTEGER NOT NULL,
    destination_bin_id INTEGER NOT NULL,
    source_sequence INTEGER NOT NULL,
    destination_sequence INTEGER NOT NULL,
    planned_quantity FLOAT NOT NULL,
    transferred_quantity FLOAT NOT NULL DEFAULT 0,
    status mapping_status_enum NOT NULL DEFAULT 'PENDING',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    start_timestamp TIMESTAMP,
    end_timestamp TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES "12hours_transfer_sessions"(id) ON DELETE CASCADE,
    FOREIGN KEY (source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (destination_bin_id) REFERENCES bins(id)
);

CREATE INDEX IF NOT EXISTS idx_bins_mapping_session ON "12hours_transfer_bins_mapping"(transfer_session_id);
CREATE INDEX IF NOT EXISTS idx_bins_mapping_source ON "12hours_transfer_bins_mapping"(source_bin_id);
CREATE INDEX IF NOT EXISTS idx_bins_mapping_destination ON "12hours_transfer_bins_mapping"(destination_bin_id);
CREATE INDEX IF NOT EXISTS idx_bins_mapping_status ON "12hours_transfer_bins_mapping"(status);
CREATE INDEX IF NOT EXISTS idx_bins_mapping_locked ON "12hours_transfer_bins_mapping"(is_locked);

-- ============================================================================
-- Table 3: 12hours_special_transfers
-- Special transfer mapping (one extra source -> one specific destination with manual quantity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "12hours_special_transfers" (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL UNIQUE,
    special_source_bin_id INTEGER NOT NULL,
    special_destination_bin_id INTEGER NOT NULL,
    manual_quantity FLOAT NOT NULL,
    status special_transfer_status_enum NOT NULL DEFAULT 'PENDING',
    start_timestamp TIMESTAMP,
    end_timestamp TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES "12hours_transfer_sessions"(id) ON DELETE CASCADE,
    FOREIGN KEY (special_source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (special_destination_bin_id) REFERENCES bins(id)
);

CREATE INDEX IF NOT EXISTS idx_special_transfers_session ON "12hours_special_transfers"(transfer_session_id);

-- ============================================================================
-- Table 4: 12hours_transfer_records
-- Individual transfer operation records (actual transfers that happened)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "12hours_transfer_records" (
    id SERIAL PRIMARY KEY,
    transfer_session_id INTEGER NOT NULL,
    bins_mapping_id INTEGER NOT NULL,
    source_bin_id INTEGER NOT NULL,
    destination_bin_id INTEGER NOT NULL,
    quantity_planned FLOAT NOT NULL,
    quantity_transferred FLOAT NOT NULL DEFAULT 0,
    status record_status_enum NOT NULL DEFAULT 'PLANNED',
    water_added FLOAT,
    moisture_level FLOAT,
    transfer_start_time TIMESTAMP,
    transfer_end_time TIMESTAMP,
    duration_minutes INTEGER,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES "12hours_transfer_sessions"(id),
    FOREIGN KEY (bins_mapping_id) REFERENCES "12hours_transfer_bins_mapping"(id),
    FOREIGN KEY (source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (destination_bin_id) REFERENCES bins(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_records_session ON "12hours_transfer_records"(transfer_session_id);
CREATE INDEX IF NOT EXISTS idx_transfer_records_status ON "12hours_transfer_records"(status);

-- ============================================================================
-- Modification to existing bins table: Add locking for Special Transfer
-- Only run if locked_by_transfer_session_id column doesn't exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bins' 
        AND column_name = 'locked_by_transfer_session_id'
    ) THEN
        ALTER TABLE bins 
        ADD COLUMN locked_by_transfer_session_id INTEGER,
        ADD FOREIGN KEY (locked_by_transfer_session_id) REFERENCES "12hours_transfer_sessions"(id);
        
        CREATE INDEX idx_bins_locked ON bins(locked_by_transfer_session_id);
        
        RAISE NOTICE 'Column locked_by_transfer_session_id added to bins table';
    ELSE
        RAISE NOTICE 'Column locked_by_transfer_session_id already exists in bins table';
    END IF;
END $$;

-- ============================================================================
-- Setup Complete
-- ============================================================================
-- All 4 new tables created:
-- 1. 12hours_transfer_sessions
-- 2. 12hours_transfer_bins_mapping
-- 3. 12hours_special_transfers
-- 4. 12hours_transfer_records
--
-- Existing bins table modified:
-- - Added locked_by_transfer_session_id column (if not already present)
--
-- Ready for backend implementation!
-- ============================================================================
