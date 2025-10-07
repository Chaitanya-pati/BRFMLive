import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { unloadingApi, godownApi } from '../api/client';
import colors from '../theme/colors';

export default function UnloadingEntryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);

  const [formData, setFormData] = useState({
    vehicle_entry_id: '',
    godown_id: '',
    gross_weight: '',
    empty_vehicle_weight: '',
    net_weight: '0',
    unloading_start_time: new Date().toISOString(),
    unloading_end_time: new Date().toISOString(),
    notes: '',
  });

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showConfirm = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]);
    }
  };

  useEffect(() => {
    loadEntries();
    loadVehicles();
    loadGodowns();
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
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

  const calculateNetWeight = (gross, empty) => {
    const grossNum = parseFloat(gross) || 0;
    const emptyNum = parseFloat(empty) || 0;
    return (grossNum - emptyNum).toFixed(2);
  };

  const handleWeightChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'gross_weight' || field === 'empty_vehicle_weight') {
      newFormData.net_weight = calculateNetWeight(
        newFormData.gross_weight,
        newFormData.empty_vehicle_weight
      );
    }
    setFormData(newFormData);
  };

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'before') {
        setBeforeImage(result.assets[0]);
      } else {
        setAfterImage(result.assets[0]);
      }
    }
  };

  const takePhoto = async (type) => {
    if (!cameraPermission) {
      showAlert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'before') {
        setBeforeImage(result.assets[0]);
      } else {
        setAfterImage(result.assets[0]);
      }
    }
  };

  const openAddModal = () => {
    setFormData({
      vehicle_entry_id: '',
      godown_id: '',
      gross_weight: '',
      empty_vehicle_weight: '',
      net_weight: '0',
      unloading_start_time: new Date().toISOString(),
      unloading_end_time: new Date().toISOString(),
      notes: '',
    });
    setBeforeImage(null);
    setAfterImage(null);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.vehicle_entry_id || !formData.godown_id || 
          !formData.gross_weight || !formData.empty_vehicle_weight) {
        showAlert('Error', 'Please fill all required fields');
        return;
      }

      if (!beforeImage || !afterImage) {
        showAlert('Error', 'Please capture both before and after images');
        return;
      }

      const submitFormData = new FormData();
      submitFormData.append('vehicle_entry_id', formData.vehicle_entry_id);
      submitFormData.append('godown_id', formData.godown_id);
      submitFormData.append('gross_weight', formData.gross_weight);
      submitFormData.append('empty_vehicle_weight', formData.empty_vehicle_weight);
      submitFormData.append('net_weight', formData.net_weight);
      submitFormData.append('unloading_start_time', formData.unloading_start_time);
      submitFormData.append('unloading_end_time', formData.unloading_end_time);
      if (formData.notes) {
        submitFormData.append('notes', formData.notes);
      }

      if (Platform.OS === 'web') {
        const beforeBlob = await fetch(beforeImage.uri).then(r => r.blob());
        const afterBlob = await fetch(afterImage.uri).then(r => r.blob());
        submitFormData.append('before_unloading_image', beforeBlob, 'before.jpg');
        submitFormData.append('after_unloading_image', afterBlob, 'after.jpg');
      } else {
        submitFormData.append('before_unloading_image', {
          uri: beforeImage.uri,
          type: 'image/jpeg',
          name: 'before.jpg',
        });
        submitFormData.append('after_unloading_image', {
          uri: afterImage.uri,
          type: 'image/jpeg',
          name: 'after.jpg',
        });
      }

      await unloadingApi.create(submitFormData);
      showAlert('Success', 'Unloading entry added successfully');
      setModalVisible(false);
      loadEntries();
      loadGodowns();
    } catch (error) {
      console.error('Error saving entry:', error);
      showAlert('Error', 'Failed to save entry');
    }
  };

  const handleDelete = (entry) => {
    showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this unloading entry?',
      async () => {
        try {
          await unloadingApi.delete(entry.id);
          loadEntries();
          showAlert('Success', 'Deleted successfully');
        } catch (error) {
          console.error('Error deleting:', error);
          showAlert('Error', 'Failed to delete');
        }
      }
    );
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'vehicle_entry', 
      label: 'Vehicle', 
      render: (entry) => entry.vehicle_entry?.vehicle_number || 'N/A'
    },
    { 
      key: 'godown', 
      label: 'Godown', 
      render: (entry) => entry.godown?.name || 'N/A'
    },
    { key: 'gross_weight', label: 'Gross Weight (kg)' },
    { key: 'net_weight', label: 'Net Weight (kg)' },
  ];

  return (
    <Layout navigation={navigation} title="Unloading Entry">
      <DataTable
        columns={columns}
        data={entries}
        onAdd={openAddModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Add Unloading Entry"
      >
        <ScrollView style={styles.modalContent}>
          <Text style={styles.label}>Vehicle (Lab Tested) *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicle_entry_id}
              onValueChange={(value) => setFormData({ ...formData, vehicle_entry_id: value })}
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

          <Text style={styles.label}>Godown *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.godown_id}
              onValueChange={(value) => setFormData({ ...formData, godown_id: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Godown" value="" />
              {godowns.map((godown) => (
                <Picker.Item
                  key={godown.id}
                  label={`${godown.name} (${godown.type}) - ${godown.current_storage}/${godown.capacity} tons`}
                  value={godown.id}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Gross Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            value={formData.gross_weight}
            onChangeText={(text) => handleWeightChange('gross_weight', text)}
            placeholder="Enter gross weight"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Empty Vehicle Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            value={formData.empty_vehicle_weight}
            onChangeText={(text) => handleWeightChange('empty_vehicle_weight', text)}
            placeholder="Enter empty vehicle weight"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Net Weight (kg) - Auto-calculated</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={formData.net_weight}
            editable={false}
          />

          <Text style={styles.label}>Before Unloading Image *</Text>
          <View style={styles.imageSection}>
            {beforeImage ? (
              <Image source={{ uri: beforeImage.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => takePhoto('before')}
              >
                <Text style={styles.imageButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage('before')}
              >
                <Text style={styles.imageButtonText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>After Unloading Image *</Text>
          <View style={styles.imageSection}>
            {afterImage ? (
              <Image source={{ uri: afterImage.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => takePhoto('after')}
              >
                <Text style={styles.imageButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage('after')}
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
});
