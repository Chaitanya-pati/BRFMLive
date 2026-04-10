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
  disabled = false,
  compact = false,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isEnabled = enabled && !disabled;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {label && <Text style={[styles.label, isMobile && styles.labelMobile]}>{label}</Text>}
      <View style={[
        styles.pickerContainer, 
        isMobile && !compact && styles.pickerContainerMobile,
        compact && styles.pickerContainerCompact,
        error && styles.pickerContainerError, 
        !isEnabled && styles.pickerDisabled
      ]}>
        <Picker
          selectedValue={value || ""}
          onValueChange={(val) => {
            if (isEnabled) onValueChange(val);
          }}
          enabled={isEnabled}
          style={[styles.picker, isMobile && !compact && styles.pickerMobile, compact && styles.pickerCompact]}
          dropdownIconColor={isEnabled ? colors.textPrimary : colors.textSecondary}
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
  containerCompact: {
    marginBottom: 0,
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
  pickerContainerCompact: {
    minHeight: 36,
    borderRadius: 5,
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
  pickerCompact: {
    fontSize: 13,
    height: Platform.select({ ios: 120, android: 36, web: 36 }),
    paddingHorizontal: Platform.OS === 'web' ? 8 : 0,
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