-- ============================================================================
-- 12-Hour Transfer Process - Complete Database Setup Script
-- ============================================================================
-- Copy and paste this entire script into your database
-- This will create all necessary tables and modifications for 12-hour transfers
-- ============================================================================

-- Table 1: 12hours_transfer_sessions
-- Main session record for each 12-hour transfer (Normal or Special type)
CREATE TABLE IF NOT EXISTS `12hours_transfer_sessions` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `production_order_id` INT NOT NULL,
    `transfer_type` ENUM('NORMAL', 'SPECIAL') NOT NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED') DEFAULT 'PLANNED',
    `session_sequence` INT NOT NULL DEFAULT 1,
    `start_timestamp` DATETIME,
    `end_timestamp` DATETIME,
    `created_by` INT,
    `updated_by` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`),
    INDEX `idx_production_order` (`production_order_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: 12hours_transfer_bins_mapping
-- Maps source (24-hour) and destination (12-hour) bins with their sequences
CREATE TABLE IF NOT EXISTS `12hours_transfer_bins_mapping` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `transfer_session_id` INT NOT NULL,
    `source_bin_id` INT NOT NULL,
    `destination_bin_id` INT NOT NULL,
    `source_sequence` INT NOT NULL,
    `destination_sequence` INT NOT NULL,
    `planned_quantity` FLOAT NOT NULL,
    `transferred_quantity` FLOAT DEFAULT 0,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED') DEFAULT 'PENDING',
    `is_locked` BOOLEAN DEFAULT FALSE,
    `start_timestamp` DATETIME,
    `end_timestamp` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`transfer_session_id`) REFERENCES `12hours_transfer_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`source_bin_id`) REFERENCES `bins`(`id`),
    FOREIGN KEY (`destination_bin_id`) REFERENCES `bins`(`id`),
    INDEX `idx_transfer_session` (`transfer_session_id`),
    INDEX `idx_source_bin` (`source_bin_id`),
    INDEX `idx_destination_bin` (`destination_bin_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_locked` (`is_locked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: 12hours_special_transfers
-- Special transfer mapping (one extra source -> one specific destination with manual quantity)
CREATE TABLE IF NOT EXISTS `12hours_special_transfers` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `transfer_session_id` INT NOT NULL,
    `special_source_bin_id` INT NOT NULL,
    `special_destination_bin_id` INT NOT NULL,
    `manual_quantity` FLOAT NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    `start_timestamp` DATETIME,
    `end_timestamp` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`transfer_session_id`) REFERENCES `12hours_transfer_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`special_source_bin_id`) REFERENCES `bins`(`id`),
    FOREIGN KEY (`special_destination_bin_id`) REFERENCES `bins`(`id`),
    INDEX `idx_transfer_session` (`transfer_session_id`),
    UNIQUE KEY `unique_session_special` (`transfer_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 4: 12hours_transfer_records
-- Individual transfer operation records (actual transfers that happened)
CREATE TABLE IF NOT EXISTS `12hours_transfer_records` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `transfer_session_id` INT NOT NULL,
    `bins_mapping_id` INT NOT NULL,
    `source_bin_id` INT NOT NULL,
    `destination_bin_id` INT NOT NULL,
    `quantity_planned` FLOAT NOT NULL,
    `quantity_transferred` FLOAT DEFAULT 0,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
    `water_added` FLOAT,
    `moisture_level` FLOAT,
    `transfer_start_time` DATETIME,
    `transfer_end_time` DATETIME,
    `duration_minutes` INT,
    `created_by` INT,
    `updated_by` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`transfer_session_id`) REFERENCES `12hours_transfer_sessions`(`id`),
    FOREIGN KEY (`bins_mapping_id`) REFERENCES `12hours_transfer_bins_mapping`(`id`),
    FOREIGN KEY (`source_bin_id`) REFERENCES `bins`(`id`),
    FOREIGN KEY (`destination_bin_id`) REFERENCES `bins`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`),
    INDEX `idx_transfer_session` (`transfer_session_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modification to existing bins table: Add locking for Special Transfer
-- Only run if locked_by_transfer_session_id column doesn't exist
SET @col_exists := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'bins' 
    AND COLUMN_NAME = 'locked_by_transfer_session_id'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE `bins` ADD COLUMN `locked_by_transfer_session_id` INT NULL, ADD FOREIGN KEY (`locked_by_transfer_session_id`) REFERENCES `12hours_transfer_sessions`(`id`)',
    'SELECT "Column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index on bins table for locking performance
CREATE INDEX IF NOT EXISTS `idx_bins_locked` ON `bins`(`locked_by_transfer_session_id`);

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
-- - Added locked_by_transfer_session_id column
--
-- Ready for backend implementation!
-- ============================================================================
