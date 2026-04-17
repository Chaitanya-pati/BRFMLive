import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import Layout from '../components/Layout';
import BinVisual from '../components/BinVisual';
import colors from '../theme/colors';
import { getApiClient } from '../api/client';
import { formatISTDate } from '../utils/dateUtils';

const STATUS_CONFIG = {
  PENDING:    { color: '#94a3b8', bg: '#f1f5f9', label: 'Pending',     dot: '○' },
  IN_PROGRESS:{ color: '#f59e0b', bg: '#fffbeb', label: 'In Progress', dot: '●' },
  COMPLETED:  { color: '#10b981', bg: '#f0fdf4', label: 'Completed',   dot: '✓' },
  PARTIAL:    { color: '#6366f1', bg: '#eef2ff', label: 'Partial',     dot: '◑' },
};

const ORDER_STATUS_COLOR = {
  CREATED:    '#6b7280',
  PLANNED:    '#3b82f6',
  IN_PROGRESS:'#f59e0b',
  COMPLETED:  '#10b981',
  CANCELLED:  '#ef4444',
};

function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[
      styles.statusBadge,
      { backgroundColor: cfg.bg, borderColor: cfg.color },
      small && { paddingHorizontal: 6, paddingVertical: 2 },
    ]}>
      <Text style={[styles.statusBadgeText, { color: cfg.color }, small && { fontSize: 10 }]}>
        {cfg.dot} {cfg.label}
      </Text>
    </View>
  );
}

function StageConnector() {
  return (
    <View style={styles.connector}>
      <View style={styles.connectorLine} />
      <Text style={styles.connectorArrow}>›</Text>
    </View>
  );
}

