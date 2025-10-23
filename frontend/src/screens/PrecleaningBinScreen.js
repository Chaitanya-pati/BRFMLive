
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import colors from '../theme/colors';
import { binApi, magnetApi, routeMagnetMappingApi, godownApi } from '../api/client';

export default function PrecleaningBinScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState('bins');
  const [bins, setBins] = useState([]);
  const [magnets, setMagnets] = useState([]);
  const [routeMappings, setRouteMappings] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [editingMagnet, setEditingMagnet] = useState(null);
  const [editingRouteMapping, setEditingRouteMapping] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const [routeMappingFormData, setRouteMappingFormData] = useState({
    magnet_id: '',
    source_type: 'godown', // 'godown' or 'bin'
    source_godown_id: '',
    source_bin_id: '',
    destination_bin_id: '',
    cleaning_interval_hours: '3',
  });

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Full', value: 'Full' },
    { label: 'Maintenance', value: 'Maintenance' },
  ];

  useEffect(() => {
    fetchBins();
    fetchMagnets();
    fetchRouteMappings();
    fetchGodowns();
  }, []);

  const fetchBins = async () => {
    try {
      setLoading(true);
      const response = await binApi.getAll();
      setBins(response.data);
    } catch (error) {
      console.error('Error fetching bins:', error);
      Alert.alert('Error', 'Failed to load bins');
    } finally {
      setLoading(false);
    }
  };

  const fetchMagnets = async () => {
    try {
      setLoading(true);
      const response = await magnetApi.getAll();
      setMagnets(response.data);
    } catch (error) {
      console.error('Error fetching magnets:', error);
      Alert.alert('Error', 'Failed to load magnets');
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteMappings = async () => {
    try {
      setLoading(true);
      const response = await routeMagnetMappingApi.getAll();
      setRouteMappings(response.data);
    } catch (error) {
      console.error('Error fetching route mappings:', error);
      Alert.alert('Error', 'Failed to load route mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data);
    } catch (error) {
      console.error('Error fetching godowns:', error);
    }
  };

  const handleAddBin = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setBinFormData({
      bin_number: '',
      capacity: '',
      current_quantity: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const handleAddMagnet = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
    setMagnetFormData({
      name: '',
      description: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const handleAddRouteMapping = () => {
    setEditingBin(null);
    setEditingMagnet(null);
    setEditingRouteMapping(null);
    setRouteMappingFormData({
      magnet_id: '',
      source_type: 'godown',
      source_godown_id: '',
      source_bin_id: '',
      destination_bin_id: '',
      cleaning_interval_hours: '3',
    });
    setModalVisible(true);
  };

  const handleEditRouteMapping = (mapping) => {
    setEditingRouteMapping(mapping);
    setEditingBin(null);
    setEditingMagnet(null);
    const sourceType = mapping.source_godown_id ? 'godown' : 'bin';
    setRouteMappingFormData({
      magnet_id: String(mapping.magnet_id),
      source_type: sourceType,
      source_godown_id: mapping.source_godown_id ? String(mapping.source_godown_id) : '',
      source_bin_id: mapping.source_bin_id ? String(mapping.source_bin_id) : '',
      destination_bin_id: String(mapping.destination_bin_id),
      cleaning_interval_hours: String(mapping.cleaning_interval_hours),
    });
    setModalVisible(true);
  };

  const handleDeleteRouteMapping = async (mapping) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete this route mapping?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this route mapping?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await routeMagnetMappingApi.delete(mapping.id);
      await fetchRouteMappings();
      
      if (Platform.OS === 'web') {
        alert('Route mapping deleted successfully');
      } else {
        Alert.alert('Success', 'Route mapping deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting route mapping:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete route mapping';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRouteMapping = async () => {
    const sourceId = routeMappingFormData.source_type === 'godown' 
      ? routeMappingFormData.source_godown_id 
      : routeMappingFormData.source_bin_id;

    if (!routeMappingFormData.magnet_id || !sourceId || 
        !routeMappingFormData.destination_bin_id || !routeMappingFormData.cleaning_interval_hours) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const mappingData = {
        magnet_id: parseInt(routeMappingFormData.magnet_id),
        destination_bin_id: parseInt(routeMappingFormData.destination_bin_id),
        cleaning_interval_hours: parseInt(routeMappingFormData.cleaning_interval_hours),
      };

      // Add the appropriate source ID
      if (routeMappingFormData.source_type === 'godown') {
        mappingData.source_godown_id = parseInt(routeMappingFormData.source_godown_id);
        mappingData.source_bin_id = null;
      } else {
        mappingData.source_bin_id = parseInt(routeMappingFormData.source_bin_id);
        mappingData.source_godown_id = null;
      }

      if (editingRouteMapping) {
        await routeMagnetMappingApi.update(editingRouteMapping.id, mappingData);
        Alert.alert('Success', 'Route mapping updated successfully');
      } else {
        await routeMagnetMappingApi.create(mappingData);
        Alert.alert('Success', 'Route mapping added successfully');
      }

      setModalVisible(false);
      await fetchRouteMappings();
    } catch (error) {
      console.error('Error saving route mapping:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save route mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBin = (bin) => {
    setEditingBin(bin);
    setEditingMagnet(null);
    setBinFormData({
      bin_number: bin.bin_number,
      capacity: String(bin.capacity),
      current_quantity: String(bin.current_quantity || 0),
      status: bin.status,
    });
    setModalVisible(true);
  };

  const handleEditMagnet = (magnet) => {
    setEditingMagnet(magnet);
    setEditingBin(null);
    setMagnetFormData({
      name: magnet.name,
      description: magnet.description || '',
      status: magnet.status,
    });
    setModalVisible(true);
  };

  const handleDeleteBin = async (bin) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete bin ${bin.bin_number}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete bin ${bin.bin_number}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await binApi.delete(bin.id);
      await fetchBins();
      
      if (Platform.OS === 'web') {
        alert('Bin deleted successfully');
      } else {
        Alert.alert('Success', 'Bin deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting bin:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete bin';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMagnet = async (magnet) => {
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete magnet ${magnet.name}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete magnet ${magnet.name}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      setLoading(true);
      await magnetApi.delete(magnet.id);
      await fetchMagnets();
      
      if (Platform.OS === 'web') {
        alert('Magnet deleted successfully');
      } else {
        Alert.alert('Success', 'Magnet deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting magnet:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete magnet';
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBin = async () => {
    if (!binFormData.bin_number || !binFormData.capacity) {
      Alert.alert('Error', 'Please fill in all required fields (Bin Number and Capacity)');
      return;
    }

    const capacity = parseFloat(binFormData.capacity);
    const currentQuantity = binFormData.current_quantity ? parseFloat(binFormData.current_quantity) : 0.0;

    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Error', 'Please enter a valid capacity');
      return;
    }

    if (isNaN(currentQuantity) || currentQuantity < 0) {
      Alert.alert('Error', 'Please enter a valid current quantity');
      return;
    }

    try {
      setLoading(true);
      const binData = {
        bin_number: binFormData.bin_number.trim(),
        capacity: capacity,
        current_quantity: currentQuantity,
        status: binFormData.status,
      };

      if (editingBin) {
        await binApi.update(editingBin.id, binData);
        Alert.alert('Success', 'Bin updated successfully');
      } else {
        await binApi.create(binData);
        Alert.alert('Success', 'Bin added successfully');
      }

      setModalVisible(false);
      await fetchBins();
    } catch (error) {
      console.error('Error saving bin:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save bin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMagnet = async () => {
    if (!magnetFormData.name) {
      Alert.alert('Error', 'Please fill in the magnet name');
      return;
    }

    try {
      setLoading(true);
      const magnetData = {
        name: magnetFormData.name.trim(),
        description: magnetFormData.description.trim(),
        status: magnetFormData.status,
      };

      if (editingMagnet) {
        await magnetApi.update(editingMagnet.id, magnetData);
        Alert.alert('Success', 'Magnet updated successfully');
      } else {
        await magnetApi.create(magnetData);
        Alert.alert('Success', 'Magnet added successfully');
      }

      setModalVisible(false);
      await fetchMagnets();
    } catch (error) {
      console.error('Error saving magnet:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save magnet');
    } finally {
      setLoading(false);
    }
  };

  const binColumns = [
    { field: 'bin_number', label: 'Bin Number', flex: 1 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'current_quantity', label: 'Current Qty (tons)', flex: 1 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const magnetColumns = [
    { field: 'name', label: 'Magnet Name', flex: 2 },
    { field: 'description', label: 'Description', flex: 3 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  const routeMappingColumns = [
    { 
      field: 'magnet', 
      label: 'Magnet', 
      flex: 1.5,
      render: (val) => val?.name || '-'
    },
    { 
      field: 'source', 
      label: 'Source', 
      flex: 1.5,
      render: (val, row) => {
        if (row.source_godown) {
          return `Godown: ${row.source_godown.name}`;
        } else if (row.source_bin) {
          return `Bin: ${row.source_bin.bin_number}`;
        }
        return '-';
      }
    },
    { 
      field: 'destination_bin', 
      label: 'Destination Bin', 
      flex: 1.5,
      render: (val) => val?.bin_number || '-'
    },
    { field: 'cleaning_interval_hours', label: 'Cleaning Interval (hrs)', flex: 1 },
  ];

  return (
    <Layout title="Precleaning Process" navigation={navigation} currentRoute="PrecleaningBin">
      <View style={styles.container}>
        <View style={styles.tabContainer}>
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
          <TouchableOpacity
            style={[styles.tab, activeTab === 'routeMappings' && styles.activeTab]}
            onPress={() => setActiveTab('routeMappings')}
          >
            <Text style={[styles.tabText, activeTab === 'routeMappings' && styles.activeTabText]}>
              Route Mappings
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'bins' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Bin"
                onPress={handleAddBin}
                variant="primary"
              />
            </View>

            <DataTable
              columns={binColumns}
              data={bins}
              onEdit={handleEditBin}
              onDelete={handleDeleteBin}
              loading={loading}
              emptyMessage="No bins found"
            />
          </>
        ) : activeTab === 'magnets' ? (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Magnet"
                onPress={handleAddMagnet}
                variant="primary"
              />
            </View>

            <DataTable
              columns={magnetColumns}
              data={magnets}
              onEdit={handleEditMagnet}
              onDelete={handleDeleteMagnet}
              loading={loading}
              emptyMessage="No magnets found"
            />
          </>
        ) : (
          <>
            <View style={styles.headerActions}>
              <Button
                title="Add Route Mapping"
                onPress={handleAddRouteMapping}
                variant="primary"
              />
            </View>

            <DataTable
              columns={routeMappingColumns}
              data={routeMappings}
              onEdit={handleEditRouteMapping}
              onDelete={handleDeleteRouteMapping}
              loading={loading}
              emptyMessage="No route mappings found"
            />
          </>
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={
            editingBin ? 'Edit Bin' : 
            editingMagnet ? 'Edit Magnet' :
            editingRouteMapping ? 'Edit Route Mapping' :
            activeTab === 'bins' ? 'Add Bin' : 
            activeTab === 'magnets' ? 'Add Magnet' : 'Add Route Mapping'
          }
        >
          <ScrollView style={styles.modalContent}>
            {(editingBin || (!editingMagnet && !editingRouteMapping && activeTab === 'bins')) ? (
              <>
                <InputField
                  label="Bin Number *"
                  placeholder="Enter bin number"
                  value={binFormData.bin_number}
                  onChangeText={(text) => setBinFormData({ ...binFormData, bin_number: text })}
                />

                <InputField
                  label="Capacity (tons) *"
                  placeholder="Enter capacity in tons"
                  value={binFormData.capacity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, capacity: text })}
                  keyboardType="numeric"
                />

                <InputField
                  label="Current Quantity (tons)"
                  placeholder="Enter current quantity in tons"
                  value={binFormData.current_quantity}
                  onChangeText={(text) => setBinFormData({ ...binFormData, current_quantity: text })}
                  keyboardType="numeric"
                />

                <SelectDropdown
                  label="Status *"
                  value={binFormData.status}
                  onValueChange={(value) => setBinFormData({ ...binFormData, status: value })}
                  options={statusOptions}
                  placeholder="Select status"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingBin ? 'Update' : 'Add'}
                    onPress={handleSubmitBin}
                    variant="primary"
                  />
                </View>
              </>
            ) : (editingMagnet || (!editingBin && !editingRouteMapping && activeTab === 'magnets')) ? (
              <>
                <InputField
                  label="Magnet Name *"
                  placeholder="Enter magnet name"
                  value={magnetFormData.name}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, name: text })}
                />

                <InputField
                  label="Description"
                  placeholder="Enter description"
                  value={magnetFormData.description}
                  onChangeText={(text) => setMagnetFormData({ ...magnetFormData, description: text })}
                  multiline
                  numberOfLines={3}
                />

                <SelectDropdown
                  label="Status *"
                  value={magnetFormData.status}
                  onValueChange={(value) => setMagnetFormData({ ...magnetFormData, status: value })}
                  options={statusOptions}
                  placeholder="Select status"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingMagnet ? 'Update' : 'Add'}
                    onPress={handleSubmitMagnet}
                    variant="primary"
                  />
                </View>
              </>
            ) : (
              <>
                <SelectDropdown
                  label="Magnet *"
                  value={routeMappingFormData.magnet_id}
                  onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, magnet_id: value })}
                  options={magnets.map(m => ({ label: m.name, value: String(m.id) }))}
                  placeholder="Select magnet"
                />

                <SelectDropdown
                  label="Source Type *"
                  value={routeMappingFormData.source_type}
                  onValueChange={(value) => setRouteMappingFormData({ 
                    ...routeMappingFormData, 
                    source_type: value,
                    source_godown_id: '',
                    source_bin_id: ''
                  })}
                  options={[
                    { label: 'Godown', value: 'godown' },
                    { label: 'Bin', value: 'bin' }
                  ]}
                  placeholder="Select source type"
                />

                {routeMappingFormData.source_type === 'godown' ? (
                  <SelectDropdown
                    label="Source Godown *"
                    value={routeMappingFormData.source_godown_id}
                    onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, source_godown_id: value })}
                    options={godowns.map(g => ({ label: g.name, value: String(g.id) }))}
                    placeholder="Select source godown"
                  />
                ) : (
                  <SelectDropdown
                    label="Source Bin *"
                    value={routeMappingFormData.source_bin_id}
                    onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, source_bin_id: value })}
                    options={bins.map(b => ({ label: b.bin_number, value: String(b.id) }))}
                    placeholder="Select source bin"
                  />
                )}

                <SelectDropdown
                  label="Destination Bin *"
                  value={routeMappingFormData.destination_bin_id}
                  onValueChange={(value) => setRouteMappingFormData({ ...routeMappingFormData, destination_bin_id: value })}
                  options={bins.map(b => ({ label: b.bin_number, value: String(b.id) }))}
                  placeholder="Select destination bin"
                />

                <InputField
                  label="Cleaning Interval (hours) *"
                  placeholder="Enter cleaning interval in hours"
                  value={routeMappingFormData.cleaning_interval_hours}
                  onChangeText={(text) => setRouteMappingFormData({ ...routeMappingFormData, cleaning_interval_hours: text })}
                  keyboardType="numeric"
                />

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                    variant="outline"
                  />
                  <Button
                    title={editingRouteMapping ? 'Update' : 'Add'}
                    onPress={handleSubmitRouteMapping}
                    variant="primary"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[600],
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  modalContent: {
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});
