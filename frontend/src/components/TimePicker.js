import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import colors from '../theme/colors';

const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

export default function TimePicker({ label, value, onValueChange }) {
  const [showModal, setShowModal] = useState(false);
  
  // value format: "HH-MM-PERIOD"
  const [selectedHour, selectedMinute, selectedPeriod] = (value || '12-00-AM').split('-');

  const handleSelect = (h, m, p) => {
    onValueChange(`${h}-${m}-${p}`);
  };

  const renderPicker = (data, selected, onSelect) => (
    <ScrollView style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
      {data.map((item) => (
        <TouchableOpacity
          key={item}
          style={[styles.pickerItem, selected === item && styles.selectedItem]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.pickerItemText, selected === item && styles.selectedItemText]}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.input} onPress={() => setShowModal(true)}>
        <Text style={styles.inputText}>{`${selectedHour}:${selectedMinute} ${selectedPeriod}`}</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <View style={styles.pickerContainer}>
              {renderPicker(hours, selectedHour, (h) => handleSelect(h, selectedMinute, selectedPeriod))}
              {renderPicker(minutes, selectedMinute, (m) => handleSelect(selectedHour, m, selectedPeriod))}
              {renderPicker(periods, selectedPeriod, (p) => handleSelect(selectedHour, selectedMinute, p))}
            </View>
            <TouchableOpacity style={styles.doneButton} onPress={() => setShowModal(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.onSurface, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputText: { fontSize: 16, color: colors.onSurface },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  pickerContainer: { flexDirection: 'row', justifyContent: 'space-around', height: 200 },
  pickerColumn: { flex: 1 },
  pickerItem: { paddingVertical: 10, alignItems: 'center' },
  selectedItem: { backgroundColor: colors.primary + '20', borderRadius: 8 },
  pickerItemText: { fontSize: 18, color: colors.text.secondary },
  selectedItemText: { color: colors.primary, fontWeight: 'bold' },
  doneButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  doneButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
