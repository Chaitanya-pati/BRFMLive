import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import Layout from '../components/Layout';
import { productionOrderApi, planningBinsApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { formatISTDate } from '../utils/dateUtils';

export default function ProductionOrderPlanningScreen({ route, navigation }) {
  const initialOrderId = route.params?.orderId;
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [sourceBins, setSourceBins] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedDestinations, setSelectedDestinations] = useState([]);

  useEffect(() => {
    if (selectedOrderId) {
      loadData();
    } else {
      loadOrdersList();
    }
  }, [selectedOrderId]);

  const loadOrdersList = async () => {
    try {
      setLoading(true);
      const response = await productionOrderApi.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, sourceRes, destRes] = await Promise.all([
        productionOrderApi.getPlanning(selectedOrderId),
        planningBinsApi.getSourceBins(),
        planningBinsApi.getDestinationBins(),
      ]);
      
      setOrder(orderRes.data);
      setSourceBins(sourceRes.data);
      setDestinationBins(destRes.data);

      if (orderRes.data.source_bins && orderRes.data.source_bins.length > 0) {
        setSelectedSources(orderRes.data.source_bins.map(sb => ({
          bin_id: sb.bin_id,
          blend_percentage: sb.blend_percentage,
          quantity: sb.quantity,
          bin: sb.bin,
        })));
      }
      
      if (orderRes.data.destination_bins && orderRes.data.destination_bins.length > 0) {
        setSelectedDestinations(orderRes.data.destination_bins.map(db => ({
          bin_id: db.bin_id,
          quantity: db.quantity,
          bin: db.bin,
        })));
      }
    } catch (error) {
      console.error('Error loading planning data:', error);
      showError('Failed to load planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOrderList = () => {
    setSelectedOrderId(null);
    setOrder(null);
    setSelectedSources([]);
    setSelectedDestinations([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CREATED': return '#6b7280';
      case 'PLANNED': return '#3b82f6';
      case 'IN_PROGRESS': return '#f59e0b';
      case 'COMPLETED': return '#10b981';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleSelectOrder(item.id)}
    >
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderNumber}>{item.order_number}</Text>
        <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusTextSmall}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderCardDetails}>
        <Text style={styles.orderDetail}>Product: {item.raw_product?.product_name || 'N/A'}</Text>
        <Text style={styles.orderDetail}>Quantity: {item.quantity} kg</Text>
        <Text style={styles.orderDetail}>Target: {item.target_finish_date ? formatISTDate(item.target_finish_date) : 'N/A'}</Text>
      </View>
      <TouchableOpacity style={styles.planButtonCard} onPress={() => handleSelectOrder(item.id)}>
        <Text style={styles.planButtonText}>Plan This Order</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const addSourceBin = (binId) => {
    const bin = sourceBins.find(b => b.id === binId);
    if (!bin) return;
    
    if (selectedSources.find(s => s.bin_id === binId)) {
      showError('This bin is already selected');
      return;
    }

    setSelectedSources([...selectedSources, {
      bin_id: binId,
      blend_percentage: 0,
      quantity: 0,
      bin: bin,
    }]);
  };

  const removeSourceBin = (binId) => {
    setSelectedSources(selectedSources.filter(s => s.bin_id !== binId));
  };

  const updateSourceBin = (binId, field, value) => {
    const numValue = parseFloat(value) || 0;
    setSelectedSources(selectedSources.map(s => {
      if (s.bin_id === binId) {
        const updated = { ...s, [field]: numValue };
        if (field === 'blend_percentage' && order) {
          updated.quantity = (numValue / 100) * order.quantity;
        }
        return updated;
      }
      return s;
    }));
  };

  const addDestinationBin = (binId) => {
    const bin = destinationBins.find(b => b.id === binId);
    if (!bin) return;
    
    if (selectedDestinations.find(d => d.bin_id === binId)) {
      showError('This bin is already selected');
      return;
    }

    setSelectedDestinations([...selectedDestinations, {
      bin_id: binId,
      quantity: 0,
      bin: bin,
    }]);
  };

  const removeDestinationBin = (binId) => {
    setSelectedDestinations(selectedDestinations.filter(d => d.bin_id !== binId));
  };

  const updateDestinationBin = (binId, value) => {
    setSelectedDestinations(selectedDestinations.map(d => {
      if (d.bin_id === binId) {
        return { ...d, quantity: parseFloat(value) || 0 };
      }
      return d;
    }));
  };

  const calculateTotals = () => {
    const totalPercentage = selectedSources.reduce((sum, s) => sum + (s.blend_percentage || 0), 0);
    const totalSourceQty = selectedSources.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalDistribution = selectedDestinations.reduce((sum, d) => sum + (d.quantity || 0), 0);
    return { totalPercentage, totalSourceQty, totalDistribution };
  };

  const { totalPercentage, totalSourceQty, totalDistribution } = calculateTotals();
  
  const isBlendValid = Math.abs(totalPercentage - 100) < 0.01;
  const isDistributionValid = Math.abs(totalDistribution - (order?.quantity || 0)) < 0.01;
  const hasSourceBins = selectedSources.length > 0;
  const hasDestinationBins = selectedDestinations.length > 0;
  const isConfigValid = isBlendValid && isDistributionValid && hasSourceBins && hasDestinationBins;

  const handleSave = async () => {
    if (!hasSourceBins) {
      showError('Please add at least one source bin');
      return;
    }
    if (!hasDestinationBins) {
      showError('Please add at least one destination bin');
      return;
    }
    if (!isBlendValid) {
      showError('Blend percentages must total 100%');
      return;
    }
    if (!isDistributionValid) {
      showError(`Distribution must equal ${order?.quantity} kg`);
      return;
    }

    const confirmed = await showConfirm(
      'Save Planning',
      'Are you sure you want to save this planning configuration? The order status will be updated to PLANNED.'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const payload = {
        source_bins: selectedSources.map(s => ({
          bin_id: s.bin_id,
          blend_percentage: s.blend_percentage,
          quantity: s.quantity,
        })),
        destination_bins: selectedDestinations.map(d => ({
          bin_id: d.bin_id,
          quantity: d.quantity,
        })),
      };

      await productionOrderApi.savePlanning(selectedOrderId, payload);
      showSuccess('Planning saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      showError(error.response?.data?.detail || 'Failed to save planning');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableSourceBins = () => {
    return sourceBins.filter(b => !selectedSources.find(s => s.bin_id === b.id));
  };

  const getAvailableDestinationBins = () => {
    return destinationBins.filter(b => !selectedDestinations.find(d => d.bin_id === b.id));
  };

  if (loading) {
    return (
      <Layout title="Production Order Planning" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  if (!selectedOrderId) {
    return (
      <Layout title="Order Planning" navigation={navigation}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Select an Order to Plan</Text>
            <Text style={styles.pageSubtitle}>Choose a production order to configure source bins and distribution</Text>
          </View>
          {orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No production orders found</Text>
              <TouchableOpacity
                style={styles.createOrderButton}
                onPress={() => navigation.navigate('ProductionOrder')}
              >
                <Text style={styles.createOrderButtonText}>Create New Order</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderOrderItem}
              contentContainerStyle={styles.ordersList}
            />
          )}
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Production Order Planning" navigation={navigation}>
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToOrderList}>
          <Text style={styles.backButtonText}>← Back to Order List</Text>
        </TouchableOpacity>

        <View style={styles.orderInfoCard}>
          <View style={styles.orderInfoHeader}>
            <Text style={styles.orderTitle}>Order: {order?.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.status) }]}>
              <Text style={styles.statusText}>{order?.status}</Text>
            </View>
          </View>
          <View style={styles.orderInfoDetails}>
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Product</Text>
              <Text style={styles.orderInfoValue}>{order?.raw_product?.product_name}</Text>
            </View>
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Order Quantity</Text>
              <Text style={styles.orderInfoValueLarge}>{order?.quantity} kg</Text>
            </View>
            <View style={styles.orderInfoItem}>
              <Text style={styles.orderInfoLabel}>Target Date</Text>
              <Text style={styles.orderInfoValue}>{formatISTDate(order?.target_finish_date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Blend Sources (Raw Wheat Bins)</Text>
              <Text style={styles.sectionSubtitle}>Configure the wheat blend percentages from source bins</Text>
            </View>
            <View style={[styles.validationBadge, isBlendValid ? styles.validBadge : styles.invalidBadge]}>
              <Text style={[styles.validationBadgeText, isBlendValid ? styles.validText : styles.invalidText]}>
                {isBlendValid ? '✓ Valid' : '✗ Invalid'}
              </Text>
            </View>
          </View>

          {getAvailableSourceBins().length > 0 && (
            <View style={styles.addBinSection}>
              <Text style={styles.addBinLabel}>Add Source Bin:</Text>
              <View style={styles.binChips}>
                {getAvailableSourceBins().map(bin => (
                  <TouchableOpacity
                    key={bin.id}
                    style={styles.addBinChip}
                    onPress={() => addSourceBin(bin.id)}
                  >
                    <Text style={styles.addBinChipText}>+ {bin.bin_number}</Text>
                    <Text style={styles.addBinChipSubtext}>{bin.current_quantity} kg</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedSources.length === 0 ? (
            <View style={styles.emptyBinMessage}>
              <Text style={styles.emptyBinText}>No source bins selected. Click on a bin above to add it.</Text>
            </View>
          ) : (
            <View style={styles.binTable}>
              <View style={styles.binTableHeader}>
                <Text style={[styles.binTableHeaderCell, { flex: 2 }]}>Source Bin</Text>
                <Text style={[styles.binTableHeaderCell, { flex: 1 }]}>Available</Text>
                <Text style={[styles.binTableHeaderCell, { flex: 1 }]}>Blend %</Text>
                <Text style={[styles.binTableHeaderCell, { flex: 1 }]}>Quantity (kg)</Text>
                <Text style={[styles.binTableHeaderCell, { width: 50 }]}>Action</Text>
              </View>
              {selectedSources.map((source) => (
                <View key={source.bin_id} style={styles.binTableRow}>
                  <View style={[styles.binTableCell, { flex: 2 }]}>
                    <Text style={styles.binName}>{source.bin?.bin_number}</Text>
                  </View>
                  <View style={[styles.binTableCell, { flex: 1 }]}>
                    <Text style={styles.binAvailable}>{source.bin?.current_quantity} kg</Text>
                  </View>
                  <View style={[styles.binTableCell, { flex: 1 }]}>
                    <TextInput
                      style={styles.tableInput}
                      value={source.blend_percentage.toString()}
                      onChangeText={(v) => updateSourceBin(source.bin_id, 'blend_percentage', v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={[styles.binTableCell, { flex: 1 }]}>
                    <Text style={styles.calculatedQty}>{source.quantity.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.binTableCell, { width: 50, alignItems: 'center' }]}>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeSourceBin(source.bin_id)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Blend:</Text>
              <Text style={[styles.totalValue, !isBlendValid && styles.errorValue]}>
                {totalPercentage.toFixed(1)}%
              </Text>
              {!isBlendValid && <Text style={styles.errorHint}>(must be 100%)</Text>}
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Quantity:</Text>
              <Text style={styles.totalValue}>{totalSourceQty.toFixed(2)} kg</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Distribution Destinations (24 Hours Bins)</Text>
              <Text style={styles.sectionSubtitle}>Distribute the order quantity to destination bins</Text>
            </View>
            <View style={[styles.validationBadge, isDistributionValid ? styles.validBadge : styles.invalidBadge]}>
              <Text style={[styles.validationBadgeText, isDistributionValid ? styles.validText : styles.invalidText]}>
                {isDistributionValid ? '✓ Valid' : '✗ Invalid'}
              </Text>
            </View>
          </View>

          {getAvailableDestinationBins().length > 0 && (
            <View style={styles.addBinSection}>
              <Text style={styles.addBinLabel}>Add Destination Bin:</Text>
              <View style={styles.binChips}>
                {getAvailableDestinationBins().map(bin => (
                  <TouchableOpacity
                    key={bin.id}
                    style={[styles.addBinChip, styles.addBinChipDest]}
                    onPress={() => addDestinationBin(bin.id)}
                  >
                    <Text style={styles.addBinChipText}>+ {bin.bin_number}</Text>
                    <Text style={styles.addBinChipSubtext}>{((bin.capacity || 0) - (bin.current_quantity || 0)).toFixed(0)} kg free</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedDestinations.length === 0 ? (
            <View style={styles.emptyBinMessage}>
              <Text style={styles.emptyBinText}>No destination bins selected. Click on a bin above to add it.</Text>
            </View>
          ) : (
            <View style={styles.binTable}>
              <View style={styles.binTableHeader}>
                <Text style={[styles.binTableHeaderCell, { flex: 2 }]}>Destination Bin</Text>
                <Text style={[styles.binTableHeaderCell, { flex: 1 }]}>Capacity Free</Text>
                <Text style={[styles.binTableHeaderCell, { flex: 1 }]}>Quantity (kg)</Text>
                <Text style={[styles.binTableHeaderCell, { width: 50 }]}>Action</Text>
              </View>
              {selectedDestinations.map((dest) => (
                <View key={dest.bin_id} style={styles.binTableRow}>
                  <View style={[styles.binTableCell, { flex: 2 }]}>
                    <Text style={styles.binName}>{dest.bin?.bin_number}</Text>
                  </View>
                  <View style={[styles.binTableCell, { flex: 1 }]}>
                    <Text style={styles.binAvailable}>
                      {((dest.bin?.capacity || 0) - (dest.bin?.current_quantity || 0)).toFixed(0)} kg
                    </Text>
                  </View>
                  <View style={[styles.binTableCell, { flex: 1 }]}>
                    <TextInput
                      style={styles.tableInput}
                      value={dest.quantity.toString()}
                      onChangeText={(v) => updateDestinationBin(dest.bin_id, v)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={[styles.binTableCell, { width: 50, alignItems: 'center' }]}>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeDestinationBin(dest.bin_id)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Distribution:</Text>
              <Text style={[styles.totalValue, !isDistributionValid && styles.errorValue]}>
                {totalDistribution.toFixed(2)} kg
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Required:</Text>
              <Text style={styles.totalValue}>{order?.quantity} kg</Text>
              {!isDistributionValid && (
                <Text style={styles.errorHint}>
                  ({totalDistribution > (order?.quantity || 0) ? 'over' : 'under'} by {Math.abs(totalDistribution - (order?.quantity || 0)).toFixed(2)} kg)
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Configuration Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Source Bins</Text>
              <View style={[styles.summaryStatus, hasSourceBins ? styles.summaryValid : styles.summaryInvalid]}>
                <Text style={styles.summaryStatusText}>{selectedSources.length} selected</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Blend Total</Text>
              <View style={[styles.summaryStatus, isBlendValid ? styles.summaryValid : styles.summaryInvalid]}>
                <Text style={styles.summaryStatusText}>{totalPercentage.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Destination Bins</Text>
              <View style={[styles.summaryStatus, hasDestinationBins ? styles.summaryValid : styles.summaryInvalid]}>
                <Text style={styles.summaryStatusText}>{selectedDestinations.length} selected</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Distribution</Text>
              <View style={[styles.summaryStatus, isDistributionValid ? styles.summaryValid : styles.summaryInvalid]}>
                <Text style={styles.summaryStatusText}>{totalDistribution.toFixed(0)} / {order?.quantity} kg</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, !isConfigValid && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || !isConfigValid}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isConfigValid ? 'Save Planning' : 'Complete Configuration to Save'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 16,
  },
  createOrderButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createOrderButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  orderCardDetails: {
    marginBottom: 12,
  },
  orderDetail: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  planButtonCard: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  orderInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfoDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  orderInfoItem: {},
  orderInfoLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  orderInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  orderInfoValueLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  validationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  validBadge: {
    backgroundColor: '#dcfce7',
  },
  invalidBadge: {
    backgroundColor: '#fee2e2',
  },
  validationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  validText: {
    color: '#16a34a',
  },
  invalidText: {
    color: '#dc2626',
  },
  addBinSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addBinLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  binChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addBinChip: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
  },
  addBinChipDest: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  addBinChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  addBinChipSubtext: {
    fontSize: 11,
    color: colors.textLight,
  },
  emptyBinMessage: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyBinText: {
    color: colors.textLight,
    fontSize: 14,
  },
  binTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  binTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  binTableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  binTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  binTableCell: {
    justifyContent: 'center',
  },
  binName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  binAvailable: {
    fontSize: 13,
    color: colors.textLight,
  },
  tableInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    width: 80,
  },
  calculatedQty: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  errorValue: {
    color: '#dc2626',
  },
  errorHint: {
    fontSize: 12,
    color: '#dc2626',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: 120,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  summaryStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  summaryValid: {
    backgroundColor: '#dcfce7',
  },
  summaryInvalid: {
    backgroundColor: '#fee2e2',
  },
  summaryStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '500',
  },
});
