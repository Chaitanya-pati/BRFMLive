import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { machineApi } from '../api/client';
import colors from '../theme/colors';

// Assuming showNotification is a function available in the scope,
// possibly imported from a UI library or a custom hook.
// For demonstration, let's define a placeholder if it's not globally available.
const showNotification = (message, type) => {
  // In a real app, this would display a toast/snackbar.
  // For this example, we'll use Alert, similar to showAlert.
  Alert.alert(type.charAt(0).toUpperCase() + type.slice(1), message);
};


export default function MachineManagementScreen({ navigation }) {
  const [machines, setMachines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMachine, setCurrentMachine] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    machine_type: 'Separator',
    make: '',
    serial_number: '',
    description: '',
    status: 'Active',
  });

  const machineTypes = ['Separator', 'Drum Shield', 'Other'];
  const statuses = ['Active', 'Inactive'];

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
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await machineApi.getAll();
      setMachines(response.data);
    } catch (error) {
      console.error('Error loading machines:', error);
      showAlert('Error', 'Failed to load machines');
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentMachine(null);
    setFormData({
      name: '',
      machine_type: 'Separator',
      make: '',
      serial_number: '',
      description: '',
      status: 'Active',
    });
    setModalVisible(true);
  };

  const openEditModal = (machine) => {
    setEditMode(true);
    setCurrentMachine(machine);
    setFormData({
      name: machine.name,
      machine_type: machine.machine_type,
      make: machine.make || '',
      serial_number: machine.serial_number || '',
      description: machine.description || '',
      status: machine.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showAlert('Validation Error', 'Machine name is required');
      return;
    }

    if (!formData.machine_type) {
      showAlert('Validation Error', 'Machine type is required');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        await machineApi.update(currentMachine.id, formData);
        // Updated toast message for successful machine update
        showNotification("Machine updated successfully!", "success");
      } else {
        await machineApi.create(formData);
        // Updated toast message for successful machine creation
        showNotification("Machine created successfully!", "success");
      }
      setModalVisible(false);
      loadMachines();
    } catch (error) {
      console.error('Error saving machine:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save machine';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (machine) => {
    showConfirm(
      'Delete Machine',
      `Are you sure you want to delete machine "${machine.name}"?`,
      async () => {
        try {
          await machineApi.delete(machine.id);
          // Updated toast message for successful machine deletion
          showNotification("Machine deleted successfully!", "success");
          loadMachines();
        } catch (error) {
          console.error('Error deleting machine:', error);
          const errorMessage = error.response?.data?.detail || 'Failed to delete machine';
          showAlert('Error', errorMessage);
        }
      }
    );
  };

  const columns = [
    { label: 'ID', field: 'id', flex: 0.5 },
    { label: 'Name', field: 'name', flex: 1.2 },
    { label: 'Type', field: 'machine_type', flex: 0.8 },
    { label: 'Make', field: 'make', flex: 0.8 },
    { label: 'Serial No.', field: 'serial_number', flex: 0.8 },
    { label: 'Description', field: 'description', flex: 1.5 },
    { label: 'Status', field: 'status', flex: 0.6 },
  ];

  const renderModalContent = () => (
    <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Machine Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter machine name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Machine Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.machine_type}
            onValueChange={(value) => setFormData({ ...formData, machine_type: value })}
            style={styles.picker}
          >
            {machineTypes.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Make (Brand)</Text>
        <TextInput
          style={styles.input}
          value={formData.make}
          onChangeText={(text) => setFormData({ ...formData, make: text })}
          placeholder="Enter machine make/brand"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Serial Number</Text>
        <TextInput
          style={styles.input}
          value={formData.serial_number}
          onChangeText={(text) => setFormData({ ...formData, serial_number: text })}
          placeholder="Enter serial number"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Enter description"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
            style={styles.picker}
          >
            {statuses.map((status) => (
              <Picker.Item key={status} label={status} value={status} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => setModalVisible(false)}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : editMode ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Layout navigation={navigation} title="Machine Management">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Machine Configuration</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Machine</Text>
          </TouchableOpacity>
        </View>

        <DataTable
          columns={columns}
          data={machines}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? 'Edit Machine' : 'Add New Machine'}
        >
          {renderModalContent()}
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: colors.text,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});