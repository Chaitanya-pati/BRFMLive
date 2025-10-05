import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import colors from '../theme/colors';

export default function DataTable({ columns, data, onEdit, onDelete, onAdd, searchable = true }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = searchable
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {searchable && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        )}
        {onAdd && (
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Text style={styles.addButtonText}>+ Add New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          <View style={styles.tableHeader}>
            {columns.map((col, index) => (
              <View key={index} style={[styles.headerCell, { width: col.width || 150 }]}>
                <Text style={styles.headerText}>{col.label}</Text>
              </View>
            ))}
            <View style={[styles.headerCell, { width: 150 }]}>
              <Text style={styles.headerText}>Actions</Text>
            </View>
          </View>

          <ScrollView style={styles.tableBody}>
            {filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No data available</Text>
              </View>
            ) : (
              filteredData.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.tableRow}>
                  {columns.map((col, colIndex) => (
                    <View key={colIndex} style={[styles.cell, { width: col.width || 150 }]}>
                      <Text style={styles.cellText} numberOfLines={2}>
                        {col.render ? col.render(row[col.field], row) : row[col.field] || '-'}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.cell, { width: 150 }]}>
                    <View style={styles.actionButtons}>
                      {onEdit && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => onEdit(row)}
                        >
                          <Text style={styles.actionButtonText}>👁️</Text>
                        </TouchableOpacity>
                      )}
                      {onEdit && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => onEdit(row)}
                        >
                          <Text style={styles.actionButtonText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      {onDelete && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => onDelete(row)}
                        >
                          <Text style={styles.actionButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    boxShadow: '0 1px 3px rgba(44, 62, 80, 0.08)',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    padding: 10,
    marginRight: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.onInfo,
    fontWeight: '600',
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.outlineVariant,
  },
  headerCell: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableBody: {
    maxHeight: 500,
    backgroundColor: colors.surface,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  cell: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
});