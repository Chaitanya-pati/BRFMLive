import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import notify from '../utils/notifications';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { claimApi, labTestApi } from '../api/client';
import colors from '../theme/colors';
import { formatISTDate } from '../utils/dateUtils';

export default function ClaimTrackingScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [raiseClaimModalVisible, setRaiseClaimModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [updateData, setUpdateData] = useState({
    claim_status: '',
    description: '',
    claim_type: '',
    claim_amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [labTests, setLabTests] = useState([]);
  const [newClaimData, setNewClaimData] = useState({
    lab_test_id: '',
    description: '',
    claim_type: '',
    claim_amount: '',
    claim_date: new Date(),
  });
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
      notify.showError('Failed to load claims');
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
        claim.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.lab_test?.vehicle_entry?.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.lab_test?.vehicle_entry?.supplier?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      description: claim.description || '',
      claim_type: claim.claim_type || '',
      claim_amount: claim.claim_amount ? claim.claim_amount.toString() : '',
    });
    setUpdateModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedClaim) return;

    setLoading(true);
    try {
      await claimApi.update(selectedClaim.id, {
        claim_status: updateData.claim_status,
        description: updateData.description || null,
        claim_type: updateData.claim_type || null,
        claim_amount: updateData.claim_amount ? parseFloat(updateData.claim_amount) : null,
      });
      notify.showSuccess('Claim updated successfully');
      setUpdateModalVisible(false);
      loadClaims();
    } catch (error) {
      notify.showError('Failed to update claim');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadLabTestsWithoutClaims = async () => {
    try {
      const response = await labTestApi.getAll();
      const testsWithoutClaims = response.data.filter(test => !test.has_claim);
      setLabTests(testsWithoutClaims);
    } catch (error) {
      console.error('Error loading lab tests:', error);
      notify.showError('Failed to load lab tests');
    }
  };

  const openRaiseClaimModal = async () => {
    await loadLabTestsWithoutClaims();
    setNewClaimData({
      lab_test_id: '',
      description: '',
      claim_type: '',
      claim_amount: '',
      claim_date: new Date(),
    });
    setRaiseClaimModalVisible(true);
  };

  const handleRaiseClaim = async () => {
    if (!newClaimData.lab_test_id) {
      notify.showWarning('Please select a lab test');
      return;
    }
    if (!newClaimData.description) {
      notify.showWarning('Please enter the description');
      return;
    }

    setLoading(true);
    try {
      await claimApi.create({
        lab_test_id: parseInt(newClaimData.lab_test_id),
        description: newClaimData.description,
        claim_type: newClaimData.claim_type || null,
        claim_amount: newClaimData.claim_amount ? parseFloat(newClaimData.claim_amount) : null,
        claim_date: newClaimData.claim_date.toISOString(),
      });
      notify.showSuccess('Claim raised successfully');
      setRaiseClaimModalVisible(false);
      loadClaims();
    } catch (error) {
      notify.showError('Failed to raise claim');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { label: 'Claim ID', field: 'id', width: 100 },
    {
      label: 'Vehicle No',
      field: 'lab_test',
      width: 140,
      render: (labTest) => labTest?.vehicle_entry?.vehicle_number || '-'
    },
    {
      label: 'Supplier Name',
      field: 'lab_test',
      width: 200,
      render: (labTest) => labTest?.vehicle_entry?.supplier?.supplier_name || '-'
    },
    { label: 'Description', field: 'description', width: 250 },
    {
      label: 'Claim Type',
      field: 'claim_type',
      width: 120,
      render: (type) => type ? (type === 'percentage' ? 'Percentage (%)' : 'Per KG (₹/kg)') : '-'
    },
    { label: 'Amount', field: 'claim_amount', width: 100 },
    {
      label: 'Claim Status',
      field: 'claim_status',
      width: 150,
      render: (status) => (
        <View style={styles.statusContainer}>
          <Text style={styles.statusEmoji}>{getStatusEmoji(status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {status}
          </Text>
        </View>
      )
    },
    {
      label: 'Claim Date (IST)',
      field: 'claim_date',
      width: 150,
      render: (value) => formatISTDate(value)
    },
    {
      label: 'Action',
      field: 'action',
      width: 100,
      render: (rowData) => (
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => openUpdateModal(rowData)}
        >
          <Text style={styles.updateButtonText}>Update</Text>
        </TouchableOpacity>
      )
    },
  ];

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

          <TouchableOpacity
            style={[styles.raiseClaimButton, isMobile && styles.raiseClaimButtonMobile]}
            onPress={openRaiseClaimModal}
          >
            <Text style={styles.raiseClaimButtonText}>+ Raise New Claim</Text>
          </TouchableOpacity>
        </View>

        <DataTable
          columns={columns}
          data={filteredClaims}
          onEdit={openUpdateModal}
          searchable={false}
        />
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

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={updateData.description}
                onChangeText={(text) => setUpdateData({ ...updateData, description: text })}
                placeholder="Update description"
                multiline
                numberOfLines={6}
              />

              <Text style={styles.label}>Claim Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={updateData.claim_type}
                  onValueChange={(value) => setUpdateData({ ...updateData, claim_type: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Claim Type" value="" />
                  <Picker.Item label="Percentage (%)" value="percentage" />
                  <Picker.Item label="Rupees per Kilogram (₹/kg)" value="per_kg" />
                </Picker>
              </View>

              {updateData.claim_type && (
                <>
                  <Text style={styles.label}>
                    Claim Amount {updateData.claim_type === "percentage" ? "(%)" : "(₹/kg)"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={updateData.claim_amount}
                    onChangeText={(text) => setUpdateData({ ...updateData, claim_amount: text })}
                    placeholder={updateData.claim_type === "percentage" ? "Enter percentage" : "Enter amount per kg"}
                    keyboardType="numeric"
                  />
                </>
              )}

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

      <Modal
        visible={raiseClaimModalVisible}
        onClose={() => setRaiseClaimModalVisible(false)}
        title="Raise New Claim"
        width={isMobile ? '95%' : isTablet ? '80%' : '70%'}
      >
        <View style={styles.form}>
          <Text style={styles.label}>Select Lab Test *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newClaimData.lab_test_id}
              onValueChange={(value) => setNewClaimData({ ...newClaimData, lab_test_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select a lab test..." value="" />
              {labTests.map((test) => (
                <Picker.Item
                  key={test.id}
                  label={`Test #${test.id} - ${test.vehicle_entry?.vehicle_number || 'N/A'} - ${test.vehicle_entry?.supplier?.supplier_name || 'N/A'}`}
                  value={test.id.toString()}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newClaimData.description}
            onChangeText={(text) => setNewClaimData({ ...newClaimData, description: text })}
            placeholder="Describe the issue..."
            multiline
            numberOfLines={6}
          />

          <Text style={styles.label}>Claim Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newClaimData.claim_type}
              onValueChange={(value) => setNewClaimData({ ...newClaimData, claim_type: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Claim Type" value="" />
              <Picker.Item label="Percentage (%)" value="percentage" />
              <Picker.Item label="Rupees per Kilogram (₹/kg)" value="per_kg" />
            </Picker>
          </View>

          {newClaimData.claim_type && (
            <>
              <Text style={styles.label}>
                Claim Amount {newClaimData.claim_type === "percentage" ? "(%)" : "(₹/kg)"}
              </Text>
              <TextInput
                style={styles.input}
                value={newClaimData.claim_amount}
                onChangeText={(text) => setNewClaimData({ ...newClaimData, claim_amount: text })}
                placeholder={newClaimData.claim_type === "percentage" ? "Enter percentage" : "Enter amount per kg"}
                keyboardType="numeric"
              />
            </>
          )}

          <View style={[styles.buttonContainer, isMobile && styles.buttonContainerMobile]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, isMobile && styles.buttonMobile]}
              onPress={() => setRaiseClaimModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled, isMobile && styles.buttonMobile]}
              onPress={handleRaiseClaim}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Raising Claim...' : 'Raise Claim'}
              </Text>
            </TouchableOpacity>
          </View>
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
  raiseClaimButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  raiseClaimButtonMobile: {
    width: '100%',
    marginTop: 12,
  },
  raiseClaimButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
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