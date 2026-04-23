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
import { useFocusEffect } from '@react-navigation/native';
import Layout from '../components/Layout';
import BinVisual from '../components/BinVisual';
import colors from '../theme/colors';
import { getApiClient } from '../api/client';
import { formatISTDate } from '../utils/dateUtils';

const STATUS_CONFIG = {
  PENDING:     { color: '#94a3b8', bg: '#f1f5f9', label: 'Pending',     dot: '○', pulse: false },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fffbeb', label: 'In Progress', dot: '●', pulse: true  },
  COMPLETED:   { color: '#10b981', bg: '#f0fdf4', label: 'Completed',   dot: '✓', pulse: false },
  PARTIAL:     { color: '#6366f1', bg: '#eef2ff', label: 'Partial',     dot: '◑', pulse: false },
};

const ORDER_STATUS_COLOR = {
  CREATED:     '#6b7280',
  PLANNED:     '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED:   '#10b981',
  CANCELLED:   '#ef4444',
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

function StageConnector({ vertical }) {
  if (vertical) {
    return (
      <View style={styles.narrowConnector}>
        <View style={styles.narrowConnectorLine} />
        <Text style={styles.narrowConnectorArrow}>↓</Text>
      </View>
    );
  }
  return (
    <View style={styles.connector}>
      <View style={styles.connectorLine} />
      <Text style={styles.connectorArrow}>›</Text>
    </View>
  );
}

function StageNumber({ num, status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.stageNum, { backgroundColor: cfg.color }]}>
      <Text style={styles.stageNumText}>{num}</Text>
    </View>
  );
}

