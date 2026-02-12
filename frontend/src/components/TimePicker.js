import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

export default function TimePicker({ label, value, onValueChange, style }) {
  const [showModal, setShowModal] = useState(false);
  
  // value format: "HH-MM-PERIOD"
  const parts = (value || '12-00-AM').split('-');
  let selectedHour = parts[0] || '12';
  let selectedMinute = parts[1] || '00';
  let selectedPeriod = parts[2] || 'AM';

  if (value && value.includes(':')) {
    const [time, period] = value.split(' ');
    const [h, m] = time.split(':');
    selectedHour = h.padStart(2, '0');
    selectedMinute = m.padStart(2, '0');
    selectedPeriod = period || 'AM';
  }

  const handleSelect = (h, m, p) => {
    onValueChange(`${h}-${m}-${p}`);
  };

  const renderPicker = (data, selected, onSelect, type) => (
    <View style={styles.columnWrapper}>
      <Text style={styles.columnLabel}>{type}</Text>
      <ScrollView 
        style={styles.pickerColumn} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((item) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              style={[styles.pickerItem, isSelected && styles.selectedItem]}
              onPress={() => onSelect(item)}
            >
              <Text style={[styles.pickerItemText, isSelected && styles.selectedItemText]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity 
        style={styles.input} 
        activeOpacity={0.7}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.inputText}>{`${selectedHour}:${selectedMinute} ${selectedPeriod}`}</Text>
      </TouchableOpacity>

      <Modal 
        visible={showModal} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Time</Text>
              <Text style={styles.modalSubtitle}>{`${selectedHour}:${selectedMinute} ${selectedPeriod}`}</Text>
            </View>
            
            <View style={styles.pickerContainer}>
              {renderPicker(hours, selectedHour, (h) => handleSelect(h, selectedMinute, selectedPeriod), "HH")}
              <View style={styles.separator}><Text style={styles.separatorText}>:</Text></View>
              {renderPicker(minutes, selectedMinute, (m) => handleSelect(selectedHour, m, selectedPeriod), "MM")}
              <View style={styles.separator} />
              {renderPicker(periods, selectedPeriod, (p) => handleSelect(selectedHour, selectedMinute, p), "AM/PM")}
            </View>
            
            <TouchableOpacity 
              style={styles.doneButton} 
              activeOpacity={0.8}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.doneButtonText}>Confirm Time</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 }
    })
  },
  inputText: { fontSize: 13, fontWeight: '500', color: '#333' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24, 
    width: Platform.OS === 'web' ? 360 : Math.min(SCREEN_WIDTH - 40, 320),
    maxHeight: 500,
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 15
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 4 },
  modalSubtitle: { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  pickerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'flex-start',
    height: 220,
    marginBottom: 10
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BBB',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  pickerColumn: { 
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 20
  },
  pickerItem: { 
    paddingVertical: 12, 
    marginVertical: 2,
    alignItems: 'center',
    borderRadius: 12,
    width: '85%'
  },
  selectedItem: { 
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },
  pickerItemText: { fontSize: 18, color: '#444', fontWeight: '500' },
  selectedItemText: { color: '#fff', fontWeight: '700' },
  separator: {
    width: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 18
  },
  separatorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DDD'
  },
  doneButton: { 
    backgroundColor: colors.primary, 
    paddingVertical: 16, 
    borderRadius: 16, 
    marginTop: 10, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 }
    })
  },
  doneButtonText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
});
