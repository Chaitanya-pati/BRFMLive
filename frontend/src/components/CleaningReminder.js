
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal as RNModal } from 'react-native';
import colors from '../theme/colors';

const CleaningReminder = ({ visible, onClose, magnets, sourceName, destName, runningTime, cleaningInterval, totalMagnets }) => {
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
                {magnets.length} of {totalMagnets}
              </Text>
            </View>

            <View style={styles.magnetList}>
              <Text style={styles.label}>Magnets:</Text>
              <View style={styles.magnetTags}>
                {magnets.map((magnet, index) => (
                  <View key={index} style={styles.magnetTag}>
                    <Text style={styles.magnetTagText}>{magnet.name}</Text>
                  </View>
                ))}
              </View>
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
                Please clean the {magnets.length === 1 ? 'magnet' : 'magnets'} now!
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Acknowledge</Text>
          </TouchableOpacity>
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
  magnetTagText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
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
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    alignItems: 'center',
    margin: 20,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CleaningReminder;
