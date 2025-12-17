import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Layout from '../components/Layout';
import { productionOrderApi, planningBinsApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { formatISTDate } from '../utils/dateUtils';

export default function ProductionOrderPlanningScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [sourceBins, setSourceBins] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderRes, sourceRes, destRes] = await Promise.all([
        productionOrderApi.getPlanning(orderId),
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
    setValidationResult(null);
  };

  const removeSourceBin = (binId) => {
    setSelectedSources(selectedSources.filter(s => s.bin_id !== binId));
    setValidationResult(null);
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
    setValidationResult(null);
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
    setValidationResult(null);
  };

  const removeDestinationBin = (binId) => {
    setSelectedDestinations(selectedDestinations.filter(d => d.bin_id !== binId));
    setValidationResult(null);
  };

  const updateDestinationBin = (binId, value) => {
    setSelectedDestinations(selectedDestinations.map(d => {
      if (d.bin_id === binId) {
        return { ...d, quantity: parseFloat(value) || 0 };
      }
      return d;
    }));
    setValidationResult(null);
  };

  const calculateTotals = () => {
    const totalPercentage = selectedSources.reduce((sum, s) => sum + (s.blend_percentage || 0), 0);
    const totalSourceQty = selectedSources.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalDistribution = selectedDestinations.reduce((sum, d) => sum + (d.quantity || 0), 0);
    return { totalPercentage, totalSourceQty, totalDistribution };
  };

  const handleValidate = async () => {
    if (selectedSources.length === 0) {
      showError('Please add at least one source bin');
      return;
    }
    if (selectedDestinations.length === 0) {
      showError('Please add at least one destination bin');
      return;
    }

    try {
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

      const response = await productionOrderApi.validatePlanning(orderId, payload);
      setValidationResult(response.data);
      
      if (response.data.valid) {
        showSuccess('Configuration is valid');
      }
    } catch (error) {
      console.error('Validation error:', error);
      showError(error.response?.data?.detail || 'Validation failed');
    }
  };

  const handleSave = async () => {
    if (selectedSources.length === 0) {
      showError('Please add at least one source bin');
      return;
    }
    if (selectedDestinations.length === 0) {
      showError('Please add at least one destination bin');
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

      await productionOrderApi.savePlanning(orderId, payload);
      showSuccess('Planning saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      showError(error.response?.data?.detail || 'Failed to save planning');
    } finally {
      setSaving(false);
    }
  };

  const { totalPercentage, totalSourceQty, totalDistribution } = calculateTotals();

  if (loading) {
    return (
      <Layout title="Production Order Planning" navigation={navigation}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Production Order Planning" navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>Order: {order?.order_number}</Text>
          <View style={styles.orderDetails}>
            <Text style={styles.detailText}>Product: {order?.raw_product?.product_name}</Text>
            <Text style={styles.detailText}>Quantity: {order?.quantity} kg</Text>
            <Text style={styles.detailText}>Target Date: {formatISTDate(order?.target_finish_date)}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(order?.status) }]}>
              {order?.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blend Sources (Raw Wheat Bins)</Text>
          <Text style={styles.sectionSubtitle}>Configure the wheat blend percentages from source bins</Text>
          
          <View style={styles.binSelector}>
            <Text style={styles.label}>Add Source Bin:</Text>
            <View style={styles.binOptions}>
              {sourceBins.filter(b => !selectedSources.find(s => s.bin_id === b.id)).map(bin => (
                <TouchableOpacity
                  key={bin.id}
                  style={styles.binOption}
                  onPress={() => addSourceBin(bin.id)}
                >
                  <Text style={styles.binOptionText}>{bin.bin_number}</Text>
                  <Text style={styles.binOptionSubtext}>{bin.current_quantity} kg available</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {selectedSources.map((source, index) => (
            <View key={source.bin_id} style={styles.selectedBinRow}>
              <View style={styles.binInfo}>
                <Text style={styles.binName}>{source.bin?.bin_number}</Text>
                <Text style={styles.binAvailable}>Available: {source.bin?.current_quantity} kg</Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blend %</Text>
                <TextInput
                  style={styles.input}
                  value={source.blend_percentage.toString()}
                  onChangeText={(v) => updateSourceBin(source.bin_id, 'blend_percentage', v)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity (kg)</Text>
                <TextInput
                  style={[styles.input, styles.readonlyInput]}
                  value={source.quantity.toFixed(2)}
                  editable={false}
                />
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSourceBin(source.bin_id)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={[styles.totalText, totalPercentage !== 100 && styles.errorText]}>
              Total Blend: {totalPercentage.toFixed(1)}% {totalPercentage !== 100 && '(must be 100%)'}
            </Text>
            <Text style={styles.totalText}>Total Quantity: {totalSourceQty.toFixed(2)} kg</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribution Destinations (24 Hours Bins)</Text>
          <Text style={styles.sectionSubtitle}>Distribute the order quantity to destination bins</Text>
          
          <View style={styles.binSelector}>
            <Text style={styles.label}>Add Destination Bin:</Text>
            <View style={styles.binOptions}>
              {destinationBins.filter(b => !selectedDestinations.find(d => d.bin_id === b.id)).map(bin => (
                <TouchableOpacity
                  key={bin.id}
                  style={styles.binOption}
                  onPress={() => addDestinationBin(bin.id)}
                >
                  <Text style={styles.binOptionText}>{bin.bin_number}</Text>
                  <Text style={styles.binOptionSubtext}>{(bin.capacity - bin.current_quantity).toFixed(0)} kg capacity</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {selectedDestinations.map((dest, index) => (
            <View key={dest.bin_id} style={styles.selectedBinRow}>
              <View style={styles.binInfo}>
                <Text style={styles.binName}>{dest.bin?.bin_number}</Text>
                <Text style={styles.binAvailable}>
                  Capacity: {((dest.bin?.capacity || 0) - (dest.bin?.current_quantity || 0)).toFixed(0)} kg
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={dest.quantity.toString()}
                  onChangeText={(v) => updateDestinationBin(dest.bin_id, v)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeDestinationBin(dest.bin_id)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.totalsRow}>
            <Text style={[styles.totalText, Math.abs(totalDistribution - (order?.quantity || 0)) > 0.01 && styles.errorText]}>
              Total Distribution: {totalDistribution.toFixed(2)} kg / {order?.quantity} kg required
            </Text>
          </View>
        </View>

        {validationResult && (
          <View style={[styles.validationResult, validationResult.valid ? styles.validResult : styles.invalidResult]}>
            <Text style={styles.validationTitle}>
              {validationResult.valid ? '✓ Configuration Valid' : '✗ Validation Failed'}
            </Text>
            {validationResult.errors?.map((error, i) => (
              <Text key={i} style={styles.errorMessage}>• {error}</Text>
            ))}
            {validationResult.warnings?.map((warning, i) => (
              <Text key={i} style={styles.warningMessage}>⚠ {warning}</Text>
            ))}
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.validateButton} onPress={handleValidate}>
            <Text style={styles.buttonText}>Validate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Planning</Text>
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

const getStatusColor = (status) => {
  switch (status) {
    case 'CREATED': return colors.info;
    case 'PLANNED': return colors.primary;
    case 'IN_PROGRESS': return colors.warning;
    case 'COMPLETED': return colors.success;
    case 'CANCELLED': return colors.danger;
    default: return colors.textLight;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 16,
  },
  binSelector: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  binOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  binOption: {
    backgroundColor: colors.lightBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120,
  },
  binOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  binOptionSubtext: {
    fontSize: 11,
    color: colors.textLight,
  },
  selectedBinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  binInfo: {
    flex: 1,
    minWidth: 120,
  },
  binName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  binAvailable: {
    fontSize: 11,
    color: colors.textLight,
  },
  inputGroup: {
    minWidth: 100,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 80,
  },
  readonlyInput: {
    backgroundColor: colors.lightBg,
    color: colors.textLight,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  errorText: {
    color: colors.danger,
  },
  validationResult: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  validResult: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  invalidResult: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 4,
  },
  warningMessage: {
    color: colors.warning,
    fontSize: 13,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  validateButton: {
    flex: 1,
    backgroundColor: colors.info,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
