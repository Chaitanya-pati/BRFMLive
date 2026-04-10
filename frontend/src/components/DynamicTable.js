import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import SelectDropdown from './SelectDropdown';
import colors from '../theme/colors';

/**
 * DynamicTable
 * ─────────────────────────────────────────────────────────────────────────────
 * A purely structural, fully generic editable table.
 * All cell rendering is delegated to the caller via `column.render`.
 *
 * Props
 * ─────
 *   columns      [{ key, label, flex?, minWidth?, render }]
 *   rows         array of row data objects
 *   onAddRow     () => void
 *   onRemoveRow  (rowIndex) => void
 *   onCellChange (rowIndex, columnKey, newValue) => void
 *   addLabel     string  (default "+ Add Row")
 *   minRows      number  (default 1) — hides remove button when rows.length <= minRows
 *
 * Column definition
 * ─────────────────
 *   key       string  — field name in the row object
 *   label     string  — header label
 *   flex      number  (default 1)
 *   minWidth  number  (default 90)
 *   render    (value, row, rowIndex, onChange) => ReactNode
 *             where onChange = (newValue) => onCellChange(rowIndex, key, newValue)
 *
 * Cell factory helpers (exported)
 * ────────────────────────────────
 *   createTextCell({ placeholder? })
 *   createNumberCell({ placeholder? })
 *   createSelectCell({ options, placeholder?, disabled? })
 *     options  — [{ label, value }] or (row) => [{ label, value }]
 *     disabled — boolean or (row) => boolean
 */

// ─── Cell factory helpers ────────────────────────────────────────────────────

export function createTextCell({ placeholder = '', disabled } = {}) {
  return (value, row, _idx, onChange) => {
    const isDisabled = typeof disabled === 'function' ? disabled(row) : !!disabled;
    return (
      <TextInput
        style={[cellStyles.input, isDisabled && cellStyles.inputDisabled]}
        value={isDisabled ? '' : (value != null ? String(value) : '')}
        onChangeText={(val) => { if (!isDisabled) onChange(val); }}
        placeholder={isDisabled ? '—' : placeholder}
        placeholderTextColor={isDisabled ? '#d1d5db' : '#9ca3af'}
        editable={!isDisabled}
      />
    );
  };
}

export function createNumberCell({ placeholder = '', disabled } = {}) {
  return (value, row, _idx, onChange) => {
    const isDisabled = typeof disabled === 'function' ? disabled(row) : !!disabled;
    return (
      <TextInput
        style={[cellStyles.input, isDisabled && cellStyles.inputDisabled]}
        value={isDisabled ? '' : (value != null ? String(value) : '')}
        onChangeText={(val) => { if (!isDisabled) onChange(val); }}
        placeholder={isDisabled ? '—' : placeholder}
        placeholderTextColor={isDisabled ? '#d1d5db' : '#9ca3af'}
        keyboardType="decimal-pad"
        editable={!isDisabled}
      />
    );
  };
}

export function createSelectCell({ options = [], placeholder = 'Select', disabled } = {}) {
  return (value, row, _idx, onChange) => {
    const resolvedOptions = typeof options === 'function' ? options(row) : options;
    const isDisabled = typeof disabled === 'function' ? disabled(row) : !!disabled;
    return (
      <SelectDropdown
        options={resolvedOptions}
        value={isDisabled ? '' : (value != null ? String(value) : '')}
        onValueChange={(val) => { if (!isDisabled) onChange(val); }}
        placeholder={placeholder}
        compact
        disabled={isDisabled}
      />
    );
  };
}

// ─── DynamicTable component ──────────────────────────────────────────────────

export default function DynamicTable({
  columns = [],
  rows = [],
  onAddRow,
  onRemoveRow,
  onCellChange,
  addLabel = '+ Add Row',
  minRows = 1,
}) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>

          {/* ── Header row ── */}
          <View style={styles.headerRow}>
            <View style={styles.rowNumCell}>
              <Text style={styles.headerText}>#</Text>
            </View>

            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  { flex: col.flex ?? 1, minWidth: col.minWidth ?? 90 },
                ]}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {col.label}
                </Text>
              </View>
            ))}

            <View style={styles.actionCell} />
          </View>

          {/* ── Data rows ── */}
          {rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.dataRow, rowIndex % 2 === 1 && styles.dataRowAlt]}
            >
              <View style={styles.rowNumCell}>
                <Text style={styles.rowNumText}>{rowIndex + 1}</Text>
              </View>

              {columns.map((col) => {
                const value = row[col.key];
                const onChange = (newVal) => onCellChange(rowIndex, col.key, newVal);
                return (
                  <View
                    key={col.key}
                    style={[
                      styles.cell,
                      { flex: col.flex ?? 1, minWidth: col.minWidth ?? 90 },
                    ]}
                  >
                    {col.render(value, row, rowIndex, onChange)}
                  </View>
                );
              })}

              <View style={styles.actionCell}>
                {rows.length > minRows ? (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => onRemoveRow(rowIndex)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.removeBtn} />
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Add row button ── */}
      <TouchableOpacity style={styles.addRowBtn} onPress={onAddRow}>
        <Text style={styles.addRowBtnText}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Shared input styles (used by helpers) ───────────────────────────────────

export const cellStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#111827',
    height: 36,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    color: '#9ca3af',
  },
});

// ─── Table structure styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: 8,
  },
  table: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerCell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  dataRowAlt: {
    backgroundColor: '#fafafa',
  },
  rowNumCell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  rowNumText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cell: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  actionCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
  },
  addRowBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#f0f4ff',
  },
  addRowBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
