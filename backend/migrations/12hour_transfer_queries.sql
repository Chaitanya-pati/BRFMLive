-- 12-Hour Transfer Process - Validation & Query Statements
-- Use these queries in your backend API endpoints

-- ============================================================================
-- QUERY 1: Get Available Source Bins for an Order (24-hour bins with quantity)
-- ============================================================================
SELECT 
    b.id,
    b.bin_number,
    b.capacity,
    b.current_quantity,
    posb.quantity as order_planned_quantity,
    b.status,
    b.bin_type
FROM bins b
INNER JOIN production_order_source_bins posb ON b.id = posb.bin_id
WHERE posb.production_order_id = ?
  AND b.bin_type = '24_hour'
  AND b.current_quantity > 0
  AND b.status = 'Active'
ORDER BY b.id;

-- ============================================================================
-- QUERY 2: Get Available Destination Bins (12-hour bins, excluding locked ones)
-- ============================================================================
SELECT 
    b.id,
    b.bin_number,
    b.capacity,
    b.current_quantity,
    (b.capacity - b.current_quantity) as remaining_capacity,
    podb.quantity as order_planned_quantity,
    b.status,
    b.bin_type
FROM bins b
INNER JOIN production_order_destination_bins podb ON b.id = podb.bin_id
WHERE podb.production_order_id = ?
  AND b.bin_type = '12_hour'
  AND b.current_quantity < b.capacity
  AND b.status = 'Active'
  AND b.locked_by_transfer_session_id IS NULL
ORDER BY b.id;

-- ============================================================================
-- QUERY 3: Get Available Destination Bins for Special Transfer
-- (12-hour bins NOT used in Normal Transfer mapping of current session)
-- ============================================================================
SELECT 
    b.id,
    b.bin_number,
    b.capacity,
    b.current_quantity,
    (b.capacity - b.current_quantity) as remaining_capacity,
    podb.quantity as order_planned_quantity,
    b.status,
    b.bin_type
FROM bins b
INNER JOIN production_order_destination_bins podb ON b.id = podb.bin_id
WHERE podb.production_order_id = ?
  AND b.bin_type = '12_hour'
  AND b.current_quantity < b.capacity
  AND b.status = 'Active'
  AND NOT EXISTS (
    SELECT 1 FROM 12hours_transfer_bins_mapping tbm
    WHERE tbm.destination_bin_id = b.id 
      AND tbm.transfer_session_id = ?
  )
ORDER BY b.id;

-- ============================================================================
-- QUERY 4: Check if Destination Bin is Locked
-- ============================================================================
SELECT 
    id,
    bin_number,
    locked_by_transfer_session_id
FROM bins
WHERE id = ?
  AND locked_by_transfer_session_id IS NOT NULL;

-- ============================================================================
-- QUERY 5: Get Active Transfer Session for an Order
-- ============================================================================
SELECT 
    id,
    production_order_id,
    transfer_type,
    status,
    session_sequence,
    start_timestamp,
    end_timestamp
FROM 12hours_transfer_sessions
WHERE production_order_id = ?
  AND status IN ('PLANNED', 'IN_PROGRESS')
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- QUERY 6: Get Current Transfer Mapping (source -> destination with sequence)
-- ============================================================================
SELECT 
    tbm.id,
    tbm.transfer_session_id,
    tbm.source_bin_id,
    tbm.destination_bin_id,
    tbm.source_sequence,
    tbm.destination_sequence,
    tbm.planned_quantity,
    tbm.transferred_quantity,
    (tbm.planned_quantity - tbm.transferred_quantity) as remaining_quantity,
    tbm.status,
    tbm.is_locked,
    sb.bin_number as source_bin_number,
    db.bin_number as destination_bin_number,
    sb.current_quantity as source_current_qty,
    db.current_quantity as destination_current_qty,
    db.capacity as destination_capacity
FROM 12hours_transfer_bins_mapping tbm
INNER JOIN bins sb ON tbm.source_bin_id = sb.id
INNER JOIN bins db ON tbm.destination_bin_id = db.id
WHERE tbm.transfer_session_id = ?
ORDER BY tbm.source_sequence, tbm.destination_sequence;

-- ============================================================================
-- QUERY 7: Get Special Transfer Details
-- ============================================================================
SELECT 
    st.id,
    st.transfer_session_id,
    st.special_source_bin_id,
    st.special_destination_bin_id,
    st.manual_quantity,
    st.status,
    st.start_timestamp,
    st.end_timestamp,
    ssb.bin_number as special_source_bin_number,
    sdb.bin_number as special_destination_bin_number,
    ssb.current_quantity as special_source_current_qty,
    sdb.current_quantity as special_destination_current_qty,
    sdb.capacity as special_destination_capacity
