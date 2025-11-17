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
import { routeConfigurationApi, magnetApi, machineApi, godownApi, binApi } from '../api/client';
import colors from '../theme/colors';

export default function RouteConfigurationScreen({ navigation }) {
  const [routes, setRoutes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const [magnets, setMagnets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [bins, setBins] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stages: [
      { sequence_no: 1, component_type: 'godown', component_id: null },
      { sequence_no: 2, component_type: 'bin', component_id: null },
    ],
  });

  const componentTypes = ['godown', 'magnet', 'machine', 'bin'];

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
    loadRoutes();
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      const [magnetsRes, machinesRes, godownsRes, binsRes] = await Promise.all([
        magnetApi.getAll(),
        machineApi.getAll(),
        godownApi.getAll(),
        binApi.getAll(),
      ]);
      setMagnets(magnetsRes.data);
      setMachines(machinesRes.data);
      setGodowns(godownsRes.data);
      setBins(binsRes.data);
    } catch (error) {
      console.error('Error loading components:', error);
      showAlert('Error', 'Failed to load components');
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await routeConfigurationApi.getAll();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error loading routes:', error);
      showAlert('Error', 'Failed to load routes');
    }
  };

  const getComponentsForType = (type) => {
    switch (type) {
      case 'godown':
        return godowns;
      case 'magnet':
        return magnets;
      case 'machine':
        return machines;
      case 'bin':
        return bins;
      default:
        return [];
    }
  };

  const getComponentLabel = (type, componentId) => {
    const components = getComponentsForType(type);
    const component = components.find((c) => c.id === componentId);
    if (!component) return 'Not selected';
    
    switch (type) {
      case 'godown':
        return component.name;
      case 'magnet':
        return component.name;
      case 'machine':
        return component.name;
      case 'bin':
        return component.bin_number;
      default:
        return 'Unknown';
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentRoute(null);
    setFormData({
      name: '',
      description: '',
      stages: [
        { sequence_no: 1, component_type: 'godown', component_id: null },
        { sequence_no: 2, component_type: 'bin', component_id: null },
      ],
    });
    setModalVisible(true);
  };

  const openEditModal = (route) => {
    setEditMode(true);
    setCurrentRoute(route);
    setFormData({
      name: route.name,
      description: route.description || '',
      stages: route.stages || [
        { sequence_no: 1, component_type: 'godown', component_id: null },
        { sequence_no: 2, component_type: 'bin', component_id: null },
      ],
    });
    setModalVisible(true);
  };

  const handleAddStage = () => {
    const stages = [...formData.stages];
    const lastStage = stages[stages.length - 1];
    
    const newStage = {
      sequence_no: stages.length,
      component_type: 'magnet',
      component_id: null,
    };
    
    stages[stages.length - 1] = newStage;
    
    stages.push({
      sequence_no: stages.length + 1,
      component_type: 'bin',
      component_id: lastStage.component_id,
    });
    
    setFormData({ ...formData, stages: stages.map((s, idx) => ({ ...s, sequence_no: idx + 1 })) });
  };

  const handleRemoveStage = (index) => {
    if (index === 0 || index === formData.stages.length - 1) {
      showAlert('Error', 'Cannot remove first or last stage');
      return;
    }
    
    const stages = formData.stages.filter((_, idx) => idx !== index);
    setFormData({ ...formData, stages: stages.map((s, idx) => ({ ...s, sequence_no: idx + 1 })) });
  };

  const handleStageChange = (index, field, value) => {
    const stages = [...formData.stages];
    stages[index] = { ...stages[index], [field]: value };
    
    if (field === 'component_type') {
      stages[index].component_id = null;
    }
    
    setFormData({ ...formData, stages });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showAlert('Validation Error', 'Route name is required');
      return;
    }

    for (let i = 0; i < formData.stages.length; i++) {
      const stage = formData.stages[i];
      if (!stage.component_id) {
        showAlert('Validation Error', `Please select a component for stage ${i + 1}`);
        return;
      }
    }

    if (formData.stages.length < 2) {
      showAlert('Validation Error', 'At least 2 stages (godown and bin) are required');
      return;
    }

    if (formData.stages[0].component_type !== 'godown') {
      showAlert('Validation Error', 'First stage must be a godown');
      return;
    }

    if (formData.stages[formData.stages.length - 1].component_type !== 'bin') {
      showAlert('Validation Error', 'Last stage must be a bin');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        await routeConfigurationApi.update(currentRoute.id, formData);
        showAlert('Success', 'Route updated successfully');
      } else {
        await routeConfigurationApi.create(formData);
        showAlert('Success', 'Route created successfully');
      }
      setModalVisible(false);
      loadRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save route';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (route) => {
    showConfirm(
      'Delete Route',
      `Are you sure you want to delete route "${route.name}"?`,
      async () => {
        try {
          await routeConfigurationApi.delete(route.id);
          showAlert('Success', 'Route deleted successfully');
          loadRoutes();
        } catch (error) {
          console.error('Error deleting route:', error);
          const errorMessage = error.response?.data?.detail || 'Failed to delete route';
          showAlert('Error', errorMessage);
        }
      }
    );
  };

  const columns = [
    { title: 'ID', key: 'id', width: 60 },
    { title: 'Name', key: 'name', width: 200 },
    { title: 'Description', key: 'description', width: 250 },
    { title: 'Stages', key: 'stages', width: 100, render: (row) => row.stages?.length || 0 },
  ];

  const renderStage = (stage, index) => {
    const isFirst = index === 0;
    const isLast = index === formData.stages.length - 1;
    const components = getComponentsForType(stage.component_type);

    return (
      <View key={index} style={styles.stageContainer}>
        <View style={styles.stageHeader}>
          <Text style={styles.stageTitle}>Stage {stage.sequence_no}</Text>
          {!isFirst && !isLast && (
            <TouchableOpacity
              style={styles.removeStageButton}
              onPress={() => handleRemoveStage(index)}
            >
              <Text style={styles.removeStageText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Component Type {isFirst ? '(First = Godown)' : isLast ? '(Last = Bin)' : ''}
          </Text>
          <View style={[styles.pickerContainer, (isFirst || isLast) && styles.disabledPicker]}>
            <Picker
              selectedValue={stage.component_type}
              onValueChange={(value) => handleStageChange(index, 'component_type', value)}
              style={styles.picker}
              enabled={!isFirst && !isLast}
            >
              {componentTypes.map((type) => (
                <Picker.Item key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Component *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={stage.component_id}
              onValueChange={(value) => handleStageChange(index, 'component_id', parseInt(value))}
              style={styles.picker}
            >
              <Picker.Item label="Select..." value={null} />
              {components.map((component) => {
                const label = component.name || component.bin_number || `ID: ${component.id}`;
                return <Picker.Item key={component.id} label={label} value={component.id} />;
              })}
            </Picker>
          </View>
        </View>
      </View>
    );
  };

  const renderModalContent = () => (
    <ScrollView style={styles.modalScroll}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Route Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter route name"
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
          numberOfLines={3}
        />
      </View>

      <View style={styles.stagesSection}>
        <View style={styles.stagesSectionHeader}>
          <Text style={styles.sectionTitle}>Workflow Stages</Text>
          <TouchableOpacity
            style={styles.addStageButton}
            onPress={handleAddStage}
          >
            <Text style={styles.addStageText}>+ Add Stage</Text>
          </TouchableOpacity>
        </View>

        {formData.stages.map((stage, index) => renderStage(stage, index))}
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
    <Layout navigation={navigation} title="Route Configuration">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dynamic Route Configuration</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Route</Text>
          </TouchableOpacity>
        </View>

        <DataTable
          columns={columns}
          data={routes}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? 'Edit Route' : 'Add New Route'}
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
  modalScroll: {
    maxHeight: 600,
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  disabledPicker: {
    backgroundColor: '#f0f0f0',
  },
  picker: {
    height: 40,
  },
  stagesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  stagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  addStageButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addStageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  removeStageButton: {
    backgroundColor: '#dc3545',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeStageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
