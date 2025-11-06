import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import notify from '../utils/notifications';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SelectDropdown from '../components/SelectDropdown';
import { godownApi, supplierApi, binApi, magnetApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';

export default function MasterViewScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('godown');
  const [godowns, setGodowns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);
  const [godownTypes, setGodownTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [states, setStates] = useState([]); // This state is used to store states fetched from API
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(''); // This state is not directly used in the Picker, but might be useful for other logic.
  const [loading, setLoading] = useState(false);
  const [currentGodown, setCurrentGodown] = useState(null);
  const [currentBin, setCurrentBin] = useState(null);
  const [currentMagnet, setCurrentMagnet] = useState(null);


  const [godownFormData, setGodownFormData] = useState({
    name: '',
    capacity: '',
    type: ''
  });

  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    state: '', // This will store the state name
    city: '',  // This will store the city name
  });

  const [binFormData, setBinFormData] = useState({
    bin_number: '',
    capacity: '',
    current_quantity: '',
    status: 'Active',
  });

  const [magnetFormData, setMagnetFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
  });

  // Comprehensive list of Indian states - this static list is no longer used for the picker,
  // it's replaced by states fetched from the API.
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  console.log("🗺️ Indian States loaded:", indianStates.length, "states");


  useEffect(() => {
    loadGodowns();
    loadSuppliers();
    loadBins();
    loadMagnets();
    loadGodownTypes();
    loadStatesFromApi(); // Renamed to avoid conflict with the static list
  }, []);

  const loadGodownTypes = async () => {
    try {
      const response = await godownApi.getTypes();
      console.log('Godown types response:', response.data);
      setGodownTypes(response.data || []);
    } catch (error) {
      console.error('Error loading godown types:', error);
      // Fallback to default types if API fails
      setGodownTypes(['Warehouse', 'Silo', 'Storage', 'Cold Storage']);
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

  const loadBins = async () => {
    try {
      const response = await binApi.getAll();
      setBins(response.data);
    } catch (error) {
      console.error('Error loading bins:', error);
    }
  };

  const loadMagnets = async () => {
    try {
      const response = await magnetApi.getAll();
      setMagnets(response.data);
    } catch (error) {
      console.error('Error loading magnets:', error);
    }
  };

  // Function to load states from API
  const loadStatesFromApi = async () => {
    try {
      console.log('📍 Loading states...');
      const statesData = await stateCityApi.getStates();
      console.log('📍 States loaded:', statesData);
      setStates(statesData); // Populate the 'states' state variable with API data
    } catch (error) {
      console.error('❌ Error loading states from API:', error);
    }
  };


  const handleStateChange = async (value) => {
    console.log('🔄 State changed to:', value);

    // Find the state name from the state_id
    const selectedState = states.find(s => s.state_id === parseInt(value));
    const stateName = selectedState ? selectedState.state_name : '';

    console.log('📍 Selected state:', stateName, 'ID:', value);

    setSupplierFormData({ ...supplierFormData, state: stateName, city: '' }); // Update form data with state name and clear city
    setSelectedStateId(value || ''); // Update selectedStateId if needed for other logic
  };


  const openAddModal = () => {
    setEditMode(false);
    setCurrentItem(null);
    if (activeTab === 'godown') {
      setGodownFormData({ name: '', capacity: '', type: '' });
      setCurrentGodown(null);
    } else {
      // Reset supplier form data and related states
      setSupplierFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        address: '',
        state: '',
        city: '',
      });
      setSelectedStateId(''); // Reset selected state ID
      loadStatesFromApi(); // Ensure states are loaded when opening the modal
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
        type: item.type
      });
      setCurrentGodown(item);
    } else { // Supplier tab
      setSupplierFormData({
        supplier_name: item.supplier_name,
        contact_person: item.contact_person || '',
        phone: item.phone || '',
        address: item.address || '',
        state: item.state, // This is the state name
        city: item.city,   // This is the city name
      });

      // Find the state object from the API data to get its ID
      const stateObject = states.find(s => s.state_name === item.state);
      if (stateObject) {
        setSelectedStateId(stateObject.state_id.toString()); // Set selectedStateId for Picker
      } else {
        setSelectedStateId('');
      }
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === 'godown') {
        await handleGodownSubmit();
      } else if (activeTab === 'bins') {
        await handleBinSubmit();
      } else if (activeTab === 'magnets') {
        await handleMagnetSubmit();
      } else { // Supplier tab
        // Ensure supplierFormData.state and supplierFormData.city are correctly set before validation
        if (!supplierFormData.supplier_name || !supplierFormData.state || !supplierFormData.city) {
          notify.showWarning('Please fill all required fields: Supplier Name, State, and City are mandatory.');
          return;
        }

        if (editMode) {
          await supplierApi.update(currentItem.id, supplierFormData);
          notify.showSuccess('Supplier updated successfully');
        } else {
          await supplierApi.create(supplierFormData);
          notify.showSuccess('Supplier added successfully');
        }
        loadSuppliers();
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      notify.showError('Failed to save data. Please try again.');
    }
  };

  const handleDelete = (item) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete this ${activeTab === 'godown' ? 'godown' : activeTab === 'supplier' ? 'supplier' : activeTab === 'bins' ? 'bin' : 'magnet'}?`,
      async () => {
        try {
          if (activeTab === 'godown') {
            await godownApi.delete(item.id);
            loadGodowns();
          } else if (activeTab === 'supplier') {
            await supplierApi.delete(item.id);
            loadSuppliers();
          } else if (activeTab === 'bins') {
            await binApi.delete(item.id);
            loadBins();
          } else { // magnets
            await magnetApi.delete(item.id);
            loadMagnets();
          }
          notify.showSuccess('Deleted successfully');
        } catch (error) {
          console.error('Error deleting:', error);
          notify.showError('Failed to delete. Please try again.');
        }
      }
    );
  };

  // Redundant delete handlers, consolidated into handleDelete
  const handleSupplierDelete = (supplier) => {
    handleDelete(supplier); // Call the consolidated handler
  };

  const handleGodownDelete = (godown) => {
    handleDelete(godown); // Call the consolidated handler
  };

  const godownColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'name', label: 'Name', flex: 1.5 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'type', label: 'Type', flex: 1 },
    { field: 'current_storage', label: 'Current Storage (tons)', flex: 1.2 },
  ];

  const supplierColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'supplier_name', label: 'Supplier Name', flex: 1.5 },
    { field: 'contact_person', label: 'Contact Person', flex: 1.2 },
    { field: 'phone', label: 'Phone', flex: 1 },
    { field: 'state', label: 'State', flex: 1 },
    { field: 'city', label: 'City', flex: 1 },
  ];

  const binColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'bin_number', label: 'Bin Number', flex: 1 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'current_quantity', label: 'Current Quantity (tons)', flex: 1.2 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const magnetColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'name', label: 'Magnet Name', flex: 1.5 },
    { field: 'description', label: 'Description', flex: 2 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Full', value: 'Full' },
    { label: 'Maintenance', value: 'Maintenance' },
  ];

  const openGodownModal = () => {
    setEditMode(false);
    setCurrentGodown(null);
    setGodownFormData({
      name: '',
      capacity: '',
      type: ''
    });
    setModalVisible(true);
  };

  const openEditGodownModal = (godown) => {
    setEditMode(true);
    setCurrentGodown(godown);
    setGodownFormData({
      name: godown.name,
      capacity: godown.capacity.toString(),
      type: godown.type
    });
    setActiveTab('godown');
    setModalVisible(true);
  };

  const handleGodownSubmit = async () => {
    if (!godownFormData.name || !godownFormData.capacity || !godownFormData.type) {
      notify.showWarning('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: godownFormData.name,
        capacity: parseFloat(godownFormData.capacity),
        type: godownFormData.type,
        current_storage: editMode ? currentGodown?.current_storage || 0 : 0,
      };

      if (editMode && currentGodown) {
        await godownApi.update(currentGodown.id, payload);
        notify.showSuccess('Godown updated successfully');
      } else {
        await godownApi.create(payload);
        notify.showSuccess('Godown created successfully');
      }

      setModalVisible(false);
      loadGodowns();
    } catch (error) {
      notify.showError(editMode ? 'Failed to update godown' : 'Failed to create godown');
    } finally {
      setLoading(false);
    }
  };

  const openBinModal = () => {
    setEditMode(false);
    setCurrentBin(null);
    setBinFormData({
      bin_number: '',
      capacity: '',
      current_quantity: '',
      status: 'Active',
    });
    setActiveTab('bins');
    setModalVisible(true);
  };

  const openEditBinModal = (bin) => {
    setEditMode(true);
    setCurrentBin(bin);
    setBinFormData({
      bin_number: bin.bin_number,
      capacity: bin.capacity.toString(),
      current_quantity: bin.current_quantity?.toString() || '0',
      status: bin.status || 'Active',
    });
    setActiveTab('bins');
    setModalVisible(true);
  };

  const handleBinSubmit = async () => {
    if (!binFormData.bin_number || !binFormData.capacity) {
      notify.showWarning('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bin_number: binFormData.bin_number,
        capacity: parseFloat(binFormData.capacity),
        current_quantity: parseFloat(binFormData.current_quantity) || 0,
        status: binFormData.status,
      };

      if (editMode && currentBin) {
        await binApi.update(currentBin.id, payload);
        notify.showSuccess('Bin updated successfully');
      } else {
        await binApi.create(payload);
        notify.showSuccess('Bin created successfully');
      }

      setModalVisible(false);
      loadBins();
    } catch (error) {
      notify.showError(editMode ? 'Failed to update bin' : 'Failed to create bin');
    } finally {
      setLoading(false);
    }
  };

  const handleBinDelete = (bin) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete bin ${bin.bin_number}?`,
      async () => {
        try {
          await binApi.delete(bin.id);
          notify.showSuccess('Bin deleted successfully');
          loadBins();
        } catch (error) {
          notify.showError('Failed to delete bin');
        }
      }
    );
  };

  const openMagnetModal = () => {
    setEditMode(false);
    setCurrentMagnet(null);
    setMagnetFormData({
      name: '',
      description: '',
      status: 'Active',
    });
    setActiveTab('magnets');
    setModalVisible(true);
  };

  const openEditMagnetModal = (magnet) => {
    setEditMode(true);
    setCurrentMagnet(magnet);
    setMagnetFormData({
      name: magnet.name,
      description: magnet.description || '',
      status: magnet.status || 'Active',
    });
    setActiveTab('magnets');
    setModalVisible(true);
  };

  const handleMagnetSubmit = async () => {
    if (!magnetFormData.name) {
      notify.showWarning('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: magnetFormData.name,
        description: magnetFormData.description,
        status: magnetFormData.status,
      };

      if (editMode && currentMagnet) {
        await magnetApi.update(currentMagnet.id, payload);
        notify.showSuccess('Magnet updated successfully');
      } else {
        await magnetApi.create(payload);
        notify.showSuccess('Magnet created successfully');
      }

      setModalVisible(false);
      loadMagnets();
    } catch (error) {
      notify.showError(editMode ? 'Failed to update magnet' : 'Failed to create magnet');
    } finally {
      setLoading(false);
    }
  };

  const handleMagnetDelete = (magnet) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete magnet ${magnet.name}?`,
      async () => {
        try {
          await magnetApi.delete(magnet.id);
          notify.showSuccess('Magnet deleted successfully');
          loadMagnets();
        } catch (error) {
          notify.showError('Failed to delete magnet');
        }
      }
    );
  };


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
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bins' && styles.activeTab]}
            onPress={() => setActiveTab('bins')}
          >
            <Text style={[styles.tabText, activeTab === 'bins' && styles.activeTabText]}>
              Bins
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'magnets' && styles.activeTab]}
            onPress={() => setActiveTab('magnets')}
          >
            <Text style={[styles.tabText, activeTab === 'magnets' && styles.activeTabText]}>
              Magnets
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'godown' && (
          <DataTable
            columns={godownColumns}
            data={godowns}
            onAdd={openGodownModal}
            onEdit={openEditGodownModal}
            onDelete={handleGodownDelete}
          />
        )}
        {activeTab === 'supplier' && (
          <DataTable
            columns={supplierColumns}
            data={suppliers}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={handleSupplierDelete}
          />
        )}
        {activeTab === 'bins' && (
          <DataTable
            columns={binColumns}
            data={bins}
            onAdd={openBinModal}
            onEdit={openEditBinModal}
            onDelete={handleBinDelete}
          />
        )}
        {activeTab === 'magnets' && (
          <DataTable
            columns={magnetColumns}
            data={magnets}
            onAdd={openMagnetModal}
            onEdit={openEditMagnetModal}
            onDelete={handleMagnetDelete}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? `Edit ${activeTab === 'godown' ? 'Godown' : activeTab === 'bins' ? 'Bin' : activeTab === 'magnets' ? 'Magnet' : 'Supplier'}` : `Add New ${activeTab === 'godown' ? 'Godown' : activeTab === 'bins' ? 'Bin' : activeTab === 'magnets' ? 'Magnet' : 'Supplier'}`}
        >
          <ScrollView style={styles.modalContent}>
            {activeTab === 'godown' && (
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
                <SelectDropdown
                  data={godownTypes.map(type => ({ label: type, value: type }))}
                  value={godownFormData.type}
                  onSelect={(item) => setGodownFormData({ ...godownFormData, type: item.value })}
                  placeholder="Select Type"
                  searchPlaceholder="Search type..."
                />
              </>
            )}
            {activeTab === 'bins' && (
              <>
                <Text style={styles.label}>Bin Number *</Text>
                <TextInput
                  style={styles.input}
                  value={binFormData.bin_number}
                  onChangeText={(text) => setBinFormData({ ...binFormData, bin_number: text })}
                  placeholder="Enter bin number"
                />

                <Text style={styles.label}>Capacity (in tons) *</Text>
                <TextInput
                  style={styles.input}
                  value={binFormData.capacity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, capacity: text })}
                  placeholder="Enter capacity"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Current Quantity (in tons)</Text>
                <TextInput
                  style={styles.input}
                  value={binFormData.current_quantity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, current_quantity: text })}
                  placeholder="Enter current quantity"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Status *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={binFormData.status}
                    onValueChange={(value) => setBinFormData({ ...binFormData, status: value })}
                    style={styles.picker}
                  >
                    {statusOptions.map((option, index) => (
                      <Picker.Item key={index} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </>
            )}
            {activeTab === 'magnets' && (
              <>
                <Text style={styles.label}>Magnet Name *</Text>
                <TextInput
                  style={styles.input}
                  value={magnetFormData.name}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, name: text })}
                  placeholder="Enter magnet name"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={magnetFormData.description}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, description: text })}
                  placeholder="Enter description"
                  multiline
                />

                <Text style={styles.label}>Status *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={magnetFormData.status}
                    onValueChange={(value) => setMagnetFormData({ ...magnetFormData, status: value })}
                    style={styles.picker}
                  >
                    {statusOptions.map((option, index) => (
                      <Picker.Item key={index} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </>
            )}
            {activeTab === 'supplier' && (
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
                    selectedValue={states.find(s => s.state_name === supplierFormData.state)?.state_id?.toString() || ''}
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
                  value={supplierFormData.city || ''}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, city: text })}
                  placeholder="Enter city name"
                />
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