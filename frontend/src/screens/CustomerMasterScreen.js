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
import { customerApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

export default function CustomerMasterScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    contact_person: '',
    contact_person_mobile: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    gst_number: '',
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadCustomers();
    loadStates();
  }, []);

  const loadStates = async () => {
    const statesData = await stateCityApi.getStates();
    setStates(statesData || []);
  };

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
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
    setCurrentCustomer(null);
    setFormData({
      customer_name: '',
      contact_person: '',
      contact_person_mobile: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pin_code: '',
      gst_number: '',
    });
    setSelectedStateId('');
    setModalVisible(true);
  };

  const openEditModal = (customer) => {
    setEditMode(true);
    setCurrentCustomer(customer);
    setFormData({
      customer_name: customer.customer_name,
      contact_person: customer.contact_person || '',
      contact_person_mobile: customer.contact_person_mobile || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pin_code: customer.pin_code || '',
      gst_number: customer.gst_number || '',
    });

    const state = states.find(s => s.state_name === customer.state);
    if (state) {
      setSelectedStateId(state.state_id);
    } else {
      setSelectedStateId('');
    }

    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedName = formData.customer_name?.trim();
    const trimmedState = formData.state?.trim();
    const trimmedCity = formData.city?.trim();

    if (!trimmedName || !trimmedState || !trimmedCity) {
      await showAlert('Validation Error', 'Please fill in all required fields (Customer Name, State, City)', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        customer_name: trimmedName,
        contact_person: formData.contact_person?.trim() || '',
        contact_person_mobile: formData.contact_person_mobile?.trim() || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        city: trimmedCity,
        state: trimmedState,
        pin_code: formData.pin_code?.trim() || '',
        gst_number: formData.gst_number?.trim() || '',
        is_active: true,
      };

      if (editMode && currentCustomer) {
        await customerApi.update(currentCustomer.customer_id, payload);
        showSuccess('Customer updated successfully');
      } else {
        await customerApi.create(payload);
        showSuccess('Customer created successfully');
      }

      setModalVisible(false);
      await loadCustomers();
    }, 'customer');
  };

  const handleDelete = async (customer) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete ${customer.customer_name}?`
    );

    if (confirmed) {
      try {
        await customerApi.delete(customer.customer_id);
        showSuccess('Customer deleted successfully');
        loadCustomers();
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete customer');
      }
    }
  };

  const columns = [
    { label: 'ID', field: 'customer_id', width: 80 },
    { label: 'Customer Name', field: 'customer_name', width: 200 },
    { label: 'Contact Person', field: 'contact_person', width: 180 },
    { label: 'Mobile', field: 'contact_person_mobile', width: 130 },
    { label: 'GSTIN', field: 'gst_number', width: 150 },
    { label: 'State', field: 'state', width: 130 },
    { label: 'City', field: 'city', width: 130 },
    {
      label: 'Created',
      field: 'created_at',
      width: 150,
      render: (value) => formatISTDate(value)
    },
  ];

  return (
    <Layout title="Customer Master" navigation={navigation} currentRoute="CustomerMaster">
      <DataTable
        columns={columns}
        data={customers}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Customer' : 'Add New Customer'}
        width="70%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Customer Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.customer_name}
            onChangeText={(text) => setFormData({ ...formData, customer_name: text })}
            placeholder="Enter customer name"
          />

          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_person}
            onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
            placeholder="Enter contact person"
          />

          <Text style={styles.label}>Contact Mobile</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_person_mobile}
            onChangeText={(text) => setFormData({ ...formData, contact_person_mobile: text.replace(/[^0-9]/g, '') })}
            placeholder="Enter 10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>State *</Text>
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

          <Text style={styles.label}>City *</Text>
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

          <Text style={styles.label}>Pin Code</Text>
          <TextInput
            style={styles.input}
            value={formData.pin_code || ''}
            onChangeText={(text) => setFormData({ ...formData, pin_code: text })}
            placeholder="Enter pin code"
            keyboardType="numeric"
          />

          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            style={styles.input}
            value={formData.gst_number}
            onChangeText={(text) => setFormData({ ...formData, gst_number: text })}
            placeholder="Enter GSTIN"
            maxLength={15}
            autoCapitalize="characters"
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
