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
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const [liveOrders, setLiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isWide = width >= 768;

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
      <Layout title="Live" navigation={navigation} currentRoute="LiveAdd">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading live production orders...</Text>
        </View>
      </Layout>
    );
  }

  if (selectedOrder) {
    const has24h = detail && detail.records_24h && detail.records_24h.length > 0;
    const has12h = detail && detail.records_12h && detail.records_12h.length > 0;
    const hasHourly = detail && detail.hourly_productions && detail.hourly_productions.length > 0;

    return (
      <Layout title="Live" navigation={navigation} currentRoute="LiveAdd">
        <ScrollView
          style={[styles.container, isWide && styles.containerWide]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Back to Live Orders</Text>
          </TouchableOpacity>

          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <PulseIcon />
              <View style={styles.detailHeaderText}>
                <Text style={styles.detailTitle}>Production Order: {selectedOrder.order_number}</Text>
                <Text style={styles.detailSub}>Branch: {selectedOrder.branch_name}&nbsp;&nbsp;|&nbsp;&nbsp;Status: LIVE</Text>
              </View>
            </View>
          </View>

          {/* ---- SHORTCUTS ---- */}
          <View style={styles.shortcutsWrap}>
            <Text style={styles.shortcutsLabel}>GO TO</Text>
            <View style={[styles.shortcutsRow, isWide && styles.shortcutsRowWide]}>
              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => navigation.navigate('TransferRecordingDetails', {
                  order: {
                    id: selectedOrder.production_order_id,
                    order_number: selectedOrder.order_number,
                    branch_name: selectedOrder.branch_name,
                  },
                })}
              >
                <Text style={styles.shortcutIcon}>🔁</Text>
                <Text style={styles.shortcutBtnText}>24h Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={() => navigation.navigate('Transfer12Hour')}
              >
                <Text style={styles.shortcutIcon}>⏱</Text>
                <Text style={styles.shortcutBtnText}>12h Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => navigation.navigate('Grinding')}
              >
                <Text style={styles.shortcutIcon}>⚙️</Text>
                <Text style={styles.shortcutBtnText}>Grinding</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#10b981' }]}
                onPress={() => navigation.navigate('DispatchManagement')}
              >
                <Text style={styles.shortcutIcon}>🚛</Text>
                <Text style={styles.shortcutBtnText}>Dispatch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#0f172a' }]}
                onPress={() => navigation.navigate('ProductionPipeline', {
                  orderId: selectedOrder.production_order_id,
                })}
              >
                <Text style={styles.shortcutIcon}>📊</Text>
                <Text style={styles.shortcutBtnText}>Pipeline View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {detailLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : detail ? (
            <>
              {has24h && (
                <Section title="24 HOURS TRANSFER DETAILS" color="#3b82f6">
                  {detail.records_24h.map((r, i) => (
                    <TransferCard key={r.id || i} record={r} isWide={isWide} sourceBins={detail.source_bins || []} />
                  ))}
                </Section>
              )}

              {has12h && (
                <Section title="12 HOURS TRANSFER DETAILS" color="#8b5cf6">
                  {detail.records_12h.map((r, i) => (
                    <TransferCard key={r.id || i} record={r} isWide={isWide} />
                  ))}
                </Section>
              )}

              {hasHourly && (
                <Section title="HOURLY PRODUCTION DETAILS" color="#10b981">
                  {detail.hourly_productions.map((h, i) => (
                    <HourlyCard key={h.id || i} record={h} isWide={isWide} />
                  ))}
                </Section>
              )}

              {!has24h && !has12h && !hasHourly && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
                  <Text style={styles.emptyStateTitle}>No Records Yet</Text>
                  <Text style={styles.emptyStateText}>
                    No transfer or production data has been recorded for this order yet.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>Failed to load details.</Text>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Layout>
    );
  }

  const cardWidth = isWide ? Math.min(300, (width - 80) / Math.floor((width - 80) / 280)) : '100%';

  return (
    <Layout title="Live" navigation={navigation} currentRoute="LiveAdd">
      <ScrollView
        style={[styles.container, isWide && styles.containerWide]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            <Text style={styles.emptyStateText}>
              There are currently no active production orders.
            </Text>
          </View>
        ) : (
          <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
            {liveOrders.map((order) => (
              <TouchableOpacity
                key={order.production_order_id}
                style={[styles.card, isWide ? { width: cardWidth } : { width: '100%' }]}
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

function SourceBinsBreakdown({ sourceBins, destQty }) {
  if (!sourceBins || sourceBins.length === 0 || destQty == null) return null;
  const qty = parseFloat(destQty) || 0;
  return (
    <View style={styles.srcBreakdownWrap}>
      <Text style={styles.srcBreakdownTitle}>Source Bin Breakdown</Text>
      {sourceBins.map((sb, i) => {
        const contributed = ((sb.blend_percentage / 100) * qty).toFixed(2);
        const binName = sb.bin_number || (sb.bin && sb.bin.bin_number) || `Bin #${sb.bin_id}`;
        return (
          <View key={sb.bin_id || i} style={styles.srcBreakdownRow}>
            <Text style={styles.srcBreakdownBin}>{binName}</Text>
            <View style={styles.srcBreakdownRight}>
              <Text style={styles.srcBreakdownPct}>{sb.blend_percentage}%</Text>
              <Text style={styles.srcBreakdownQty}>{contributed} T</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TransferCard({ record, isWide, sourceBins }) {
  const statusColor = STATUS_COLOR[record.status] || '#6b7280';
  const is12h = record.target_moisture !== undefined;
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
      <View style={[styles.recordGrid, isWide && styles.recordGridWide]}>
        <RecordField label="Start Time" value={record.start_time ? formatISTDateTime(record.start_time) : 'N/A'} />
        <RecordField label="End Time" value={record.end_time ? formatISTDateTime(record.end_time) : 'N/A'} />
        <RecordField label="Quantity" value={record.quantity_transferred != null ? `${record.quantity_transferred} T` : 'N/A'} />
        {is12h ? (
          <>
            <RecordField label="Incoming M%" value={record.incoming_moisture != null ? `${record.incoming_moisture}%` : 'N/A'} />
            <RecordField label="Target M%" value={record.target_moisture != null ? `${record.target_moisture}%` : 'N/A'} />
            <RecordField label="Actual M%" value={record.moisture != null ? `${record.moisture}%` : 'N/A'} />
            <RecordField label="Water Added" value={record.water_added != null ? `${record.water_added} L` : 'N/A'} />
          </>
        ) : (
          <>
            <RecordField label="Water Added" value={record.water_added != null ? `${record.water_added} L` : 'N/A'} />
            <RecordField label="Moisture" value={record.moisture != null ? `${record.moisture}%` : 'N/A'} />
          </>
        )}
      </View>
      {sourceBins && sourceBins.length > 0 && (
        <SourceBinsBreakdown sourceBins={sourceBins} destQty={record.quantity_transferred} />
      )}
    </View>
  );
}

function HourlyCard({ record, isWide }) {
  const hasDetails = record.details && record.details.length > 0;
  const hasSiloDetails = record.silo_details && record.silo_details.length > 0;

  return (
    <View style={styles.recordCard}>
      <View style={[styles.recordGrid, isWide && styles.recordGridWide]}>
        <RecordField label="Hour" value={record.hour ?? 'N/A'} />
        <RecordField label="Production Qty" value={record.production_quantity != null ? `${record.production_quantity} t` : 'N/A'} />
        <RecordField label="Timestamp" value={record.timestamp ? formatISTDateTime(record.timestamp) : 'N/A'} />
      </View>

      {hasDetails && (
        <View style={styles.productList}>
          {record.details.map((d, i) => (
            <View key={i} style={styles.productRow}>
              <Text style={styles.productName}>{d.product_name}</Text>
              <Text style={styles.productQty}>
                {d.quantity_bags != null ? `${d.quantity_bags} bags` : 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hasSiloDetails && (
        <View style={styles.productList}>
          {record.silo_details.map((s, i) => (
            <View key={i} style={styles.productRow}>
              <Text style={styles.productName}>{s.product_name}</Text>
              <Text style={styles.productQty}>
                {s.quantity_kg != null ? `${s.quantity_kg} kg` : 'N/A'}{s.silo_name ? ` · ${s.silo_name}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  container: { flex: 1, padding: 16 },
  containerWide: { paddingHorizontal: 32, paddingVertical: 20 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 10,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
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
    flexShrink: 0,
  },
  pulseCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },

  cardGrid: { gap: 14 },
  cardGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
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
    marginBottom: 10,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardLabel: { fontSize: 13, color: '#6b7280' },
  cardValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  cardFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  tapHint: { fontSize: 12, color: colors.primary, textAlign: 'right', fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 340, lineHeight: 20 },

  backBtn: { marginBottom: 18 },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  detailHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexWrap: 'wrap',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: { elevation: 2 },
    }),
  },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' },
  detailHeaderText: { flex: 1 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flexShrink: 1 },
  detailSub: { fontSize: 12, color: '#6b7280', marginTop: 2, flexShrink: 1 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1 },
    }),
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderLeftWidth: 4,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionBody: { padding: 14, gap: 10 },

  shortcutsWrap: {
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  shortcutsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutsRowWide: {
    flexWrap: 'nowrap',
  },
  shortcutBtn: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  shortcutIcon: { fontSize: 18 },
  shortcutBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  srcBreakdownWrap: {
    marginTop: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 10,
    gap: 4,
  },
  srcBreakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891b2',
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  srcBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  srcBreakdownBin: { fontSize: 13, fontWeight: '600', color: '#0c4a6e' },
  srcBreakdownRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  srcBreakdownPct: { fontSize: 12, color: '#0891b2', fontWeight: '600', minWidth: 36, textAlign: 'right' },
  srcBreakdownQty: { fontSize: 13, fontWeight: '700', color: '#1e293b', minWidth: 60, textAlign: 'right' },

  recordCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: { fontSize: 13, color: '#374151', fontWeight: '500', flexShrink: 1 },
  productQty: { fontSize: 13, color: '#10b981', fontWeight: '700', marginLeft: 8 },
  recordCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  binFlow: { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  arrow: { color: colors.primary },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  recordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordGridWide: {
    gap: 14,
  },
  recordField: {
    minWidth: 120,
    flex: 1,
  },
  recordFieldLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 2, fontWeight: '600', textTransform: 'uppercase' },
  recordFieldValue: { fontSize: 13, color: '#374151', fontWeight: '600' },

  emptyText: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic', padding: 8 },
});
