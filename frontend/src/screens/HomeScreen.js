import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Layout from '../components/Layout';
import colors from '../theme/colors';

export default function HomeScreen({ navigation }) {
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
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <View style={styles.statInfo}>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={() => navigation.navigate(action.route)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
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
  statIcon: {
    fontSize: 36,
    marginRight: 16,
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
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 150,
    boxShadow: '0 2px 4px rgba(44, 62, 80, 0.1)',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
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
