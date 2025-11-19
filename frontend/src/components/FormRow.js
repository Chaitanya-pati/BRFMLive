
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import colors from '../theme/colors';

export default function FormRow({ label, children, required = false }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.rowLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.rowField}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formRow: {
    flexDirection: Platform.select({ 
      web: 'row', 
      default: 'column' 
    }),
    marginBottom: 16,
    alignItems: Platform.select({ 
      web: 'flex-start', 
      default: 'stretch' 
    }),
    gap: Platform.select({ web: 16, default: 6 }),
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    width: Platform.select({ 
      web: '35%', 
      default: '100%' 
    }),
    minWidth: Platform.select({ web: 200, default: 'auto' }),
    paddingTop: Platform.select({ web: 12, default: 0 }),
  },
  rowField: {
    flex: 1,
    width: Platform.select({ 
      web: '65%', 
      default: '100%' 
    }),
  },
  required: {
    color: colors.error,
  },
});
