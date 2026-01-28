import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal as RNModal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../theme/colors';

export default function DatePicker({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder = 'Select date',
  error,
  minimumDate,
  maximumDate,
}) {
  const [show, setShow] = useState(false);

  const handleChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formatDateForWeb = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    if (mode === 'time') {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (mode === 'datetime') {
      return `${year}-${month}-${day}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date) => {
    if (!date) return placeholder;
    const d = new Date(date);
    if (isNaN(d.getTime())) return placeholder;
    
    if (mode === 'time') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (mode === 'datetime') {
      return d.toLocaleString([], { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toLocaleDateString();
  };

  const renderPicker = () => (
    <DateTimePicker
      value={value instanceof Date ? value : new Date()}
      mode={mode}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
    />
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      {Platform.OS === 'web' ? (
        <input
          type={mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date'}
          value={formatDateForWeb(value)}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              onChange(new Date(val));
            }
          }}
          style={{
            backgroundColor: colors.inputBackground || '#fff',
            border: `1px solid ${error ? (colors.error || '#f44336') : (colors.border || '#ccc')}`,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '16px',
            color: colors.onSurface || '#333',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}
        />
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, error && styles.buttonError]}
            onPress={() => setShow(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, !value && styles.placeholderText]}>
              {formatDate(value)}
            </Text>
            <Text style={styles.icon}>📅</Text>
          </TouchableOpacity>

          {show && Platform.OS === 'ios' && (
            <RNModal transparent visible={show} animationType="slide">
              <View style={styles.iosModalContainer}>
                <View style={styles.iosModalContent}>
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={() => setShow(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                  {renderPicker()}
                </View>
              </View>
            </RNModal>
          )}

          {show && Platform.OS !== 'ios' && renderPicker()}
        </>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface || '#333',
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.inputBackground || '#fff',
    borderWidth: 1,
    borderColor: colors.border || '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonError: {
    borderColor: colors.error || '#f44336',
  },
  buttonText: {
    fontSize: 16,
    color: colors.onSurface || '#333',
  },
  placeholderText: {
    color: colors.placeholder || '#999',
  },
  icon: {
    fontSize: 20,
  },
  errorText: {
    color: colors.error || '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  iosModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iosModalContent: {
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  doneButton: {
    padding: 16,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  doneButtonText: {
    color: colors.primary || '#2196F3',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
