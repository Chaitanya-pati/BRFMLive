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
      notify.showWarning('Camera permission is required to take photos');
    }
  };

  const loadEntries = async () => {
    try {
      const response = await unloadingApi.getAll();
      setEntries(response.data);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await unloadingApi.getLabTestedVehicles();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
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
      notify.showError('Failed to pick image');
    }
  };

  const captureImage = async (type) => {
    try {
      if (!cameraPermission) {
        await requestCameraPermission();
        return;
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
      notify.showError('Failed to capture image');
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
    try {
      if (!formData.vehicle_entry_id || !formData.godown_id) {
        notify.showWarning('Please fill all required fields');
        return;
      }

      const submitFormData = new FormData();
      submitFormData.append('vehicle_entry_id', formData.vehicle_entry_id);
      submitFormData.append('godown_id', formData.godown_id);
      submitFormData.append('unloading_start_time', formData.unloading_start_time);
      submitFormData.append('unloading_end_time', formData.unloading_end_time);
      if (formData.notes) {
        submitFormData.append('notes', formData.notes);
      }

      // Only append new images (not existing URLs)
      if (beforeImage && !beforeImage.uri.startsWith('http')) {
        if (Platform.OS === 'web') {
          const beforeBlob = await fetch(beforeImage.uri).then(r => r.blob());
          submitFormData.append('before_unloading_image', beforeBlob, 'before.jpg');
        } else {
          submitFormData.append('before_unloading_image', {
            uri: beforeImage.uri,
            type: 'image/jpeg',
            name: 'before.jpg',
          });
        }
      }

      if (afterImage && !afterImage.uri.startsWith('http')) {
        if (Platform.OS === 'web') {
          const afterBlob = await fetch(afterImage.uri).then(r => r.blob());
          submitFormData.append('after_unloading_image', afterBlob, 'after.jpg');
        } else {
          submitFormData.append('after_unloading_image', {
            uri: afterImage.uri,
            type: 'image/jpeg',
            name: 'after.jpg',
          });
        }
      }

      if (formData.id) {
        await unloadingApi.update(formData.id, submitFormData);
        notify.showSuccess('Unloading entry updated successfully');
      } else {
        await unloadingApi.create(submitFormData);
        notify.showSuccess('Unloading entry added successfully');
      }

      setModalVisible(false);
      loadEntries();
      loadGodowns();
    } catch (error) {
      console.error('Error saving entry:', error);
      notify.showError('Failed to save unloading entry. Please try again.');
    }
  };

  const handleDelete = (entry) => {
    notify.showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this unloading entry?',
      async () => {
        try {
          await unloadingApi.delete(entry.id);
          loadEntries();
          notify.showSuccess('Unloading entry deleted successfully');
        } catch (error) {
          console.error('Error deleting:', error);
          notify.showError('Failed to delete unloading entry');
        }
      }
    );
  };

  const columns = [
    { key: 'id', label: 'ID', field: 'id', width: 80 },
    { 
      key: 'vehicle_entry', 
      label: 'Vehicle', 
      field: 'vehicle_entry',
      width: 180,
      render: (value) => value?.vehicle_number || 'N/A'
    },
    { 
      key: 'godown', 
      label: 'Godown', 
      field: 'godown',
      width: 200,
      render: (value) => value?.name || 'N/A'
    },
    { key: 'net_weight', label: 'Net Weight (kg)', field: 'net_weight', width: 150 },
    { 
      key: 'images', 
      label: 'Images', 
      field: 'before_unloading_image',
      width: 150,
      render: (value, row) => {
        const hasBeforeImage = row.before_unloading_image;
        const hasAfterImage = row.after_unloading_image;

        if (hasBeforeImage && hasAfterImage) {
          return '✅ Complete';
        } else if (!hasBeforeImage && !hasAfterImage) {
          return '⚠️ Missing Both';
        } else if (!hasBeforeImage) {
          return '⚠️ Missing Before';
        } else {
          return '⚠️ Missing After';
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
            >
              <Text style={styles.buttonText}>Save</Text>
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