function StageCard({ title, stageKey, status, navigation, orderId, children, onNavigate }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.stageCard, { borderTopColor: cfg.color }]}>
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>{title}</Text>
        <StatusBadge status={status} small />
      </View>
      <View style={styles.stageContent}>
        {children}
      </View>
      {onNavigate && (
        <TouchableOpacity style={[styles.stageNavBtn, { borderColor: cfg.color }]} onPress={onNavigate}>
          <Text style={[styles.stageNavBtnText, { color: cfg.color }]}>Open →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BinRow({ bins, emptyText, size = 'sm' }) {
  if (!bins || bins.length === 0) {
    return <Text style={styles.emptyStageText}>{emptyText || 'No bins configured'}</Text>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.binRow}>
      {bins.map((bin, i) => (
        <View key={bin.id || i} style={{ marginRight: 10 }}>
          <BinVisual
            binNumber={bin.bin_number}
            capacity={bin.capacity}
            currentQuantity={bin.current_quantity}
            size={size}
            label={bin.blend_percentage ? `${bin.blend_percentage}% blend` : null}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function TransferRecordMini({ record, type }) {
  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.PENDING;
  const hasMoisture = record.incoming_moisture != null || record.moisture_level != null;
  return (
    <View style={[styles.recordMini, { borderLeftColor: cfg.color }]}>
      <View style={styles.recordMiniHeader}>
        {type === '12h' ? (
          <Text style={styles.recordMiniBins}>
            {record.source_bin?.bin_number || `Src#${record.source_bin?.id || '?'}`}
            {' → '}
            {record.destination_bin?.bin_number || `Dst#${record.destination_bin?.id || '?'}`}
          </Text>
        ) : (
          <Text style={styles.recordMiniBins}>
            → {record.destination_bin?.bin_number || `Bin#${record.destination_bin?.id || '?'}`}
          </Text>
        )}
        <StatusBadge status={record.status} small />
      </View>
      {record.quantity_transferred > 0 && (
        <Text style={styles.recordMiniQty}>{record.quantity_transferred} T</Text>
      )}
      {hasMoisture && type === '12h' && (
        <Text style={styles.recordMiniMoisture}>
          {record.incoming_moisture != null ? `In: ${record.incoming_moisture}%` : ''}
          {record.target_moisture != null ? `  Tgt: ${record.target_moisture}%` : ''}
          {record.moisture_level != null ? `  Act: ${record.moisture_level}%` : ''}
        </Text>
      )}
      {record.moisture_level != null && type === '24h' && (
        <Text style={styles.recordMiniMoisture}>Moisture: {record.moisture_level}%</Text>
      )}
    </View>
  );
}

export default function ProductionPipelineScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const initialOrderId = route?.params?.orderId;
  const isWide = width >= 900;

  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const client = getApiClient();
      const res = await client.get('/production-orders');
      setOrders(res.data || []);
    } catch (err) {
      console.error('Pipeline: failed to load orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPipeline = useCallback(async (orderId) => {
    if (!orderId) return;
    setOrderLoading(true);
    try {
      const client = getApiClient();
      const res = await client.get(`/production-orders/${orderId}/pipeline`);
      setPipeline(res.data);
    } catch (err) {
      console.error('Pipeline: failed to load pipeline', err);
      setPipeline(null);
    } finally {
      setOrderLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchPipeline(selectedOrderId);
    } else {
      fetchOrders();
    }
  }, [selectedOrderId, fetchPipeline, fetchOrders]);

  useEffect(() => {
    if (!selectedOrderId || !pipeline) return;
    const stages = pipeline.stages;
    const hasActive =
      stages.transfer_24h.status === 'IN_PROGRESS' ||
      stages.transfer_12h.status === 'IN_PROGRESS';
    if (!hasActive) return;
    const interval = setInterval(() => fetchPipeline(selectedOrderId), 30000);
    return () => clearInterval(interval);
  }, [selectedOrderId, pipeline, fetchPipeline]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedOrderId) fetchPipeline(selectedOrderId);
    else { setLoading(true); fetchOrders(); setRefreshing(false); }
  };

  const handleSelectOrder = (id) => {
    setSelectedOrderId(id);
    setPipeline(null);
  };

  const handleBack = () => {
    setSelectedOrderId(null);
    setPipeline(null);
  };

  // ── Order list ────────────────────────────────────────────────────────────
  if (!selectedOrderId) {
    return (
      <Layout title="Production Pipeline" navigation={navigation}>
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Production Pipeline View</Text>
            <Text style={styles.pageSubtitle}>Select an order to see all stages at a glance</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const statusColor = ORDER_STATUS_COLOR[item.status] || '#6b7280';
                return (
                  <TouchableOpacity style={styles.orderCard} onPress={() => handleSelectOrder(item.id)}>
                    <View style={styles.orderCardLeft}>
                      <Text style={styles.orderCardNumber}>{item.order_number}</Text>
                      <Text style={styles.orderCardProduct}>{item.raw_product?.product_name || '—'}</Text>
                    </View>
                    <View style={styles.orderCardRight}>
                      <View style={[styles.orderStatusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.orderStatusText}>{item.status}</Text>
                      </View>
                      <Text style={styles.orderCardQty}>{item.quantity} T</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No production orders found</Text>
                </View>
              }
            />
          )}
        </View>
      </Layout>
    );
  }

  // ── Pipeline view ─────────────────────────────────────────────────────────
  const order = pipeline?.order;
  const stages = pipeline?.stages;

  const pipelineContent = orderLoading ? (
    <View style={styles.loadingCenter}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading pipeline...</Text>
    </View>
  ) : !pipeline ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Could not load pipeline data.</Text>
      <TouchableOpacity onPress={() => fetchPipeline(selectedOrderId)} style={styles.retryBtn}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.pipelineScroll}
    >
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Text style={styles.orderHeaderNumber}>{order.order_number}</Text>
          <Text style={styles.orderHeaderProduct}>{order.raw_product?.product_name || '—'}</Text>
        </View>
        <View style={styles.orderHeaderRight}>
          <View style={[styles.orderStatusBadgeLarge, { backgroundColor: ORDER_STATUS_COLOR[order.status] || '#6b7280' }]}>
            <Text style={styles.orderStatusTextLarge}>{order.status}</Text>
          </View>
          <Text style={styles.orderHeaderQty}>{order.quantity} T</Text>
          {order.target_finish_date && (
            <Text style={styles.orderHeaderDate}>Target: {formatISTDate(order.target_finish_date)}</Text>
          )}
        </View>
      </View>

      {/* Pipeline Flow */}
      {isWide ? (
        // Wide layout: 4 columns side by side
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wideFlow}>
          <View style={styles.wideFlowInner}>
            <StageCard
              title="Raw Wheat"
              status={stages.raw_wheat.status}
              onNavigate={() => navigation.navigate('ProductionOrderPlanning', { orderId: order.id })}
            >
              {stages.raw_wheat.source_bins.length > 0 ? (
                <>
                  <BinRow bins={stages.raw_wheat.source_bins} size="sm" />
                  <Text style={styles.stageNote}>
                    {stages.raw_wheat.source_bins.length} source bin{stages.raw_wheat.source_bins.length !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyStageText}>No source bins planned</Text>
              )}
            </StageCard>

            <StageConnector />

            <StageCard
              title="24-Hour Transfer"
              status={stages.transfer_24h.status}
              onNavigate={() => navigation.navigate('TransferRecordingDetails', { order: { id: order.id, order_number: order.order_number } })}
            >
              {stages.transfer_24h.records.length === 0 ? (
                <Text style={styles.emptyStageText}>No transfers yet</Text>
              ) : (
                <>
                  {stages.transfer_24h.records.map((r) => (
                    <TransferRecordMini key={r.id} record={r} type="24h" />
                  ))}
                  {stages.transfer_24h.records.some(r => r.destination_bin) && (
                    <BinRow
                      bins={stages.transfer_24h.records
                        .filter(r => r.destination_bin)
                        .map(r => r.destination_bin)}
                      size="sm"
                    />
                  )}
                </>
              )}
            </StageCard>

            <StageConnector />

            <StageCard
              title="12-Hour Transfer"
              status={stages.transfer_12h.status}
              onNavigate={() => navigation.navigate('Transfer12Hour')}
            >
              {stages.transfer_12h.records.length === 0 ? (
                <Text style={styles.emptyStageText}>No transfers yet</Text>
              ) : (
                <>
                  {stages.transfer_12h.records.map((r) => (
                    <TransferRecordMini key={r.id} record={r} type="12h" />
                  ))}
                  {stages.transfer_12h.records.some(r => r.destination_bin) && (
                    <BinRow
                      bins={stages.transfer_12h.records
                        .filter(r => r.destination_bin)
                        .map(r => r.destination_bin)}
                      size="sm"
                    />
                  )}
                </>
              )}
            </StageCard>

            <StageConnector />

            <StageCard
              title="Grinding"
              status={stages.grinding.status}
              onNavigate={() => navigation.navigate('Grinding')}
            >
              {stages.grinding.bins.length === 0 ? (
                <Text style={styles.emptyStageText}>
                  {stages.transfer_12h.status === 'PENDING'
                    ? 'Awaiting 12h transfer'
                    : 'No grinding bins yet'}
                </Text>
              ) : (
                <>
                  <BinRow bins={stages.grinding.bins} size="sm" />
                  {stages.grinding.hourly_records_count > 0 && (
                    <Text style={styles.stageNote}>
                      {stages.grinding.hourly_records_count} hourly record{stages.grinding.hourly_records_count !== 1 ? 's' : ''}
                    </Text>
                  )}
                </>
              )}
            </StageCard>
          </View>
        </ScrollView>
      ) : (
        // Narrow layout: stacked cards
        <View style={styles.narrowFlow}>
          <StageCard
            title="1. Raw Wheat"
            status={stages.raw_wheat.status}
            onNavigate={() => navigation.navigate('ProductionOrderPlanning', { orderId: order.id })}
          >
            {stages.raw_wheat.source_bins.length > 0 ? (
              <>
                <BinRow bins={stages.raw_wheat.source_bins} size="xs" />
                <Text style={styles.stageNote}>
                  {stages.raw_wheat.source_bins.length} source bin{stages.raw_wheat.source_bins.length !== 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.emptyStageText}>No source bins planned</Text>
            )}
          </StageCard>

          <View style={styles.narrowConnector}>
            <Text style={styles.narrowConnectorText}>↓</Text>
          </View>

          <StageCard
            title="2. 24-Hour Transfer"
            status={stages.transfer_24h.status}
            onNavigate={() => navigation.navigate('TransferRecordingDetails', { order: { id: order.id, order_number: order.order_number } })}
          >
            {stages.transfer_24h.records.length === 0 ? (
              <Text style={styles.emptyStageText}>No transfers yet</Text>
            ) : (
              <>
                {stages.transfer_24h.records.map((r) => (
                  <TransferRecordMini key={r.id} record={r} type="24h" />
                ))}
                {stages.transfer_24h.records.some(r => r.destination_bin) && (
                  <BinRow
                    bins={stages.transfer_24h.records.filter(r => r.destination_bin).map(r => r.destination_bin)}
                    size="xs"
                  />
                )}
              </>
            )}
          </StageCard>

          <View style={styles.narrowConnector}>
            <Text style={styles.narrowConnectorText}>↓</Text>
          </View>

          <StageCard
            title="3. 12-Hour Transfer"
            status={stages.transfer_12h.status}
            onNavigate={() => navigation.navigate('Transfer12Hour')}
          >
            {stages.transfer_12h.records.length === 0 ? (
              <Text style={styles.emptyStageText}>No transfers yet</Text>
            ) : (
              <>
                {stages.transfer_12h.records.map((r) => (
                  <TransferRecordMini key={r.id} record={r} type="12h" />
                ))}
                {stages.transfer_12h.records.some(r => r.destination_bin) && (
                  <BinRow
                    bins={stages.transfer_12h.records.filter(r => r.destination_bin).map(r => r.destination_bin)}
                    size="xs"
                  />
                )}
              </>
            )}
          </StageCard>

          <View style={styles.narrowConnector}>
            <Text style={styles.narrowConnectorText}>↓</Text>
          </View>

          <StageCard
            title="4. Grinding"
            status={stages.grinding.status}
            onNavigate={() => navigation.navigate('Grinding')}
          >
            {stages.grinding.bins.length === 0 ? (
              <Text style={styles.emptyStageText}>
                {stages.transfer_12h.status === 'PENDING' ? 'Awaiting 12h transfer' : 'No grinding bins yet'}
              </Text>
            ) : (
              <>
                <BinRow bins={stages.grinding.bins} size="xs" />
                {stages.grinding.hourly_records_count > 0 && (
                  <Text style={styles.stageNote}>
                    {stages.grinding.hourly_records_count} hourly record{stages.grinding.hourly_records_count !== 1 ? 's' : ''}
                  </Text>
                )}
              </>
            )}
          </StageCard>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );

  return (
    <Layout title="Production Pipeline" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Orders</Text>
          </TouchableOpacity>
          {order && (
            <TouchableOpacity onPress={() => fetchPipeline(selectedOrderId)} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>↻ Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
        {pipelineContent}
      </View>
    </Layout>
  );
}

const STAGE_CARD_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.gray[100],
  },
  backBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  refreshBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCardLeft: {
    flex: 1,
  },
  orderCardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  orderCardProduct: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  orderCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardQty: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    margin: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  orderHeaderProduct: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 3,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderStatusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  orderStatusTextLarge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderHeaderQty: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  orderHeaderDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  wideFlow: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  wideFlowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  narrowFlow: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  pipelineScroll: {
    flex: 1,
  },
  stageCard: {
    width: STAGE_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: 6,
  },
  stageContent: {
    minHeight: 60,
  },
  stageNavBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  stageNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stageNote: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 6,
  },
  connector: {
    alignSelf: 'center',
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  connectorLine: {
    height: 2,
    width: 20,
    backgroundColor: colors.border,
  },
  connectorArrow: {
    fontSize: 20,
    color: colors.gray[300],
    marginTop: -6,
  },
  narrowConnector: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  narrowConnectorText: {
    fontSize: 20,
    color: colors.gray[300],
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  binRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  emptyStageText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  recordMini: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  recordMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  recordMiniBins: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  recordMiniQty: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  recordMiniMoisture: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
