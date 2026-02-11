-- 12-Hour Transfer Process - Database Schema Creation
-- Run these queries in order

-- 1. Create 12hours_transfer_sessions table
CREATE TABLE IF NOT EXISTS 12hours_transfer_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    production_order_id INT NOT NULL,
    transfer_type ENUM('NORMAL', 'SPECIAL') NOT NULL,
    status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED') DEFAULT 'PLANNED',
    session_sequence INT NOT NULL DEFAULT 1,
    start_timestamp DATETIME,
    end_timestamp DATETIME,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_production_order (production_order_id),
    INDEX idx_status (status)
);

-- 2. Create 12hours_transfer_bins_mapping table
CREATE TABLE IF NOT EXISTS 12hours_transfer_bins_mapping (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_session_id INT NOT NULL,
    source_bin_id INT NOT NULL,
    destination_bin_id INT NOT NULL,
    source_sequence INT NOT NULL,
    destination_sequence INT NOT NULL,
    planned_quantity FLOAT NOT NULL,
    transferred_quantity FLOAT DEFAULT 0,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED') DEFAULT 'PENDING',
    is_locked BOOLEAN DEFAULT FALSE,
    start_timestamp DATETIME,
    end_timestamp DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES 12hours_transfer_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (destination_bin_id) REFERENCES bins(id),
    INDEX idx_transfer_session (transfer_session_id),
    INDEX idx_source_bin (source_bin_id),
    INDEX idx_destination_bin (destination_bin_id),
    INDEX idx_status (status),
    INDEX idx_locked (is_locked)
);

-- 3. Create 12hours_special_transfers table
CREATE TABLE IF NOT EXISTS 12hours_special_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_session_id INT NOT NULL,
    special_source_bin_id INT NOT NULL,
    special_destination_bin_id INT NOT NULL,
    manual_quantity FLOAT NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    start_timestamp DATETIME,
    end_timestamp DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES 12hours_transfer_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (special_source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (special_destination_bin_id) REFERENCES bins(id),
    INDEX idx_transfer_session (transfer_session_id),
    UNIQUE KEY unique_session_special (transfer_session_id)
);

-- 4. Create 12hours_transfer_records table
CREATE TABLE IF NOT EXISTS 12hours_transfer_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_session_id INT NOT NULL,
    bins_mapping_id INT NOT NULL,
    source_bin_id INT NOT NULL,
    destination_bin_id INT NOT NULL,
    quantity_planned FLOAT NOT NULL,
    quantity_transferred FLOAT DEFAULT 0,
    status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
    water_added FLOAT,
    moisture_level FLOAT,
    transfer_start_time DATETIME,
    transfer_end_time DATETIME,
    duration_minutes INT,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_session_id) REFERENCES 12hours_transfer_sessions(id),
    FOREIGN KEY (bins_mapping_id) REFERENCES 12hours_transfer_bins_mapping(id),
    FOREIGN KEY (source_bin_id) REFERENCES bins(id),
    FOREIGN KEY (destination_bin_id) REFERENCES bins(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_transfer_session (transfer_session_id),
    INDEX idx_status (status)
);

-- 5. Alter bins table to add locking column (remove locked_until)
ALTER TABLE bins 
ADD COLUMN locked_by_transfer_session_id INT NULL,
ADD FOREIGN KEY (locked_by_transfer_session_id) REFERENCES 12hours_transfer_sessions(id);

-- Create index for performance
CREATE INDEX idx_bins_locked ON bins(locked_by_transfer_session_id);
