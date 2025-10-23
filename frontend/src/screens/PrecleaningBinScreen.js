
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import colors from '../theme/colors';

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
    material_type: '',
    status: 'empty',
    location: '',
    notes: '',
  });

  const statusOptions = [
    { label: 'Empty', value: 'empty' },
    { label: 'In Use', value: 'in_use' },
    { label: 'Full', value: 'full' },
    { label: 'Maintenance', value: 'maintenance' },
  ];

  const materialOptions = [
    { label: 'Wheat', value: 'wheat' },
    { label: 'Rice', value: 'rice' },
    { label: 'Corn', value: 'corn' },
    { label: 'Barley', value: 'barley' },
  ];

  useEffect(() => {
    fetchBins();
  }, []);

  const fetchBins = async () => {
    try {
      setLoading(true);
      // Simulated data - replace with actual API call
      const mockData = [
        {
          id: 1,
          bin_number: 'BIN-001',
          capacity: '1000',
          current_quantity: '750',
          material_type: 'Wheat',
          status: 'in_use',
          location: 'Warehouse A',
          notes: 'Regular cleaning schedule',
        },
        {
          id: 2,
          bin_number: 'BIN-002',
          capacity: '1000',
          current_quantity: '0',
          material_type: '',
          status: 'empty',
          location: 'Warehouse A',
          notes: '',
        },
      ];
      setBins(mockData);
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
      material_type: '',
      status: 'empty',
      location: '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (bin) => {
    setEditingBin(bin);
    setFormData({
      bin_number: bin.bin_number,
      capacity: bin.capacity,
      current_quantity: bin.current_quantity,
      material_type: bin.material_type,
      status: bin.status,
      location: bin.location,
      notes: bin.notes,
    });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this bin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBins(bins.filter(bin => bin.id !== id));
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.bin_number || !formData.capacity || !formData.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (editingBin) {
      setBins(bins.map(bin =>
        bin.id === editingBin.id
          ? { ...bin, ...formData }
          : bin
      ));
    } else {
      const newBin = {
        id: bins.length + 1,
        ...formData,
      };
      setBins([...bins, newBin]);
    }

    setModalVisible(false);
  };

  const columns = [
    { key: 'bin_number', label: 'Bin Number', type: 'text' },
    { key: 'capacity', label: 'Capacity (kg)', type: 'text' },
    { key: 'current_quantity', label: 'Current Qty (kg)', type: 'text' },
    { key: 'material_type', label: 'Material Type', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'location', label: 'Location', type: 'text' },
  ];

  return (
    <Layout title="Precleaning Bin" navigation={navigation} currentRoute="PrecleaningBin">
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
              label="Capacity (kg) *"
              placeholder="Enter capacity"
              value={formData.capacity}
              onChangeText={(text) => setFormData({ ...formData, capacity: text })}
              keyboardType="numeric"
            />

            <InputField
              label="Current Quantity (kg)"
              placeholder="Enter current quantity"
              value={formData.current_quantity}
              onChangeText={(text) => setFormData({ ...formData, current_quantity: text })}
              keyboardType="numeric"
            />

            <SelectDropdown
              label="Material Type"
              value={formData.material_type}
              onValueChange={(value) => setFormData({ ...formData, material_type: value })}
              options={materialOptions}
              placeholder="Select material type"
            />

            <SelectDropdown
              label="Status *"
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              options={statusOptions}
              placeholder="Select status"
            />

            <InputField
              label="Location *"
              placeholder="Enter location"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />

            <InputField
              label="Notes"
              placeholder="Enter notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              numberOfLines={3}
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
