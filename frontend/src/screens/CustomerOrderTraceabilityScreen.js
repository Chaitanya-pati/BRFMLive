import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Card from '../components/Card';
import colors from '../theme/colors';
import { getApiClient, customerOrderApi, customerApi } from '../api/client';
import { showToast, showError } from '../utils/customAlerts';
import { formatISTDate } from '../utils/dateUtils';
import DatePicker from '../components/DatePicker';

export default function CustomerOrderTraceabilityScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadOrdersByDateRange();
  }, [startDate, endDate, selectedCustomerIds]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerApi.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      showError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersByDateRange = async () => {
    try {
      setLoading(true);
      const response = await customerOrderApi.getAll();
      let filteredData = response.data || [];

      // Filter by date range
      filteredData = filteredData.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= startDate && orderDate <= endDate;
      });

      // Filter by selected customers
      if (selectedCustomerIds.length > 0) {
        filteredData = filteredData.filter(order =>
          selectedCustomerIds.includes(order.customer_id)
        );
      }

      // Sort by date descending
      filteredData.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

      setOrders(filteredData);
      applySearch(filteredData, searchText);
    } catch (error) {
      console.error('Error loading orders:', error);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const applySearch = (dataToSearch, searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredOrders(dataToSearch);
      return;
    }

    const filtered = dataToSearch.filter(order => {
      const customerName = order.customer?.customer_name || '';
      const orderCode = order.order_code || '';
      const searchLower = searchTerm.toLowerCase();
      
      return (
        orderCode.toLowerCase().includes(searchLower) ||
        customerName.toLowerCase().includes(searchLower)
      );
    });
    setFilteredOrders(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    applySearch(orders, text);
  };

  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomerIds(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const selectAllCustomers = () => {
    if (selectedCustomerIds.length === customers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map(c => c.customer_id));
    }
  };

  const clearFilters = () => {
    setSelectedCustomerIds([]);
    setSearchText('');
    setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    setEndDate(new Date());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#FF9800';
      case 'CONFIRMED':
        return '#2196F3';
      case 'DISPATCHED':
        return '#9C27B0';
      case 'DELIVERED':
        return colors.success;
      case 'CANCELLED':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const renderCustomerDropdown = () => (
    <View style={styles.dropdownContainer}>
      <View style={styles.dropdownHeader}>
        <Text style={styles.dropdownTitle}>
          Selected: {selectedCustomerIds.length} / {customers.length}
        </Text>
        <TouchableOpacity onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}>
          <Text style={styles.toggleIcon}>{showCustomerDropdown ? '▼' : '▶'}</Text>
        </TouchableOpacity>
      </View>

      {showCustomerDropdown && (
        <View style={styles.dropdownContent}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={selectAllCustomers}
          >
            <Text style={styles.dropdownItemText}>
              {selectedCustomerIds.length === customers.length ? '✓ ' : ''}
              Select All
            </Text>
          </TouchableOpacity>

          {customers.map(customer => (
            <TouchableOpacity
              key={customer.customer_id}
              style={styles.dropdownItem}
              onPress={() => toggleCustomerSelection(customer.customer_id)}
            >
              <Text style={styles.dropdownItemText}>
                {selectedCustomerIds.includes(customer.customer_id) ? '✓ ' : ''}
                {customer.customer_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderOrderTimeline = () => {
    if (filteredOrders.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No orders found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your filters or date range
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={true}>
        {filteredOrders.map((order, index) => (
          <View key={order.order_id} style={styles.orderWrapper}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineLineContainer}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: getStatusColor(order.order_status) },
                  ]}
                />
                {index < filteredOrders.length - 1 && <View style={styles.timelineLine} />}
              </View>

              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => {
                  navigation.navigate('CustomerOrderMaster');
                }}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderCode}>{order.order_code}</Text>
                    <Text style={styles.customerName}>
                      {order.customer?.customer_name || 'Unknown Customer'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.order_status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{order.order_status}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Date:</Text>
                    <Text style={styles.detailValue}>
                      {formatISTDate(order.order_date)}
                    </Text>
                  </View>

                  {order.completed_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed:</Text>
                      <Text style={styles.detailValue}>
                        {formatISTDate(order.completed_time)}
                      </Text>
                    </View>
                  )}

                  {order.items && order.items.length > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Items:</Text>
                      <Text style={styles.detailValue}>{order.items.length} item(s)</Text>
                    </View>
                  )}

                  {order.remarks && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Remarks:</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>
                        {order.remarks}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <Layout title="Customer Order Traceability" navigation={navigation}>
      <View style={styles.container}>
        <Card style={styles.filterCard}>
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <DatePicker label="From" value={startDate} onChange={setStartDate} />
              </View>
              <View style={{ flex: 1 }}>
                <DatePicker label="To" value={endDate} onChange={setEndDate} />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Customers</Text>
            {renderCustomerDropdown()}
          </View>

          <View style={styles.divider} />

          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by order code or customer name..."
              value={searchText}
              onChangeText={handleSearchChange}
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button
              title="Clear Filters"
              onPress={clearFilters}
              style={styles.clearButton}
              textStyle={styles.clearButtonText}
            />
          </View>
        </Card>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            Orders ({filteredOrders.length})
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : (
          renderOrderTimeline()
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background || '#f5f5f5',
  },
  filterCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  filterSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  toggleIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dropdownContent: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    maxHeight: 250,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.text,
  },
  searchInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  clearButtonText: {
    color: colors.text,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timelineContainer: {
    flex: 1,
  },
  orderWrapper: {
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLineContainer: {
    width: 30,
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: 1,
    borderWidth: 3,
    borderColor: '#fff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ddd',
    marginVertical: -8,
  },
  orderCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginLeft: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customerName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
