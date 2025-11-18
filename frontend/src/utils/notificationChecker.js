/**
 * Notification Checker Utility
 * Extracted notification logic for testability
 */

/**
 * Calculate which magnets need cleaning based on transfer sessions and cleaning records
 * @param {Array} transferSessions - Active transfer sessions
 * @param {Array} cleaningRecords - All cleaning records
 * @param {Array} routeMappings - Route magnet mappings (deprecated, kept for backward compatibility)
 * @param {Array} magnets - All magnets
 * @param {Array} godowns - All godowns  
 * @param {Array} bins - All bins
 * @returns {Array} Array of notifications with magnet cleaning requirements
 */
export function calculateMagnetNotifications(
  transferSessions,
  cleaningRecords,
  routeMappings,
  magnets,
  godowns,
  bins,
  currentTime = new Date()
) {
  const notifications = [];

  // Process each active transfer session
  transferSessions.forEach((session) => {
    // Match original logic: case-insensitive status check AND must not have stop_timestamp
    if (session.status?.toLowerCase() !== 'active' || session.stop_timestamp) return;

    const now = currentTime;
    const startTime = new Date(session.start_timestamp);
    const godown = godowns.find((g) => g.id === session.source_godown_id);
    const bin = bins.find((b) => b.id === session.destination_bin_id);

    // NEW: Process each magnet from session_magnets (from route configuration)
    const sessionMagnets = session.session_magnets || [];
    
    if (sessionMagnets.length > 0) {
      // NEW SYSTEM: Use route configuration magnets
      sessionMagnets.forEach((sessionMagnet) => {
        const elapsedSeconds = (now - startTime) / 1000;
        // Note: cleaning_interval_hours is actually stored in seconds despite the name
        const cleaningIntervalSeconds = sessionMagnet.cleaning_interval_hours;
        const intervalsPassed = Math.floor(elapsedSeconds / cleaningIntervalSeconds);

        // Skip if first interval hasn't passed yet
        if (intervalsPassed === 0) return;

        // Calculate current interval boundaries
        const currentIntervalNumber = intervalsPassed;
        const currentIntervalStart = new Date(
          startTime.getTime() + currentIntervalNumber * cleaningIntervalSeconds * 1000
        );

        // Check if THIS specific magnet was cleaned in current interval
        const cleanedInCurrentInterval = cleaningRecords.some((record) => {
          const recordTime = new Date(record.cleaning_timestamp);
          return (
            record.magnet_id === sessionMagnet.magnet_id &&
            record.transfer_session_id === session.id &&
            recordTime >= currentIntervalStart
          );
        });

        // If NOT cleaned in current interval, create notification
        if (!cleanedInCurrentInterval) {
          const magnet = sessionMagnet.magnet || magnets.find((m) => m.id === sessionMagnet.magnet_id);

          if (magnet && godown && bin) {
            notifications.push({
              id: `magnet-${sessionMagnet.magnet_id}-session-${session.id}`,
              type: 'MAGNET_CLEANING_REQUIRED',
              magnetId: sessionMagnet.magnet_id,
              magnetName: magnet.name,
              sessionId: session.id,
              sourceGodownName: godown.name,
              destinationBinNumber: bin.bin_number,
              intervalNumber: currentIntervalNumber,
              cleaningIntervalHours: sessionMagnet.cleaning_interval_hours,
              message: `MAGNET CLEANING REQUIRED: ${magnet.name} needs cleaning (Interval #${currentIntervalNumber})`,
            });
          }
        }
      });
    } else {
      // OLD SYSTEM: Backward compatibility with single magnet per session
      const elapsedSeconds = (now - startTime) / 1000;
      const cleaningIntervalSeconds = session.cleaning_interval_hours;
      const intervalsPassed = Math.floor(elapsedSeconds / cleaningIntervalSeconds);

      // Skip if first interval hasn't passed yet
      if (intervalsPassed === 0) return;

      // Calculate current interval boundaries
      const currentIntervalNumber = intervalsPassed;
      const currentIntervalStart = new Date(
        startTime.getTime() + currentIntervalNumber * cleaningIntervalSeconds * 1000
      );

      // Check if magnet was cleaned in current interval
      const cleanedInCurrentInterval = cleaningRecords.some((record) => {
        const recordTime = new Date(record.cleaning_timestamp);
        return (
          record.magnet_id === session.magnet_id &&
          record.transfer_session_id === session.id &&
          recordTime >= currentIntervalStart
        );
      });

      // If NOT cleaned in current interval, create notification
      if (!cleanedInCurrentInterval && session.magnet_id) {
        const magnet = magnets.find((m) => m.id === session.magnet_id);

        if (magnet && godown && bin) {
          notifications.push({
            id: `magnet-${session.magnet_id}-session-${session.id}`,
            type: 'MAGNET_CLEANING_REQUIRED',
            magnetId: session.magnet_id,
            magnetName: magnet.name,
            sessionId: session.id,
            sourceGodownName: godown.name,
            destinationBinNumber: bin.bin_number,
            intervalNumber: currentIntervalNumber,
            cleaningIntervalHours: session.cleaning_interval_hours,
            message: `MAGNET CLEANING REQUIRED: ${magnet.name} needs cleaning (Interval #${currentIntervalNumber})`,
          });
        }
      }
    }
  });

  return notifications;
}

/**
 * Check if notifications should be shown for a specific session
 * Useful for testing specific scenarios
 */
export function shouldShowNotificationForSession(
  session,
  cleaningRecords,
  currentTime = new Date()
) {
  // Match original logic: case-insensitive status check AND must not have stop_timestamp
  if (session.status?.toLowerCase() !== 'active' || session.stop_timestamp) return false;

  const startTime = new Date(session.start_timestamp);
  const elapsedSeconds = (currentTime - startTime) / 1000;
  const cleaningIntervalSeconds = session.cleaning_interval_hours;
  const intervalsPassed = Math.floor(elapsedSeconds / cleaningIntervalSeconds);

  // No notification before first interval
  if (intervalsPassed === 0) return false;

  // Calculate current interval start
  const currentIntervalNumber = intervalsPassed;
  const currentIntervalStart = new Date(
    startTime.getTime() + currentIntervalNumber * cleaningIntervalSeconds * 1000
  );

  // Check if cleaned in current interval
  const cleanedInCurrentInterval = cleaningRecords.some((record) => {
    const recordTime = new Date(record.cleaning_timestamp);
    return (
      record.magnet_id === session.magnet_id &&
      record.transfer_session_id === session.id &&
      recordTime >= currentIntervalStart
    );
  });

  return !cleanedInCurrentInterval;
}
