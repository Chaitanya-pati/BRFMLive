import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { AuthContext } from '../../App';

export default function Layout({ children, title, navigation, currentRoute }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { name: 'Dashboard', route: 'Home', icon: '📊' },
    { name: 'Suppliers', route: 'SupplierMaster', icon: '🏢' },
    { name: 'Vehicle Entries', route: 'VehicleEntry', icon: '🚛' },
    { name: 'Lab Tests', route: 'LabTest', icon: '🔬' },
    ...(user?.role === 'admin' ? [{ name: 'Users', route: 'UserManagement', icon: '👥' }] : []),
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>Gate Entry & Lab Testing System</Text>
          <Text style={styles.topBarSubtitle}>ERP Management</Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userRole}>{user?.role}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
