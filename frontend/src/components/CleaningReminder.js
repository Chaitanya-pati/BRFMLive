
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal as RNModal } from 'react-native';
import colors from '../theme/colors';

const CleaningReminder = ({ 
  visible = false, 
  onClose = () => {}, 
  magnets = [], 
  sourceName = 'N/A', 
  destName = 'N/A', 
  runningTime = '0h 0m 0s', 
  cleaningInterval = '0m 0s', 
  totalMagnets = 0,
  onAddCleaningRecord = () => {} 
}) => {
  const [selectedMagnet, setSelectedMagnet] = React.useState(null);

  React.useEffect(() => {
    if (magnets && magnets.length > 0 && !selectedMagnet) {
      setSelectedMagnet(magnets[0]);
    }
  }, [magnets]);

  if (!visible) {
    return null;
  }

  const hasMagnets = magnets && Array.isArray(magnets) && magnets.length > 0;

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.bellIconContainer}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
            <Text style={styles.title}>Magnet Cleaning Required</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Transfer Route:</Text>
              <Text style={styles.value}>{sourceName} → Bin {destName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Uncleaned Magnets:</Text>
              <Text style={styles.valueHighlight}>
                {hasMagnets ? magnets.length : 0} of {totalMagnets}
              </Text>
            </View>

            <View style={styles.magnetList}>
              <Text style={styles.label}>Magnets Needing Cleaning:</Text>
              {hasMagnets ? (
                <View style={styles.magnetTags}>
                  {magnets.map((magnet, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.magnetTag,
                        selectedMagnet?.id === magnet.id && styles.magnetTagSelected
                      ]}
                      onPress={() => setSelectedMagnet(magnet)}
                    >
                      <Text style={[
                        styles.magnetTagText,
                        selectedMagnet?.id === magnet.id && styles.magnetTagTextSelected
                      ]}>
                        {magnet.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>Loading magnet data...</Text>
              )}
              {hasMagnets && magnets.length > 1 && (
                <Text style={styles.hintText}>Tap a magnet to select it for cleaning record</Text>
              )}
            </View>

            <View style={styles.timeInfo}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Running Time:</Text>
                <Text style={styles.timeValue}>{runningTime}</Text>
              </View>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Cleaning Interval:</Text>
                <Text style={styles.timeValue}>{cleaningInterval}</Text>
              </View>
            </View>

            <View style={styles.urgentBox}>
              <Text style={styles.urgentIcon}>⚠️</Text>
              <Text style={styles.urgentText}>
                {hasMagnets 
                  ? `Please clean the ${magnets.length === 1 ? 'magnet' : 'magnets'} now!`
                  : 'Please wait for magnet data to load...'}
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.addRecordButton,
                !selectedMagnet && styles.buttonDisabled
              ]} 
              onPress={() => {
                if (onAddCleaningRecord && typeof onAddCleaningRecord === 'function' && selectedMagnet) {
                  onAddCleaningRecord(selectedMagnet);
                }
                onClose();
                setSelectedMagnet(null);
              }}
              disabled={!selectedMagnet}
            >
              <Text style={styles.buttonText}>
                {selectedMagnet ? `Add Record for ${selectedMagnet.name}` : 'Add Cleaning Record'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.acknowledgeButton]} 
              onPress={() => {
                onClose();
                setSelectedMagnet(null);
              }}
            >
              <Text style={styles.buttonText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f59e0b',
    padding: 20,
    alignItems: 'center',
  },
  bellIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bellIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  valueHighlight: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
  },
  magnetList: {
    marginTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  magnetTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  magnetTag: {
    backgroundColor: '#dbeafe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  magnetTagSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  magnetTagText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  magnetTagTextSelected: {
    color: '#ffffff',
  },
  hintText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 6,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  timeItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '700',
  },
  urgentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  urgentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  urgentText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    margin: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  addRecordButton: {
    backgroundColor: '#10b981',
  },
  acknowledgeButton: {
    backgroundColor: '#6b7280',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default CleaningReminder;
