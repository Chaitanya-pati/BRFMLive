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

      // Fetch traceability data for each order to get dispatch info
      const ordersWithTraceability = await Promise.all(
        filteredData.map(async (order) => {
          try {
            const client = getApiClient();
            const traceRes = await client.get(`/customer-orders/${order.order_id}/traceability`);
            return { ...order, traceability: traceRes.data };
          } catch (error) {
            console.error(`Error fetching traceability for order ${order.order_id}:`, error);
            return { ...order, traceability: null };
          }
        })
      );

      filteredData = ordersWithTraceability;

      // Filter by date range
      filteredData = filteredData.filter(order => {
        const orderDate = new Date(order.order_date);
        const inRange = orderDate >= startDate && orderDate <= endDate;
        return inRange;
      });

      // Filter by selected customers
      if (selectedCustomerIds.length > 0) {
        filteredData = filteredData.filter(order =>
          selectedCustomerIds.includes(order.customer_id)
        );
      }

      // Sort by most recent dispatch date
      filteredData.sort((a, b) => {
        const lastDispatchA = a.traceability?.timeline
          ? new Date(
              Math.max(
                ...a.traceability.timeline
                  .filter(t => t.name.includes('Dispatch'))
                  .map(t => new Date(t.date).getTime()),
                new Date(a.order_date).getTime()
              )
            )
          : new Date(a.order_date);

        const lastDispatchB = b.traceability?.timeline
          ? new Date(
              Math.max(
                ...b.traceability.timeline
                  .filter(t => t.name.includes('Dispatch'))
                  .map(t => new Date(t.date).getTime()),
                new Date(b.order_date).getTime()
              )
            )
          : new Date(b.order_date);

        return lastDispatchB.getTime() - lastDispatchA.getTime();
      });

      console.log('Final filtered orders count:', filteredData.length);
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
        {filteredOrders.map((order) => {
          const lastDispatchDate = order.traceability?.timeline
            ? order.traceability.timeline
                .filter(t => t.name.includes('Dispatch'))
                .map(t => new Date(t.date))
                .sort((a, b) => b.getTime() - a.getTime())[0]
            : null;

          return (
            <TouchableOpacity
              key={order.order_id}
              style={styles.orderCardWrapper}
              onPress={() => fetchOrderTraceability(order.order_id)}
              activeOpacity={0.7}
            >
              <View style={styles.orderCardContent}>
                {/* Card Header */}
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderCardInfo}>
                    <Text style={styles.orderCardCode}>{order.order_code}</Text>
                    <Text style={styles.orderCardCustomer}>
                      {order.customer?.customer_name || 'Unknown Customer'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.orderCardBadge,
                      { backgroundColor: getStatusColor(order.order_status) },
                    ]}
                  >
                    <Text style={styles.orderCardBadgeText}>{order.order_status}</Text>
                  </View>
                </View>

                {/* Card Body - Key Info */}
                <View style={styles.orderCardBody}>
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoLabel}>Order Date:</Text>
                    <Text style={styles.cardInfoValue}>
                      {formatISTDate(order.order_date).split(' ')[0]}
                    </Text>
                  </View>

                  {lastDispatchDate && (
                    <View style={styles.cardInfoRow}>
                      <Text style={styles.cardInfoLabel}>Last Dispatch:</Text>
                      <Text style={styles.cardInfoValue}>
                        {formatISTDate(lastDispatchDate).split(' ')[0]}
                      </Text>
                    </View>
                  )}

                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoLabel}>Items:</Text>
                    <Text style={styles.cardInfoValue}>{order.items?.length || 0}</Text>
                  </View>

                  {order.traceability && (
                    <View style={styles.cardInfoRow}>
                      <Text style={styles.cardInfoLabel}>Dispatches:</Text>
                      <Text style={styles.cardInfoValue}>{order.traceability.dispatch_count}</Text>
                    </View>
                  )}
                </View>

                {/* Card Footer - CTA */}
                <View style={styles.orderCardFooter}>
                  <Text style={styles.viewDetailsText}>View Traceability →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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

          {/* Delivery Progress - For PARTIALLY DELIVERED Orders */}
          {orderTraceability.order_status === 'PARTIALLY DELIVERED' && (
            <View style={styles.deliveryProgressSection}>
              <Text style={styles.deliveryProgressTitle}>Delivery Progress</Text>
              <View style={styles.deliveryProgressContainer}>
                <View style={styles.deliveryMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Ordered</Text>
                    <Text style={styles.metricValue}>
                      {orderTraceability.items?.reduce((sum, item) => {
                        return sum + (item.quantity_ton > 0 ? item.quantity_ton : (item.number_of_bags || 0));
                      }, 0).toFixed(2)}
                      {orderTraceability.items?.some(item => item.quantity_ton > 0) ? 'T' : ' Bags'}
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Delivered</Text>
                    <Text style={styles.metricValueDelivered}>
                      {orderTraceability.total_dispatched_tons.toFixed(2)}T
                    </Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Pending</Text>
                    <Text style={styles.metricValuePending}>
                      {(orderTraceability.items?.reduce((sum, item) => {
                        return sum + (item.quantity_ton > 0 ? item.quantity_ton : 0);
                      }, 0) - orderTraceability.total_dispatched_tons).toFixed(2)}T
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

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
  orderCardWrapper: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  orderCardContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCardHeader: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderCardCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  orderCardCustomer: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  orderCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 85,
    alignItems: 'center',
  },
  orderCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  orderCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  orderCardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
  deliveryProgressSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deliveryProgressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryProgressContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  deliveryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metricValueDelivered: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  metricValuePending: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9800',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
});
