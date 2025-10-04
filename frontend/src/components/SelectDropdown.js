import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import colors from '../theme/colors';

export default function SelectDropdown({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select an option',
  error,
  enabled = true,
}) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.pickerContainer, error && styles.pickerContainerError]}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={enabled}
          style={styles.picker}
          dropdownIconColor={colors.onSurface}
        >
          <Picker.Item
            label={placeholder}
            value=""
            color={colors.placeholder}
          />
          {options.map((option, index) => (
            <Picker.Item
              key={index}
              label={option.label}
              value={option.value}
              color={colors.onSurface}
            />
          ))}
        </Picker>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerContainerError: {
    borderColor: colors.error,
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 48,
    color: colors.onSurface,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});
