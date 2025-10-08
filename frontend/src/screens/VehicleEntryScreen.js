import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { vehicleApi, supplierApi } from '../api/client';
import colors from '../theme/colors';

export default function VehicleEntryScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billPhoto, setBillPhoto] = useState(null);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
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
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'web') {
      // Camera permissions are handled by the browser on web
      setCameraPermission(true);
      return;
    }
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillPhoto(result.assets[0]);
      } else {
        setVehiclePhoto(result.assets[0]);
      }
    }
  };

  const takePhoto = async (type) => {
    if (cameraPermission === null || cameraPermission === false) {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
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
      id: vehicle.id,
      vehicle_number: vehicle.vehicle_number,
      supplier_id: vehicle.supplier?.id || '',
      bill_no: vehicle.bill_no,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      arrival_time: new Date(vehicle.arrival_time),
      notes: vehicle.notes || '',
    });
    
    // Load existing images if available
    if (vehicle.supplier_bill_photo) {
      const billPhotoUrl = vehicle.supplier_bill_photo.startsWith('http') 
        ? vehicle.supplier_bill_photo 
        : `https://brfmlive.onrender.com${vehicle.supplier_bill_photo}`;
      setBillPhoto({ uri: billPhotoUrl });
    } else {
      setBillPhoto(null);
    }
    
    if (vehicle.vehicle_photo) {
      const vehiclePhotoUrl = vehicle.vehicle_photo.startsWith('http') 
        ? vehicle.vehicle_photo 
        : `https://brfmlive.onrender.com${vehicle.vehicle_photo}`;
      setVehiclePhoto({ uri: vehiclePhotoUrl });
    } else {
      setVehiclePhoto(null);
    }
    
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

  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_number || !formData.supplier_id || !formData.bill_no) {
      showAlert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append('vehicle_number', formData.vehicle_number);
      submitFormData.append('supplier_id', formData.supplier_id);
      submitFormData.append('bill_no', formData.bill_no);
      if (formData.driver_name) {
        submitFormData.append('driver_name', formData.driver_name);
      }
      if (formData.driver_phone) {
        submitFormData.append('driver_phone', formData.driver_phone);
      }
      submitFormData.append('arrival_time', formData.arrival_time.toISOString());
      if (formData.notes) {
        submitFormData.append('notes', formData.notes);
      }

      if (billPhoto) {
        if (Platform.OS === 'web') {
          const billBlob = await fetch(billPhoto.uri).then(r => r.blob());
          submitFormData.append('supplier_bill_photo', billBlob, 'bill.jpg');
        } else {
          submitFormData.append('supplier_bill_photo', {
            uri: billPhoto.uri,
            type: 'image/jpeg',
            name: 'bill.jpg',
          });
        }
      }

      if (vehiclePhoto) {
        if (Platform.OS === 'web') {
          const vehicleBlob = await fetch(vehiclePhoto.uri).then(r => r.blob());
          submitFormData.append('vehicle_photo', vehicleBlob, 'vehicle.jpg');
        } else {
          submitFormData.append('vehicle_photo', {
            uri: vehiclePhoto.uri,
            type: 'image/jpeg',
            name: 'vehicle.jpg',
          });
        }
      }

      if (formData.id) {
        // Update existing vehicle entry
        await vehicleApi.update(formData.id, submitFormData);
        showAlert('Success', 'Vehicle entry updated successfully');
      } else {
        // Create new vehicle entry
        await vehicleApi.create(submitFormData);
        showAlert('Success', 'Vehicle entry added successfully');
      }
      
      setModalVisible(false);
      loadVehicles();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save entry');
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
        title={formData.id ? "Edit Vehicle Entry" : "New Vehicle Entry"}
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

          <Text style={styles.label}>Supplier Bill Photo</Text>
          <View style={styles.imageSection}>
            {billPhoto ? (
              <Image source={{ uri: billPhoto.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => takePhoto('bill')}
              >
                <Text style={styles.imageButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage('bill')}
              >
                <Text style={styles.imageButtonText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Vehicle Photo</Text>
          <View style={styles.imageSection}>
            {vehiclePhoto ? (
              <Image source={{ uri: vehiclePhoto.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => takePhoto('vehicle')}
              >
                <Text style={styles.imageButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage('vehicle')}
              >
                <Text style={styles.imageButtonText}>🖼️ Gallery</Text>
              </TouchableOpacity>
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageSection: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  imageButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
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