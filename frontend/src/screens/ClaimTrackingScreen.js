import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { claimApi } from '../api/client';
import colors from '../theme/colors';

export default function ClaimTrackingScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [updateData, setUpdateData] = useState({
    claim_status: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    filterClaims();
  }, [claims, statusFilter]);

  const loadClaims = async () => {
    try {
      const response = await claimApi.getAll();
      setClaims(response.data);
    } catch (error) {
      console.error('Error loading claims:', error);
      Alert.alert('Error', 'Failed to load claims');
    }
  };

  const filterClaims = () => {
    if (statusFilter === 'All') {
      setFilteredClaims(claims);
    } else {
      setFilteredClaims(claims.filter(claim => claim.claim_status === statusFilter));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Closed':
        return '#10B981';
      case 'In Progress':
        return '#F59E0B';
      case 'Open':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'Closed':
        return '🟢';
      case 'In Progress':
        return '🟠';
      case 'Open':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const openUpdateModal = (claim) => {
    setSelectedClaim(claim);
    setUpdateData({
      claim_status: claim.claim_status,
      remarks: claim.remarks || '',
    });
    setUpdateModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedClaim) return;

    setLoading(true);
    try {
      await claimApi.update(selectedClaim.id, {
        claim_status: updateData.claim_status,
        remarks: updateData.remarks || null,
      });
      Alert.alert('Success', 'Claim updated successfully');
      setUpdateModalVisible(false);
      loadClaims();
    } catch (error) {
      Alert.alert('Error', 'Failed to update claim');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Claim Tracking" navigation={navigation} currentRoute="ClaimTracking">
      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Status:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
              style={styles.picker}
            >
              <Picker.Item label="All" value="All" />
              <Picker.Item label="Open" value="Open" />
              <Picker.Item label="In Progress" value="In Progress" />
              <Picker.Item label="Closed" value="Closed" />
            </Picker>
          </View>
        </View>

        <ScrollView horizontal style={styles.tableContainer}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.cellId]}>Claim ID</Text>
              <Text style={[styles.headerCell, styles.cellVehicle]}>Vehicle No</Text>
              <Text style={[styles.headerCell, styles.cellSupplier]}>Supplier Name</Text>
              <Text style={[styles.headerCell, styles.cellIssue]}>Issue Found</Text>
              <Text style={[styles.headerCell, styles.cellStatus]}>Claim Status</Text>
              <Text style={[styles.headerCell, styles.cellDate]}>Claim Date</Text>
              <Text style={[styles.headerCell, styles.cellRemarks]}>Remarks</Text>
              <Text style={[styles.headerCell, styles.cellAction]}>Action</Text>
            </View>

            <ScrollView style={styles.tableBody}>
              {filteredClaims.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No claims found</Text>
                </View>
              ) : (
                filteredClaims.map((claim) => (
                  <View key={claim.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellId]}>{claim.id}</Text>
                    <Text style={[styles.cell, styles.cellVehicle]}>
                      {claim.lab_test?.vehicle_entry?.vehicle_number || '-'}
                    </Text>
                    <Text style={[styles.cell, styles.cellSupplier]}>
                      {claim.lab_test?.vehicle_entry?.supplier?.supplier_name || '-'}
                    </Text>
                    <Text style={[styles.cell, styles.cellIssue]} numberOfLines={2}>
                      {claim.issue_found}
                    </Text>
                    <View style={[styles.cell, styles.cellStatus]}>
                      <View style={styles.statusContainer}>
                        <Text style={styles.statusEmoji}>{getStatusEmoji(claim.claim_status)}</Text>
                        <Text style={[styles.statusText, { color: getStatusColor(claim.claim_status) }]}>
                          {claim.claim_status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cell, styles.cellDate]}>
                      {new Date(claim.claim_date).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.cell, styles.cellRemarks]} numberOfLines={2}>
                      {claim.remarks || '-'}
                    </Text>
                    <View style={[styles.cell, styles.cellAction]}>
                      <TouchableOpacity
                        style={styles.updateButton}
                        onPress={() => openUpdateModal(claim)}
                      >
                        <Text style={styles.updateButtonText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={updateModalVisible}
        onClose={() => setUpdateModalVisible(false)}
        title="Update Claim"
        width="70%"
      >
        <View style={styles.form}>
          {selectedClaim && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Claim ID: {selectedClaim.id}</Text>
                <Text style={styles.infoText}>
                  Vehicle: {selectedClaim.lab_test?.vehicle_entry?.vehicle_number || '-'}
                </Text>
                <Text style={styles.infoText}>
                  Supplier: {selectedClaim.lab_test?.vehicle_entry?.supplier?.supplier_name || '-'}
                </Text>
              </View>

              <Text style={styles.label}>Claim Status *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={updateData.claim_status}
                  onValueChange={(value) => setUpdateData({ ...updateData, claim_status: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Open" value="Open" />
                  <Picker.Item label="In Progress" value="In Progress" />
                  <Picker.Item label="Closed" value="Closed" />
                </Picker>
              </View>

              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={updateData.remarks}
                onChangeText={(text) => setUpdateData({ ...updateData, remarks: text })}
                placeholder="Add or update remarks"
                multiline
                numberOfLines={4}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setUpdateModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                  onPress={handleUpdate}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Updating...' : 'Update Claim'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 200,
  },
  picker: {
    height: 40,
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    padding: 12,
    fontWeight: '700',
    color: colors.onPrimary,
    fontSize: 13,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  tableBody: {
    backgroundColor: colors.surface,
    maxHeight: 500,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cellId: {
    width: 80,
  },
  cellVehicle: {
    width: 140,
  },
  cellSupplier: {
    width: 200,
  },
  cellIssue: {
    width: 250,
  },
  cellStatus: {
    width: 150,
  },
  cellDate: {
    width: 120,
  },
  cellRemarks: {
    width: 200,
  },
  cellAction: {
    width: 100,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusEmoji: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  updateButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  infoBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
