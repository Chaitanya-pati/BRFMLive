
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import colors from '../theme/colors';
import { binApi } from '../api/client';

export default function PrecleaningBinScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [bins, setBins] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    bin_number: '',
    capacity: '',
    current_quantity: '',
    status: 'Active',
  });

  const statusOptions = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Full', value: 'Full' },
    { label: 'Maintenance', value: 'Maintenance' },
  ];

  useEffect(() => {
    fetchBins();
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

  const handleAdd = () => {
    setEditingBin(null);
    setFormData({
      bin_number: '',
      capacity: '',
      current_quantity: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const handleEdit = (bin) => {
    setEditingBin(bin);
    setFormData({
      bin_number: bin.bin_number,
      capacity: String(bin.capacity),
      current_quantity: String(bin.current_quantity || 0),
      status: bin.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (bin) => {
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
      console.log('Deleting bin with ID:', bin.id);
      const response = await binApi.delete(bin.id);
      console.log('Delete response:', response);
      await fetchBins();
      
      if (Platform.OS === 'web') {
        alert('Bin deleted successfully');
      } else {
        Alert.alert('Success', 'Bin deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting bin:', error);
      console.error('Error details:', error.response);
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

  const handleSubmit = async () => {
    if (!formData.bin_number || !formData.capacity) {
      Alert.alert('Error', 'Please fill in all required fields (Bin Number and Capacity)');
      return;
    }

    const capacity = parseFloat(formData.capacity);
    const currentQuantity = formData.current_quantity ? parseFloat(formData.current_quantity) : 0.0;

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
        bin_number: formData.bin_number.trim(),
        capacity: capacity,
        current_quantity: currentQuantity,
        status: formData.status,
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

  const columns = [
    { field: 'bin_number', label: 'Bin Number', flex: 1 },
    { field: 'capacity', label: 'Capacity (tons)', flex: 1 },
    { field: 'current_quantity', label: 'Current Qty (tons)', flex: 1 },
    { field: 'status', label: 'Status', flex: 1 },
  ];

  return (
    <Layout title="Precleaning Process" navigation={navigation} currentRoute="PrecleaningBin">
      <View style={styles.container}>
        <View style={styles.headerActions}>
          <Button
            title="Add Bin"
            onPress={handleAdd}
            variant="primary"
          />
        </View>

        <DataTable
          columns={columns}
          data={bins}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No bins found"
        />

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingBin ? 'Edit Bin' : 'Add Bin'}
        >
          <ScrollView style={styles.modalContent}>
            <InputField
              label="Bin Number *"
              placeholder="Enter bin number"
              value={formData.bin_number}
              onChangeText={(text) => setFormData({ ...formData, bin_number: text })}
            />

            <InputField
              label="Capacity (tons) *"
              placeholder="Enter capacity in tons"
              value={formData.capacity}
              onChangeText={(text) => setFormData({ ...formData, capacity: text })}
              keyboardType="numeric"
            />

            <InputField
              label="Current Quantity (tons)"
              placeholder="Enter current quantity in tons"
              value={formData.current_quantity}
              onChangeText={(text) => setFormData({ ...formData, current_quantity: text })}
              keyboardType="numeric"
            />

            <SelectDropdown
              label="Status *"
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                onPress={handleSubmit}
                variant="primary"
              />
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
