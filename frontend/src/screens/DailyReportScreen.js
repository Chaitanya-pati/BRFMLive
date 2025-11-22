
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Layout from '../components/Layout';
import DatePicker from '../components/DatePicker';
import { vehicleApi, supplierApi, labTestApi, godownApi, binApi, unloadingApi } from '../api/client';
import colors from '../theme/colors';
import notify from '../utils/notifications';
import { formatISTDate } from '../utils/timeUtils';

export default function DailyReportScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
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

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [vehicles, labTests, unloadings, suppliers, godowns, bins] = await Promise.all([
        vehicleApi.getAll(),
        labTestApi ? labTestApi.getAll() : Promise.resolve({ data: [] }),
        unloadingApi ? unloadingApi.getAll() : Promise.resolve({ data: [] }),
        supplierApi.getAll(),
        godownApi.getAll(),
        binApi.getAll(),
      ]);

      // Filter data for selected date
      const dateStr = formatISTDate(selectedDate).split(' ')[0]; // Get YYYY-MM-DD part

      const filteredVehicles = (vehicles.data || []).filter(v => {
        const vehicleDate = formatISTDate(new Date(v.arrival_time)).split(' ')[0];
        return vehicleDate === dateStr;
      });

      const filteredLabTests = (labTests.data || []).filter(lt => {
        const testDate = formatISTDate(new Date(lt.test_date)).split(' ')[0];
        return testDate === dateStr;
      });

      const filteredUnloadings = (unloadings.data || []).filter(u => {
        const unloadDate = formatISTDate(new Date(u.unloading_start_time)).split(' ')[0];
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

      // Calculate summary
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

  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Daily Summary</Text>
      <Text style={styles.summaryDate}>{formatISTDate(selectedDate)}</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalVehicles}</Text>
          <Text style={styles.summaryLabel}>Vehicles Arrived</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.uniqueSuppliers}</Text>
          <Text style={styles.summaryLabel}>Unique Suppliers</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalLabTests}</Text>
          <Text style={styles.summaryLabel}>Lab Tests</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalUnloadings}</Text>
          <Text style={styles.summaryLabel}>Unloadings</Text>
        </View>
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

  const renderVehicleReport = () => (
    <View style={styles.reportSection}>
      <Text style={styles.sectionTitle}>Vehicle Arrivals ({reportData.vehicleEntries.length})</Text>
      {reportData.vehicleEntries.length === 0 ? (
        <Text style={styles.noData}>No vehicles arrived on this date</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Vehicle #</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Supplier</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bill No</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Time</Text>
          </View>
          {reportData.vehicleEntries.map((vehicle, index) => (
            <View key={vehicle.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{vehicle.vehicle_number}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{getSupplierName(vehicle.supplier_id)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{vehicle.bill_no}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {new Date(vehicle.arrival_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderLabTestReport = () => (
    <View style={styles.reportSection}>
      <Text style={styles.sectionTitle}>Lab Test Results ({reportData.labTests.length})</Text>
      {reportData.labTests.length === 0 ? (
        <Text style={styles.noData}>No lab tests conducted on this date</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bill No</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Moisture %</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Protein %</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>
          {reportData.labTests.map((test, index) => (
            <View key={test.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{test.bill_number || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{test.moisture?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{test.protein_percent?.toFixed(1) || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{test.category || '-'}</Text>
              <Text style={[styles.tableCell, { flex: 1, color: test.raise_claim ? colors.error : colors.success }]}>
                {test.raise_claim ? 'Failed' : 'Passed'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderUnloadingReport = () => (
    <View style={styles.reportSection}>
      <Text style={styles.sectionTitle}>Unloading Activities ({reportData.unloadingEntries.length})</Text>
      {reportData.unloadingEntries.length === 0 ? (
        <Text style={styles.noData}>No unloading activities on this date</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Godown</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Gross (kg)</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Empty (kg)</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Net (tons)</Text>
          </View>
          {reportData.unloadingEntries.map((unloading, index) => (
            <View key={unloading.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{getGodownName(unloading.godown_id)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{unloading.gross_weight?.toFixed(0)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{unloading.empty_vehicle_weight?.toFixed(0)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{(unloading.net_weight / 1000)?.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSupplierWiseReport = () => {
    const supplierStats = {};
    
    reportData.vehicleEntries.forEach(vehicle => {
      const supplierId = vehicle.supplier_id;
      const supplierName = getSupplierName(supplierId);
      
      if (!supplierStats[supplierId]) {
        supplierStats[supplierId] = {
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

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Supplier-wise Summary ({suppliers.length})</Text>
        {suppliers.length === 0 ? (
          <Text style={styles.noData}>No supplier data available</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Supplier Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Vehicles</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Total (tons)</Text>
            </View>
            {suppliers.map((supplier, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{supplier.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{supplier.vehicles}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{supplier.totalQuantity.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Layout navigation={navigation} title="Daily Report" currentRoute="DailyReport">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Operations Report</Text>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
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
            {renderVehicleReport()}
            {renderLabTestReport()}
            {renderUnloadingReport()}
            {renderSupplierWiseReport()}
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    minWidth: 110,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  noData: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 12,
  },
  tableHeaderCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    fontSize: 12,
    color: colors.textPrimary,
  },
});
