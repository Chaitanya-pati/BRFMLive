
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
    marginBottom: 14,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  rowField: {
    width: '100%',
  },
  required: {
    color: colors.error,
  },
});
