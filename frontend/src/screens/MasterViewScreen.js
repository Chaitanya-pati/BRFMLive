import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { godownApi, supplierApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';

export default function MasterViewScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('godown');
  const [godowns, setGodowns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [godownTypes, setGodownTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');

  const [godownFormData, setGodownFormData] = useState({
    name: '',
    capacity: '',
    type: '',
  });

  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    state: '',
    city: '',
  });

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showConfirm = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  useEffect(() => {
    loadGodowns();
    loadSuppliers();
    loadGodownTypes();
    loadStates();
  }, []);

  const loadGodownTypes = async () => {
    try {
      const response = await godownApi.getTypes();
      setGodownTypes(response.data);
    } catch (error) {
      console.error('Error loading godown types:', error);
    }
  };

  const loadGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data);
    } catch (error) {
      console.error('Error loading godowns:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadStates = async () => {
    const statesData = await stateCityApi.getStates();
    setStates(statesData || []);
  };

  const handleStateChange = async (stateId) => {
    if (!stateId || stateId === '') {
      setSelectedStateId('');
      setSupplierFormData({ ...supplierFormData, state: '', city: '' });
      setCities([]);
      return;
    }
    
    const numericStateId = typeof stateId === 'string' ? parseInt(stateId, 10) : stateId;
    const state = states.find(s => {
      const sid = typeof s.state_id === 'string' ? parseInt(s.state_id, 10) : s.state_id;
      return sid === numericStateId;
    });
    
    if (state) {
      setSelectedStateId(numericStateId);
      setSupplierFormData({ ...supplierFormData, state: state.state_name, city: '' });
      const citiesData = await stateCityApi.getCities(numericStateId);
      setCities(citiesData || []);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentItem(null);
    if (activeTab === 'godown') {
      setGodownFormData({ name: '', capacity: '', type: '' });
    } else {
      setSupplierFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        address: '',
        state: '',
        city: '',
      });
      setSelectedStateId('');
      setCities([]);
    }
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditMode(true);
    setCurrentItem(item);
    if (activeTab === 'godown') {
      setGodownFormData({
        name: item.name,
        capacity: item.capacity.toString(),
        type: item.type,
      });
    } else {
      setSupplierFormData({
        supplier_name: item.supplier_name,
        contact_person: item.contact_person || '',
        phone: item.phone || '',
        address: item.address || '',
        state: item.state,
        city: item.city,
      });
      const state = states.find(s => s.state_name === item.state);
      if (state) {
        const stateId = typeof state.state_id === 'string' ? parseInt(state.state_id, 10) : state.state_id;
        setSelectedStateId(stateId);
        stateCityApi.getCities(stateId).then(citiesData => {
          setCities(citiesData || []);
        });
      }
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === 'godown') {
        if (!godownFormData.name || !godownFormData.capacity || !godownFormData.type) {
          showAlert('Error', 'Please fill all required fields');
          return;
        }

        const data = {
          name: godownFormData.name,
          capacity: parseInt(godownFormData.capacity, 10),
          type: godownFormData.type,
        };

        if (editMode) {
          await godownApi.update(currentItem.id, data);
          showAlert('Success', 'Godown updated successfully');
        } else {
          await godownApi.create(data);
          showAlert('Success', 'Godown added successfully');
        }
        loadGodowns();
      } else {
        if (!supplierFormData.supplier_name || !supplierFormData.state || !supplierFormData.city) {
          showAlert('Error', 'Please fill all required fields');
          return;
        }

        if (editMode) {
          await supplierApi.update(currentItem.id, supplierFormData);
          showAlert('Success', 'Supplier updated successfully');
        } else {
          await supplierApi.create(supplierFormData);
          showAlert('Success', 'Supplier added successfully');
        }
        loadSuppliers();
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving data:', error);
      showAlert('Error', 'Failed to save data');
    }
  };

  const handleDelete = (item) => {
    showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete this ${activeTab === 'godown' ? 'godown' : 'supplier'}?`,
      async () => {
        try {
          if (activeTab === 'godown') {
            await godownApi.delete(item.id);
            loadGodowns();
          } else {
            await supplierApi.delete(item.id);
            loadSuppliers();
          }
          showAlert('Success', 'Deleted successfully');
        } catch (error) {
          console.error('Error deleting:', error);
          showAlert('Error', 'Failed to delete');
        }
      }
    );
  };

  const godownColumns = [
    { field: 'id', label: 'ID', width: 80 },
    { field: 'name', label: 'Name', width: 200 },
    { field: 'capacity', label: 'Capacity (tons)', width: 150 },
    { field: 'type', label: 'Type', width: 150 },
    { field: 'current_storage', label: 'Current Storage (tons)', width: 180 },
  ];

  const supplierColumns = [
    { field: 'id', label: 'ID', width: 80 },
    { field: 'supplier_name', label: 'Supplier Name', width: 200 },
    { field: 'contact_person', label: 'Contact Person', width: 180 },
    { field: 'phone', label: 'Phone', width: 150 },
    { field: 'state', label: 'State', width: 150 },
    { field: 'city', label: 'City', width: 150 },
  ];

  return (
    <Layout navigation={navigation} title="Master Data">
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'godown' && styles.activeTab]}
            onPress={() => setActiveTab('godown')}
          >
            <Text style={[styles.tabText, activeTab === 'godown' && styles.activeTabText]}>
              Godown Master
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'supplier' && styles.activeTab]}
            onPress={() => setActiveTab('supplier')}
          >
            <Text style={[styles.tabText, activeTab === 'supplier' && styles.activeTabText]}>
              Supplier Master
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'godown' ? (
          <DataTable
            columns={godownColumns}
            data={godowns}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        ) : (
          <DataTable
            columns={supplierColumns}
            data={suppliers}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? `Edit ${activeTab === 'godown' ? 'Godown' : 'Supplier'}` : `Add New ${activeTab === 'godown' ? 'Godown' : 'Supplier'}`}
        >
          <ScrollView style={styles.modalContent}>
            {activeTab === 'godown' ? (
              <>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={godownFormData.name}
                  onChangeText={(text) => setGodownFormData({ ...godownFormData, name: text })}
                  placeholder="Enter godown name"
                />

                <Text style={styles.label}>Capacity (in tons) *</Text>
                <TextInput
                  style={styles.input}
                  value={godownFormData.capacity}
                  onChangeText={(text) => setGodownFormData({ ...godownFormData, capacity: text })}
                  placeholder="Enter capacity"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={godownFormData.type}
                    onValueChange={(value) => setGodownFormData({ ...godownFormData, type: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Type" value="" />
                    {godownTypes.map((type, index) => (
                      <Picker.Item key={index} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Supplier Name *</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.supplier_name}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, supplier_name: text })}
                  placeholder="Enter supplier name"
                />

                <Text style={styles.label}>Contact Person</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.contact_person}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, contact_person: text })}
                  placeholder="Enter contact person"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.phone}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, phone: text })}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.address}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, address: text })}
                  placeholder="Enter address"
                  multiline
                />

                <Text style={styles.label}>State *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedStateId}
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
                {cities.length > 0 ? (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={supplierFormData.city}
                      onValueChange={(value) => setSupplierFormData({ ...supplierFormData, city: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select City" value="" />
                      {cities.map((city) => (
                        <Picker.Item
                          key={city.district_id}
                          label={city.district_name}
                          value={city.district_name}
                        />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={supplierFormData.city}
                    onChangeText={(text) => setSupplierFormData({ ...supplierFormData, city: text })}
                    placeholder="Enter city name"
                  />
                )}
              </>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>
                  {editMode ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    alignSelf: 'stretch',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
