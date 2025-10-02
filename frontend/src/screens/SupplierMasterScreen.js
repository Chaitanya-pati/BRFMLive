import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { supplierApi, stateCityApi } from '../api/client';

export default function SupplierMasterScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    state: '',
    city: '',
  });

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

  const handleStateChange = async (stateId) => {
    console.log('handleStateChange called with stateId:', stateId, 'type:', typeof stateId);
    console.log('Available states:', states);
    
    if (!stateId || stateId === '') {
      setSelectedStateId('');
      setFormData({ 
        ...formData, 
        state: '', 
        city: '' 
      });
      setCities([]);
      return;
    }
    
    const numericStateId = typeof stateId === 'string' ? parseInt(stateId, 10) : stateId;
    console.log('Looking for state with ID:', numericStateId);
    const state = states.find(s => {
      const sid = typeof s.state_id === 'string' ? parseInt(s.state_id, 10) : s.state_id;
      console.log('Comparing:', sid, '===', numericStateId, '?', sid === numericStateId);
      return sid === numericStateId;
    });
    console.log('Found state:', state);
    
    if (state) {
      setSelectedStateId(numericStateId);
      setFormData({ 
        ...formData, 
        state: state.state_name, 
        city: '' 
      });
      
      const citiesData = await stateCityApi.getCities(numericStateId);
      setCities(citiesData || []);
      console.log('Updated formData with state:', state.state_name);
    } else {
      setSelectedStateId('');
      setFormData({ 
        ...formData, 
        state: '', 
        city: '' 
      });
      setCities([]);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentSupplier(null);
    setFormData({
      supplier_name: '',
      contact_person: '',
      phone: '',
      address: '',
      state: '',
      city: '',
    });
    setSelectedStateId('');
    setCities([]);
    setModalVisible(true);
  };

  const openEditModal = async (supplier) => {
    setEditMode(true);
    setCurrentSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      state: supplier.state,
      city: supplier.city,
    });

    const state = states.find(s => s.state_name === supplier.state);
    if (state) {
      setSelectedStateId(state.state_id);
      const citiesData = await stateCityApi.getCities(state.state_id);
      setCities(citiesData || []);
    } else {
      setSelectedStateId('');
      setCities([]);
    }
    
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    console.log('Save button clicked');
    console.log('Form data:', formData);
    console.log('Selected State ID:', selectedStateId);
    
    // Trim and validate required fields
    const trimmedName = formData.supplier_name?.trim();
    const trimmedState = formData.state?.trim();
    const trimmedCity = formData.city?.trim();
    
    if (!trimmedName || !trimmedState || !trimmedCity) {
      Alert.alert('Error', 'Please fill in all required fields (Supplier Name, State, City)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supplier_name: trimmedName,
        contact_person: formData.contact_person?.trim() || '',
        phone: formData.phone?.trim() || '',
        address: formData.address?.trim() || '',
        state: trimmedState,
        city: trimmedCity,
      };
      
      console.log('Sending payload to API:', payload);
      console.log('API Base URL:', await import('../api/client').then(m => m.api.defaults.baseURL));
      
      if (editMode && currentSupplier) {
        console.log('Updating supplier:', currentSupplier.id);
        const response = await supplierApi.update(currentSupplier.id, payload);
        console.log('Update response status:', response.status);
        console.log('Update response data:', response.data);
        Alert.alert('Success', 'Supplier updated successfully');
      } else {
        console.log('Creating new supplier with payload:', payload);
        const response = await supplierApi.create(payload);
        console.log('Create response status:', response.status);
        console.log('Create response data:', response.data);
        Alert.alert('Success', 'Supplier created successfully');
      }
      
      setModalVisible(false);
      await loadSuppliers();
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || 'Unknown error occurred';
      Alert.alert('Error', 'Failed to save supplier: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplier) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${supplier.supplier_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supplierApi.delete(supplier.id);
              Alert.alert('Success', 'Supplier deleted successfully');
              loadSuppliers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const columns = [
    { label: 'ID', field: 'id', width: 80 },
    { label: 'Supplier Name', field: 'supplier_name', width: 200 },
    { label: 'Contact Person', field: 'contact_person', width: 180 },
    { label: 'Phone', field: 'phone', width: 150 },
    { label: 'State', field: 'state', width: 150 },
    { label: 'City', field: 'city', width: 150 },
    { 
      label: 'Created', 
      field: 'created_at', 
      width: 180,
      render: (value) => new Date(value).toLocaleDateString()
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
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>State *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedStateId || ''}
              onValueChange={(itemValue) => {
                console.log('State picker value changed:', itemValue);
                handleStateChange(itemValue);
              }}
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

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : editMode ? 'Update' : 'Save'}
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
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
