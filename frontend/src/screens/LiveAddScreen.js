import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { formatISTDateTime } from '../utils/dateUtils';
import colors from '../theme/colors';

const STATUS_COLOR = {
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  PLANNED: '#6b7280',
};

const PulseIcon = () => (
  <View style={styles.pulseWrapper}>
    <View style={styles.pulseCore} />
  </View>
);

export default function LiveAddScreen({ navigation }) {
  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLiveOrders = useCallback(async () => {
    try {
      const res = await api.get('/live-production');
      setLiveOrders(res.data || []);
    } catch (err) {
      console.error('Error fetching live orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveOrders]);

  const handleCardPress = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get(`/live-production/${order.production_order_id}`);
      setDetail(res.data);
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedOrder(null);
    setDetail(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveOrders();
  };

  if (loading) {
    return (
      <Layout title="Live Add" navigation={navigation} currentRoute="LiveAdd">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading live production orders...</Text>
        </View>
      </Layout>
    );
  }

  if (selectedOrder) {
    return (
      <Layout title="Live Add" navigation={navigation} currentRoute="LiveAdd">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Back to Live Orders</Text>
          </TouchableOpacity>

          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <PulseIcon />
              <View>
                <Text style={styles.detailTitle}>Production Order: {selectedOrder.order_number}</Text>
                <Text style={styles.detailSub}>Branch: {selectedOrder.branch_name} &nbsp;|&nbsp; Status: LIVE</Text>
              </View>
            </View>
          </View>

          {detailLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : detail ? (
            <>
              <Section title="24 HOURS TRANSFER DETAILS" color="#3b82f6">
                {detail.records_24h.length === 0 ? (
                  <Text style={styles.emptyText}>No 24-hour transfer records found.</Text>
                ) : (
                  detail.records_24h.map((r, i) => (
                    <TransferCard key={r.id || i} record={r} />
                  ))
                )}
              </Section>

              <Section title="12 HOURS TRANSFER DETAILS" color="#8b5cf6">
                {detail.records_12h.length === 0 ? (
                  <Text style={styles.emptyText}>No 12-hour transfer records found.</Text>
                ) : (
                  detail.records_12h.map((r, i) => (
                    <TransferCard key={r.id || i} record={r} />
                  ))
                )}
              </Section>

              <Section title="HOURLY PRODUCTION DETAILS" color="#10b981">
                {detail.hourly_productions.length === 0 ? (
                  <Text style={styles.emptyText}>No hourly production recorded yet.</Text>
                ) : (
                  detail.hourly_productions.map((h, i) => (
                    <HourlyCard key={h.id || i} record={h} />
                  ))
                )}
              </Section>
            </>
          ) : (
            <Text style={styles.emptyText}>Failed to load details.</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Layout>
    );
  }

  return (
    <Layout title="Live Add" navigation={navigation} currentRoute="LiveAdd">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <PulseIcon />
            <Text style={styles.pageTitle}>Live Production Monitor</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>

        {liveOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Live Production Orders</Text>
            <Text style={styles.emptyStateText}>There are currently no production orders with in-progress transfers.</Text>
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {liveOrders.map((order) => (
              <TouchableOpacity
                key={`${order.production_order_id}-${order.branch_id}`}
                style={styles.card}
                onPress={() => handleCardPress(order)}
                activeOpacity={0.8}
              >
                <View style={styles.cardBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <Text style={styles.cardTitle}>{order.order_number}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Branch</Text>
                  <Text style={styles.cardValue}>{order.branch_name}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>PO ID</Text>
                  <Text style={styles.cardValue}>{order.production_order_id}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.tapHint}>Tap to view details →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}

function Section({ title, color, children }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function TransferCard({ record }) {
  const statusColor = STATUS_COLOR[record.status] || '#6b7280';
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordCardHeader}>
        <Text style={styles.binFlow}>
          {record.from_bin} <Text style={styles.arrow}>→</Text> {record.to_bin}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>{record.status}</Text>
        </View>
      </View>
      <View style={styles.recordGrid}>
        <RecordField label="Start Time" value={record.start_time ? formatISTDateTime(record.start_time) : 'N/A'} />
        <RecordField label="End Time" value={record.end_time ? formatISTDateTime(record.end_time) : 'N/A'} />
        <RecordField label="Quantity" value={record.quantity_transferred != null ? `${record.quantity_transferred} kg` : 'N/A'} />
        <RecordField label="Water Added" value={record.water_added != null ? `${record.water_added} L` : 'N/A'} />
        <RecordField label="Moisture" value={record.moisture != null ? `${record.moisture}%` : 'N/A'} />
        <RecordField label="Branch ID" value={record.branch_id ?? 'N/A'} />
      </View>
    </View>
  );
}

function HourlyCard({ record }) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordGrid}>
        <RecordField label="Hour" value={record.hour ?? 'N/A'} />
        <RecordField label="Production Qty" value={record.production_quantity != null ? `${record.production_quantity} t` : 'N/A'} />
        <RecordField label="Timestamp" value={record.timestamp ? formatISTDateTime(record.timestamp) : 'N/A'} />
        <RecordField label="Branch ID" value={record.branch_id ?? 'N/A'} />
      </View>
    </View>
  );
}

function RecordField({ label, value }) {
  return (
    <View style={styles.recordField}>
      <Text style={styles.recordFieldLabel}>{label}</Text>
      <Text style={styles.recordFieldValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  refreshBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  refreshBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  pulseWrapper: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef444433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },

  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: Platform.OS === 'web' ? 280 : '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: { elevation: 3 },
    }),
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: { fontSize: 13, color: '#6b7280' },
  cardValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  cardFooter: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  tapHint: { fontSize: 12, color: colors.primary, textAlign: 'right', fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 340 },

  backBtn: { marginBottom: 20 },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  detailHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: { elevation: 2 },
    }),
  },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  detailSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1 },
    }),
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderLeftWidth: 4,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionBody: { padding: 16, gap: 12 },

  recordCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  binFlow: { fontSize: 15, fontWeight: '700', color: '#111827' },
  arrow: { color: colors.primary },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  recordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordField: {
    minWidth: 140,
    flex: 1,
  },
  recordFieldLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2, fontWeight: '500' },
  recordFieldValue: { fontSize: 13, color: '#374151', fontWeight: '600' },

  emptyText: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic', padding: 8 },
});
