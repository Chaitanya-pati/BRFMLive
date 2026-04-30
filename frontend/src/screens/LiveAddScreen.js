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
import BinVisual from '../components/BinVisual';
import { api } from '../api/client';
import { formatISTDateTime } from '../utils/dateUtils';
import colors from '../theme/colors';

const STATUS_CONFIG = {
  PENDING:     { color: '#94a3b8', bg: '#f1f5f9', label: 'Pending',     dot: '○' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fffbeb', label: 'In Progress', dot: '●' },
  COMPLETED:   { color: '#10b981', bg: '#f0fdf4', label: 'Completed',   dot: '✓' },
  PARTIAL:     { color: '#6366f1', bg: '#eef2ff', label: 'Partial',     dot: '◑' },
};

const STAGE_THEME = {
  raw:   { color: '#3b82f6', icon: '🌾', title: 'Raw Wheat' },
  t24:   { color: '#3b82f6', icon: '🔁', title: '24h Transfer' },
  t12:   { color: '#8b5cf6', icon: '⏱', title: '12h Transfer' },
  grind: { color: '#f59e0b', icon: '⚙️', title: 'Grinding' },
};

const PulseIcon = () => (
  <View style={styles.pulseWrapper}>
    <View style={styles.pulseCore} />
  </View>
);

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.dot} {cfg.label}</Text>
    </View>
  );
}

function StageNumber({ num, color }) {
  return (
    <View style={[styles.stageNum, { backgroundColor: color }]}>
      <Text style={styles.stageNumText}>{num}</Text>
    </View>
  );
}

