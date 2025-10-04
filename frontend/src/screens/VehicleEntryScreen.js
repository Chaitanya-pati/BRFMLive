import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { supplierApi, vehicleApi } from '../api/client';
import colors from '../theme/colors';

export default function VehicleEntryScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [billPhoto, setBillPhoto] = useState(null);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: '',
    supplier_id: '',
    bill_no: '',
    driver_name: '',
    driver_phone: '',
    arrival_time: new Date(),
    notes: '',
  });

  useEffect(() => {
    loadVehicles();
    loadSuppliers();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  };

  const loadSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const pickImage = async (type) => {
    Alert.alert(
      'Select Option',
      'Choose how to add the photo',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(type),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => chooseFromGallery(type),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (type) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillPhoto(result.assets[0]);
      } else {
        setVehiclePhoto(result.assets[0]);
      }
    }
  };

  const chooseFromGallery = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillPhoto(result.assets[0]);
      } else {
        setVehiclePhoto(result.assets[0]);
      }
    }
  };

  const openAddModal = () => {
    setFormData({
      vehicle_number: '',
      supplier_id: '',
      bill_no: '',
      driver_name: '',
      driver_phone: '',
      arrival_time: new Date(),
      notes: '',
    });
    setBillPhoto(null);
    setVehiclePhoto(null);
    setModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, arrival_time: selectedDate });
    }
  };

  const openEditModal = (vehicle) => {
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      supplier_id: vehicle.supplier?.id || '',
      bill_no: vehicle.bill_no,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      arrival_time: new Date(vehicle.arrival_time),
      notes: vehicle.notes || '',
    });
    setBillPhoto(null);
    setVehiclePhoto(null);
    setModalVisible(true);
  };

  const handleDelete = async (vehicle) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete vehicle entry ${vehicle.vehicle_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleApi.delete(vehicle.id);
              Alert.alert('Success', 'Vehicle entry deleted successfully');
              loadVehicles();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vehicle entry');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_number || !formData.supplier_id || !formData.bill_no) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('vehicle_number', formData.vehicle_number);
      submitData.append('supplier_id', formData.supplier_id);
      submitData.append('bill_no', formData.bill_no);
      submitData.append('driver_name', formData.driver_name || '');
      submitData.append('driver_phone', formData.driver_phone || '');
      submitData.append('arrival_time', formData.arrival_time.toISOString());
      submitData.append('notes', formData.notes || '');

      if (billPhoto && billPhoto.base64) {
        submitData.append('supplier_bill_photo', `data:image/jpeg;base64,${billPhoto.base64}`);
      }

      if (vehiclePhoto && vehiclePhoto.base64) {
        submitData.append('vehicle_photo', `data:image/jpeg;base64,${vehiclePhoto.base64}`);
      }

      await vehicleApi.create(submitData);
      Alert.alert('Success', 'Vehicle entry created successfully');
      
      setModalVisible(false);
      loadVehicles();
    } catch (error) {
      Alert.alert('Error', 'Failed to create vehicle entry');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { label: 'ID', field: 'id', width: 80 },
    { label: 'Vehicle Number', field: 'vehicle_number', width: 150 },
    { 
      label: 'Supplier', 
      field: 'supplier', 
      width: 200,
      render: (supplier) => supplier?.supplier_name || '-'
    },
    { label: 'Bill No', field: 'bill_no', width: 150 },
    { label: 'Driver Name', field: 'driver_name', width: 150 },
    { label: 'Driver Phone', field: 'driver_phone', width: 150 },
    { 
      label: 'Arrival Time', 
      field: 'arrival_time', 
      width: 180,
      render: (value) => new Date(value).toLocaleString()
    },
  ];

  return (
    <Layout title="Vehicle Entries" navigation={navigation} currentRoute="VehicleEntry">
      <DataTable
        columns={columns}
        data={vehicles}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="New Vehicle Entry"
        width="70%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Vehicle Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.vehicle_number}
            onChangeText={(text) => setFormData({ ...formData, vehicle_number: text.toUpperCase() })}
            placeholder="e.g., UP16AB1234"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Supplier *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.supplier_id}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Supplier" value="" />
              {suppliers.map((supplier) => (
                <Picker.Item
                  key={supplier.id}
                  label={`${supplier.supplier_name} - ${supplier.contact_person || 'N/A'}`}
                  value={supplier.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Bill No *</Text>
          <TextInput
            style={styles.input}
            value={formData.bill_no}
            onChangeText={(text) => setFormData({ ...formData, bill_no: text })}
            placeholder="Enter bill number"
          />

          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            style={styles.input}
            value={formData.driver_name}
            onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
            placeholder="Enter driver name"
          />

          <Text style={styles.label}>Driver Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.driver_phone}
            onChangeText={(text) => setFormData({ ...formData, driver_phone: text })}
            placeholder="Enter driver phone"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Arrival Time</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{formData.arrival_time.toLocaleString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.arrival_time}
              mode="datetime"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <View style={styles.photoSection}>
            <View style={styles.photoColumn}>
              <Text style={styles.label}>Supplier Bill Photo</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('bill')}
              >
                <Text style={styles.photoButtonText}>
                  {billPhoto ? '✓ Photo Added' : '📷 Add Photo'}
                </Text>
              </TouchableOpacity>
              {billPhoto && (
                <Image source={{ uri: billPhoto.uri }} style={styles.photoPreview} />
              )}
            </View>

            <View style={styles.photoColumn}>
              <Text style={styles.label}>Vehicle Photo</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('vehicle')}
              >
                <Text style={styles.photoButtonText}>
                  {vehiclePhoto ? '✓ Photo Added' : '📷 Add Photo'}
                </Text>
              </TouchableOpacity>
              {vehiclePhoto && (
                <Image source={{ uri: vehiclePhoto.uri }} style={styles.photoPreview} />
              )}
            </View>
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Enter any additional notes"
            multiline
            numberOfLines={3}
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
                {loading ? 'Saving...' : 'Save Entry'}
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
  photoSection: {
    flexDirection: 'row',
    gap: 16,
  },
  photoColumn: {
    flex: 1,
  },
  photoButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  photoButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginTop: 8,
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
});
