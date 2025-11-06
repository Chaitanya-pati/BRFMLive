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
import { godownApi, supplierApi, binApi, magnetApi } from '../api/client';
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
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
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
    state: '',
    city: '',
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



  useEffect(() => {
    loadGodowns();
    loadSuppliers();
    loadBins();
    loadMagnets();
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
      setCurrentGodown(null);
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
        type: item.type
      });
      setCurrentGodown(item);
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
        await handleGodownSubmit();
      } else if (activeTab === 'bins') {
        await handleBinSubmit();
      } else if (activeTab === 'magnets') {
        await handleMagnetSubmit();
      } else {
        if (!supplierFormData.supplier_name || !supplierFormData.state || !supplierFormData.city) {
          notify.showWarning('Please fill all required fields');
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
          notify.showSuccess('Deleted successfully');
        } catch (error) {
          console.error('Error deleting:', error);
          notify.showError('Failed to delete. Please try again.');
        }
      }
    );
  };

  const handleSupplierDelete = (supplier) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete ${supplier.supplier_name}?`,
      async () => {
        try {
          await supplierApi.delete(supplier.id);
          notify.showSuccess('Supplier deleted successfully');
          loadSuppliers();
        } catch (error) {
          notify.showError('Failed to delete supplier');
        }
      }
    );
  };

  const handleGodownDelete = (godown) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete ${godown.name}?`,
      async () => {
        try {
          await godownApi.delete(godown.id);
          notify.showSuccess('Godown deleted successfully');
          loadGodowns();
        } catch (error) {
          notify.showError('Failed to delete godown');
        }
      }
    );
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