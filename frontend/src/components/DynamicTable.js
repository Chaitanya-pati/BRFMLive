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
 * DynamicTable – a reusable editable table for multi-row form data.
 *
 * Props:
 *   columns      Array of column definitions (see below)
 *   rows         Array of row data objects
 *   onAddRow     () => void
 *   onRemoveRow  (rowIndex) => void
 *   onCellChange (rowIndex, columnKey, newValue) => void
 *   addLabel     Label for the "+ Add Row" button  (default "+ Add Row")
 *   minRows      Minimum rows; hides remove button when row count <= minRows (default 1)
 *
 * Column definition:
 *   key          string  – field name in the row object
 *   label        string  – column header text
 *   type         'text' | 'number' | 'select'
 *   options      [{ label, value }]   (for type='select')
 *   placeholder  string
 *   flex         number  (default 1)
 *   minWidth     number  (default 80)
 *   disabled     boolean | (row) => boolean
 */
export default function DynamicTable({
  columns = [],
  rows = [],
  onAddRow,
  onRemoveRow,
  onCellChange,
  addLabel = '+ Add Row',
  minRows = 1,
}) {
  const isDisabled = (col, row) => {
    if (typeof col.disabled === 'function') return col.disabled(row);
    return !!col.disabled;
  };

  const renderCell = (col, row, rowIndex) => {
    const disabled = isDisabled(col, row);
    const cellFlex = col.flex || 1;
    const cellMinWidth = col.minWidth || 90;
    const value = row[col.key] != null ? String(row[col.key]) : '';

    return (
      <View
        key={col.key}
        style={[
          styles.cell,
          { flex: cellFlex, minWidth: cellMinWidth },
          disabled && styles.cellDisabled,
        ]}
      >
        {col.type === 'select' ? (
          <SelectDropdown
            options={col.options || []}
            value={disabled ? '' : value}
            onValueChange={(val) => !disabled && onCellChange(rowIndex, col.key, val)}
            placeholder={col.placeholder || 'Select'}
            compact
            disabled={disabled}
          />
        ) : (
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            value={disabled ? '' : value}
            onChangeText={(val) => !disabled && onCellChange(rowIndex, col.key, val)}
            placeholder={disabled ? '—' : (col.placeholder || '')}
            placeholderTextColor={disabled ? '#c0c0c0' : '#9ca3af'}
            keyboardType={col.type === 'number' ? 'decimal-pad' : 'default'}
            editable={!disabled}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.rowNumCell}>
              <Text style={styles.headerText}>#</Text>
            </View>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[styles.headerCell, { flex: col.flex || 1, minWidth: col.minWidth || 90 }]}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {col.label}
                </Text>
              </View>
            ))}
            <View style={styles.actionCell}>
              <Text style={styles.headerText}> </Text>
            </View>
          </View>

          {/* Data Rows */}
          {rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.dataRow, rowIndex % 2 === 1 && styles.dataRowAlt]}
            >
              <View style={styles.rowNumCell}>
                <Text style={styles.rowNumText}>{rowIndex + 1}</Text>
              </View>

              {columns.map((col) => renderCell(col, row, rowIndex))}

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

      {/* Add Row Button */}
      <TouchableOpacity style={styles.addRowBtn} onPress={onAddRow}>
        <Text style={styles.addRowBtnText}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  cellDisabled: {
    opacity: 0.35,
  },
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
