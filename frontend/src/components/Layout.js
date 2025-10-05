
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import colors from '../theme/colors';

export default function Layout({ children, title, navigation, currentRoute }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', route: 'Home', icon: '📊', section: null },
    { name: 'Suppliers', route: 'SupplierMaster', icon: '🏢', section: 'Operations' },
    { name: 'Vehicle Entries', route: 'VehicleEntry', icon: '🚛', section: 'Operations' },
    { name: 'Lab Tests', route: 'LabTest', icon: '🔬', section: 'Operations' },
  ];

  const renderMenuItem = (item, index) => (
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
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.menuToggle}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Text style={styles.menuToggleIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Welcome to Gate Entry & Lab Testing System</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.adminProfile}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>AD</Text>
            </View>
            <Text style={styles.adminName}>Admin</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Sidebar */}
        <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed && (
              <>
                <Text style={styles.sidebarTitle}>Mill Management</Text>
                <Text style={styles.sidebarSubtitle}>System v2.0</Text>
              </>
            )}
            {sidebarCollapsed && (
              <Text style={styles.sidebarTitleCollapsed}>MM</Text>
            )}
          </View>

          <ScrollView style={styles.menuContainer}>
            {renderMenuItem(menuItems[0], 0)}
            
            {!sidebarCollapsed && (
              <Text style={styles.sectionLabel}>Operations</Text>
            )}
            
            {menuItems.slice(1).map((item, index) => renderMenuItem(item, index + 1))}
          </ScrollView>
        </View>

        {/* Content Area */}
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
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    boxShadow: '0 2px 4px rgba(44, 62, 80, 0.08)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuToggle: {
    padding: 8,
    marginRight: 16,
  },
  menuToggleIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: colors.onError,
    fontSize: 10,
    fontWeight: '600',
  },
  adminProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    color: colors.onInfo,
    fontSize: 14,
    fontWeight: '600',
  },
  adminName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    backgroundColor: colors.sidebarBackground,
    boxShadow: '2px 0 8px rgba(44, 62, 80, 0.1)',
  },
  sidebarCollapsed: {
    width: 70,
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 240, 241, 0.1)',
    alignItems: 'center',
  },
  sidebarTitle: {
    color: colors.sidebarText,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sidebarSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  sidebarTitleCollapsed: {
    color: colors.sidebarText,
    fontSize: 20,
    fontWeight: '700',
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 12,
  },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: colors.sidebarActive,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuText: {
    color: colors.sidebarText,
    fontSize: 14,
    opacity: 0.9,
  },
  menuTextActive: {
    color: colors.sidebarText,
    fontWeight: '600',
    opacity: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contentScroll: {
    flex: 1,
    padding: 20,
  },
});