FROM 12hours_special_transfers st
INNER JOIN bins ssb ON st.special_source_bin_id = ssb.id
INNER JOIN bins sdb ON st.special_destination_bin_id = sdb.id
WHERE st.transfer_session_id = ?;

-- ============================================================================
-- QUERY 8: Get All Transfer Records for a Session
-- ============================================================================
SELECT 
    tr.id,
    tr.transfer_session_id,
    tr.source_bin_id,
    tr.destination_bin_id,
    tr.quantity_planned,
    tr.quantity_transferred,
    tr.status,
    tr.water_added,
    tr.moisture_level,
    tr.transfer_start_time,
    tr.transfer_end_time,
    tr.duration_minutes,
    sb.bin_number as source_bin_number,
    db.bin_number as destination_bin_number
FROM 12hours_transfer_records tr
INNER JOIN bins sb ON tr.source_bin_id = sb.id
INNER JOIN bins db ON tr.destination_bin_id = db.id
WHERE tr.transfer_session_id = ?
ORDER BY tr.created_at DESC;

-- ============================================================================
-- QUERY 9: Lock Destination Bin for Special Transfer
-- ============================================================================
UPDATE bins
SET locked_by_transfer_session_id = ?
WHERE id = ? AND locked_by_transfer_session_id IS NULL;

-- ============================================================================
-- QUERY 10: Unlock Destination Bin (after emptying)
-- ============================================================================
UPDATE bins
SET locked_by_transfer_session_id = NULL
WHERE id = ?;

-- ============================================================================
-- QUERY 11: Update Bin Quantity after Transfer
-- ============================================================================
UPDATE bins
SET current_quantity = current_quantity - ?
WHERE id = ? AND current_quantity >= ?;

-- ============================================================================
-- QUERY 12: Check if Source Bin Still Has Quantity
-- ============================================================================
SELECT id, bin_number, current_quantity
FROM bins
WHERE id = ? AND current_quantity > 0;

-- ============================================================================
-- QUERY 13: Check Destination Bin Remaining Capacity
-- ============================================================================
SELECT 
    id,
    bin_number,
    capacity,
    current_quantity,
    (capacity - current_quantity) as remaining_capacity
FROM bins
WHERE id = ? AND current_quantity < capacity;

-- ============================================================================
-- QUERY 14: Get Transfer History for an Order
-- ============================================================================
SELECT 
    tts.id,
    tts.production_order_id,
    tts.transfer_type,
    tts.status,
    tts.session_sequence,
    tts.start_timestamp,
    tts.end_timestamp,
    (SELECT COUNT(*) FROM 12hours_transfer_bins_mapping WHERE transfer_session_id = tts.id) as bin_mapping_count,
    (SELECT SUM(transferred_quantity) FROM 12hours_transfer_records WHERE transfer_session_id = tts.id) as total_transferred
FROM 12hours_transfer_sessions tts
WHERE tts.production_order_id = ?
ORDER BY tts.created_at DESC;

-- ============================================================================
-- QUERY 15: Validate Transfer Can Start (Check all mappings are ready)
-- ============================================================================
SELECT 
    COUNT(*) as pending_mappings
FROM 12hours_transfer_bins_mapping
WHERE transfer_session_id = ?
  AND status = 'PENDING';

-- ============================================================================
-- QUERY 16: Get Next Source Bin to Transfer From (by sequence)
-- ============================================================================
SELECT 
    tbm.id,
    tbm.source_bin_id,
    tbm.destination_bin_id,
    tbm.source_sequence,
    tbm.destination_sequence,
    tbm.planned_quantity,
    tbm.transferred_quantity,
    (tbm.planned_quantity - tbm.transferred_quantity) as remaining_quantity,
    sb.bin_number as source_bin_number,
    sb.current_quantity as source_current_qty,
    db.bin_number as destination_bin_number,
    db.current_quantity as destination_current_qty,
    db.capacity as destination_capacity
FROM 12hours_transfer_bins_mapping tbm
INNER JOIN bins sb ON tbm.source_bin_id = sb.id
INNER JOIN bins db ON tbm.destination_bin_id = db.id
WHERE tbm.transfer_session_id = ?
  AND tbm.status IN ('PENDING', 'IN_PROGRESS')
ORDER BY tbm.source_sequence ASC, tbm.destination_sequence ASC
LIMIT 1;