// ── Compact mini-card shown in the 4-in-a-row layout ──────────────────────────
function StageMiniCard({ num, themeKey, status, summary, bins, expanded, onToggle }) {
  const theme = STAGE_THEME[themeKey];
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onToggle}
      style={[
        styles.miniCard,
        { borderTopColor: theme.color },
        expanded && { borderColor: theme.color, borderWidth: 2 },
      ]}
    >
      <View style={styles.miniHeader}>
        <View style={styles.miniHeaderLeft}>
          <StageNumber num={num} color={theme.color} />
          <Text style={styles.miniIcon}>{theme.icon}</Text>
          <Text style={styles.miniTitle} numberOfLines={1}>{theme.title}</Text>
        </View>
      </View>
      <View style={styles.miniStatusRow}>
        <StatusPill status={status} />
      </View>

      {/* Compact bin row */}
      {bins && bins.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniBinScroll}>
          {bins.slice(0, 4).map((bin, i) => (
            <View key={bin.id || i} style={{ marginRight: 6 }}>
              <BinVisual
                binNumber={bin.bin_number}
                capacity={bin.capacity}
                currentQuantity={bin.current_quantity}
                size="xs"
              />
            </View>
          ))}
          {bins.length > 4 && (
            <View style={styles.binMoreBadge}><Text style={styles.binMoreText}>+{bins.length - 4}</Text></View>
          )}
        </ScrollView>
      ) : (
        <Text style={styles.miniEmpty}>—</Text>
      )}

      {/* 1-line summary */}
      <Text style={styles.miniSummary} numberOfLines={2}>{summary || 'No data yet'}</Text>

      <View style={styles.miniExpand}>
        <Text style={[styles.miniExpandText, { color: theme.color }]}>
          {expanded ? '▲ Hide details' : '▼ Expand'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Expanded detail panel for each stage ─────────────────────────────────────
function ExpandedRawWheat({ bins, totalPlanned, totalTransferred }) {
  if (!bins || bins.length === 0) {
    return <Text style={styles.expandedEmpty}>No source bins planned for this order yet.</Text>;
  }
  const pct = totalPlanned > 0 ? Math.min(100, Math.round((totalTransferred / totalPlanned) * 100)) : 0;
  return (
    <View>
      <View style={styles.expandedHeaderRow}>
        <Text style={styles.expandedSubtitle}>Source Bins ({bins.length})</Text>
        <Text style={styles.expandedSubtitleRight}>
          Extracted: {totalTransferred.toFixed(2)} / {totalPlanned.toFixed(2)} T ({pct}%)
        </Text>
      </View>
      <View style={styles.binGrid}>
        {bins.map((bin, i) => {
          const planned = Number(bin.planned_quantity) || 0;
          const blendPct = Number(bin.blend_percentage) || 0;
          const extracted = Math.min(planned, (totalTransferred * blendPct) / 100);
          return (
            <View key={bin.id || i} style={styles.binTile}>
              <BinVisual
                binNumber={bin.bin_number}
                capacity={bin.capacity}
                currentQuantity={bin.current_quantity}
                size="sm"
                label={blendPct ? `${blendPct}% blend` : null}
              />
              <Text style={styles.binTileExtracted}>
                {extracted.toFixed(2)} / {planned.toFixed(2)} T
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ExpandedTransferRecords({ records, type, magnetRecords }) {
  if ((!records || records.length === 0) && (!magnetRecords || magnetRecords.length === 0)) {
    return <Text style={styles.expandedEmpty}>No transfer records yet.</Text>;
  }

  return (
    <View>
      {records && records.length > 0 && (
        <>
          <Text style={styles.expandedSubtitle}>
            Transfer Records ({records.length})
          </Text>
          {records.map((r, i) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
            return (
              <View key={r.id || i} style={[styles.transferRow, { borderLeftColor: cfg.color }]}>
                <View style={styles.transferRowHeader}>
                  <Text style={styles.transferBinFlow}>
                    {type === '12h'
                      ? `${r.source_bin?.bin_number || '—'} → ${r.destination_bin?.bin_number || '—'}`
                      : `→ ${r.destination_bin?.bin_number || '—'}`}
                  </Text>
                  <StatusPill status={r.status} />
                </View>
                <View style={styles.transferGrid}>
                  <KV label="Start" value={r.transfer_start_time ? formatISTDateTime(r.transfer_start_time) : '—'} />
                  <KV label="End" value={r.transfer_end_time ? formatISTDateTime(r.transfer_end_time) : '—'} />
                  <KV label="Quantity" value={r.quantity_transferred != null ? `${r.quantity_transferred} T` : '—'} />
                  {type === '12h' ? (
                    <>
                      <KV label="In M%" value={r.incoming_moisture != null ? `${r.incoming_moisture}%` : '—'} />
                      <KV label="Tgt M%" value={r.target_moisture != null ? `${r.target_moisture}%` : '—'} />
                      <KV label="Act M%" value={r.moisture_level != null ? `${r.moisture_level}%` : '—'} />
                      <KV label="Water" value={r.water_added != null ? `${r.water_added} L` : '—'} />
                    </>
                  ) : (
                    <>
                      <KV label="Water" value={r.water_added != null ? `${r.water_added} L` : '—'} />
                      <KV label="Moisture" value={r.moisture_level != null ? `${r.moisture_level}%` : '—'} />
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Magnet Cleaning Records */}
      {magnetRecords && magnetRecords.length > 0 && (
        <View style={styles.magnetSection}>
          <View style={styles.magnetHeader}>
            <Text style={styles.magnetIcon}>🧲</Text>
            <Text style={styles.expandedSubtitle}>
              Magnet Cleaning Records ({magnetRecords.length})
            </Text>
          </View>
          {magnetRecords.map((m, i) => (
            <View key={m.id || i} style={styles.magnetRow}>
              <View style={styles.magnetRowHeader}>
                <Text style={styles.magnetName}>
                  {m.magnet?.magnet_name || `Magnet #${m.magnet_id}`}
                </Text>
                <Text style={styles.magnetTime}>
                  {m.cleaning_timestamp ? formatISTDateTime(m.cleaning_timestamp) : '—'}
                </Text>
              </View>
              <View style={styles.transferGrid}>
                {m.source_bin_id ? (
                  <KV label="Source bin" value={`#${m.source_bin_id}`} />
                ) : null}
                {m.destination_bin_id ? (
                  <KV label="Dest bin" value={`#${m.destination_bin_id}`} />
                ) : null}
                {m.notes ? <KV label="Notes" value={m.notes} /> : null}
              </View>
              {(m.before_cleaning_photo || m.after_cleaning_photo) && (
                <View style={styles.magnetPhotosRow}>
                  {m.before_cleaning_photo && (
                    <View style={styles.magnetPhotoBox}>
                      <Text style={styles.magnetPhotoLabel}>Before</Text>
                      <Text style={styles.magnetPhotoLink} numberOfLines={1}>📷 photo</Text>
                    </View>
                  )}
                  {m.after_cleaning_photo && (
                    <View style={styles.magnetPhotoBox}>
                      <Text style={styles.magnetPhotoLabel}>After</Text>
                      <Text style={styles.magnetPhotoLink} numberOfLines={1}>📷 photo</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ExpandedGrinding({ bins, hourlyCount }) {
  if ((!bins || bins.length === 0) && !hourlyCount) {
    return <Text style={styles.expandedEmpty}>No grinding data yet.</Text>;
  }
  return (
    <View>
      {bins && bins.length > 0 && (
        <>
          <Text style={styles.expandedSubtitle}>Grinding Bins ({bins.length})</Text>
          <View style={styles.binGrid}>
            {bins.map((bin, i) => (
              <View key={bin.id || i} style={styles.binTile}>
                <BinVisual
                  binNumber={bin.bin_number}
                  capacity={bin.capacity}
                  currentQuantity={bin.current_quantity}
                  size="sm"
                />
              </View>
            ))}
          </View>
        </>
      )}
      {hourlyCount > 0 && (
        <Text style={styles.expandedNote}>
          {hourlyCount} hourly production record{hourlyCount !== 1 ? 's' : ''} captured.
        </Text>
      )}
    </View>
  );
}

function KV({ label, value }) {
  return (
    <View style={styles.kvCell}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{String(value)}</Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function LiveAddScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [liveOrders, setLiveOrders] = useState([]);
  const [rawWheatSessions, setRawWheatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [magnetRecords, setMagnetRecords] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedStage, setExpandedStage] = useState(null);

  const isWide = width >= 768;

  const fetchLiveOrders = useCallback(async () => {
    try {
      const [ordersRes, sessionsRes] = await Promise.all([
        api.get('/live-production'),
        api.get('/transfer-sessions?status=active').catch(() => ({ data: [] })),
      ]);
      setLiveOrders(ordersRes.data || []);
      setRawWheatSessions(sessionsRes.data || []);
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

  const fetchDetail = useCallback(async (orderId) => {
    setDetailLoading(true);
    try {
      const [pipeRes, magRes] = await Promise.all([
        api.get(`/production-orders/${orderId}/pipeline`),
        api.get(`/magnet-cleaning-records?production_order_id=${orderId}&limit=200`),
      ]);
      setPipeline(pipeRes.data);
      setMagnetRecords(magRes.data || []);
    } catch (err) {
      console.error('Error fetching detail:', err);
      setPipeline(null);
      setMagnetRecords([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCardPress = async (order) => {
    setSelectedOrder(order);
    setPipeline(null);
    setMagnetRecords([]);
    setExpandedStage(null);
    await fetchDetail(order.production_order_id);
  };

  const handleBack = () => {
    setSelectedOrder(null);
    setPipeline(null);
    setMagnetRecords([]);
    setExpandedStage(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedOrder) {
      fetchDetail(selectedOrder.production_order_id).finally(() => setRefreshing(false));
    } else {
      fetchLiveOrders();
    }
  };

  // ── Loading initial list ──────────────────────────────────────────────────
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

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selectedOrder) {
    const stages = pipeline?.stages;
    const order = pipeline?.order;

    // Magnet records grouped by destination bin role (24h vs 12h)
    // Records that match a 24h destination bin → 24h section
    // Records that match a 12h destination bin → 12h section
    const dest24Ids = new Set((stages?.transfer_24h?.records || [])
      .map(r => r.destination_bin?.id).filter(Boolean));
    const dest12Ids = new Set((stages?.transfer_12h?.records || [])
      .map(r => r.destination_bin?.id).filter(Boolean));
    const magnetRecords24 = magnetRecords.filter(m => m.destination_bin_id && dest24Ids.has(m.destination_bin_id));
    const magnetRecords12 = magnetRecords.filter(m => m.destination_bin_id && dest12Ids.has(m.destination_bin_id));

    // Stage summaries (1-line)
    let rawSummary = '—', t24Summary = '—', t12Summary = '—', grindSummary = '—';
    let totalPlanned = 0, totalTransferred = 0;
    let rawBins = [], t24Bins = [], t12Bins = [], grindBins = [];
    if (stages) {
      rawBins = stages.raw_wheat.source_bins || [];
      t24Bins = (stages.transfer_24h.records || [])
        .filter(r => r.destination_bin)
        .map(r => r.destination_bin);
      t12Bins = (stages.transfer_12h.records || [])
        .filter(r => r.destination_bin)
        .map(r => r.destination_bin);
      grindBins = stages.grinding.bins || [];

      totalPlanned = rawBins.reduce((s, b) => s + (Number(b.planned_quantity) || 0), 0);
      totalTransferred = (stages.transfer_24h.records || []).reduce(
        (s, r) => s + (Number(r.quantity_transferred) || 0), 0
      );

      rawSummary = rawBins.length > 0
        ? `${rawBins.length} bin${rawBins.length !== 1 ? 's' : ''} · ${totalPlanned.toFixed(1)} T planned`
        : 'Not planned';
      t24Summary = stages.transfer_24h.records.length > 0
        ? `${stages.transfer_24h.records.length} transfer${stages.transfer_24h.records.length !== 1 ? 's' : ''} · ${totalTransferred.toFixed(1)} T`
        : 'No transfers';
      const t12TotalQty = (stages.transfer_12h.records || []).reduce(
        (s, r) => s + (Number(r.quantity_transferred) || 0), 0
      );
      t12Summary = stages.transfer_12h.records.length > 0
        ? `${stages.transfer_12h.records.length} transfer${stages.transfer_12h.records.length !== 1 ? 's' : ''} · ${t12TotalQty.toFixed(1)} T`
        : 'No transfers';
      grindSummary = stages.grinding.hourly_records_count > 0
        ? `${stages.grinding.hourly_records_count} hourly record${stages.grinding.hourly_records_count !== 1 ? 's' : ''}`
        : (grindBins.length > 0 ? `${grindBins.length} bin${grindBins.length !== 1 ? 's' : ''}` : 'No data');
    }

    const toggleStage = (key) => setExpandedStage(prev => prev === key ? null : key);

    return (
      <Layout title="Live" navigation={navigation} currentRoute="LiveAdd">
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Back to Live Orders</Text>
          </TouchableOpacity>

          {/* Compact header */}
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <PulseIcon />
              <View style={styles.detailHeaderText}>
                <Text style={styles.detailTitle}>{selectedOrder.order_number}</Text>
                <Text style={styles.detailSub}>
                  {selectedOrder.branch_name}
                  {order?.raw_product?.product_name ? ` · ${order.raw_product.product_name}` : ''}
                  {order?.quantity ? ` · ${order.quantity} T` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.liveBadgeWrap}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>

          {/* Quick navigation shortcuts */}
          <View style={styles.shortcutsWrap}>
            <View style={[styles.shortcutsRow, isWide && styles.shortcutsRowWide]}>
              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => navigation.navigate('TransferRecordingDetails', {
                  order: { id: selectedOrder.production_order_id, order_number: selectedOrder.order_number, branch_name: selectedOrder.branch_name },
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
                <Text style={styles.shortcutBtnText}>Pipeline</Text>
              </TouchableOpacity>
            </View>
          </View>

          {detailLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !pipeline ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>⚠️</Text>
              <Text style={styles.emptyStateTitle}>Could not load details</Text>
            </View>
          ) : (
            <>
              {/* 4 stages in one row (or stacked on mobile) */}
              <View style={styles.stageRowWrap}>
                <Text style={styles.sectionLabel}>PRODUCTION STAGES</Text>
                <View style={[styles.stageRow, !isWide && styles.stageRowStacked]}>
                  <StageMiniCard
                    num="1"
                    themeKey="raw"
                    status={stages.raw_wheat.status}
                    summary={rawSummary}
                    bins={rawBins}
                    expanded={expandedStage === 'raw'}
                    onToggle={() => toggleStage('raw')}
                  />
                  <StageMiniCard
                    num="2"
                    themeKey="t24"
                    status={stages.transfer_24h.status}
                    summary={t24Summary}
                    bins={t24Bins}
                    expanded={expandedStage === 't24'}
                    onToggle={() => toggleStage('t24')}
                  />
                  <StageMiniCard
                    num="3"
                    themeKey="t12"
                    status={stages.transfer_12h.status}
                    summary={t12Summary}
                    bins={t12Bins}
                    expanded={expandedStage === 't12'}
                    onToggle={() => toggleStage('t12')}
                  />
                  <StageMiniCard
                    num="4"
                    themeKey="grind"
                    status={stages.grinding.status}
                    summary={grindSummary}
                    bins={grindBins}
                    expanded={expandedStage === 'grind'}
                    onToggle={() => toggleStage('grind')}
                  />
                </View>
              </View>

              {/* Expanded stage details */}
              {expandedStage && (
                <View style={[styles.expandedPanel, { borderTopColor: STAGE_THEME[expandedStage].color }]}>
                  <View style={styles.expandedHeader}>
                    <Text style={styles.expandedIcon}>{STAGE_THEME[expandedStage].icon}</Text>
                    <Text style={styles.expandedTitle}>{STAGE_THEME[expandedStage].title} — Details</Text>
                    <TouchableOpacity onPress={() => setExpandedStage(null)} style={styles.expandedClose}>
                      <Text style={styles.expandedCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.expandedBody}>
                    {expandedStage === 'raw' && (
                      <ExpandedRawWheat
                        bins={rawBins}
                        totalPlanned={totalPlanned}
                        totalTransferred={totalTransferred}
                      />
                    )}
                    {expandedStage === 't24' && (
                      <ExpandedTransferRecords
                        records={stages.transfer_24h.records}
                        type="24h"
                        magnetRecords={magnetRecords24}
                      />
                    )}
                    {expandedStage === 't12' && (
                      <ExpandedTransferRecords
                        records={stages.transfer_12h.records}
                        type="12h"
                        magnetRecords={magnetRecords12}
                      />
                    )}
                    {expandedStage === 'grind' && (
                      <ExpandedGrinding
                        bins={grindBins}
                        hourlyCount={stages.grinding.hourly_records_count}
                      />
                    )}
                  </View>
                </View>
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Layout>
    );
  }

  // ── List view (unchanged) ─────────────────────────────────────────────────
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

        {/* ── RAW Wheat Bin Process (active transfer sessions) ─────────── */}
        {rawWheatSessions.length > 0 && (
          <View style={styles.liveSection}>
            <View style={styles.liveSectionHeader}>
              <Text style={styles.liveSectionTitle}>RAW Wheat Bin Process</Text>
              <Text style={styles.liveSectionSubtitle}>
                {rawWheatSessions.length} active transfer{rawWheatSessions.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={[styles.cardGrid, isWide && styles.cardGridWide]}>
              {rawWheatSessions.map((session) => {
                const sourceName = session.source_godown?.name || `Godown #${session.source_godown_id}`;
                const destName =
                  session.current_bin?.bin_number ||
                  session.destination_bin?.bin_number ||
                  `Bin #${session.current_bin_id || session.destination_bin_id}`;
                const magnetName = session.magnet?.name || null;
                const qty =
                  session.transferred_quantity != null
                    ? `${parseFloat(session.transferred_quantity).toFixed(2)} T`
                    : '— T';
                return (
                  <View
                    key={session.id}
                    style={[styles.card, isWide ? { width: cardWidth } : { width: '100%' }]}
                  >
                    <View style={styles.cardBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                    <Text style={styles.cardTitle}>Transfer #{session.id}</Text>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>From</Text>
                      <Text style={styles.cardValue}>{sourceName}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>To</Text>
                      <Text style={styles.cardValue}>{destName}</Text>
                    </View>
                    {magnetName && (
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Magnet</Text>
                        <Text style={styles.cardValue}>{magnetName}</Text>
                      </View>
                    )}
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Transferred</Text>
                      <Text style={styles.cardValue}>{qty}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Started</Text>
                      <Text style={styles.cardValue}>
                        {session.start_timestamp
                          ? formatISTDateTime(session.start_timestamp)
                          : '—'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Production Orders ───────────────────────────────────────── */}
        {liveOrders.length === 0 && rawWheatSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Live Production Orders</Text>
            <Text style={styles.emptyStateText}>
              There are currently no active production orders.
            </Text>
          </View>
        ) : liveOrders.length > 0 ? (
          <View style={styles.liveSection}>
            <View style={styles.liveSectionHeader}>
              <Text style={styles.liveSectionTitle}>Production Process</Text>
              <Text style={styles.liveSectionSubtitle}>
                {liveOrders.length} active order{liveOrders.length === 1 ? '' : 's'}
              </Text>
            </View>
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
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  containerWide: { paddingHorizontal: 32, paddingVertical: 20 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, flexWrap: 'wrap', gap: 10,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  refreshBtn: {
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f3f4f6',
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  refreshBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  pulseWrapper: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef444433',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pulseCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },

  liveSection: { marginBottom: 24 },
  liveSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  liveSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  liveSectionSubtitle: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },

  cardGrid: { gap: 14 },
  cardGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 18,
    borderWidth: 1, borderColor: '#e5e7eb',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }, default: { elevation: 3 } }),
  },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveBadgeText: { fontSize: 11, fontWeight: '700', color: '#ef4444', letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardLabel: { fontSize: 13, color: '#6b7280' },
  cardValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  cardFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  tapHint: { fontSize: 12, color: colors.primary, textAlign: 'right', fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 340, lineHeight: 20 },

  backBtn: { marginBottom: 12 },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  // Detail header
  detailHeader: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e7eb', flexWrap: 'wrap', gap: 8,
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }, default: { elevation: 2 } }),
  },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  detailHeaderText: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detailSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  liveBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#fef2f2', borderRadius: 12 },

  // Shortcuts
  shortcutsWrap: {
    marginBottom: 14, backgroundColor: '#f8fafc', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', padding: 10,
  },
  shortcutsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  shortcutsRowWide: { flexWrap: 'nowrap' },
  shortcutBtn: {
    flex: 1, minWidth: 80, flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 6, gap: 3,
  },
  shortcutIcon: { fontSize: 16 },
  shortcutBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Stage row
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
  stageRowWrap: { marginBottom: 14 },
  stageRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  stageRowStacked: { flexDirection: 'column' },

  miniCard: {
    flex: 1,
    backgroundColor: '#fff', borderRadius: 10,
    borderTopWidth: 3, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 10, minHeight: 168,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 1 } }),
  },
  miniHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  miniHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  stageNum: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stageNumText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  miniIcon: { fontSize: 14 },
  miniTitle: { fontSize: 12, fontWeight: '700', color: '#111827', flex: 1, minWidth: 0 },
  miniStatusRow: { marginBottom: 8 },
  miniBinScroll: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  miniEmpty: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', paddingVertical: 12, textAlign: 'center' },
  miniSummary: { fontSize: 11, color: '#475569', marginTop: 6, lineHeight: 14 },
  miniExpand: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  miniExpandText: { fontSize: 11, fontWeight: '700' },

  binMoreBadge: {
    paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#f1f5f9',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  binMoreText: { fontSize: 10, color: '#64748b', fontWeight: '700' },

  statusPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  // Expanded panel
  expandedPanel: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#e5e7eb', borderTopWidth: 4, overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }, default: { elevation: 2 } }),
  },
  expandedHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc',
  },
  expandedIcon: { fontSize: 18 },
  expandedTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  expandedClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  expandedCloseText: { fontSize: 13, color: '#475569', fontWeight: '700' },
  expandedBody: { padding: 14 },
  expandedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, gap: 8 },
  expandedSubtitle: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  expandedSubtitleRight: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  expandedEmpty: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  expandedNote: { fontSize: 12, color: '#64748b', marginTop: 8 },

  binGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  binTile: { alignItems: 'center', minWidth: 80 },
  binTileExtracted: { fontSize: 10, fontWeight: '600', color: '#10b981', marginTop: 4, textAlign: 'center' },

  transferRow: {
    backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3,
    padding: 10, marginBottom: 8,
  },
  transferRowHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, flexWrap: 'wrap', gap: 6,
  },
  transferBinFlow: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  transferGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kvCell: { minWidth: 90 },
  kvLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kvValue: { fontSize: 12, color: '#1e293b', fontWeight: '600', marginTop: 2 },

  // Magnet section
  magnetSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  magnetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  magnetIcon: { fontSize: 16 },
  magnetRow: {
    backgroundColor: '#fef9c3', borderRadius: 8, padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  magnetRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  magnetName: { fontSize: 13, fontWeight: '700', color: '#854d0e' },
  magnetTime: { fontSize: 11, color: '#92400e' },
  magnetPhotosRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  magnetPhotoBox: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  magnetPhotoLabel: { fontSize: 9, fontWeight: '700', color: '#92400e', letterSpacing: 0.5 },
  magnetPhotoLink: { fontSize: 11, color: '#1d4ed8', marginTop: 1 },
});
