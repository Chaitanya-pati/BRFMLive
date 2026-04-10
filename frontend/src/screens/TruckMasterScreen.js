import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { truckApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

const TRUCK_TYPES = ['Open', 'Closed', 'Container', 'Tanker'];
const VEHICLE_CATEGORIES = ['Light', 'Medium', 'Heavy'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

export default function TruckMasterScreen({ navigation }) {
  const [trucks, setTrucks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTruck, setCurrentTruck] = useState(null);

  const [formData, setFormData] = useState({
    truck_number: '',
    truck_type: 'Open',
    vehicle_category: 'Light',
    status: 'Active',
    is_active: true,
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadTrucks();
  }, []);

  const loadTrucks = async () => {
    try {
      const response = await truckApi.getAll();
      setTrucks(response.data);
    } catch (error) {
      console.error('Error loading trucks:', error);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentTruck(null);
    setFormData({
      truck_number: '',
      truck_type: 'Open',
      vehicle_category: 'Light',
      status: 'Active',
      is_active: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (truck) => {
    setEditMode(true);
    setCurrentTruck(truck);
    setFormData({
      truck_number: truck.truck_number,
      truck_type: truck.truck_type,
      vehicle_category: truck.vehicle_category,
      status: truck.status,
      is_active: truck.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedNumber = formData.truck_number?.trim().toUpperCase();

    if (!trimmedNumber) {
      await showAlert('Validation Error', 'Please enter a Truck Number', 'error');
      return;
    }

    if (!formData.truck_type) {
      await showAlert('Validation Error', 'Please select a Truck Type', 'error');
      return;
    }

    if (!formData.vehicle_category) {
      await showAlert('Validation Error', 'Please select a Vehicle Category', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        truck_number: trimmedNumber,
        truck_type: formData.truck_type,
        vehicle_category: formData.vehicle_category,
        status: formData.status,
        is_active: formData.is_active,
      };

      if (editMode && currentTruck) {
        await truckApi.update(currentTruck.truck_id, payload);
        showSuccess('Truck updated successfully');
      } else {
        await truckApi.create(payload);
        showSuccess('Truck created successfully');
      }

      setModalVisible(false);
      await loadTrucks();
    }, 'truck');
  };

  const handleDelete = async (truck) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete truck ${truck.truck_number}?`
    );

    if (confirmed) {
      try {
        await truckApi.delete(truck.truck_id);
        showSuccess('Truck deleted successfully');
        loadTrucks();
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete truck');
      }
    }
  };

  const columns = [
    { label: 'ID', field: 'truck_id', width: 70, key: 'truck_id' },
    { label: 'Truck Number', field: 'truck_number', width: 160, key: 'truck_number' },
    { label: 'Truck Type', field: 'truck_type', width: 130, key: 'truck_type' },
    { label: 'Vehicle Category', field: 'vehicle_category', width: 150, key: 'vehicle_category' },
    { label: 'Status', field: 'status', width: 100, key: 'status' },
    {
      label: 'Active',
      field: 'is_active',
      width: 80,
      key: 'is_active',
      render: (value) => (value ? 'Yes' : 'No'),
    },
    {
      label: 'Created',
      field: 'created_at',
      width: 150,
      key: 'created_at',
      render: (value) => formatISTDate(value),
    },
  ];

  return (
    <Layout title="Truck Master" navigation={navigation} currentRoute="TruckMaster">
      <DataTable
        columns={columns}
        data={trucks}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Truck' : 'Add New Truck'}
        width="70%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Truck Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.truck_number}
            onChangeText={(text) => setFormData({ ...formData, truck_number: text.toUpperCase() })}
            placeholder="e.g., KA01AB1234"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Truck Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.truck_type}
              onValueChange={(val) => setFormData({ ...formData, truck_type: val })}
              style={styles.picker}
            >
              {TRUCK_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Vehicle Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicle_category}
              onValueChange={(val) => setFormData({ ...formData, vehicle_category: val })}
              style={styles.picker}
            >
              {VEHICLE_CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.status}
              onValueChange={(val) =>
                setFormData({ ...formData, status: val, is_active: val === 'Active' })
              }
              style={styles.picker}
            >
              {STATUS_OPTIONS.map((s) => (
                <Picker.Item key={s} label={s} value={s} />
              ))}
            </Picker>
          </View>

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
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  picker: { height: Platform.OS === 'ios' ? 150 : 50 },
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
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  saveButton: { backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.5 },
  cancelButtonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  saveButtonText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
});
