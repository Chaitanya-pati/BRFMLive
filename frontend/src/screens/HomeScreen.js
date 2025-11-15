import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import Layout from '../components/Layout';
import colors from '../theme/colors';
import { supplierApi, vehicleApi, labTestApi } from '../api/client';
import SvgIcon from 'react-native-svg-icon'; // Assuming you have this library or a similar one for SVG icons

// Import your SVG icons
// Example:
// import { BuildingIcon, TruckIcon, FlaskIcon, ClockIcon } from '../assets/icons';

// Placeholder for SVG icons if not explicitly imported
const IconPlaceholder = ({ name, size, color }) => (
  <Text style={{ fontSize: size, color: color, marginRight: 16 }}>{name}</Text>
);

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [stats, setStats] = useState([
    { title: 'Total Suppliers', value: '-', color: '#3b82f6', icon: 'building', gradient: ['#3b82f6', '#2563eb'] },
    { title: 'Vehicle Entries', value: '-', color: '#8b5cf6', icon: 'truck', gradient: ['#8b5cf6', '#7c3aed'] },
    { title: 'Lab Tests', value: '-', color: '#10b981', icon: 'flask', gradient: ['#10b981', '#059669'] },
    { title: 'Pending Tests', value: '-', color: '#f59e0b', icon: 'clock', gradient: ['#f59e0b', '#d97706'] },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [suppliersRes, vehiclesRes, labTestsRes, availableVehiclesRes] = await Promise.all([
        supplierApi.getAll(),
        vehicleApi.getAll(),
        labTestApi.getAll(),
        vehicleApi.getAvailableForTesting(),
      ]);

      setStats([
        { title: 'Total Suppliers', value: suppliersRes.data.length.toString(), color: '#3b82f6', icon: 'building', gradient: ['#3b82f6', '#2563eb'] },
        { title: 'Vehicle Entries', value: vehiclesRes.data.length.toString(), color: '#8b5cf6', icon: 'truck', gradient: ['#8b5cf6', '#7c3aed'] },
        { title: 'Lab Tests', value: labTestsRes.data.length.toString(), color: '#10b981', icon: 'flask', gradient: ['#10b981', '#059669'] },
        { title: 'Pending Tests', value: availableVehiclesRes.data.length.toString(), color: '#f59e0b', icon: 'clock', gradient: ['#f59e0b', '#d97706'] },
      ]);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Branch Master', route: 'BranchMaster', icon: 'storefront', color: '#3b82f6' }, // Changed icon
    { title: 'User Management', route: 'UserManagement', icon: 'people', color: '#6366f1' }, // Changed icon
    { title: 'Add Supplier', route: 'SupplierMaster', icon: 'person-add', color: '#06b6d4' }, // Changed icon
    { title: 'Vehicle Entry', route: 'VehicleEntry', icon: 'car', color: '#f43f5e' }, // Changed icon
    { title: 'New Lab Test', route: 'LabTest', icon: 'flask', color: '#10b981' }, // Changed icon
  ];

  return (
    <Layout title="Dashboard" navigation={navigation} currentRoute="Home">
      <View style={styles.container}>
        <View style={[
          styles.statsContainer,
          isMobile && styles.statsContainerMobile,
          isTablet && styles.statsContainerTablet,
        ]}>
          {stats.map((stat, index) => (
            <View key={index} style={[
              styles.statCard,
              { borderLeftColor: stat.color }, // Using the new color
              isMobile && styles.statCardMobile,
            ]}>
              {/* Replace text icon with SvgIcon */}
              {/* Example: <SvgIcon name={stat.icon} width={36} height={36} color={stat.color} /> */}
              <IconPlaceholder name={stat.icon} size={isMobile ? 28 : 36} color={stat.color} />
              <View style={styles.statInfo}>
                <Text style={[styles.statTitle, isMobile && styles.statTitleMobile]}>{stat.title}</Text>
                {loading ? (
                  <ActivityIndicator size="small" color={stat.color} />
                ) : (
                  <Text style={[styles.statValue, { color: stat.color }, isMobile && styles.statValueMobile]}>{stat.value}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Quick Actions</Text>
        <View style={[
          styles.quickActions,
          isMobile && styles.quickActionsMobile,
        ]}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionCard,
                { backgroundColor: action.color },
                isMobile && styles.actionCardMobile,
              ]}
              onPress={() => navigation.navigate(action.route)}
            >
              {/* Replace text icon with SvgIcon */}
              {/* Example: <SvgIcon name={action.icon} width={32} height={32} color={colors.onPrimary} /> */}
              <IconPlaceholder name={action.icon} size={isMobile ? 28 : 32} color={colors.onPrimary} />
              <Text style={[styles.actionTitle, isMobile && styles.actionTitleMobile]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>No recent activity</Text>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20, // Added padding for better spacing
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statsContainerMobile: {
    gap: 12,
    marginBottom: 16,
  },
  statsContainerTablet: {
    gap: 14,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4, // Kept for emphasis, can be removed or styled differently
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // Softer shadow
    overflow: 'hidden', // To ensure gradient clipping if used
  },
  statCardMobile: {
    minWidth: '100%',
    padding: 16,
  },
  statIcon: {
    fontSize: 36,
    marginRight: 16,
    // Removed direct icon styling, will rely on SvgIcon or placeholder
  },
  statIconMobile: {
    fontSize: 28,
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  statTitleMobile: {
    fontSize: 11,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statValueMobile: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 20, // Increased font size for better hierarchy
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 12, // Increased margin top
  },
  sectionTitleMobile: {
    fontSize: 18,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  quickActionsMobile: {
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 150,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // Softer shadow
    justifyContent: 'center', // Center content vertically
  },
  actionCardMobile: {
    minWidth: Platform.select({ web: 'calc(50% - 6px)', default: '45%' }),
    padding: 16,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
    // Removed direct icon styling, will rely on SvgIcon or placeholder
  },
  actionIconMobile: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionTitle: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionTitleMobile: {
    fontSize: 13,
  },
  activityCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 0,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // Softer shadow
    minHeight: 100, // Give it some height
    justifyContent: 'center', // Center text
    alignItems: 'center',
  },
  activityText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
});