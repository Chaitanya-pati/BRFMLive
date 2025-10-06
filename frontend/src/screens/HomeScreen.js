import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import Layout from '../components/Layout';
import colors from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const stats = [
    { title: 'Total Suppliers', value: '-', color: colors.info, icon: '🏢' },
    { title: 'Vehicle Entries', value: '-', color: colors.purple, icon: '🚛' },
    { title: 'Lab Tests', value: '-', color: colors.success, icon: '🔬' },
    { title: 'Pending Tests', value: '-', color: colors.warning, icon: '⏱️' },
  ];

  const quickActions = [
    { title: 'Add Supplier', route: 'SupplierMaster', icon: '➕', color: colors.info },
    { title: 'Vehicle Entry', route: 'VehicleEntry', icon: '🚛', color: colors.purple },
    { title: 'New Lab Test', route: 'LabTest', icon: '🔬', color: colors.success },
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
              { borderLeftColor: stat.color },
              isMobile && styles.statCardMobile,
            ]}>
              <Text style={[styles.statIcon, isMobile && styles.statIconMobile]}>{stat.icon}</Text>
              <View style={styles.statInfo}>
                <Text style={[styles.statTitle, isMobile && styles.statTitleMobile]}>{stat.title}</Text>
                <Text style={[styles.statValue, { color: stat.color }, isMobile && styles.statValueMobile]}>{stat.value}</Text>
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
              <Text style={[styles.actionIcon, isMobile && styles.actionIconMobile]}>{action.icon}</Text>
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
    borderRadius: 8,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    boxShadow: '0 1px 3px rgba(44, 62, 80, 0.08)',
  },
  statCardMobile: {
    minWidth: '100%',
    padding: 16,
  },
  statIcon: {
    fontSize: 36,
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitleMobile: {
    fontSize: 16,
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
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 150,
    boxShadow: '0 2px 4px rgba(44, 62, 80, 0.1)',
  },
  actionCardMobile: {
    minWidth: Platform.select({ web: 'calc(50% - 6px)', default: '45%' }),
    padding: 16,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    boxShadow: '0 1px 3px rgba(44, 62, 80, 0.08)',
  },
  activityText: {
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
