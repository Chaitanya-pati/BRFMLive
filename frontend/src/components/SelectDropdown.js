import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, isMobile && styles.labelMobile]}>{label}</Text>}
      <View style={[
        styles.pickerContainer, 
        isMobile && styles.pickerContainerMobile,
        error && styles.pickerContainerError, 
        !enabled && styles.pickerDisabled
      ]}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          enabled={enabled}
          style={[styles.picker, isMobile && styles.pickerMobile]}
          dropdownIconColor={enabled ? colors.textPrimary : colors.textSecondary}
          itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
        >
          <Picker.Item
            label={placeholder}
            value=""
            color={colors.textSecondary}
            style={styles.placeholderItem}
          />
          {options.map((option, index) => (
            <Picker.Item
              key={index}
              label={option.label}
              value={option.value}
              color={colors.textPrimary}
              style={styles.pickerItem}
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
    color: colors.textPrimary,
    marginBottom: 8,
  },
  labelMobile: {
    fontSize: 13,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    minHeight: Platform.select({ web: 48, default: 50 }),
  },
  pickerContainerMobile: {
    minHeight: Platform.select({ web: 44, default: 48 }),
  },
  pickerContainerError: {
    borderColor: colors.error,
  },
  pickerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  picker: {
    height: Platform.select({ 
      ios: 180, 
      android: 50,
      web: 48 
    }),
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 0,
  },
  pickerMobile: {
    fontSize: 13,
    height: Platform.select({ 
      ios: 180, 
      android: 48,
      web: 44 
    }),
    paddingHorizontal: Platform.OS === 'web' ? 10 : 0,
  },
  pickerItem: {
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  placeholderItem: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
});