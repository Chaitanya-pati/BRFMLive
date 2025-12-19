
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Layout from '../components/Layout';
import { vehicleApi, supplierApi, labTestApi, godownApi, binApi, unloadingApi } from '../api/client';
import colors from '../theme/colors';
import notify from '../utils/notifications';
import { formatISTDateTime, formatISTDate, formatISTTime } from '../utils/dateUtils';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function DailyReportScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [reportData, setReportData] = useState({
    vehicleEntries: [],
    labTests: [],
    unloadingEntries: [],
    suppliers: [],
    godowns: [],
    bins: [],
  });

  const [summary, setSummary] = useState({
    totalVehicles: 0,
    totalLabTests: 0,
    totalUnloadings: 0,
    totalQuantityUnloaded: 0,
    uniqueSuppliers: 0,
    passedTests: 0,
    failedTests: 0,
    claimsRaised: 0,
  });

  useEffect(() => {
    loadDailyReport();
  }, [selectedDate]);

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const [vehicles, labTests, unloadings, suppliers, godowns, bins] = await Promise.all([
        vehicleApi.getAll(),
        labTestApi ? labTestApi.getAll() : Promise.resolve({ data: [] }),
        unloadingApi ? unloadingApi.getAll() : Promise.resolve({ data: [] }),
        supplierApi.getAll(),
        godownApi.getAll(),
        binApi.getAll(),
      ]);

      const dateStr = formatISTDate(selectedDate);

      const filteredVehicles = (vehicles.data || []).filter(v => {
        const vehicleDate = formatISTDate(new Date(v.arrival_time));
        return vehicleDate === dateStr;
      });

      const filteredLabTests = (labTests.data || []).filter(lt => {
        const testDate = formatISTDate(new Date(lt.test_date));
        return testDate === dateStr;
      });

      const filteredUnloadings = (unloadings.data || []).filter(u => {
        const unloadDate = formatISTDate(new Date(u.unloading_start_time));
        return unloadDate === dateStr;
      });

      setReportData({
        vehicleEntries: filteredVehicles,
        labTests: filteredLabTests,
        unloadingEntries: filteredUnloadings,
        suppliers: suppliers.data || [],
        godowns: godowns.data || [],
        bins: bins.data || [],
      });

      const uniqueSupplierIds = new Set(filteredVehicles.map(v => v.supplier_id));
      const totalQuantity = filteredUnloadings.reduce((sum, u) => sum + (u.net_weight / 1000 || 0), 0);
      const passedTests = filteredLabTests.filter(lt => !lt.raise_claim).length;
      const failedTests = filteredLabTests.filter(lt => lt.raise_claim).length;

      setSummary({
        totalVehicles: filteredVehicles.length,
        totalLabTests: filteredLabTests.length,
        totalUnloadings: filteredUnloadings.length,
        totalQuantityUnloaded: totalQuantity,
        uniqueSuppliers: uniqueSupplierIds.size,
        passedTests,
        failedTests,
        claimsRaised: failedTests,
      });

    } catch (error) {
      console.error('Error loading daily report:', error);
      notify.showError('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId) => {
    const supplier = reportData.suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.supplier_name : 'Unknown';
  };

  const getGodownName = (godownId) => {
    const godown = reportData.godowns.find(g => g.id === godownId);
    return godown ? godown.name : 'Unknown';
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Daily Summary</Text>
      <Text style={styles.summaryDate}>{formatISTDate(selectedDate)}</Text>
      
      <View style={styles.summaryGrid}>
        <TouchableOpacity 
          style={styles.summaryItem}
          onPress={() => toggleSection('vehicles')}
        >
          <Text style={styles.summaryValue}>{summary.totalVehicles}</Text>
          <Text style={styles.summaryLabel}>Vehicles</Text>
          <Text style={styles.viewButton}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.summaryItem}
          onPress={() => toggleSection('suppliers')}
        >
          <Text style={styles.summaryValue}>{summary.uniqueSuppliers}</Text>
          <Text style={styles.summaryLabel}>Suppliers</Text>
          <Text style={styles.viewButton}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.summaryItem}
          onPress={() => toggleSection('labTests')}
        >
          <Text style={styles.summaryValue}>{summary.totalLabTests}</Text>
          <Text style={styles.summaryLabel}>Lab Tests</Text>
          <Text style={styles.viewButton}>View Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.summaryItem}
          onPress={() => toggleSection('unloading')}
        >
          <Text style={styles.summaryValue}>{summary.totalUnloadings}</Text>
          <Text style={styles.summaryLabel}>Unloadings</Text>
          <Text style={styles.viewButton}>View Details</Text>
        </TouchableOpacity>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalQuantityUnloaded.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Tons Unloaded</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{summary.passedTests}</Text>
          <Text style={styles.summaryLabel}>Tests Passed</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>{summary.failedTests}</Text>
          <Text style={styles.summaryLabel}>Tests Failed</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{summary.claimsRaised}</Text>
          <Text style={styles.summaryLabel}>Claims Raised</Text>
        </View>
      </View>
    </View>
  );

  const renderVehicleCard = (vehicle) => (
    <View key={vehicle.id} style={styles.detailCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{vehicle.vehicle_number}</Text>
        <Text style={styles.cardTime}>{formatISTTime(vehicle.arrival_time)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Supplier:</Text>
        <Text style={styles.cardValue}>{getSupplierName(vehicle.supplier_id)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Bill No:</Text>
        <Text style={styles.cardValue}>{vehicle.bill_no}</Text>
      </View>
    </View>
  );

  const renderLabTestCard = (test) => (
    <View key={test.id} style={styles.detailCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{test.bill_number || 'N/A'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: test.raise_claim ? colors.error : colors.success }]}>
          <Text style={styles.statusText}>{test.raise_claim ? 'Failed' : 'Passed'}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Moisture:</Text>
        <Text style={styles.cardValue}>{test.moisture?.toFixed(1)}%</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Protein:</Text>
        <Text style={styles.cardValue}>{test.protein_percent?.toFixed(1)}%</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Category:</Text>
        <Text style={styles.cardValue}>{test.category || '-'}</Text>
      </View>
    </View>
  );

  const renderUnloadingCard = (unloading) => (
    <View key={unloading.id} style={styles.detailCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{getGodownName(unloading.godown_id)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Gross Weight:</Text>
        <Text style={styles.cardValue}>{unloading.gross_weight?.toFixed(0)} kg</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Empty Weight:</Text>
        <Text style={styles.cardValue}>{unloading.empty_vehicle_weight?.toFixed(0)} kg</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Net Weight:</Text>
        <Text style={[styles.cardValue, styles.highlightValue]}>{(unloading.net_weight / 1000)?.toFixed(2)} tons</Text>
      </View>
    </View>
  );

  const renderSupplierCard = (supplier) => (
    <View key={supplier.id} style={styles.detailCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{supplier.name}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Vehicles:</Text>
        <Text style={styles.cardValue}>{supplier.vehicles}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Total Quantity:</Text>
        <Text style={[styles.cardValue, styles.highlightValue]}>{supplier.totalQuantity.toFixed(2)} tons</Text>
      </View>
    </View>
  );

  const renderExpandedSection = () => {
    if (!expandedSection) return null;

    let content = null;
    let title = '';

    switch (expandedSection) {
      case 'vehicles':
        title = `Vehicle Arrivals (${reportData.vehicleEntries.length})`;
        content = reportData.vehicleEntries.length === 0 ? (
          <Text style={styles.noData}>No vehicles arrived on this date</Text>
        ) : (
          reportData.vehicleEntries.map(renderVehicleCard)
        );
        break;

      case 'labTests':
        title = `Lab Test Results (${reportData.labTests.length})`;
        content = reportData.labTests.length === 0 ? (
          <Text style={styles.noData}>No lab tests conducted on this date</Text>
        ) : (
          reportData.labTests.map(renderLabTestCard)
        );
        break;

      case 'unloading':
        title = `Unloading Activities (${reportData.unloadingEntries.length})`;
        content = reportData.unloadingEntries.length === 0 ? (
          <Text style={styles.noData}>No unloading activities on this date</Text>
        ) : (
          reportData.unloadingEntries.map(renderUnloadingCard)
        );
        break;

      case 'suppliers':
        const supplierStats = {};
        
        reportData.vehicleEntries.forEach(vehicle => {
          const supplierId = vehicle.supplier_id;
          const supplierName = getSupplierName(supplierId);
          
          if (!supplierStats[supplierId]) {
            supplierStats[supplierId] = {
              id: supplierId,
              name: supplierName,
              vehicles: 0,
              totalQuantity: 0,
            };
          }
          
          supplierStats[supplierId].vehicles += 1;
          
          const unloading = reportData.unloadingEntries.find(u => u.vehicle_entry_id === vehicle.id);
          if (unloading) {
            supplierStats[supplierId].totalQuantity += (unloading.net_weight / 1000) || 0;
          }
        });

        const suppliers = Object.values(supplierStats);
        title = `Supplier-wise Summary (${suppliers.length})`;
        content = suppliers.length === 0 ? (
          <Text style={styles.noData}>No supplier data available</Text>
        ) : (
          suppliers.map(renderSupplierCard)
        );
        break;

      default:
        return null;
    }

    return (
      <View style={styles.expandedSection}>
        <View style={styles.expandedHeader}>
          <Text style={styles.expandedTitle}>{title}</Text>
          <TouchableOpacity onPress={() => setExpandedSection(null)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.expandedContent}>
          {content}
        </ScrollView>
      </View>
    );
  };

  return (
    <Layout navigation={navigation} title="Daily Report" currentRoute="DailyReport">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Operations Report</Text>
          
          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>Select Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {formatISTDate(selectedDate)}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadDailyReport}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>
              {loading ? 'Loading...' : 'Refresh Report'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating report...</Text>
          </View>
        ) : (
          <>
            {renderSummaryCard()}
            {renderExpandedSection()}
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: isMobile ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 20,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: isMobile ? 30 : 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: isMobile ? 12 : 16,
    padding: isMobile ? 16 : 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobile ? 8 : 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: isMobile ? '45%' : 140,
    padding: isMobile ? 12 : 16,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: isMobile ? 11 : 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  viewButton: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  expandedSection: {
    backgroundColor: '#fff',
    margin: isMobile ? 12 : 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxHeight: 500,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  expandedTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  expandedContent: {
    padding: isMobile ? 12 : 16,
  },
  detailCard: {
    backgroundColor: '#f9fafb',
    padding: isMobile ? 12 : 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: isMobile ? 15 : 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  highlightValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noData: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
