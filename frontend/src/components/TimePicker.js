import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, Dimensions,
} from 'react-native';
import colors from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const hours = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

const ITEM_HEIGHT = 48;          // matches pickerItem height + marginVertical
const COLUMN_HEIGHT = 200;       // visible scrollable area
const CENTER_OFFSET = (COLUMN_HEIGHT / 2) - (ITEM_HEIGHT / 2);

/**
 * Returns the current local time as "HH-MM-PERIOD" e.g. "09-37-AM".
 * Use this to seed default values for TimePicker fields.
 */
export function getCurrentTimeString() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${period}`;
}

function parseValue(value) {
  // Accept "HH-MM-PERIOD" and "HH:MM PERIOD"
  if (!value) return null;
  if (value.includes(':')) {
    const [time, period] = value.split(' ');
    const [h, m] = time.split(':');
    return {
      h: (h || '12').padStart(2, '0'),
      m: (m || '00').padStart(2, '0'),
      p: period || 'AM',
    };
  }
  const parts = value.split('-');
  return {
    h: (parts[0] || '12').padStart(2, '0'),
    m: (parts[1] || '00').padStart(2, '0'),
    p: parts[2] || 'AM',
  };
}

export default function TimePicker({ label, value, onValueChange, style, disabled }) {
  const [showModal, setShowModal] = useState(false);

  // If value is missing, fall back to current time so the input never shows empty.
  const effectiveValue = value || getCurrentTimeString();
  const parsed = parseValue(effectiveValue) || parseValue(getCurrentTimeString());
  const selectedHour = parsed.h;
  const selectedMinute = parsed.m;
  const selectedPeriod = parsed.p;

  // If parent never set a value, push the current-time default up so submissions are correct.
  useEffect(() => {
    if (!value && typeof onValueChange === 'function') {
      onValueChange(getCurrentTimeString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  // When the modal opens, scroll each column to the currently selected item
  useEffect(() => {
    if (!showModal) return;
    const hIdx = hours.indexOf(selectedHour);
    const mIdx = minutes.indexOf(selectedMinute);
    const t = setTimeout(() => {
      hourRef.current?.scrollTo({
        y: Math.max(0, hIdx * ITEM_HEIGHT - CENTER_OFFSET),
        animated: false,
      });
      minuteRef.current?.scrollTo({
        y: Math.max(0, mIdx * ITEM_HEIGHT - CENTER_OFFSET),
        animated: false,
      });
    }, 30);
    return () => clearTimeout(t);
  }, [showModal, selectedHour, selectedMinute]);

  const handleSelect = (h, m, p) => {
    onValueChange(`${h}-${m}-${p}`);
  };

  const setNow = () => {
    const now = parseValue(getCurrentTimeString());
    handleSelect(now.h, now.m, now.p);
  };

  const renderColumn = (data, selected, onSelect, type, columnRef, scrollable = true) => (
    <View style={styles.columnWrapper}>
      <Text style={styles.columnLabel}>{type}</Text>
      <View style={styles.columnFrame}>
        {/* Center highlight band so the user knows what is "selected" */}
        <View pointerEvents="none" style={styles.centerBand} />
        <ScrollView
          ref={columnRef}
          style={styles.pickerColumn}
          showsVerticalScrollIndicator={scrollable}
          nestedScrollEnabled
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
                disabled={disabled}
              >
                <Text style={[styles.pickerItemText, isSelected && styles.selectedItemText]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderPeriodColumn = (selected, onSelect) => (
    <View style={styles.columnWrapper}>
      <Text style={styles.columnLabel}>AM/PM</Text>
      <View style={styles.periodStack}>
        {periods.map((item) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              style={[styles.periodItem, isSelected && styles.selectedItem]}
              onPress={() => onSelect(item)}
              disabled={disabled}
            >
              <Text style={[styles.pickerItemText, isSelected && styles.selectedItemText]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, disabled && styles.disabledInput]}
        activeOpacity={0.7}
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        <Text style={[styles.inputText, disabled && styles.disabledInputText]}>
          {`${selectedHour}:${selectedMinute} ${selectedPeriod}`}
        </Text>
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
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Time</Text>
              <Text style={styles.modalSubtitle}>
                {`${selectedHour}:${selectedMinute} ${selectedPeriod}`}
              </Text>
              <TouchableOpacity style={styles.nowChip} onPress={setNow} activeOpacity={0.7}>
                <Text style={styles.nowChipText}>Set to Now</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {renderColumn(hours, selectedHour,
                (h) => handleSelect(h, selectedMinute, selectedPeriod),
                'HH', hourRef)}
              <View style={styles.separator}><Text style={styles.separatorText}>:</Text></View>
              {renderColumn(minutes, selectedMinute,
                (m) => handleSelect(selectedHour, m, selectedPeriod),
                'MM', minuteRef)}
              <View style={styles.separator} />
              {renderPeriodColumn(selectedPeriod,
                (p) => handleSelect(selectedHour, selectedMinute, p))}
            </View>

            <Text style={styles.helperText}>Tip: scroll each column or tap a value.</Text>

            <TouchableOpacity
              style={styles.doneButton}
              activeOpacity={0.85}
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
    width: 130,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  inputText: { fontSize: 14, fontWeight: '600', color: '#333' },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  disabledInputText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: Platform.OS === 'web' ? 380 : Math.min(SCREEN_WIDTH - 40, 340),
    maxHeight: 560,
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 4 },
  modalSubtitle: { fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 8 },
  nowChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  nowChipText: { color: colors.primary || '#4338CA', fontWeight: '700', fontSize: 12, letterSpacing: 0.4 },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: COLUMN_HEIGHT + 30,           // +30 for the column label row
    marginBottom: 6,
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  columnFrame: {
    width: '100%',
    height: COLUMN_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  centerBand: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: CENTER_OFFSET,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    opacity: 0.6,
  },
  pickerColumn: {
    width: '100%',
  },
  scrollContent: {
    paddingTop: CENTER_OFFSET,
    paddingBottom: CENTER_OFFSET,
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT - 4,
    marginVertical: 2,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 70,
  },
  periodStack: {
    width: '100%',
    height: COLUMN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  periodItem: {
    height: ITEM_HEIGHT - 4,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 70,
    backgroundColor: '#F1F5F9',
  },
  selectedItem: {
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  pickerItemText: { fontSize: 18, color: '#1F2937', fontWeight: '600' },
  selectedItemText: { color: '#fff', fontWeight: '800' },
  separator: {
    width: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
  },
  separatorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  doneButtonText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
});
