/**
 * Unit Tests for Notification Checker
 * Tests the critical fix: notifications should stop after cleaning record creation
 */

import {
  calculateMagnetNotifications,
  shouldShowNotificationForSession,
} from './notificationChecker';

describe('Magnet Cleaning Notification System', () => {
  // Test data setup
  const createTestData = () => {
    const startTime = new Date('2025-10-29T12:00:00Z');
    
    const magnet = {
      id: 1,
      name: 'Test Magnet M1',
      status: 'Active',
    };

    const godown = {
      id: 1,
      name: 'Test Godown G1',
      capacity: 10000,
      type: 'Warehouse',
    };

    const bin = {
      id: 1,
      bin_number: 'BIN-001',
      capacity: 1000,
      status: 'Active',
    };

    const routeMapping = {
      id: 1,
      magnet_id: 1,
      source_godown_id: 1,
      destination_bin_id: 1,
      cleaning_interval_hours: 10, // 10 seconds for testing
    };

    const transferSession = {
      id: 1,
      magnet_id: 1,
      source_godown_id: 1,
      destination_bin_id: 1,
      start_timestamp: startTime.toISOString(),
      status: 'active',
      cleaning_interval_hours: 10, // 10 seconds
    };

    return {
      magnet,
      godown,
      bin,
      routeMapping,
      transferSession,
      startTime,
    };
  };

  describe('shouldShowNotificationForSession', () => {
    test('should NOT show notification before first interval', () => {
      const { transferSession, startTime } = createTestData();
      const cleaningRecords = [];
      
      // Check at 5 seconds (before 10-second interval)
      const currentTime = new Date(startTime.getTime() + 5 * 1000);
      
      const result = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        currentTime
      );

      expect(result).toBe(false);
    });

    test('should show notification after first interval passes (NO cleaning record)', () => {
      const { transferSession, startTime } = createTestData();
      const cleaningRecords = [];
      
      // Check at 12 seconds (after 10-second interval)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        currentTime
      );

      expect(result).toBe(true);
    });

    test('CRITICAL FIX: should NOT show notification after cleaning record created', () => {
      const { transferSession, startTime } = createTestData();
      
      // Simulate: First interval passed (at 12 seconds)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      // Notification would show at this point...
      const beforeCleaning = shouldShowNotificationForSession(
        transferSession,
        [],
        currentTime
      );
      expect(beforeCleaning).toBe(true);
      
      // User creates cleaning record at 12.5 seconds
      const cleaningRecords = [
        {
          id: 1,
          magnet_id: 1,
          transfer_session_id: 1,
          cleaning_timestamp: new Date(startTime.getTime() + 12.5 * 1000).toISOString(),
        },
      ];
      
      // Check at 15 seconds (still in first interval)
      const currentTimeAfterCleaning = new Date(startTime.getTime() + 15 * 1000);
      
      const afterCleaning = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        currentTimeAfterCleaning
      );

      // THE CRITICAL FIX: Notification should STOP
      expect(afterCleaning).toBe(false);
    });

    test('should show notification again in NEXT interval if not cleaned', () => {
      const { transferSession, startTime } = createTestData();
      
      // Cleaning record in first interval (at 12 seconds)
      const cleaningRecords = [
        {
          id: 1,
          magnet_id: 1,
          transfer_session_id: 1,
          cleaning_timestamp: new Date(startTime.getTime() + 12 * 1000).toISOString(),
        },
      ];
      
      // Check at 15 seconds (still interval #1)
      const firstIntervalTime = new Date(startTime.getTime() + 15 * 1000);
      const firstIntervalResult = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        firstIntervalTime
      );
      expect(firstIntervalResult).toBe(false); // No notification in interval #1
      
      // Check at 22 seconds (now in interval #2, 10-20 seconds = interval #1, 20-30 = interval #2)
      const secondIntervalTime = new Date(startTime.getTime() + 22 * 1000);
      const secondIntervalResult = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        secondIntervalTime
      );
      
      // Notification should re-appear for new interval
      expect(secondIntervalResult).toBe(true);
    });

    test('should NOT show notification for inactive session', () => {
      const { transferSession, startTime } = createTestData();
      const inactiveSession = { ...transferSession, status: 'completed' };
      const cleaningRecords = [];
      
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        inactiveSession,
        cleaningRecords,
        currentTime
      );

      expect(result).toBe(false);
    });

    test('should handle CAPITALIZED status (Active instead of active)', () => {
      const { transferSession, startTime } = createTestData();
      const capitalizedSession = { ...transferSession, status: 'Active' }; // Capitalized
      const cleaningRecords = [];
      
      // Check at 12 seconds (after first interval)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        capitalizedSession,
        cleaningRecords,
        currentTime
      );

      // Should work with capitalized status
      expect(result).toBe(true);
    });

    test('should NOT show notification for stopped session (has stop_timestamp)', () => {
      const { transferSession, startTime } = createTestData();
      const stoppedSession = {
        ...transferSession,
        stop_timestamp: new Date(startTime.getTime() + 8 * 1000).toISOString(),
      };
      const cleaningRecords = [];
      
      // Check at 12 seconds (would normally show notification)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        stoppedSession,
        cleaningRecords,
        currentTime
      );

      // Should NOT show because session is stopped
      expect(result).toBe(false);
    });
  });

  describe('calculateMagnetNotifications', () => {
    test('should return empty array before first interval', () => {
      const { transferSession, magnet, godown, bin, routeMapping, startTime } = createTestData();
      
      // Current time: 5 seconds after start
      const currentTime = new Date(startTime.getTime() + 5 * 1000);

      const notifications = calculateMagnetNotifications(
        [transferSession],
        [],
        [routeMapping],
        [magnet],
        [godown],
        [bin],
        currentTime
      );

      expect(notifications).toEqual([]);
    });

    test('should return notification after first interval with NO cleaning', () => {
      const { transferSession, magnet, godown, bin, routeMapping, startTime } = createTestData();
      
      // Current time: 12 seconds after start (first interval passed)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);

      const notifications = calculateMagnetNotifications(
        [transferSession],
        [],
        [routeMapping],
        [magnet],
        [godown],
        [bin],
        currentTime
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'MAGNET_CLEANING_REQUIRED',
        magnetId: 1,
        magnetName: 'Test Magnet M1',
        sessionId: 1,
        sourceGodownName: 'Test Godown G1',
        destinationBinNumber: 'BIN-001',
        intervalNumber: 1,
      });
      expect(notifications[0].message).toContain('MAGNET CLEANING REQUIRED');
    });

    test('CRITICAL FIX: should return EMPTY array after cleaning record created', () => {
      const { transferSession, magnet, godown, bin, routeMapping, startTime } = createTestData();
      
      // Cleaning record created at 12 seconds
      const cleaningRecords = [
        {
          id: 1,
          magnet_id: 1,
          transfer_session_id: 1,
          cleaning_timestamp: new Date(startTime.getTime() + 12 * 1000).toISOString(),
        },
      ];
      
      // Current time: 15 seconds (after cleaning)
      const currentTime = new Date(startTime.getTime() + 15 * 1000);

      const notifications = calculateMagnetNotifications(
        [transferSession],
        cleaningRecords,
        [routeMapping],
        [magnet],
        [godown],
        [bin],
        currentTime
      );

      // THE CRITICAL FIX: No notifications after cleaning
      expect(notifications).toEqual([]);
    });

    test('should handle multiple transfer sessions independently', () => {
      const data1 = createTestData();
      const data2 = {
        ...createTestData(),
        magnet: { id: 2, name: 'Magnet M2', status: 'Active' },
        transferSession: {
          id: 2,
          magnet_id: 2,
          source_godown_id: 1,
          destination_bin_id: 1,
          start_timestamp: new Date(data1.startTime.getTime() + 5 * 1000).toISOString(),
          status: 'active',
          cleaning_interval_hours: 10,
        },
      };
      
      // Current time: 12 seconds after first session started
      const currentTime = new Date(data1.startTime.getTime() + 12 * 1000);

      const notifications = calculateMagnetNotifications(
        [data1.transferSession, data2.transferSession],
        [],
        [data1.routeMapping],
        [data1.magnet, data2.magnet],
        [data1.godown],
        [data1.bin],
        currentTime
      );

      // Only session 1 should have notification (session 2 hasn't passed first interval)
      expect(notifications).toHaveLength(1);
      expect(notifications[0].sessionId).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle cleaning record exactly at interval boundary', () => {
      const { transferSession, startTime } = createTestData();
      
      // Cleaning exactly when first interval completes (at 10 seconds)
      const cleaningRecords = [
        {
          id: 1,
          magnet_id: 1,
          transfer_session_id: 1,
          cleaning_timestamp: new Date(startTime.getTime() + 10 * 1000).toISOString(),
        },
      ];
      
      // Check at 12 seconds
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        currentTime
      );

      // Should NOT show because cleaning timestamp >= interval start
      expect(result).toBe(false);
    });

    test('should handle cleaning record just before interval boundary', () => {
      const { transferSession, startTime } = createTestData();
      
      // Cleaning at 9.9 seconds (before first interval completes at 10 seconds)
      const cleaningRecords = [
        {
          id: 1,
          magnet_id: 1,
          transfer_session_id: 1,
          cleaning_timestamp: new Date(startTime.getTime() + 9.9 * 1000).toISOString(),
        },
      ];
      
      // Check at 12 seconds (in interval #1 which starts at 10 seconds)
      const currentTime = new Date(startTime.getTime() + 12 * 1000);
      
      const result = shouldShowNotificationForSession(
        transferSession,
        cleaningRecords,
        currentTime
      );

      // SHOULD show because cleaning was before current interval started
      expect(result).toBe(true);
    });
  });
});
