
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  useWindowDimensions,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [updateData, setUpdateData] = useState({
    claim_status: '',
    remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    filterClaims();
  }, [claims, statusFilter, searchTerm]);

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
    let filtered = claims;
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(claim => claim.claim_status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.id.toString().includes(searchTerm) ||
        claim.issue_found?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.lab_test?.vehicle_entry?.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.lab_test?.vehicle_entry?.supplier?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredClaims(filtered);
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

  const renderMobileCard = (claim) => (
    <View key={claim.id} style={styles.mobileCard}>
      <View style={styles.mobileCardHeader}>
        <Text style={styles.mobileCardId}>Claim #{claim.id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusEmoji}>{getStatusEmoji(claim.claim_status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(claim.claim_status) }]}>
            {claim.claim_status}
          </Text>
        </View>
      </View>

      <View style={styles.mobileCardContent}>
        <View style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>Vehicle:</Text>
          <Text style={styles.mobileCardValue}>
            {claim.lab_test?.vehicle_entry?.vehicle_number || '-'}
          </Text>
        </View>

        <View style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>Supplier:</Text>
          <Text style={styles.mobileCardValue} numberOfLines={2}>
            {claim.lab_test?.vehicle_entry?.supplier?.supplier_name || '-'}
          </Text>
        </View>

        <View style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>Issue:</Text>
          <Text style={styles.mobileCardValue} numberOfLines={3}>
            {claim.issue_found}
          </Text>
        </View>

        <View style={styles.mobileCardRow}>
          <Text style={styles.mobileCardLabel}>Date:</Text>
          <Text style={styles.mobileCardValue}>
            {new Date(claim.claim_date).toLocaleDateString()}
          </Text>
        </View>

        {claim.remarks && (
          <View style={styles.mobileCardRow}>
            <Text style={styles.mobileCardLabel}>Remarks:</Text>
            <Text style={styles.mobileCardValue} numberOfLines={2}>
              {claim.remarks}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.mobileUpdateButton}
        onPress={() => openUpdateModal(claim)}
      >
        <Text style={styles.mobileUpdateButtonText}>Update Status</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDesktopTable = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View style={styles.tableWrapper}>
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
                <Text style={[styles.cell, styles.cellSupplier]} numberOfLines={2}>
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
  );

  return (
    <Layout title="Claim Tracking" navigation={navigation} currentRoute="ClaimTracking">
      <View style={styles.container}>
        <View style={[styles.filterContainer, isMobile && styles.filterContainerMobile]}>
          <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
            <TextInput
              style={[styles.searchInput, isMobile && styles.searchInputMobile]}
              placeholder="Search claims..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={[styles.pickerContainer, isMobile && styles.pickerContainerMobile]}>
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
        </View>

        {isMobile ? (
          <ScrollView style={styles.mobileCardsContainer}>
            {filteredClaims.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No claims found</Text>
              </View>
            ) : (
              filteredClaims.map((claim) => renderMobileCard(claim))
            )}
          </ScrollView>
        ) : (
          <View style={styles.tableContainer}>
            {renderDesktopTable()}
          </View>
        )}
      </View>

      <Modal
        visible={updateModalVisible}
        onClose={() => setUpdateModalVisible(false)}
        title="Update Claim"
        width={isMobile ? '95%' : isTablet ? '80%' : '70%'}
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

              <View style={[styles.buttonContainer, isMobile && styles.buttonContainerMobile]}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, isMobile && styles.buttonMobile]}
                  onPress={() => setUpdateModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, loading && styles.buttonDisabled, isMobile && styles.buttonMobile]}
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
    flexWrap: 'wrap',
  },
  filterContainerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
  },
  searchContainerMobile: {
    width: '100%',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  searchInputMobile: {
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterRowMobile: {
    width: '100%',
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
    minWidth: 180,
  },
  pickerContainerMobile: {
    flex: 1,
  },
  picker: {
    height: 40,
  },
  mobileCardsContainer: {
    flex: 1,
  },
  mobileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileCardId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mobileCardContent: {
    gap: 10,
  },
  mobileCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  mobileCardValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  mobileUpdateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  mobileUpdateButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableWrapper: {
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
  buttonContainerMobile: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonMobile: {
    width: '100%',
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
