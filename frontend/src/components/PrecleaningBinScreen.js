// Check which magnets have been cleaned recently (within the current interval period)
            const uncleanedMagnets = [];
            const cleanedMagnets = [];

            routeMagnetsOnThisRoute.forEach(mapping => {
              const magnet = magnets.find(m => m.id === mapping.magnet_id);
              if (!magnet) return;

              // Find the most recent cleaning record for this magnet
              const recentCleaningRecord = cleaningRecords
                .filter(record => record.magnet_id === mapping.magnet_id)
                .sort((a, b) => new Date(b.cleaning_timestamp) - new Date(a.cleaning_timestamp))[0];

              // Check if the magnet was cleaned after the last alert interval
              const lastAlertInterval = lastAlertTimes[session.id] || 0;
              const lastAlertTime = new Date(startTime.getTime() + (lastAlertInterval * cleaningIntervalSeconds * 1000));

              if (recentCleaningRecord) {
                const cleaningTime = new Date(recentCleaningRecord.cleaning_timestamp);

                // Magnet is considered cleaned if it was cleaned after the last alert
                if (cleaningTime >= lastAlertTime) {
                  cleanedMagnets.push(magnet);
                } else {
                  uncleanedMagnets.push(magnet);
                }
              } else {
                uncleanedMagnets.push(magnet);
              }
            });

// Only show notification if there are uncleaned magnets
            if (uncleanedMagnets.length > 0) {
              const timeElapsed = (intervalsPassed * cleaningIntervalSeconds);
              const minutes = Math.floor(timeElapsed / 60);
              const seconds = Math.floor(timeElapsed % 60);
              const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

              // Format cleaning interval
              const intervalMinutes = Math.floor(cleaningIntervalSeconds / 60);
              const intervalSeconds = cleaningIntervalSeconds % 60;
              const intervalString = intervalMinutes > 0 ? `${intervalMinutes}m ${intervalSeconds}s` : `${intervalSeconds}s`;

              const totalMagnetsOnRoute = routeMagnetsOnThisRoute.length;
              const magnetNames = uncleanedMagnets.map(m => m.name).join(', ');

              const alertMessage = `🔔 Magnet Cleaning Required!\n\nTransfer from ${sourceName} to Bin ${destName}\nUncleaned Magnets: ${uncleanedMagnets.length} of ${totalMagnetsOnRoute}\nMagnets: ${magnetNames}\nRunning time: ${timeString}\nCleaning Interval: ${intervalString}\n\nPlease clean the ${uncleanedMagnets.length === 1 ? 'magnet' : 'magnets'} now!`;

              // Play notification sound
              if (Platform.OS === 'web') {
                try {
                  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+l9r0yHosBSJ1xe/glEILElyx6OyrWBUIRJze8L9qIAUuhM/z1YU1Bhxqvu7mnEoODlOq5O+zYBoHPJXY88p8LgUecL/v45dGChFcsujuq1oVB0Kb3fLBaiEELIHN89OENAM');
                  audio.play().catch(() => {});
                } catch (e) {
                  console.error('Audio play error:', e);
                }

                // Show custom notification with bell icon
                showCleaningNotification(alertMessage, session.id, intervalString, uncleanedMagnets.length, totalMagnetsOnRoute);
              } else {
                Alert.alert('🔔 Cleaning Reminder', alertMessage, [
                  { text: 'OK', style: 'default' }
                ]);
              }

              setLastAlertTimes(prev => ({
                ...prev,
                [session.id]: intervalsPassed
              }));
            } else {
              // All magnets are cleaned, remove notification if exists and reset alert counter
              if (Platform.OS === 'web') {
                const notification = document.getElementById(`cleaning-notification-${session.id}`);
                if (notification) {
                  notification.remove();
                }
              }

              // Reset the alert time so it starts counting for the next interval
              setLastAlertTimes(prev => ({
                ...prev,
                [session.id]: intervalsPassed
              }));
            }