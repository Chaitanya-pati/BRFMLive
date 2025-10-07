
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, useWindowDimensions } from 'react-native';
import colors from '../theme/colors';

export default function Layout({ children, title, navigation, currentRoute }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
      setMobileMenuOpen(false);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  const menuItems = [
    { name: 'Dashboard', route: 'Home', icon: '📊', section: null },
    { name: 'Master Data', route: 'MasterView', icon: '📚', section: 'Operations' },
    { name: 'Supplier Master', route: 'SupplierMaster', icon: '🏢', section: 'Operations' },
    { name: 'Gate Entry', route: 'VehicleEntry', icon: '🚪', section: 'Operations' },
    { name: 'Quality Control', route: 'LabTest', icon: '📋', section: 'Operations' },
    { name: 'Unloading Entry', route: 'UnloadingEntry', icon: '📦', section: 'Operations' },
    { name: 'Claim Tracking', route: 'ClaimTracking', icon: '📝', section: 'Operations' },
  ];

  const toggleMobileMenu = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleNavigate = (route) => {
    navigation.navigate(route);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.menuItem,
        currentRoute === item.route && styles.menuItemActive,
      ]}
      onPress={() => handleNavigate(item.route)}
    >
      <Text style={styles.menuIcon}>{item.icon}</Text>
      {(!sidebarCollapsed || mobileMenuOpen) && (
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
            onPress={toggleMobileMenu}
          >
            <Text style={styles.menuToggleIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, isMobile && styles.topBarTitleMobile]} numberOfLines={1}>
            {isMobile ? 'Mill Management' : 'Welcome to Mill Management System'}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          {!isMobile && (
            <View style={styles.adminProfile}>
              <View style={styles.adminAvatar}>
                <Text style={styles.adminAvatarText}>AD</Text>
              </View>
              <Text style={styles.adminName}>Admin</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Mobile Overlay */}
        {isMobile && mobileMenuOpen && (
          <TouchableOpacity 
            style={styles.mobileOverlay} 
            onPress={() => setMobileMenuOpen(false)}
            activeOpacity={1}
          />
        )}

        {/* Sidebar */}
        <View style={[
          styles.sidebar,
          sidebarCollapsed && !mobileMenuOpen && styles.sidebarCollapsed,
          isMobile && mobileMenuOpen && styles.sidebarMobileOpen,
          isMobile && !mobileMenuOpen && styles.sidebarMobileHidden,
        ]}>
          <View style={styles.sidebarHeader}>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <>
                <Text style={styles.sidebarTitle}>Mill Management</Text>
                <Text style={styles.sidebarSubtitle}>System v2.0</Text>
              </>
            )}
            {sidebarCollapsed && !mobileMenuOpen && (
              <Text style={styles.sidebarTitleCollapsed}>MM</Text>
            )}
          </View>

          <ScrollView style={styles.menuContainer}>
            {renderMenuItem(menuItems[0], 0)}
            
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <Text style={styles.sectionLabel}>Operations</Text>
            )}
            
            {menuItems.slice(1).map((item, index) => renderMenuItem(item, index + 1))}
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          <View style={styles.contentHeader}>
            <Text style={[styles.contentTitle, isMobile && styles.contentTitleMobile]}>{title}</Text>
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
    paddingHorizontal: Platform.select({ web: 16, default: 12 }),
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
    minWidth: 0,
  },
  menuToggle: {
    padding: 8,
    marginRight: Platform.select({ web: 16, default: 8 }),
  },
  menuToggleIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    flexShrink: 1,
  },
  topBarTitleMobile: {
    fontSize: 16,
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
    position: 'relative',
  },
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sidebar: {
    width: 200,
    backgroundColor: '#3d4e5c',
    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  sidebarCollapsed: {
    width: 70,
  },
  sidebarMobileOpen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    boxShadow: '2px 0 16px rgba(0, 0, 0, 0.3)',
  },
  sidebarMobileHidden: {
    position: 'absolute',
    left: -250,
    width: 0,
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'flex-start',
  },
  sidebarTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  sidebarSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  sidebarTitleCollapsed: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
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
    marginHorizontal: 0,
    borderRadius: 0,
    marginBottom: 0,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 14,
    width: 20,
  },
  menuText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '400',
  },
  menuTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  contentMobile: {
    width: '100%',
  },
  contentHeader: {
    backgroundColor: colors.surface,
    padding: Platform.select({ web: 24, default: 16 }),
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
  },
  contentTitleMobile: {
    fontSize: 20,
  },
  contentScroll: {
    flex: 1,
    padding: Platform.select({ web: 24, default: 12 }),
  },
});
