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
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      {onDelete && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => onDelete(row)}
                        >
                          <Text style={styles.actionButtonText}>Delete</Text>
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
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    fontSize: 14,
    backgroundColor: colors.inputBackground,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
  },
  headerCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.onSecondary,
  },
  tableBody: {
    maxHeight: 500,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: colors.onSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.placeholder,
    fontSize: 16,
  },
});
