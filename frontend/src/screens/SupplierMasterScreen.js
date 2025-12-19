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
import { supplierApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

export default function SupplierMasterScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [states, setStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  // Removed local loading state as it's now managed by useFormSubmission

  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    street: '',
    city: '',
    district: '',
    state: '',
    zip_code: '',
    gstin: '',
  });

  // Initialize the useFormSubmission hook
  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadSuppliers();
    loadStates();
  }, []);

  const loadStates = async () => {
    const statesData = await stateCityApi.getStates();
    setStates(statesData || []);
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
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
    setCurrentSupplier(null);
    setFormData({
      supplier_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      street: '',
      city: '',
      district: '',
      state: '',
      zip_code: '',
      gstin: '',
    });
    setSelectedStateId('');
    setModalVisible(true);
  };

  const openEditModal = (supplier) => {
    setEditMode(true);
    setCurrentSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      street: supplier.street || '',
      city: supplier.city,
      district: supplier.district || '',
      state: supplier.state,
      zip_code: supplier.zip_code || '',
      gstin: supplier.gstin || '',
    });

    const state = states.find(s => s.state_name === supplier.state);
    if (state) {
      setSelectedStateId(state.state_id);
    } else {
      setSelectedStateId('');
    }

    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedName = formData.supplier_name?.trim();
    const trimmedState = formData.state?.trim();
    const trimmedCity = formData.city?.trim();

    console.log('📝 Submitting supplier:', { trimmedName, trimmedState, trimmedCity, editMode });

    if (!trimmedName || !trimmedState || !trimmedCity) {
      await showAlert('Validation Error', 'Please fill in all required fields (Supplier Name, State, City)', 'error');
      return;
    }

    // Use handleFormSubmission for the actual submission logic
    await handleFormSubmission(async () => {
      const payload = {
        supplier_name: trimmedName,
        contact_person: formData.contact_person?.trim() || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        street: formData.street?.trim() || '',
        city: trimmedCity,
        district: formData.district?.trim() || '',
        state: trimmedState,
        zip_code: formData.zip_code?.trim() || '',
        gstin: formData.gstin?.trim() || '',
      };

      console.log('📤 Sending payload:', payload);

      if (editMode && currentSupplier) {
        const response = await supplierApi.update(currentSupplier.id, payload);
        console.log('✅ Update response:', response.data);
        showSuccess('Supplier updated successfully');
      } else {
        const response = await supplierApi.create(payload);
        console.log('✅ Create response:', response.data);
        showSuccess('Supplier created successfully');
      }

      setModalVisible(false);
      await loadSuppliers();
    }, 'supplier'); // Pass a unique identifier for this form submission
  };

  const handleDelete = async (supplier) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete ${supplier.supplier_name}?`
    );

    if (confirmed) {
      try {
        await supplierApi.delete(supplier.id);
        showSuccess('Supplier deleted successfully');
        loadSuppliers();
      } catch (error) {
        console.error('❌ Delete error:', error);
        showError('Failed to delete supplier');
      }
    }
  };

  const columns = [
    { label: 'ID', field: 'id', width: 80 },
    { label: 'Supplier Name', field: 'supplier_name', width: 200 },
    { label: 'Contact Person', field: 'contact_person', width: 180 },
    { label: 'Phone', field: 'phone', width: 130 },
    { label: 'Email', field: 'email', width: 200 },
    { label: 'GSTIN', field: 'gstin', width: 150 },
    { label: 'State', field: 'state', width: 130 },
    { label: 'City', field: 'city', width: 130 },
    { label: 'District', field: 'district', width: 130 },
    {
      label: 'Created',
      field: 'created_at',
      width: 150,
      render: (value) => formatISTDate(value)
    },
  ];

  return (
    <Layout title="Supplier Master" navigation={navigation} currentRoute="SupplierMaster">
      <DataTable
        columns={columns}
        data={suppliers}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Supplier' : 'Add New Supplier'}
        width="70%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Supplier Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.supplier_name}
            onChangeText={(text) => setFormData({ ...formData, supplier_name: text })}
            placeholder="Enter supplier name"
          />

          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_person}
            onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
            placeholder="Enter contact person"
          />

          <Text style={styles.label}>Phone</Text>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') })}
              placeholder="Enter 10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

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

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            value={formData.district || ''}
            onChangeText={(text) => setFormData({ ...formData, district: text })}
            placeholder="Enter district name"
          />

          <Text style={styles.label}>Street</Text>
          <TextInput
            style={styles.input}
            value={formData.street || ''}
            onChangeText={(text) => setFormData({ ...formData, street: text })}
            placeholder="Enter street"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address || ''}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter full address"
            multiline
          />

          <Text style={styles.label}>Zip Code</Text>
          <TextInput
            style={styles.input}
            value={formData.zip_code || ''}
            onChangeText={(text) => setFormData({ ...formData, zip_code: text })}
            placeholder="Enter zip code"
            keyboardType="numeric"
          />

          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            style={styles.input}
            value={formData.gstin}
            onChangeText={(text) => setFormData({ ...formData, gstin: text })}
            placeholder="Enter GSTIN (15 characters)"
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
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: Platform.select({ web: 100, default: 120 }),
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minWidth: 60,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
  },
});