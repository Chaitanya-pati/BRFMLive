import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import notify from '../utils/notifications';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { unloadingApi, godownApi } from '../api/client';
import { getFullImageUrl } from '../utils/imageUtils';
import { useFormSubmission } from '../utils/useFormSubmission';
import colors from '../theme/colors';

export default function UnloadingEntryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [filteredGodowns, setFilteredGodowns] = useState([]);
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);

  const [formData, setFormData] = useState({
    vehicle_entry_id: '',
    godown_id: '',
    unloading_start_time: new Date().toISOString(),
    unloading_end_time: new Date().toISOString(),
    notes: '',
  });

  // Define showNotification function locally or import it if it's a utility
  const showNotification = (message, type) => {
    if (type === "success") {
      notify.showSuccess(message);
    } else if (type === "error") {
      notify.showError(message);
    } else if (type === "warning") {
      notify.showWarning(message);
    }
  };


  const { isSubmitting, handleSubmit: submitForm } = useFormSubmission(
    async (data) => {
      console.log('📝 Submitting unloading entry:', data);
      
      const submitFormData = new FormData();
      submitFormData.append('vehicle_entry_id', data.vehicle_entry_id);
      submitFormData.append('godown_id', data.godown_id);
      submitFormData.append('unloading_start_time', data.unloading_start_time);
      submitFormData.append('unloading_end_time', data.unloading_end_time);
      if (data.notes) {
        submitFormData.append('notes', data.notes);
      }

      // Only append new images (not existing URLs)
      if (data.beforeImage && !data.beforeImage.uri.startsWith('http')) {
        console.log('📷 Adding before image');
        if (Platform.OS === 'web') {
          const beforeBlob = await fetch(data.beforeImage.uri).then(r => r.blob());
          submitFormData.append('before_unloading_image', beforeBlob, 'before.jpg');
        } else {
          submitFormData.append('before_unloading_image', {
            uri: data.beforeImage.uri,
            type: 'image/jpeg',
            name: 'before.jpg',
          });
        }
      }

      if (data.afterImage && !data.afterImage.uri.startsWith('http')) {
        console.log('📷 Adding after image');
        if (Platform.OS === 'web') {
          const afterBlob = await fetch(data.afterImage.uri).then(r => r.blob());
          submitFormData.append('after_unloading_image', afterBlob, 'after.jpg');
        } else {
          submitFormData.append('after_unloading_image', {
            uri: data.afterImage.uri,
            type: 'image/jpeg',
            name: 'after.jpg',
          });
        }
      }

      if (data.id) {
        console.log('🔄 Updating entry ID:', data.id);
        await unloadingApi.update(data.id, submitFormData);
        showNotification("Unloading Entry updated successfully!", "success");
      } else {
        console.log('➕ Creating new entry');
        await unloadingApi.create(submitFormData);
        showNotification("Unloading Entry created successfully!", "success");
      }

      setModalVisible(false);
      
      // Refresh all data
      console.log('🔄 Refreshing data...');
      await Promise.all([
        loadEntries(),
        loadGodowns(),
        loadVehicles()
      ]);
      console.log('✅ Data refreshed');
    },
    {
      onValidationFail: () => {
        showNotification('Please select both vehicle and godown', 'error');
      },
    }
  );


  useEffect(() => {
    loadEntries();
    loadVehicles();
    loadGodowns();
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'web') {
      setCameraPermission(true);
      return;
    }
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    if (status !== 'granted') {
      showNotification('Camera permission is required to take photos', 'warning');
    }
  };

  const loadEntries = async () => {
    try {
      console.log('📊 Loading unloading entries...');
      const response = await unloadingApi.getAll();
      console.log('📊 Unloading entries received:', response.data);
      console.log('📊 Total entries:', response.data?.length || 0);
      setEntries(response.data || []);
    } catch (error) {
      console.error('❌ Error loading entries:', error);
      console.error('❌ Error details:', error.response?.data);
      showNotification('Failed to load unloading entries', 'error');
      setEntries([]);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await unloadingApi.getLabTestedVehicles();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      showNotification('Failed to load vehicles', 'error');
    }
  };

  const loadGodowns = async () => {
    try {
      const response = await godownApi.getAll();
      setGodowns(response.data);
    } catch (error) {
      console.error('Error loading godowns:', error);
      showNotification('Failed to load godowns', 'error');
    }
  };

  const handleVehicleChange = (vehicleId) => {
    // Find the selected vehicle and get its lab test category
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);

    setFormData({ ...formData, vehicle_entry_id: vehicleId });

    if (selectedVehicle && selectedVehicle.lab_tests && selectedVehicle.lab_tests.length > 0) {
      const category = selectedVehicle.lab_tests[0].category;
      setSelectedVehicleCategory(category);

      // Filter godowns by category
      if (category) {
        const filtered = godowns.filter(g => g.type === category);
        setFilteredGodowns(filtered);
      } else {
        setFilteredGodowns(godowns);
      }
    } else {
      setSelectedVehicleCategory(null);
      setFilteredGodowns(godowns);
    }
  };

  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === 'before') {
          setBeforeImage(result.assets[0]);
        } else {
          setAfterImage(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showNotification('Failed to pick image', 'error');
    }
  };

  const captureImage = async (type) => {
    try {
      if (!cameraPermission) {
        await requestCameraPermission();
        // Re-check permission after requesting
        if (!cameraPermission) return; 
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === 'before') {
          setBeforeImage(result.assets[0]);
        } else {
          setAfterImage(result.assets[0]);
        }
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      showNotification('Failed to capture image', 'error');
    }
  };


  const openAddModal = () => {
    setFormData({
      vehicle_entry_id: '',
      godown_id: '',
      unloading_start_time: new Date().toISOString(),
      unloading_end_time: new Date().toISOString(),
      notes: '',
    });
    setBeforeImage(null);
    setAfterImage(null);
    setSelectedVehicleCategory(null);
    setFilteredGodowns(godowns);
    setModalVisible(true);
  };

  const openEditModal = (entry) => {
    setFormData({
      id: entry.id,
      vehicle_entry_id: entry.vehicle_entry_id,
      godown_id: entry.godown_id,
      unloading_start_time: new Date(entry.unloading_start_time),
      unloading_end_time: new Date(entry.unloading_end_time),
      notes: entry.notes || '',
    });

    // Load existing images if available (convert relative paths to full URLs)
    if (entry.before_unloading_image) {
      const fullUrl = getFullImageUrl(entry.before_unloading_image);
      console.log('Loading before image from:', fullUrl);
      setBeforeImage({ uri: fullUrl });
    } else {
      setBeforeImage(null);
    }

    if (entry.after_unloading_image) {
      const fullUrl = getFullImageUrl(entry.after_unloading_image);
      console.log('Loading after image from:', fullUrl);
      setAfterImage({ uri: fullUrl });
    } else {
      setAfterImage(null);
    }

    // Set vehicle category and filter godowns
    const selectedVehicle = vehicles.find(v => v.id === entry.vehicle_entry_id);
    if (selectedVehicle && selectedVehicle.lab_tests && selectedVehicle.lab_tests.length > 0) {
      const category = selectedVehicle.lab_tests[0].category;
      setSelectedVehicleCategory(category);
      if (category) {
        const filtered = godowns.filter(g => g.type === category);
        setFilteredGodowns(filtered);
      } else {
        setFilteredGodowns(godowns);
      }
    } else {
      setSelectedVehicleCategory(null);
      setFilteredGodowns(godowns);
    }

    setModalVisible(true);
  };

  const handleSubmit = async () => {
    submitForm({
      ...formData,
      beforeImage,
      afterImage,
    });
  };

  const handleDelete = (entry) => {
    notify.showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this unloading entry?',
      async () => {
        try {
          await unloadingApi.delete(entry.id);
          loadEntries();
          showNotification('Unloading Entry deleted successfully!', 'success');
        } catch (error) {
          console.error('Error deleting:', error);
          showNotification('Failed to delete unloading entry', 'error');
        }
      }
    );
  };

  const columns = [
    { key: 'id', label: 'ID', field: 'id', width: 80 },
    { 
      key: 'vehicle_number', 
      label: 'Vehicle Number', 
      field: 'vehicle_entry',
      width: 150,
      render: (value, row) => {
        console.log('Vehicle entry data:', value);
        return value?.vehicle_number || 'N/A';
      }
    },
    { 
      key: 'supplier', 
      label: 'Supplier', 
      field: 'vehicle_entry',
      width: 180,
      render: (value, row) => {
        return value?.supplier?.supplier_name || 'N/A';
      }
    },
    { 
      key: 'godown', 
      label: 'Godown', 
      field: 'godown',
      width: 180,
      render: (value, row) => {
        console.log('Godown data:', value);
        return value?.name ? `${value.name} (${value.type || 'N/A'})` : 'N/A';
      }
    },
    { 
      key: 'gross_weight', 
      label: 'Gross Weight (kg)', 
      field: 'gross_weight', 
      width: 140,
      render: (value) => value ? value.toFixed(2) : '0.00'
    },
    { 
      key: 'empty_weight', 
      label: 'Empty Weight (kg)', 
      field: 'empty_vehicle_weight', 
      width: 140,
      render: (value) => value ? value.toFixed(2) : '0.00'
    },
    { 
      key: 'net_weight', 
      label: 'Net Weight (kg)', 
      field: 'net_weight', 
      width: 140,
      render: (value) => value ? value.toFixed(2) : '0.00'
    },
    { 
      key: 'images', 
      label: 'Images', 
      field: 'before_unloading_image',
      width: 120,
      render: (value, row) => {
        const hasBeforeImage = row.before_unloading_image;
        const hasAfterImage = row.after_unloading_image;

        if (hasBeforeImage && hasAfterImage) {
          return '✅ Complete';
        } else if (!hasBeforeImage && !hasAfterImage) {
          return '⚠️ None';
        } else if (!hasBeforeImage) {
          return '⚠️ Before';
        } else {
          return '⚠️ After';
        }
      }
    },
  ];

  return (
    <Layout navigation={navigation} title="Unloading Entry">
      <DataTable
        columns={columns}
        data={entries}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={formData.id ? "Edit Unloading Entry" : "Add Unloading Entry"}
      >
        <ScrollView style={styles.modalContent}>
          <Text style={styles.label}>Vehicle (Ready for Unloading) *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicle_entry_id}
              onValueChange={handleVehicleChange}
              style={styles.picker}
            >
              <Picker.Item label="Select Vehicle" value="" />
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle.id}
                  label={`${vehicle.vehicle_number} - ${vehicle.supplier?.supplier_name || 'Unknown'}`}
                  value={vehicle.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Godown * {selectedVehicleCategory && `(Category: ${selectedVehicleCategory})`}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.godown_id}
              onValueChange={(value) => setFormData({ ...formData, godown_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Godown" value="" />
              {filteredGodowns.map((godown) => (
                <Picker.Item
                  key={godown.id}
                  label={`${godown.name} (${godown.type}) - ${godown.current_storage} tons`}
                  value={godown.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Before Unloading Photo</Text>
          {beforeImage ? (
            <View>
              <Image source={{ uri: beforeImage.uri }} style={styles.imagePreview} />
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage('before')}
                  style={[styles.imageActionButton, styles.cameraButton]}
                >
                  <Text style={styles.imageActionText}>📷 Capture</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage('before')}
                  style={[styles.imageActionButton, styles.galleryButton]}
                >
                  <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageButtonRow}>
              <TouchableOpacity
                onPress={() => captureImage('before')}
                style={[styles.uploadButton, styles.cameraButton]}
              >
                <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickImage('before')}
                style={[styles.uploadButton, styles.galleryButton]}
              >
                <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>After Unloading Photo</Text>
          {afterImage ? (
            <View>
              <Image source={{ uri: afterImage.uri }} style={styles.imagePreview} />
              <View style={styles.imageButtonRow}>
                <TouchableOpacity
                  onPress={() => captureImage('after')}
                  style={[styles.imageActionButton, styles.cameraButton]}
                >
                  <Text style={styles.imageActionText}>📷 Capture</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage('after')}
                  style={[styles.imageActionButton, styles.galleryButton]}
                >
                  <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageButtonRow}>
              <TouchableOpacity
                onPress={() => captureImage('after')}
                style={[styles.uploadButton, styles.cameraButton]}
              >
                <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickImage('after')}
                style={[styles.uploadButton, styles.galleryButton]}
              >
                <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Enter notes"
            multiline
            numberOfLines={3}
          />

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
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
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
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  changeImageButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    alignItems: 'center',
  },
  changeImageText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imageButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  imageActionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  imageActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});