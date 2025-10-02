import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';

export default function Layout({ children, title, navigation, currentRoute }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', route: 'Home', icon: '📊' },
    { name: 'Suppliers', route: 'SupplierMaster', icon: '🏢' },
    { name: 'Vehicle Entries', route: 'VehicleEntry', icon: '🚛' },
    { name: 'Lab Tests', route: 'LabTest', icon: '🔬' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Gate Entry & Lab Testing System</Text>
        <Text style={styles.topBarSubtitle}>ERP Management</Text>
      </View>

      <View style={styles.mainContainer}>
        <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Text style={styles.toggleIcon}>{sidebarCollapsed ? '→' : '←'}</Text>
          </TouchableOpacity>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                currentRoute === item.route && styles.menuItemActive,
              ]}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              {!sidebarCollapsed && (
                <Text
                  style={[
                    styles.menuText,
                    currentRoute === item.route && styles.menuTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>{title}</Text>
          </View>
          <ScrollView style={styles.contentScroll}>
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  topBar: {
    backgroundColor: '#1e3a8a',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  topBarSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#1e293b',
    padding: 8,
  },
  sidebarCollapsed: {
    width: 70,
  },
  toggleButton: {
    padding: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleIcon: {
    color: 'white',
    fontSize: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#3b82f6',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  menuTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  contentScroll: {
    flex: 1,
    padding: 20,
  },
});
