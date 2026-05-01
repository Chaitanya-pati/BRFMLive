
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { 
  transferSessionApi, 
  magnetCleaningRecordApi, 
  godownApi, 
  binApi, 
  magnetApi,
  vehicleApi,
  labTestApi,
  unloadingApi
} from '../api/client';
import colors from '../theme/colors';
import { formatISTDateTime, formatISTDate } from '../utils/dateUtils';
import { showError, showSuccess } from '../utils/customAlerts';

export default function ReportsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeTab, setActiveTab] = useState('timeline');

  // Timeline tab state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);

  // Traceability tab state
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [labTestModalVisible, setLabTestModalVisible] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    if (activeTab === 'timeline') {
      loadTimelineData();
    } else if (activeTab === 'traceability') {
      loadVehiclesInDateRange();
    }
  }, [activeTab, selectedDate, startDate, endDate]);

  const loadMasterData = async () => {
    try {
      const [godownsRes, binsRes, magnetsRes] = await Promise.all([
        godownApi.getAll(),
        binApi.getAll(),
        magnetApi.getAll(),
      ]);
      setGodowns(godownsRes.data);
      setBins(binsRes.data);
      setMagnets(magnetsRes.data);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  // Timeline functions
  const loadTimelineData = async () => {
    setTimelineLoading(true);
    try {
      const [sessionsRes, cleaningRecordsRes] = await Promise.all([
        transferSessionApi.getAll(),
        magnetCleaningRecordApi.getAll(),
      ]);

      const selectedDateStr = formatISTDate(selectedDate);
      
      const filteredSessions = sessionsRes.data.filter(session => {
        const sessionDate = formatISTDate(new Date(session.start_timestamp));
        return sessionDate === selectedDateStr;
      });

      const enrichedTimeline = filteredSessions.map(session => {
        const sessionCleaningRecords = cleaningRecordsRes.data.filter(
          record => record.transfer_session_id === session.id
        );

        const events = [];
        
        events.push({
          type: 'start',
          timestamp: session.start_timestamp,
          description: `Transfer started from ${getGodownName(session.source_godown_id)} to ${getBinName(session.destination_bin_id)}`,
        });

        if (session.bin_transfers && session.bin_transfers.length > 0) {
          session.bin_transfers.forEach((transfer, index) => {
            if (index > 0) {
              events.push({
                type: 'divert',
                timestamp: transfer.start_timestamp,
                description: `Diverted to ${getBinName(transfer.bin_id)}`,
                quantity: transfer.quantity,
              });
            }
          });
        }

        sessionCleaningRecords.forEach(record => {
          events.push({
            type: 'cleaning',
            timestamp: record.cleaning_timestamp,
            description: `Magnet cleaned: ${getMagnetName(record.magnet_id)}`,
            magnetDetails: magnets.find(m => m.id === record.magnet_id),
            notes: record.notes,
          });
        });

        if (session.stop_timestamp) {
          events.push({
            type: 'stop',
            timestamp: session.stop_timestamp,
            description: `Transfer completed`,
            quantity: session.transferred_quantity,
          });
        }

        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return {
          session,
          events,
          cleaningRecords: sessionCleaningRecords,
        };
      });

      setTimelineData(enrichedTimeline);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      showError('Failed to load timeline data');
    } finally {
      setTimelineLoading(false);
    }
  };

  // Traceability functions
  const loadVehiclesInDateRange = async () => {
    try {
      const response = await vehicleApi.getAll();
      const startDateStr = formatISTDate(startDate);
      const endDateStr = formatISTDate(endDate);

      const filteredVehicles = response.data.filter(vehicle => {
        const arrivalDate = formatISTDate(new Date(vehicle.arrival_time));
        return arrivalDate >= startDateStr && arrivalDate <= endDateStr;
      });

      setVehicles(filteredVehicles);
      setSelectedVehicle(null);
      setTraceabilityData(null);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      showError('Failed to load vehicles');
    }
  };

  const loadTraceabilityReport = async () => {
    if (!selectedVehicle) return;

    setTraceabilityLoading(true);
    try {
      const [labTestsRes, unloadingRes] = await Promise.all([
        labTestApi.getAll(),
        unloadingApi.getAll(),
      ]);

      const labTest = labTestsRes.data.find(test => test.vehicle_entry_id === selectedVehicle.id);
      const unloading = unloadingRes.data.find(u => u.vehicle_entry_id === selectedVehicle.id);

      setTraceabilityData({
        vehicle: selectedVehicle,
        labTest: labTest || null,
        unloading: unloading || null,
      });
    } catch (error) {
      console.error('Error loading traceability data:', error);
      showError('Failed to load traceability report');
    } finally {
      setTraceabilityLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehicle) {
      loadTraceabilityReport();
    }
  }, [selectedVehicle]);

  const getGodownName = (id) => {
    if (!id) return 'Unknown';
    const godown = godowns.find(g => g.id === parseInt(id));
    return godown ? godown.name : `Godown #${id}`;
  };

  const getBinName = (id) => {
    if (!id) return 'Unknown';
    const bin = bins.find(b => b.id === parseInt(id));
    return bin ? bin.bin_number : `Bin #${id}`;
  };

  const getMagnetName = (id) => {
    if (!id) return 'Unknown';
    const magnet = magnets.find(m => m.id === parseInt(id));
    return magnet ? magnet.name : `Magnet #${id}`;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'start': return '🚀';
      case 'divert': return '🔀';
      case 'cleaning': return '🧹';
      case 'stop': return '✅';
      default: return '📍';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'start': return '#3b82f6';
      case 'divert': return '#f59e0b';
      case 'cleaning': return '#10b981';
      case 'stop': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const renderTimelineTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Raw Wheat Bin Process Timeline</Text>
        <View style={styles.dateInputContainer}>
          <Text style={styles.label}>Select Date</Text>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              backgroundColor: '#fff',
            }}
          />
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadTimelineData}
          disabled={timelineLoading}
        >
          <Text style={styles.refreshButtonText}>
            {timelineLoading ? 'Loading...' : 'Refresh Timeline'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {timelineLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading timeline...</Text>
          </View>
        ) : timelineData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transfer sessions found for this date</Text>
          </View>
        ) : (
          timelineData.map((data, index) => (
            <View key={index} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionTitle}>Session #{data.session.id}</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: data.session.status === 'active' ? '#10b981' : '#6b7280' 
                }]}>
                  <Text style={styles.statusText}>{data.session.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.sessionInfo}>
                <Text style={styles.sessionRoute}>
                  {getGodownName(data.session.source_godown_id)} → {getBinName(data.session.destination_bin_id)}
                </Text>
                {data.session.transferred_quantity && (
                  <Text style={styles.sessionQuantity}>
                    Transferred: {data.session.transferred_quantity} tons
                  </Text>
                )}
              </View>

              <View style={styles.timeline}>
                {data.events.map((event, eventIndex) => (
                  <View key={eventIndex} style={styles.timelineEvent}>
                    <View style={styles.timelineIconContainer}>
                      <View style={[styles.timelineIcon, { backgroundColor: getEventColor(event.type) }]}>
                        <Text style={styles.timelineIconText}>{getEventIcon(event.type)}</Text>
                      </View>
                      {eventIndex < data.events.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTime}>{formatISTDateTime(event.timestamp)}</Text>
                      <Text style={styles.timelineDescription}>{event.description}</Text>
                      
                      {event.quantity && (
                        <Text style={styles.timelineQuantity}>Quantity: {event.quantity} tons</Text>
                      )}
                      
                      {event.magnetDetails && (
                        <View style={styles.magnetDetails}>
                          <Text style={styles.magnetDetailLabel}>Magnet Details:</Text>
                          <Text style={styles.magnetDetailText}>• Name: {event.magnetDetails.name}</Text>
                          {event.magnetDetails.description && (
                            <Text style={styles.magnetDetailText}>• Description: {event.magnetDetails.description}</Text>
                          )}
                          {event.notes && (
                            <Text style={styles.magnetDetailText}>• Notes: {event.notes}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {data.cleaningRecords.length > 0 && (
                <View style={styles.cleaningSummary}>
                  <Text style={styles.cleaningSummaryTitle}>
                    Total Cleanings: {data.cleaningRecords.length}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderTraceabilityTab = () => {
    const v = traceabilityData?.vehicle;
    const lt = traceabilityData?.labTest;
    const ul = traceabilityData?.unloading;

    const hasGateIn = v && Number(v.gross_weight) > 0;
    const hasGateOut = v && Number(v.empty_weight) > 0;
    const netKg = hasGateIn && hasGateOut
      ? (Number(v.gross_weight) - Number(v.empty_weight))
      : null;

    const stages = [
      {
        key: 'entry',
        icon: '🚛',
        title: 'Gate Entry',
        subtitle: 'Vehicle arrival recorded',
        done: true,
        color: '#10b981',
        rows: v ? [
          { label: 'Vehicle No.', value: v.vehicle_number },
          { label: 'Supplier', value: v.supplier?.supplier_name || '—' },
          { label: 'Bill No.', value: v.bill_no || '—' },
          { label: 'Arrival Time', value: formatISTDateTime(v.arrival_time) },
          { label: 'Driver', value: v.driver_name || '—' },
          { label: 'Driver Phone', value: v.driver_phone || '—' },
        ] : [],
      },
      {
        key: 'lab',
        icon: '🔬',
        title: 'Lab Test',
        subtitle: lt
          ? (lt.approved ? 'Tested & Approved' : 'Tested · Awaiting Approval')
          : 'Pending',
        done: !!lt,
        approved: lt?.approved,
        color: lt ? (lt.approved ? '#10b981' : '#f59e0b') : '#d1d5db',
        rows: lt ? [
          { label: 'Test Date', value: formatISTDate(lt.test_date) },
          { label: 'Wheat Variety', value: lt.wheat_variety || '—' },
          { label: 'Category', value: lt.category || '—' },
          { label: 'Moisture %', value: lt.moisture != null ? `${lt.moisture}%` : '—' },
          { label: 'Protein %', value: lt.protein_percent != null ? `${lt.protein_percent}%` : '—' },
          { label: 'Wet Gluten %', value: lt.wet_gluten != null ? `${lt.wet_gluten}%` : '—' },
          { label: 'Total Impurities %', value: lt.total_impurities != null ? `${lt.total_impurities}%` : '—' },
          { label: 'Total Dockage %', value: lt.total_dockage != null ? `${lt.total_dockage}%` : '—' },
          { label: 'Tested By', value: lt.tested_by || '—' },
          { label: 'Remarks', value: lt.remarks || '—' },
          { label: 'Claim Status', value: lt.raise_claim ? '⚠️ Claim Raised' : '✅ No Claim' },
        ] : [],
        action: lt ? {
          label: 'View Full Lab Report',
          onPress: () => { setSelectedLabTest(lt); setLabTestModalVisible(true); },
        } : null,
      },
      {
        key: 'gatein',
        icon: '⚖️',
        title: 'Gate-In (Loaded)',
        subtitle: hasGateIn ? `${v.gross_weight} kg recorded` : 'Pending',
        done: hasGateIn,
        color: hasGateIn ? '#3b82f6' : '#d1d5db',
        rows: hasGateIn ? [
          { label: 'Gross Weight', value: `${v.gross_weight} kg` },
        ] : [],
      },
      {
        key: 'unloading',
        icon: '📦',
        title: 'Unloading',
        subtitle: ul ? `${ul.godown?.name || 'Godown'}` : 'Pending',
        done: !!ul,
        color: ul ? '#8b5cf6' : '#d1d5db',
        rows: ul ? [
          { label: 'Godown', value: ul.godown?.name || '—' },
          { label: 'Start Time', value: formatISTDateTime(ul.unloading_start_time) },
          { label: 'End Time', value: ul.unloading_end_time ? formatISTDateTime(ul.unloading_end_time) : '—' },
          { label: 'Gross Weight', value: ul.gross_weight ? `${ul.gross_weight} kg` : '—' },
          { label: 'Empty Wt (Vehicle)', value: ul.empty_vehicle_weight ? `${ul.empty_vehicle_weight} kg` : '—' },
          { label: 'Net Weight', value: ul.net_weight ? `${(ul.net_weight / 1000).toFixed(2)} T` : '—' },
        ] : [],
      },
      {
        key: 'gateout',
        icon: '🚪',
        title: 'Gate-Out (Empty)',
        subtitle: hasGateOut
          ? `${v.empty_weight} kg · Net ${netKg ? (netKg / 1000).toFixed(2) + ' T' : '—'}`
          : 'Pending',
        done: hasGateOut,
        color: hasGateOut ? '#1e3a5f' : '#d1d5db',
        rows: hasGateOut ? [
          { label: 'Empty Weight', value: `${v.empty_weight} kg` },
          ...(netKg != null ? [{ label: 'Net Weight', value: `${(netKg / 1000).toFixed(2)} T`, highlight: true }] : []),
          ...(v.notes ? [{ label: 'Notes', value: v.notes }] : []),
        ] : [],
      },
    ];

    return (
      <View style={styles.tabContent}>
        {/* Filter header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vehicle Traceability</Text>
          <View style={styles.dateRangeContainer}>
            <View style={styles.datePickerWrapper}>
              <Text style={styles.label}>From</Text>
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value + 'T00:00:00'))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </View>
            <View style={styles.datePickerWrapper}>
              <Text style={styles.label}>To</Text>
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value + 'T00:00:00'))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </View>
          </View>
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>
              Select Vehicle{vehicles.length > 0 ? ` (${vehicles.length} found)` : ''}
            </Text>
            <Picker
              selectedValue={selectedVehicle?.id || ''}
              onValueChange={(value) => {
                const vehicle = vehicles.find(vv => vv.id === parseInt(value));
                setSelectedVehicle(vehicle || null);
              }}
              style={styles.picker}
            >
              <Picker.Item label="— Choose a vehicle —" value="" />
              {vehicles.map((vv) => (
                <Picker.Item
                  key={vv.id}
                  label={`${vv.vehicle_number}  ·  ${vv.supplier?.supplier_name || 'Unknown'}  ·  ${formatISTDate(vv.arrival_time)}`}
                  value={vv.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {traceabilityLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading traceability report…</Text>
            </View>
          ) : !traceabilityData ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyText}>
                {vehicles.length === 0
                  ? 'No vehicles found in the selected date range.'
                  : 'Select a vehicle above to view its full traceability timeline.'}
              </Text>
            </View>
          ) : (
            <>
              {/* Vehicle header card */}
              <View style={ts.headerCard}>
                <Text style={ts.vehicleNum}>{v.vehicle_number}</Text>
                <Text style={ts.vehicleSub}>
                  {v.supplier?.supplier_name || '—'}  ·  Bill: {v.bill_no || '—'}
                </Text>
                <Text style={ts.vehicleSub}>Arrived: {formatISTDateTime(v.arrival_time)}</Text>
                <View style={[ts.overallBadge, { backgroundColor: hasGateOut ? '#d1fae5' : '#fef3c7' }]}>
                  <Text style={[ts.overallBadgeText, { color: hasGateOut ? '#065f46' : '#92400e' }]}>
                    {hasGateOut ? '✅ Completed' : '⏳ In Progress'}
                  </Text>
                </View>
              </View>

              {/* Timeline */}
              <View style={ts.timelineWrap}>
                {stages.map((stage, idx) => (
                  <View key={stage.key} style={ts.stageRow}>
                    {/* Left: connector + dot */}
                    <View style={ts.connectorCol}>
                      {idx > 0 && (
                        <View style={[ts.connectorLine, { backgroundColor: stages[idx - 1].done ? stages[idx - 1].color : '#d1d5db' }]} />
                      )}
                      <View style={[ts.stageDot, { backgroundColor: stage.done ? stage.color : '#fff', borderColor: stage.done ? stage.color : '#d1d5db' }]}>
                        <Text style={ts.stageIcon}>{stage.done ? stage.icon : '○'}</Text>
                      </View>
                      {idx < stages.length - 1 && (
                        <View style={[ts.connectorLineBottom, { backgroundColor: stage.done ? stage.color : '#d1d5db' }]} />
                      )}
                    </View>

                    {/* Right: content card */}
                    <View style={[ts.stageCard, stage.done && ts.stageCardDone]}>
                      <View style={ts.stageCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[ts.stageTitle, stage.done && { color: stage.color }]}>{stage.title}</Text>
                          <Text style={ts.stageSub}>{stage.subtitle}</Text>
                        </View>
                        <View style={[ts.stageBadge, { backgroundColor: stage.done ? stage.color + '20' : '#f3f4f6' }]}>
                          <Text style={[ts.stageBadgeText, { color: stage.done ? stage.color : '#9ca3af' }]}>
                            {stage.done ? 'Done' : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      {stage.done && stage.rows.length > 0 && (
                        <View style={ts.stageRows}>
                          {stage.rows.map((row, ri) => (
                            <View key={ri} style={ts.stageDataRow}>
                              <Text style={ts.stageDataLabel}>{row.label}</Text>
                              <Text style={[ts.stageDataValue, row.highlight && { color: '#1e3a5f', fontWeight: '800', fontSize: 15 }]}>
                                {row.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {stage.action && (
                        <TouchableOpacity style={ts.actionBtn} onPress={stage.action.onPress}>
                          <Text style={ts.actionBtnText}>{stage.action.label}</Text>
                        </TouchableOpacity>
                      )}

                      {!stage.done && (
                        <Text style={ts.pendingHint}>Not yet recorded</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Lab Test Details Modal */}
        <Modal
          visible={labTestModalVisible}
          onClose={() => setLabTestModalVisible(false)}
          title="Lab Test Details"
          width={isMobile ? "95%" : "600px"}
        >
          {selectedLabTest && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Basic Information</Text>
                {[
                  { label: 'Bill Number', value: selectedLabTest.bill_number },
                  { label: 'Wheat Variety', value: selectedLabTest.wheat_variety },
                  { label: 'Category', value: selectedLabTest.category },
                  { label: 'Tested By', value: selectedLabTest.tested_by },
                ].map((r) => (
                  <View key={r.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{r.label}:</Text>
                    <Text style={styles.infoValue}>{r.value || 'N/A'}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Physical Parameters</Text>
                {[
                  { label: 'Moisture %', value: selectedLabTest.moisture },
                  { label: 'Hectoliter Wt', value: selectedLabTest.test_weight },
                  { label: 'Protein %', value: selectedLabTest.protein_percent },
                  { label: 'Wet Gluten %', value: selectedLabTest.wet_gluten },
                  { label: 'Dry Gluten %', value: selectedLabTest.dry_gluten },
                  { label: 'Falling No.', value: selectedLabTest.falling_number },
                ].map((r) => (
                  <View key={r.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{r.label}:</Text>
                    <Text style={styles.infoValue}>{r.value != null ? r.value : 'N/A'}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Foreign Matter</Text>
                {[
                  { label: 'Chaff/Husk', value: selectedLabTest.chaff_husk },
                  { label: 'Straws/Sticks', value: selectedLabTest.straws_sticks },
                  { label: 'Other FM', value: selectedLabTest.other_foreign_matter },
                  { label: 'Mud Balls', value: selectedLabTest.mudballs },
                  { label: 'Stones', value: selectedLabTest.stones },
                  { label: 'Dust/Sand', value: selectedLabTest.dust_sand },
                  { label: 'Total Impurities %', value: selectedLabTest.total_impurities },
                ].map((r) => (
                  <View key={r.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{r.label}:</Text>
                    <Text style={styles.infoValue}>{r.value != null ? r.value : 'N/A'}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Grain Dockage</Text>
                {[
                  { label: 'Shriveled Wheat', value: selectedLabTest.shriveled_wheat },
                  { label: 'Insect Damage', value: selectedLabTest.insect_damage },
                  { label: 'Blackened Wheat', value: selectedLabTest.blackened_wheat },
                  { label: 'Other Grains', value: selectedLabTest.sprouted_grains },
                  { label: 'Soft/Other', value: selectedLabTest.other_grain_damage },
                  { label: 'Total Dockage %', value: selectedLabTest.total_dockage },
                ].map((r) => (
                  <View key={r.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{r.label}:</Text>
                    <Text style={styles.infoValue}>{r.value != null ? r.value : 'N/A'}</Text>
                  </View>
                ))}
              </View>
              {selectedLabTest.remarks && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Remarks</Text>
                  <Text style={styles.remarksText}>{selectedLabTest.remarks}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Modal>
      </View>
    );
  };

  return (
    <Layout navigation={navigation} title="Reports" currentRoute="Reports">
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
            onPress={() => setActiveTab('timeline')}
          >
            <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>
              Raw Wheat Bin Timeline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'traceability' && styles.activeTab]}
            onPress={() => setActiveTab('traceability')}
          >
            <Text style={[styles.tabText, activeTab === 'traceability' && styles.activeTabText]}>
              Vehicle Traceability
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'timeline' ? renderTimelineTab() : renderTraceabilityTab()}
      </View>
    </Layout>
  );
}

const ts = StyleSheet.create({
  headerCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  vehicleNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  vehicleSub: {
    fontSize: 13,
    color: '#93c5fd',
    marginBottom: 2,
  },
  overallBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  overallBadgeText: {
    fontWeight: '800',
    fontSize: 13,
  },
  timelineWrap: {
    paddingHorizontal: 4,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  connectorCol: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  connectorLine: {
    width: 2,
    height: 16,
    marginBottom: 0,
  },
  connectorLineBottom: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginTop: 0,
  },
  stageDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIcon: {
    fontSize: 18,
  },
  stageCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 0,
  },
  stageCardDone: {
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stageCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  stageSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stageRows: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  stageDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  stageDataLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    flex: 1,
  },
  stageDataValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionBtn: {
    marginTop: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  pendingHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  datePickerWrapper: {
    flex: 1,
  },
  pickerContainer: {
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 50,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sessionInfo: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sessionRoute: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeline: {
    marginTop: 8,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#d1d5db',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  timelineDescription: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineQuantity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  magnetDetails: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  magnetDetailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  magnetDetailText: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 3,
  },
  cleaningSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cleaningSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  traceabilityReport: {
    gap: 16,
  },
  reportSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  highlightValue: {
    color: colors.primary,
    fontSize: 16,
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  detailsButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  remarksText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
