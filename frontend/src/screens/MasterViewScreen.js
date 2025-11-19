import React, { useState, useEffect, useRef } from 'react';
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
import { godownApi, supplierApi, binApi, magnetApi, machineApi, stateCityApi } from '../api/client';
import colors from '../theme/colors';

export default function MasterViewScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('godown');
  const [godowns, setGodowns] = useState([]);
  const [godownTypes, setGodownTypes] = useState([]); // State to store godown types
  const [suppliers, setSuppliers] = useState([]);
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);
  const [machines, setMachines] = useState([]);
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

  // State for scroll navigation
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabScrollRef = useRef(null);


  const [godownFormData, setGodownFormData] = useState({
    name: '',
    type: ''
  });

  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    address: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    gstin: '',
  });

  const [binFormData, setBinFormData] = useState({
    bin_number: '',
    capacity: '',
    current_quantity: '',
    bin_type: '',
    status: 'Active',
  });

  const [magnetFormData, setMagnetFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
  });

  const [machineFormData, setMachineFormData] = useState({
    name: '',
    machine_type: 'Separator',
    make: '',
    serial_number: '',
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
    const loadInitialData = async () => {
      await Promise.all([
        loadGodowns(),
        loadSuppliers(),
        loadBins(),
        loadMagnets(),
        loadMachines(),
        loadGodownTypes(), // Load godown types here
        loadStatesFromApi()
      ]);
    };
    loadInitialData();
  }, []);

  // Function to load godown types from API
  const loadGodownTypes = async () => {
    try {
      console.log('📋 Loading godown types...');
      const response = await godownApi.getTypes();
      console.log('📋 Godown types response:', response.data);
      setGodownTypes(response.data || []);
    } catch (error) {
      console.error('❌ Error loading godown types:', error);
      // Fallback to default types if API fails
      const fallbackTypes = ['Mill', 'Low Mill', 'HD-1', 'HD-2', 'HD-3', 'Warehouse', 'Silo', 'Storage', 'Cold Storage'];
      console.log('📋 Using fallback godown types:', fallbackTypes);
      setGodownTypes(fallbackTypes);
      notify.showWarning('Using default godown types. Backend may be unavailable.');
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

  const loadMachines = async () => {
    try {
      const response = await machineApi.getAll();
      setMachines(response.data);
    } catch (error) {
      console.error('Error loading machines:', error);
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

    if (!value || value === '') {
      setSupplierFormData({ ...supplierFormData, state: '', city: '' });
      setSelectedStateId('');
      return;
    }

    // Find the state name from the state_id
    const numericStateId = typeof value === 'string' ? parseInt(value, 10) : value;
    const selectedState = states.find(s => {
      const sid = typeof s.state_id === 'string' ? parseInt(s.state_id, 10) : s.state_id;
      return sid === numericStateId;
    });
    const stateName = selectedState ? selectedState.state_name : '';

    console.log('📍 Selected state:', stateName, 'ID:', value);

    setSupplierFormData({ ...supplierFormData, state: stateName, city: '' });
    setSelectedStateId(value.toString());
  };


  const openAddModal = () => {
    setEditMode(false);
    setCurrentItem(null);
    if (activeTab === 'godown') {
      setGodownFormData({ name: '', type: '' });
      setCurrentGodown(null);
    } else {
      // Reset supplier form data and related states
      setSupplierFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        gstin: '',
        address: '',
        state: '',
        city: '',
        street: '',
      });
      setSelectedStateId('');
      loadStatesFromApi();
    }
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditMode(true);
    setCurrentItem(item);
    if (activeTab === 'godown') {
      setGodownFormData({
        name: item.name,
        type: item.type
      });
      setCurrentGodown(item);
    } else if (activeTab === 'supplier') {
      setSupplierFormData({
        supplier_name: item.supplier_name,
        contact_person: item.contact_person || '',
        phone: item.phone || '',
        address: item.address || '',
        street: item.street || '',
        city: item.city,
        state: item.state,
        zip_code: item.zip_code || '',
        gstin: item.gstin || '',
      });

      const stateObject = states.find(s => s.state_name === item.state);
      if (stateObject) {
        setSelectedStateId(stateObject.state_id.toString());
      } else {
        setSelectedStateId('');
      }
    } else if (activeTab === 'bins') {
      setBinFormData({
        bin_number: item.bin_number,
        capacity: item.capacity.toString(),
        current_quantity: item.current_quantity?.toString() || '0',
        bin_type: item.bin_type || '',
        status: item.status || 'Active',
      });
      setCurrentBin(item);
    } else if (activeTab === 'magnets') {
      setMagnetFormData({
        name: item.name,
        description: item.description || '',
        status: item.status || 'Active',
      });
      setCurrentMagnet(item);
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
      } else if (activeTab === 'machines') {
        await handleMachineSubmit();
      } else if (activeTab === 'supplier') {
        // Trim and validate required fields
        const trimmedSupplierName = supplierFormData.supplier_name?.trim();
        const trimmedState = supplierFormData.state?.trim();
        const trimmedCity = supplierFormData.city?.trim();

        console.log('📝 Saving supplier data:', {
          trimmedSupplierName,
          trimmedState,
          trimmedCity,
          editMode,
          currentItemId: currentItem?.id
        });

        if (!trimmedSupplierName || !trimmedState || !trimmedCity) {
          notify.showWarning('Please fill all required fields: Supplier Name, State, and City are mandatory.');
          return;
        }

        setLoading(true);
        const payload = {
          supplier_name: trimmedSupplierName,
          contact_person: supplierFormData.contact_person?.trim() || '',
          phone: supplierFormData.phone?.trim() || '',
          address: supplierFormData.address?.trim() || '',
          street: supplierFormData.street?.trim() || '',
          city: trimmedCity,
          state: trimmedState,
          zip_code: supplierFormData.zip_code?.trim() || '',
          gstin: supplierFormData.gstin?.trim() || '',
        };

        console.log('📤 Sending payload:', payload);

        if (editMode && currentItem?.id) {
          const response = await supplierApi.update(currentItem.id, payload);
          console.log('✅ Update response:', response);
          notify.showSuccess('Supplier updated successfully');
        } else {
          const response = await supplierApi.create(payload);
          console.log('✅ Create response:', response);
          notify.showSuccess('Supplier added successfully');
        }

        await loadSuppliers();
        setModalVisible(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error saving data:', error);
      console.error('Error details:', error.response?.data);
      setLoading(false);
      notify.showError(error.response?.data?.detail || error.message || 'Failed to save data. Please try again.');
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
    { field: 'type', label: 'Type', flex: 1 },
    { field: 'current_storage', label: 'Current Storage (tons)', flex: 1.2 },
  ];

  const supplierColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'supplier_name', label: 'Supplier Name', flex: 1.5 },
    { field: 'contact_person', label: 'Contact Person', flex: 1.2 },
    { field: 'phone', label: 'Phone', flex: 1 },
    { field: 'gstin', label: 'GSTIN', flex: 1.2 },
    { field: 'state', label: 'State', flex: 1 },
    { field: 'city', label: 'City', flex: 1 },
  ];

  const binColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'bin_number', label: 'Bin Number', flex: 1 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'current_quantity', label: 'Current Quantity (tons)', flex: 1.2 },
    { field: 'bin_type', label: 'Bin Type', flex: 1.2 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const magnetColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'name', label: 'Magnet Name', flex: 1.5 },
    { field: 'description', label: 'Description', flex: 2 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const machineColumns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'name', label: 'Name', flex: 1.2 },
    { field: 'machine_type', label: 'Type', flex: 0.8 },
    { field: 'make', label: 'Make', flex: 0.8 },
    { field: 'serial_number', label: 'Serial No.', flex: 0.8 },
    { field: 'description', label: 'Description', flex: 1.5 },
    { field: 'status', label: 'Status', flex: 0.6 },
  ];

  const machineTypes = ['Separator', 'Drum Shield', 'Other'];

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Full', value: 'Full' },
    { label: 'Maintenance', value: 'Maintenance' },
  ];

  const binTypeOptions = [
    { label: 'Raw wheat bin', value: 'Raw wheat bin' },
    { label: '24 hours bin', value: '24 hours bin' },
    { label: '12 hours bin', value: '12 hours bin' },
  ];

  const openGodownModal = () => {
    setEditMode(false);
    setCurrentGodown(null);
    setGodownFormData({
      name: '',
      type: ''
    });
    setModalVisible(true);
  };

  const openEditGodownModal = (godown) => {
    setEditMode(true);
    setCurrentGodown(godown);
    setGodownFormData({
      name: godown.name,
      type: godown.type
    });
    setActiveTab('godown');
    setModalVisible(true);
  };

  const handleGodownSubmit = async () => {
    if (!godownFormData.name || !godownFormData.type) {
      notify.showWarning('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: godownFormData.name,
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
      bin_type: '',
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
      bin_type: bin.bin_type || '',
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
        bin_type: binFormData.bin_type,
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

  const openMachineModal = () => {
    setEditMode(false);
    setCurrentItem(null);
    setMachineFormData({
      name: '',
      machine_type: 'Separator',
      make: '',
      serial_number: '',
      description: '',
      status: 'Active',
    });
    setActiveTab('machines');
    setModalVisible(true);
  };

  const openEditMachineModal = (machine) => {
    setEditMode(true);
    setCurrentItem(machine);
    setMachineFormData({
      name: machine.name,
      machine_type: machine.machine_type,
      make: machine.make || '',
      serial_number: machine.serial_number || '',
      description: machine.description || '',
      status: machine.status,
    });
    setActiveTab('machines');
    setModalVisible(true);
  };

  const handleMachineSubmit = async () => {
    if (!machineFormData.name || !machineFormData.machine_type) {
      notify.showWarning('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: machineFormData.name,
        machine_type: machineFormData.machine_type,
        make: machineFormData.make,
        serial_number: machineFormData.serial_number,
        description: machineFormData.description,
        status: machineFormData.status,
      };

      if (editMode && currentItem) {
        await machineApi.update(currentItem.id, payload);
        notify.showSuccess('Machine updated successfully');
      } else {
        await machineApi.create(payload);
        notify.showSuccess('Machine created successfully');
      }

      setModalVisible(false);
      loadMachines();
    } catch (error) {
      notify.showError(editMode ? 'Failed to update machine' : 'Failed to create machine');
    } finally {
      setLoading(false);
    }
  };

  const handleMachineDelete = (machine) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete machine ${machine.name}?`,
      async () => {
        try {
          await machineApi.delete(machine.id);
          notify.showSuccess('Machine deleted successfully');
          loadMachines();
        } catch (error) {
          notify.showError('Failed to delete machine');
        }
      }
    );
  };

  const tabs = [
    { key: 'godown', label: 'Godown Master' },
    { key: 'supplier', label: 'Supplier Master' },
    { key: 'bins', label: 'Bins' },
    { key: 'magnets', label: 'Magnets' },
    { key: 'machines', label: 'Machines' },
  ];

  const handleScroll = (event) => {
    if (!tabScrollRef.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setCanScrollLeft(contentOffset.x > 0);
    setCanScrollRight(contentOffset.x < contentSize.width - layoutMeasurement.width);
  };

  const scrollLeft = () => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollTo({ x: 0, animated: true });
    }
  };

  const scrollRight = () => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'godown':
          await loadGodowns();
          break;
        case 'supplier':
          await loadSuppliers();
          break;
        case 'bins':
          await loadBins();
          break;
        case 'magnets':
          await loadMagnets();
          break;
        case 'machines':
          await loadMachines();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      notify.showError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigation={navigation} title="Master Data" currentRoute="MasterView">
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          {canScrollLeft && (
            <TouchableOpacity
              style={[styles.scrollButton, styles.scrollButtonLeft]}
              onPress={scrollLeft}
            >
              <Text style={styles.scrollButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScrollView}
            contentContainerStyle={styles.tabScrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (tabScrollRef.current) {
                setTimeout(() => {
                  tabScrollRef.current.scrollTo({ x: 0, animated: false });
                  handleScroll({ nativeEvent: { contentOffset: { x: 0 }, contentSize: { width: 0 }, layoutMeasurement: { width: 0 } } });
                }, 100);
              }
            }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {canScrollRight && (
            <TouchableOpacity
              style={[styles.scrollButton, styles.scrollButtonRight]}
              onPress={scrollRight}
            >
              <Text style={styles.scrollButtonText}>›</Text>
            </TouchableOpacity>
          )}
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
        {activeTab === 'machines' && (
          <DataTable
            columns={machineColumns}
            data={machines}
            onAdd={openMachineModal}
            onEdit={openEditMachineModal}
            onDelete={handleMachineDelete}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? `Edit ${activeTab === 'godown' ? 'Godown' : activeTab === 'bins' ? 'Bin' : activeTab === 'magnets' ? 'Magnet' : activeTab === 'machines' ? 'Machine' : 'Supplier'}` : `Add New ${activeTab === 'godown' ? 'Godown' : activeTab === 'bins' ? 'Bin' : activeTab === 'magnets' ? 'Magnet' : activeTab === 'machines' ? 'Machine' : 'Supplier'}`}
        >
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
            {activeTab === 'godown' && (
              <>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={godownFormData.name}
                  onChangeText={(text) => setGodownFormData({ ...godownFormData, name: text })}
                  placeholder="Enter godown name"
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

                <Text style={styles.label}>Bin Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={binFormData.bin_type}
                    onValueChange={(value) => setBinFormData({ ...binFormData, bin_type: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Bin Type" value="" />
                    {binTypeOptions.map((option, index) => (
                      <Picker.Item key={index} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>

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
            {activeTab === 'machines' && (
              <>
                <Text style={styles.label}>Machine Name *</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.name}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, name: text })}
                  placeholder="Enter machine name"
                />

                <Text style={styles.label}>Machine Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={machineFormData.machine_type}
                    onValueChange={(value) => setMachineFormData({ ...machineFormData, machine_type: value })}
                    style={styles.picker}
                  >
                    {machineTypes.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Make (Brand)</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.make}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, make: text })}
                  placeholder="Enter machine make/brand"
                />

                <Text style={styles.label}>Serial Number</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.serial_number}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, serial_number: text })}
                  placeholder="Enter serial number"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.description}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, description: text })}
                  placeholder="Enter description"
                  multiline
                />

                <Text style={styles.label}>Status *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={machineFormData.status}
                    onValueChange={(value) => setMachineFormData({ ...machineFormData, status: value })}
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
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={supplierFormData.phone}
                    onChangeText={(text) => setSupplierFormData({ ...supplierFormData, phone: text.replace(/[^0-9]/g, '') })}
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={supplierFormData.address}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, address: text })}
                  placeholder="Enter full address"
                  multiline
                />

                <Text style={styles.label}>Street</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.street}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, street: text })}
                  placeholder="Enter street"
                />

                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.city || ''}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, city: text })}
                  placeholder="Enter city name"
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
                        value={state.state_id.toString()}
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>ZIP Code</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.zip_code}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, zip_code: text })}
                  placeholder="Enter ZIP code"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>GSTIN</Text>
                <TextInput
                  style={styles.input}
                  value={supplierFormData.gstin}
                  onChangeText={(text) => setSupplierFormData({ ...supplierFormData, gstin: text })}
                  placeholder="Enter GSTIN"
                />
              </>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, loading && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : editMode ? 'Update' : 'Save'}
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingVertical: 8, // Add some padding to the container
  },
  tabScrollView: {
    flex: 1,
    flexDirection: 'row', // Ensure tabs are laid out horizontally
  },
  tabScrollContent: {
    flexDirection: 'row', // Ensure content inside ScrollView is also horizontal
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 20, // Increased padding for better touch area
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginHorizontal: 4, // Add some horizontal margin between tabs
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
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    minHeight: Platform.select({ web: 48, default: 50 }),
  },
  picker: {
    height: Platform.select({
      ios: 180,
      android: 50,
      web: 48
    }),
    color: colors.textPrimary,
    fontSize: 14,
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minWidth: 60,
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
  },
  scrollButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginVertical: 8, // Align vertically with tabs
  },
  scrollButtonLeft: {
    marginLeft: 4,
    marginRight: 0,
  },
  scrollButtonRight: {
    marginRight: 4,
    marginLeft: 0,
  },
  scrollButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
});