
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
import DatePicker from '../components/DatePicker';
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
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={setSelectedDate}
        />
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

  const renderTraceabilityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle Traceability Report</Text>
        
        <View style={styles.dateRangeContainer}>
          <View style={styles.datePickerWrapper}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
            />
          </View>
          <View style={styles.datePickerWrapper}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
            />
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Vehicle</Text>
          <Picker
            selectedValue={selectedVehicle?.id || ''}
            onValueChange={(value) => {
              const vehicle = vehicles.find(v => v.id === parseInt(value));
              setSelectedVehicle(vehicle);
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select a vehicle" value="" />
            {vehicles.map((vehicle) => (
              <Picker.Item
                key={vehicle.id}
                label={`${vehicle.vehicle_number} - ${vehicle.supplier?.supplier_name || 'Unknown'} - ${formatISTDate(vehicle.arrival_time)}`}
                value={vehicle.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {traceabilityLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading traceability report...</Text>
          </View>
        ) : !traceabilityData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Please select a vehicle to view the traceability report</Text>
          </View>
        ) : (
          <View style={styles.traceabilityReport}>
            {/* Gate Entry Section */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>🚪 Gate Entry</Text>
              <View style={styles.sectionContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vehicle Number:</Text>
                  <Text style={styles.infoValue}>{traceabilityData.vehicle.vehicle_number}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Supplier:</Text>
                  <Text style={styles.infoValue}>{traceabilityData.vehicle.supplier?.supplier_name || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bill Number:</Text>
                  <Text style={styles.infoValue}>{traceabilityData.vehicle.bill_no || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Arrival Time:</Text>
                  <Text style={styles.infoValue}>{formatISTDateTime(traceabilityData.vehicle.arrival_time)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Driver Name:</Text>
                  <Text style={styles.infoValue}>{traceabilityData.vehicle.driver_name || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Driver Phone:</Text>
                  <Text style={styles.infoValue}>{traceabilityData.vehicle.driver_phone || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Lab Test Section */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>🔬 Lab Test</Text>
              {traceabilityData.labTest ? (
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Test Date:</Text>
                    <Text style={styles.infoValue}>{formatISTDateTime(traceabilityData.labTest.test_date)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Category:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.labTest.category || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Moisture:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.labTest.moisture || 'N/A'}%</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Impurities:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.labTest.total_impurities || 'N/A'}%</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoValue, { color: traceabilityData.labTest.raise_claim ? colors.error : colors.success }]}>
                      {traceabilityData.labTest.raise_claim ? 'Failed' : 'Passed'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.detailsButton}
                    onPress={() => {
                      setSelectedLabTest(traceabilityData.labTest);
                      setLabTestModalVisible(true);
                    }}
                  >
                    <Text style={styles.detailsButtonText}>View Lab Test Details</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.sectionContent}>
                  <Text style={styles.noDataText}>Lab test not yet conducted</Text>
                </View>
              )}
            </View>

            {/* Unloading Section */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>📦 Unloading</Text>
              {traceabilityData.unloading ? (
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Godown:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.unloading.godown?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Start Time:</Text>
                    <Text style={styles.infoValue}>{formatISTDateTime(traceabilityData.unloading.unloading_start_time)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>End Time:</Text>
                    <Text style={styles.infoValue}>{formatISTDateTime(traceabilityData.unloading.unloading_end_time)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gross Weight:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.unloading.gross_weight || 'N/A'} kg</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Empty Weight:</Text>
                    <Text style={styles.infoValue}>{traceabilityData.unloading.empty_vehicle_weight || 'N/A'} kg</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Net Weight:</Text>
                    <Text style={[styles.infoValue, styles.highlightValue]}>
                      {traceabilityData.unloading.net_weight ? (traceabilityData.unloading.net_weight / 1000).toFixed(2) : 'N/A'} tons
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.sectionContent}>
                  <Text style={styles.noDataText}>Vehicle not yet unloaded</Text>
                </View>
              )}
            </View>
          </View>
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
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bill Number:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.bill_number || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wheat Variety:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.wheat_variety || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.category || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Test Parameters</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Moisture:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.moisture || 'N/A'}%</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Protein:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.protein_percent || 'N/A'}%</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Wet Gluten:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.wet_gluten || 'N/A'}%</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dry Gluten:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.dry_gluten || 'N/A'}%</Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Impurities & Dockage</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Impurities:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.total_impurities || 'N/A'}%</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Dockage:</Text>
                <Text style={styles.infoValue}>{selectedLabTest.total_dockage || 'N/A'}%</Text>
              </View>
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
