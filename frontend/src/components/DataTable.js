import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, useWindowDimensions, Platform } from 'react-native';
import colors from '../theme/colors';

export default function DataTable({ columns, data, onEdit, onDelete, onAdd, onCustomAction, customActionLabel, showCustomAction, searchable = true }) {
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
      <View style={styles.mobileCardHeader}>
        <View style={styles.mobileCardIdBadge}>
          <Text style={styles.mobileCardIdText}>#{row.id || rowIndex + 1}</Text>
        </View>
        <View style={styles.mobileCardHeaderActions}>
          {onEdit && (
            <TouchableOpacity
              style={styles.mobileHeaderIconButton}
              onPress={() => onEdit(row)}
            >
              <Text style={styles.iconText}>👁️</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.mobileHeaderIconButton, styles.deleteIconButton]}
              onPress={() => onDelete(row)}
            >
              <Text style={styles.iconText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.mobileCardContent}>
        {columns.slice(1, 5).map((col, colIndex) => (
          <View key={colIndex} style={styles.mobileCardRow}>
            <Text style={styles.mobileCardLabel}>{col.label}</Text>
            <Text style={styles.mobileCardValue} numberOfLines={2}>
              {col.render ? col.render(row[col.field], row) : row[col.field] || '-'}
            </Text>
          </View>
        ))}
      </View>
      
      {(onEdit || onCustomAction || onDelete) && (
        <View style={styles.mobileCardFooter}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.mobileActionButton, styles.mobileEditButton]}
              onPress={() => onEdit(row)}
            >
              <Text style={styles.mobileActionButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
          {onCustomAction && (!showCustomAction || showCustomAction(row)) && (
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
              <Text style={styles.mobileActionButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
                    {onCustomAction && (!showCustomAction || showCustomAction(row)) && (
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fafbfc',
    gap: 12,
  },
  toolbarMobile: {
    padding: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  searchInputMobile: {
    fontSize: 14,
    padding: 10,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(59, 89, 152, 0.2)',
  },
  addButtonMobile: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  mobileCardsContainer: {
    flex: 1,
    padding: 16,
  },
  mobileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
    overflow: 'hidden',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mobileCardIdBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mobileCardIdText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  mobileCardHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileHeaderIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconText: {
    fontSize: 16,
  },
  mobileCardContent: {
    padding: 16,
  },
  mobileCardRow: {
    marginBottom: 12,
  },
  mobileCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  mobileCardValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mobileActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  mobileEditButton: {
    backgroundColor: colors.info,
  },
  mobileDeleteButton: {
    backgroundColor: colors.error,
  },
  mobileCustomButton: {
    backgroundColor: colors.warning,
  },
  mobileActionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
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
    backgroundColor: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryHover,
  },
  headerCell: {
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.onPrimary,
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
    borderBottomColor: '#e5e7eb',
    backgroundColor: colors.surface,
    transition: 'background-color 0.2s ease',
  },
  cell: {
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 16,
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