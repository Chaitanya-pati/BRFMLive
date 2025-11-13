import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useBranch } from '../contexts/BranchContext';

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BranchSelector = () => {
  const { branches, selectedBranch, selectBranch, loading } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!branches || branches.length === 0) {
    return null;
  }

  const handleSelect = (branch) => {
    selectBranch(branch);
    setIsOpen(false);
  };

  return (
    <View style={styles.container} ref={dropdownRef}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <View style={styles.branchInfo}>
          <Text style={styles.branchLabel}>Branch:</Text>
          <Text style={styles.branchName}>{selectedBranch?.branch_name || 'Select Branch'}</Text>
        </View>
        <View style={[styles.icon, isOpen && styles.iconRotated]}>
          <ChevronDownIcon />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll}>
            {branches.map((branch) => (
              <TouchableOpacity
                key={branch.id}
                style={[
                  styles.dropdownItem,
                  selectedBranch?.id === branch.id && styles.dropdownItemActive
                ]}
                onPress={() => handleSelect(branch)}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedBranch?.id === branch.id && styles.dropdownItemTextActive
                ]}>
                  {branch.branch_name}
                </Text>
                <Text style={styles.dropdownItemCode}>{branch.branch_code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 180,
    gap: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    marginBottom: 2,
  },
  branchName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  icon: {
    color: 'rgba(255, 255, 255, 0.7)',
    transition: 'transform 0.2s',
  },
  iconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    maxHeight: 300,
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 2,
  },
  dropdownItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  dropdownItemCode: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default BranchSelector;
