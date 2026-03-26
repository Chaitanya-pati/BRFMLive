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
  
  const [startDate, setStartDate] = useState(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderTraceability, setOrderTraceability] = useState(null);

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
      console.log('Customers loaded:', response.data);
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
      console.log('Orders API Response:', response.data);
      let filteredData = response.data || [];
      console.log('Total orders received:', filteredData.length);

      // Filter by date range
      filteredData = filteredData.filter(order => {
        const orderDate = new Date(order.order_date);
        const inRange = orderDate >= startDate && orderDate <= endDate;
        console.log(`Order ${order.order_code}: ${orderDate.toISOString()} - In range: ${inRange}`);
        return inRange;
      });

      // Filter by selected customers
      if (selectedCustomerIds.length > 0) {
        filteredData = filteredData.filter(order =>
          selectedCustomerIds.includes(order.customer_id)
        );
      }

      // Sort by date descending
      filteredData.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

      console.log('Final filtered orders count:', filteredData.length);
      console.log('Filtered orders sample:', filteredData.slice(0, 2));
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
    setStartDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
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
      case 'PARTIALLY DELIVERED':
        return '#00BCD4';
      case 'DELIVERED':
        return colors.success;
      case 'CANCELLED':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const fetchOrderTraceability = async (orderId) => {
    try {
      setLoading(true);
      const client = getApiClient();
      const response = await client.get(`/customer-orders/${orderId}/traceability`);
      console.log('Order traceability data:', response.data);
      setOrderTraceability(response.data);
      setSelectedOrderId(orderId);
    } catch (error) {
      console.error('Error fetching order traceability:', error);
      showError('Failed to fetch order traceability');
    } finally {
      setLoading(false);
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
                onPress={() => fetchOrderTraceability(order.order_id)}
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
        ) : orderTraceability ? (
          renderTraceabilityDetails()
        ) : (
          renderOrderTimeline()
        )}
      </View>
    </Layout>
  );

  function renderTraceabilityDetails() {
    const isSmallScreen = width < 600;
    
    return (
      <ScrollView style={styles.traceabilityContainer} showsVerticalScrollIndicator={true}>
        <TouchableOpacity
          onPress={() => setOrderTraceability(null)}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back to Orders</Text>
        </TouchableOpacity>

        {/* Order Card with Header and Timeline */}
        <View style={styles.mainCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardOrderCode}>{orderTraceability.order_code}</Text>
              <Text style={styles.cardCustomerName}>{orderTraceability.customer_name}</Text>
              {orderTraceability.customer_city && (
                <Text style={styles.cardCity}>{orderTraceability.customer_city}</Text>
              )}
            </View>
            <View
              style={[
                styles.cardHeaderStatus,
                { backgroundColor: getStatusColor(orderTraceability.order_status) },
              ]}
            >
              <Text style={styles.cardHeaderStatusText}>{orderTraceability.order_status}</Text>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={[styles.summarySection, isSmallScreen && styles.summaryGridMobile]}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Order Date</Text>
              <Text style={styles.statValue}>{formatISTDate(orderTraceability.order_date).split(' ')[0]}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Items</Text>
              <Text style={styles.statValue}>{orderTraceability.total_items}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Dispatches</Text>
              <Text style={styles.statValue}>{orderTraceability.dispatch_count}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Dispatched</Text>
              <Text style={styles.statValue}>{orderTraceability.total_dispatched_tons.toFixed(2)}T</Text>
            </View>
          </View>

          {/* Timeline Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>Order Timeline</Text>
            
            <View style={styles.timelineTrack}>
              {orderTraceability.timeline && orderTraceability.timeline.map((stage, index) => (
                <View key={index} style={styles.timelineStageContainer}>
                  {/* Timeline Line */}
                  <View style={styles.timelineConnector}>
                    <View
                      style={[
                        styles.timelineNodeCircle,
                        {
                          backgroundColor:
                            stage.status === 'Completed' ? colors.success : colors.primary,
                        },
                      ]}
                    />
                    {index < orderTraceability.timeline.length - 1 && (
                      <View
                        style={[
                          styles.timelineConnectorLine,
                          {
                            backgroundColor:
                              stage.status === 'Completed' ? colors.success : '#ddd',
                          },
                        ]}
                      />
                    )}
                  </View>

                  {/* Stage Content */}
                  <View style={styles.timelineStageContent}>
                    <Text style={styles.stageName}>{stage.name}</Text>
                    <Text style={styles.stageDateTime}>
                      {formatISTDate(stage.date)}
                    </Text>
                    <Text style={styles.stageDescription}>{stage.details}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Order Items Section */}
          {orderTraceability.items && orderTraceability.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>Order Items ({orderTraceability.items.length})</Text>
              {orderTraceability.items.map((item, index) => (
                <View key={index} style={[styles.itemCard, index !== orderTraceability.items.length - 1 && styles.itemCardBorder]}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemProductName}>{item.product_name}</Text>
                    <Text style={styles.itemPrice}>
                      ₹{(item.price_per_ton || item.price_per_bag || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemMetaText}>
                      {item.quantity_ton > 0
                        ? `${item.quantity_ton} tons`
                        : `${item.number_of_bags} bags`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }
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
  traceabilityContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background || '#f5f5f5',
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 20,
  },
  cardHeader: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardOrderCode: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cardCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  cardCity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardHeaderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cardHeaderStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  summaryGridMobile: {
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    minWidth: 80,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  timelineSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineTrack: {
    paddingLeft: 8,
  },
  timelineStageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineConnector: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 28,
  },
  timelineNodeCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineConnectorLine: {
    width: 2,
    height: 50,
    marginTop: -4,
  },
  timelineStageContent: {
    flex: 1,
    paddingTop: 2,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  stageDateTime: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  stageDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  itemsSection: {
    padding: 16,
  },
  itemsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 12,
  },
  itemMeta: {
    marginTop: 4,
  },
  itemMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