function ActionButton({ label, color, onPress, outline }) {
  if (outline) {
    return (
      <TouchableOpacity
        style={[styles.actionBtn, { borderColor: color, backgroundColor: 'transparent', borderWidth: 1.5 }]}
        onPress={onPress}
      >
        <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={[styles.actionBtnText, { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StageCard({ num, title, status, children, actions }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.stageCard, { borderTopColor: cfg.color, borderTopWidth: 3 }]}>
      <View style={styles.stageHeader}>
        <View style={styles.stageTitleRow}>
          <StageNumber num={num} status={status} />
          <Text style={styles.stageTitle}>{title}</Text>
        </View>
        <StatusBadge status={status} small />
      </View>
      <View style={styles.stageContent}>{children}</View>
      {actions && actions.length > 0 && (
        <View style={styles.stageActions}>
          {actions.map((a, i) => (
            <ActionButton
              key={i}
              label={a.label}
              color={a.color || cfg.color}
              onPress={a.onPress}
              outline={a.outline}
            />
          ))}
        </View>
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
      {record.moisture_level != null && type === '24h' && (
        <Text style={styles.recordMiniMoisture}>Moisture: {record.moisture_level}%</Text>
      )}
      {type === '12h' && (record.incoming_moisture != null || record.target_moisture != null) && (
        <Text style={styles.recordMiniMoisture}>
          {record.incoming_moisture != null ? `In: ${record.incoming_moisture}%` : ''}
          {record.target_moisture != null ? `  Tgt: ${record.target_moisture}%` : ''}
          {record.moisture_level != null ? `  Act: ${record.moisture_level}%` : ''}
        </Text>
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

  // Auto-refresh when screen comes back into focus (e.g., returning from a sub-screen)
  useFocusEffect(
    useCallback(() => {
      if (selectedOrderId) {
        fetchPipeline(selectedOrderId);
      } else {
        fetchOrders();
      }
    }, [selectedOrderId, fetchPipeline, fetchOrders])
  );

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

  // ── build stage actions based on current status ────────────────────────────
  const buildStageActions = (stages, order) => {
    const rawWheatActions = [];
    const transfer24hActions = [];
    const transfer12hActions = [];
    const grindingActions = [];

    // Raw Wheat
    const totalPlannedQty = (stages.raw_wheat.source_bins || []).reduce(
      (sum, b) => sum + (Number(b.planned_quantity) || 0), 0
    );
    const totalTransferredQty = (stages.transfer_24h.records || []).reduce(
      (sum, r) => sum + (Number(r.quantity_transferred) || 0), 0
    );
    const planFullyExtracted = totalPlannedQty > 0 && totalTransferredQty >= totalPlannedQty - 0.0001;

    if (stages.raw_wheat.status === 'PENDING') {
      rawWheatActions.push({
        label: '▶  Plan This Order',
        color: '#3b82f6',
        onPress: () => navigation.navigate('ProductionOrderPlanning', {
          orderId: order.id,
          returnToPipeline: true,
        }),
      });
    } else if (planFullyExtracted) {
      rawWheatActions.push({
        label: '🔒  Plan Locked',
        color: '#94a3b8',
        outline: true,
        onPress: () => {},
      });
    } else {
      rawWheatActions.push({
        label: '✏  Update Plan',
        color: '#6366f1',
        outline: true,
        onPress: () => navigation.navigate('ProductionOrderPlanning', {
          orderId: order.id,
          returnToPipeline: true,
        }),
      });
    }

    // 24-Hour Transfer
    const has24InProgress = stages.transfer_24h.records?.some(r => r.status === 'IN_PROGRESS');
    if (stages.transfer_24h.status === 'PENDING') {
      transfer24hActions.push({
        label: '▶  Start Transfer',
        color: '#3b82f6',
        onPress: () => navigation.navigate('TransferRecordingDetails', {
          order: { id: order.id, order_number: order.order_number },
          returnToPipeline: true,
        }),
      });
    } else if (has24InProgress) {
      transfer24hActions.push({
        label: '⏹  End Transfer',
        color: '#ef4444',
        onPress: () => navigation.navigate('TransferRecordingDetails', {
          order: { id: order.id, order_number: order.order_number },
          returnToPipeline: true,
        }),
      });
      transfer24hActions.push({
        label: '▶  Add More',
        color: '#3b82f6',
        outline: true,
        onPress: () => navigation.navigate('TransferRecordingDetails', {
          order: { id: order.id, order_number: order.order_number },
          returnToPipeline: true,
        }),
      });
    } else {
      transfer24hActions.push({
        label: '＋  Add Transfer',
        color: '#3b82f6',
        outline: true,
        onPress: () => navigation.navigate('TransferRecordingDetails', {
          order: { id: order.id, order_number: order.order_number },
          returnToPipeline: true,
        }),
      });
    }

    // 12-Hour Transfer
    const has12InProgress = stages.transfer_12h.records?.some(r => r.status === 'IN_PROGRESS');
    if (stages.transfer_12h.status === 'PENDING') {
      transfer12hActions.push({
        label: '▶  Start Transfer',
        color: '#3b82f6',
        onPress: () => navigation.navigate('Transfer12Hour', {
          orderId: order.id,
          orderNumber: order.order_number,
          returnToPipeline: true,
        }),
      });
    } else if (has12InProgress) {
      transfer12hActions.push({
        label: '⏹  End Transfer',
        color: '#ef4444',
        onPress: () => navigation.navigate('Transfer12Hour', {
          orderId: order.id,
          orderNumber: order.order_number,
          returnToPipeline: true,
        }),
      });
      transfer12hActions.push({
        label: '▶  Add Transfer',
        color: '#3b82f6',
        outline: true,
        onPress: () => navigation.navigate('Transfer12Hour', {
          orderId: order.id,
          orderNumber: order.order_number,
          returnToPipeline: true,
        }),
      });
    } else {
      transfer12hActions.push({
        label: '＋  Add Transfer',
        color: '#3b82f6',
        outline: true,
        onPress: () => navigation.navigate('Transfer12Hour', {
          orderId: order.id,
          orderNumber: order.order_number,
          returnToPipeline: true,
        }),
      });
    }

    // Grinding
    if (stages.grinding.status === 'PENDING') {
      grindingActions.push({
        label: '▶  Start Grinding',
        color: '#8b5cf6',
        onPress: () => navigation.navigate('Grinding', {
          orderId: order.id,
          returnToPipeline: true,
        }),
      });
    } else {
      grindingActions.push({
        label: '📋  Update Records',
        color: '#8b5cf6',
        outline: true,
        onPress: () => navigation.navigate('Grinding', {
          orderId: order.id,
          returnToPipeline: true,
        }),
      });
    }

    return { rawWheatActions, transfer24hActions, transfer12hActions, grindingActions };
  };

  // ── Order list ────────────────────────────────────────────────────────────
  if (!selectedOrderId) {
    return (
      <Layout title="Production Pipeline" navigation={navigation}>
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Production Pipeline</Text>
            <Text style={styles.pageSubtitle}>Select an order to manage all stages from one place</Text>
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
                    <View style={[styles.orderCardAccent, { backgroundColor: statusColor }]} />
                    <View style={styles.orderCardBody}>
                      <View style={styles.orderCardLeft}>
                        <Text style={styles.orderCardNumber}>{item.order_number}</Text>
                        <Text style={styles.orderCardProduct}>{item.raw_product?.product_name || '—'}</Text>
                      </View>
                      <View style={styles.orderCardRight}>
                        <View style={[styles.orderStatusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.orderStatusText}>{item.status}</Text>
                        </View>
                        <Text style={styles.orderCardQty}>{item.quantity} T</Text>
                        <Text style={styles.orderCardChevron}>›</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
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

  const renderPipelineStages = () => {
    if (!pipeline || !stages) return null;
    const { rawWheatActions, transfer24hActions, transfer12hActions, grindingActions } =
      buildStageActions(stages, order);

    // Per-bin extracted = blend_percentage × total transferred for this order
    const sourceBinsWithExtracted = (stages.raw_wheat.source_bins || []).map((b) => {
      const planned = Number(b.planned_quantity) || 0;
      const blendPct = Number(b.blend_percentage) || 0;
      const extracted = Math.min(planned, (totalTransferredQty * blendPct) / 100);
      return { ...b, extracted_quantity: extracted };
    });

    const stage1 = (
      <StageCard
        num="1"
        title="Raw Wheat"
        status={stages.raw_wheat.status}
        actions={rawWheatActions}
      >
        {sourceBinsWithExtracted.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.binRow}>
              {sourceBinsWithExtracted.map((bin, i) => (
                <View key={bin.id || i} style={{ marginRight: 10, alignItems: 'center' }}>
                  <BinVisual
                    binNumber={bin.bin_number}
                    capacity={bin.capacity}
                    currentQuantity={bin.current_quantity}
                    size="sm"
                    label={bin.blend_percentage ? `${bin.blend_percentage}% blend` : null}
                  />
                  <Text style={styles.binExtractedText}>
                    Extracted: {bin.extracted_quantity.toFixed(2)} / {(Number(bin.planned_quantity) || 0).toFixed(2)} T
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.stageNote}>
              Total extracted: {totalTransferredQty.toFixed(2)} / {totalPlannedQty.toFixed(2)} T
              {' '}({totalPlannedQty > 0 ? Math.min(100, Math.round((totalTransferredQty / totalPlannedQty) * 100)) : 0}%)
            </Text>
          </>
        ) : (
          <Text style={styles.emptyStageText}>No source bins planned yet</Text>
        )}
      </StageCard>
    );

    const stage2 = (
      <StageCard
        num="2"
        title="24-Hour Transfer"
        status={stages.transfer_24h.status}
        actions={transfer24hActions}
      >
        {stages.transfer_24h.records.length === 0 ? (
          <Text style={styles.emptyStageText}>No transfers yet — click Start Transfer</Text>
        ) : (
          <>
            {stages.transfer_24h.records.map((r) => (
              <TransferRecordMini key={r.id} record={r} type="24h" />
            ))}
            {stages.transfer_24h.records.some(r => r.destination_bin) && (
              <BinRow
                bins={stages.transfer_24h.records.filter(r => r.destination_bin).map(r => r.destination_bin)}
                size="sm"
              />
            )}
          </>
        )}
      </StageCard>
    );

    const stage3 = (
      <StageCard
        num="3"
        title="12-Hour Transfer"
        status={stages.transfer_12h.status}
        actions={transfer12hActions}
      >
        {stages.transfer_12h.records.length === 0 ? (
          <Text style={styles.emptyStageText}>Awaiting 24h transfers to complete</Text>
        ) : (
          <>
            {stages.transfer_12h.records.map((r) => (
              <TransferRecordMini key={r.id} record={r} type="12h" />
            ))}
            {stages.transfer_12h.records.some(r => r.destination_bin) && (
              <BinRow
                bins={stages.transfer_12h.records.filter(r => r.destination_bin).map(r => r.destination_bin)}
                size="sm"
              />
            )}
          </>
        )}
      </StageCard>
    );

    const stage4 = (
      <StageCard
        num="4"
        title="Grinding"
        status={stages.grinding.status}
        actions={grindingActions}
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
    );

    // Progressive disclosure: a stage only appears once the previous stage has
    // at least one COMPLETED record. Raw Wheat is always shown; 24-Hour appears
    // once raw-wheat planning exists (status != PENDING); 12-Hour appears once
    // the 24-Hour stage has at least one completed transfer; Grinding appears
    // once the 12-Hour stage has at least one completed transfer.
    const show24h = stages.raw_wheat.status !== 'PENDING';
    const has24hCompleted = (stages.transfer_24h.records || []).some(r => r.status === 'COMPLETED');
    const has12hCompleted = (stages.transfer_12h.records || []).some(r => r.status === 'COMPLETED');
    const show12h = show24h && has24hCompleted;
    const showGrind = show12h && has12hCompleted;

    if (isWide) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wideFlow}>
          <View style={styles.wideFlowInner}>
            {stage1}
            {show24h && <StageConnector />}
            {show24h && stage2}
            {show12h && <StageConnector />}
            {show12h && stage3}
            {showGrind && <StageConnector />}
            {showGrind && stage4}
          </View>
        </ScrollView>
      );
    }

    return (
      <View style={styles.narrowFlow}>
        {stage1}
        {show24h && <StageConnector vertical />}
        {show24h && stage2}
        {show12h && <StageConnector vertical />}
        {show12h && stage3}
        {showGrind && <StageConnector vertical />}
        {showGrind && stage4}
      </View>
    );
  };

  const pipelineContent = orderLoading ? (
    <View style={styles.loadingCenter}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading pipeline...</Text>
    </View>
  ) : !pipeline ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>⚠️</Text>
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
          {order.target_finish_date && (
            <Text style={styles.orderHeaderDate}>Target: {formatISTDate(order.target_finish_date)}</Text>
          )}
        </View>
        <View style={styles.orderHeaderRight}>
          <View style={[styles.orderStatusBadgeLarge, { backgroundColor: ORDER_STATUS_COLOR[order.status] || '#6b7280' }]}>
            <Text style={styles.orderStatusTextLarge}>{order.status}</Text>
          </View>
          <Text style={styles.orderHeaderQty}>{order.quantity} T</Text>
        </View>
      </View>

      {/* Pipeline hint */}
      <View style={styles.pipelineHint}>
        <Text style={styles.pipelineHintText}>
          Tap any action button below to proceed through the production stage. You'll be returned here after each step.
        </Text>
      </View>

      {/* Pipeline Flow */}
      {renderPipelineStages()}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  return (
    <Layout title="Production Pipeline" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← All Orders</Text>
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

const STAGE_CARD_WIDTH = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#1e293b',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 3,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: {
    fontSize: 14,
    color: '#fff',
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  orderCardAccent: {
    width: 5,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  orderCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardQty: {
    fontSize: 13,
    color: colors.text.secondary,
    marginRight: 6,
  },
  orderCardChevron: {
    fontSize: 20,
    color: colors.text.secondary,
    fontWeight: '300',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    margin: 14,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  orderHeaderProduct: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 3,
  },
  orderHeaderDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
    color: '#94a3b8',
    fontWeight: '600',
  },
  pipelineHint: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  pipelineHintText: {
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 18,
  },
  wideFlow: {
    paddingHorizontal: 14,
  },
  wideFlowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  narrowFlow: {
    paddingHorizontal: 14,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    width: 36,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  connectorArrow: {
    fontSize: 20,
    color: '#94a3b8',
    marginLeft: -2,
  },
  narrowConnector: {
    alignItems: 'center',
    marginVertical: 6,
  },
  narrowConnectorLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
  },
  narrowConnectorArrow: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: -4,
  },
  stageCard: {
    width: STAGE_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  stageNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  stageNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stageContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    minHeight: 60,
  },
  stageActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 0,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  binRow: {
    marginTop: 6,
  },
  stageNote: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 6,
  },
  binExtractedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStageText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  recordMini: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 5,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  recordMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMiniBins: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: 4,
  },
  recordMiniQty: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  recordMiniMoisture: {
    fontSize: 10,
    color: '#6366f1',
    marginTop: 2,
  },
  pipelineScroll: {
    flex: 1,
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
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
