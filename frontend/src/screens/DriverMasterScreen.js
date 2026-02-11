import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { driverApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

export default function DriverMasterScreen({ navigation }) {
  const [drivers, setDrivers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');

  const [formData, setFormData] = useState({
    driver_name: '',
    phone: '',
    license_number: '',
    address: '',
    city: '',
    state: '',
    is_active: true,
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadDrivers();
    loadStates();
  }, []);

  const loadStates = async () => {
    const statesData = await stateCityApi.getStates();
    setStates(statesData || []);
  };

  const loadDrivers = async () => {
    try {
      const response = await driverApi.getAll();
      setDrivers(response.data);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const handleStateChange = (stateId) => {
    if (!stateId || stateId === '') {
      setSelectedStateId('');
      setFormData({
        ...formData,
        state: '',
      });
      return;
    }

    const numericStateId = typeof stateId === 'string' ? parseInt(stateId, 10) : stateId;
    const state = states.find(s => {
      const sid = typeof s.state_id === 'string' ? parseInt(s.state_id, 10) : s.state_id;
      return sid === numericStateId;
    });

    if (state) {
      setSelectedStateId(numericStateId);
      setFormData({
        ...formData,
        state: state.state_name,
      });
    } else {
      setSelectedStateId('');
      setFormData({
        ...formData,
        state: '',
      });
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentDriver(null);
    setFormData({
      driver_name: '',
      phone: '',
      license_number: '',
      address: '',
      city: '',
      state: '',
      is_active: true,
    });
    setSelectedStateId('');
    setModalVisible(true);
  };

  const openEditModal = (driver) => {
    setEditMode(true);
    setCurrentDriver(driver);
    setFormData({
      driver_name: driver.driver_name,
      phone: driver.phone || '',
      license_number: driver.license_number || '',
      address: driver.address || '',
      city: driver.city || '',
      state: driver.state || '',
      is_active: driver.is_active,
    });

    const state = states.find(s => s.state_name === driver.state);
    if (state) {
      setSelectedStateId(state.state_id);
    } else {
      setSelectedStateId('');
    }

    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedName = formData.driver_name?.trim();
    const trimmedLicense = formData.license_number?.trim();

    if (!trimmedName) {
      await showAlert('Validation Error', 'Please fill in Driver Name', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        driver_name: trimmedName,
        phone: formData.phone?.trim() || '',
        license_number: trimmedLicense || '',
        address: formData.address?.trim() || '',
        city: formData.city?.trim() || '',
        state: formData.state?.trim() || '',
        is_active: formData.is_active,
      };

      if (editMode && currentDriver) {
        await driverApi.update(currentDriver.driver_id, payload);
        showSuccess('Driver updated successfully');
      } else {
        await driverApi.create(payload);
        showSuccess('Driver created successfully');
      }

      setModalVisible(false);
      await loadDrivers();
    }, 'driver');
  };

  const handleDelete = async (driver) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete ${driver.driver_name}?`
    );

    if (confirmed) {
      try {
        await driverApi.delete(driver.driver_id);
        showSuccess('Driver deleted successfully');
        loadDrivers();
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete driver');
      }
    }
  };

  const columns = [
    { label: 'ID', field: 'driver_id', width: 80, key: 'driver_id' },
    { label: 'Driver Name', field: 'driver_name', width: 200, key: 'driver_name' },
    { label: 'Phone', field: 'phone', width: 130, key: 'phone' },
    { label: 'License', field: 'license_number', width: 150, key: 'license_number' },
    { label: 'State', field: 'state', width: 130, key: 'state' },
    { label: 'City', field: 'city', width: 130, key: 'city' },
    {
      label: 'Created',
      field: 'created_at',
      width: 150,
      key: 'created_at',
      render: (value) => formatISTDate(value)
    },
  ];

  return (
    <Layout title="Driver Management" navigation={navigation} currentRoute="DriverMaster">
      <DataTable
        columns={columns}
        data={drivers}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Driver' : 'Add New Driver'}
        width="70%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Driver Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.driver_name}
            onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
            placeholder="Enter driver name"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            maxLength={15}
          />

          <Text style={styles.label}>License Number</Text>
          <TextInput
            style={styles.input}
            value={formData.license_number}
            onChangeText={(text) => setFormData({ ...formData, license_number: text })}
            placeholder="Enter license number"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>State</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedStateId || ''}
              onValueChange={handleStateChange}
              style={styles.picker}
            >
              <Picker.Item label="Select State" value="" />
              {states.map((state) => (
                <Picker.Item
                  key={state.state_id}
                  label={state.state_name}
                  value={state.state_id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={formData.city || ''}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="Enter city name"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address || ''}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter full address"
            multiline
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Saving...' : editMode ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.outline, borderRadius: 6, padding: 12, fontSize: 14, backgroundColor: colors.surface, color: colors.textPrimary },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: colors.outline, borderRadius: 6, backgroundColor: colors.surface },
  picker: { height: Platform.OS === 'ios' ? 150 : 50 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6, minWidth: 100, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  saveButton: { backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.5 },
  cancelButtonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  saveButtonText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
});
