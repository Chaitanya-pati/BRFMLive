import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, useWindowDimensions, Platform } from 'react-native';
import colors from '../theme/colors';

export default function DataTable({ columns, data, onEdit, onDelete, onAdd, onCustomAction, customActionLabel, searchable = true }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const filteredData = searchable
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const renderMobileCard = (row, rowIndex) => (
    <View key={rowIndex} style={styles.mobileCard}>
      {columns.slice(0, 4).map((col, colIndex) => (
        <View key={colIndex} style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>{col.label}:</Text>
          <Text style={styles.mobileCardValue} numberOfLines={2}>
            {col.render ? col.render(row[col.field], row) : row[col.field] || '-'}
          </Text>
        </View>
      ))}
      <View style={styles.mobileCardActions}>
        {onEdit && (
          <TouchableOpacity
            style={styles.mobileActionButton}
            onPress={() => onEdit(row)}
          >
            <Text style={styles.mobileActionButtonText}>View/Edit</Text>
          </TouchableOpacity>
        )}
        {onCustomAction && (
          <TouchableOpacity
            style={[styles.mobileActionButton, styles.mobileCustomButton]}
            onPress={() => onCustomAction(row)}
          >
            <Text style={styles.mobileActionButtonText}>{customActionLabel || 'Action'}</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.mobileActionButton, styles.mobileDeleteButton]}
            onPress={() => onDelete(row)}
          >
            <Text style={styles.mobileActionButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDesktopTable = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View>
        <View style={styles.tableHeader}>
          {columns.map((col, index) => (
            <View key={index} style={[styles.headerCell, { width: col.width || 150 }]}>
              <Text style={styles.headerText}>{col.label}</Text>
            </View>
          ))}
          <View style={[styles.headerCell, { width: onCustomAction ? 200 : 150 }]}>
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
                <View style={[styles.cell, { width: onCustomAction ? 200 : 150 }]}>
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
                    {onCustomAction && (
                      <TouchableOpacity
                        style={styles.customActionButton}
                        onPress={() => onCustomAction(row)}
                      >
                        <Text style={styles.customActionButtonText}>{customActionLabel || 'Action'}</Text>
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
  );

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
        {searchable && (
          <TextInput
            style={[styles.searchInput, isMobile && styles.searchInputMobile]}
            placeholder="Search..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        )}
        {onAdd && (
          <TouchableOpacity style={[styles.addButton, isMobile && styles.addButtonMobile]} onPress={onAdd}>
            <Text style={styles.addButtonText}>{isMobile ? '+ Add' : '+ Add New'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isMobile ? (
        <ScrollView style={styles.mobileCardsContainer}>
          {filteredData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          ) : (
            filteredData.map((row, rowIndex) => renderMobileCard(row, rowIndex))
          )}
        </ScrollView>
      ) : (
        renderDesktopTable()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0,
    backgroundColor: colors.surface,
    gap: 12,
  },
  toolbarMobile: {
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  searchInputMobile: {
    fontSize: 14,
    padding: 8,
  },
  addButton: {
    backgroundColor: colors.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: colors.onInfo,
    fontWeight: '600',
    fontSize: 14,
  },
  mobileCardsContainer: {
    flex: 1,
    padding: 12,
  },
  mobileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  mobileCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  mobileCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    minWidth: 100,
  },
  mobileCardValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  mobileCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mobileActionButton: {
    flex: 1,
    backgroundColor: colors.info,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mobileDeleteButton: {
    backgroundColor: colors.error,
  },
  mobileCustomButton: {
    backgroundColor: colors.warning,
  },
  mobileActionButtonText: {
    color: colors.onInfo,
    fontWeight: '600',
    fontSize: 13,
  },
  customActionButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  customActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    padding: 16,
    borderRightWidth: 0,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    maxHeight: 500,
    backgroundColor: colors.surface,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: colors.surface,
  },
  cell: {
    padding: 16,
    borderRightWidth: 0,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  actionButtonText: {
    color: '#6b7280',
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