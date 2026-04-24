import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { routeConfigurationApi, magnetApi, machineApi, godownApi, binApi } from '../api/client';
import { showToast, showAlert, showConfirm } from '../utils/customAlerts';
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
    sourceType: 'godown',
    stages: [
      { sequence_no: 1, component_type: 'godown', component_id: null, interval_hours: null },
      { sequence_no: 2, component_type: 'bin', component_id: null, interval_hours: null },
    ],
  });

  const middleTypes = ['magnet', 'machine'];
  const firstStageTypes = ['godown', 'bin'];

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
      showToast('Failed to load components', 'error');
    }
  };

  const loadRoutes = async () => {
    try {
      const response = await routeConfigurationApi.getAll();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error loading routes:', error);
      showToast('Failed to load routes', 'error');
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

  // Compute role for each stage based on position + type, mirroring backend split_route_stages
  const computeRoles = (stages) => {
    if (!stages || stages.length === 0) return [];
    const sorted = [...stages].sort((a, b) => a.sequence_no - b.sequence_no);
    const sourceType = sorted[0].component_type;

    let i = 0;
    while (i < sorted.length && sorted[i].component_type === sourceType) i++;
    const sourceCount = i;

    let j = sorted.length - 1;
    while (j >= sourceCount && sorted[j].component_type === 'bin') j--;
    const destStartIdx = j + 1;

    return sorted.map((_, idx) => {
      if (idx < sourceCount) return 'source';
      if (idx >= destStartIdx) return 'destination';
      return 'middle';
    });
  };

  const renumberStages = (stages) =>
    stages.map((s, idx) => ({ ...s, sequence_no: idx + 1 }));

  const openAddModal = () => {
    setEditMode(false);
    setCurrentRoute(null);
    setFormData({
      name: '',
      description: '',
      sourceType: 'godown',
      stages: [
        { sequence_no: 1, component_type: 'godown', component_id: null, interval_hours: null },
        { sequence_no: 2, component_type: 'bin', component_id: null, interval_hours: null },
      ],
    });
    setModalVisible(true);
  };

  const openEditModal = (route) => {
    setEditMode(true);
    setCurrentRoute(route);
    const sourceType = route.stages?.[0]?.component_type || 'godown';
    setFormData({
      name: route.name,
      description: route.description || '',
      sourceType: sourceType,
      stages: route.stages || [
        { sequence_no: 1, component_type: sourceType, component_id: null, interval_hours: null },
        { sequence_no: 2, component_type: 'bin', component_id: null, interval_hours: null },
      ],
    });
    setModalVisible(true);
  };

  // Add a new SOURCE stage at the start of source block (before middle stages)
  const handleAddSource = () => {
    const stages = [...formData.stages];
    const roles = computeRoles(stages);
    let insertAt = roles.filter((r) => r === 'source').length;
    if (insertAt === 0) insertAt = 1; // safety

    const newStage = {
      sequence_no: 0,
      component_type: formData.sourceType,
      component_id: null,
      interval_hours: null,
    };
    stages.splice(insertAt, 0, newStage);
    setFormData({ ...formData, stages: renumberStages(stages) });
  };

  // Add a new DESTINATION bin stage at the end
  const handleAddDestination = () => {
    const stages = [...formData.stages];
    const newStage = {
      sequence_no: 0,
      component_type: 'bin',
      component_id: null,
      interval_hours: null,
    };
    stages.push(newStage);
    setFormData({ ...formData, stages: renumberStages(stages) });
  };

  // Add a MIDDLE stage (magnet/machine) just before destinations begin
  const handleAddMiddle = () => {
    const stages = [...formData.stages];
    const roles = computeRoles(stages);
    let insertAt = roles.length;
    for (let k = 0; k < roles.length; k++) {
      if (roles[k] === 'destination') {
        insertAt = k;
        break;
      }
    }
    const newStage = {
      sequence_no: 0,
      component_type: 'magnet',
      component_id: null,
      interval_hours: null,
    };
    stages.splice(insertAt, 0, newStage);
    setFormData({ ...formData, stages: renumberStages(stages) });
  };

  const handleRemoveStage = (index) => {
    const roles = computeRoles(formData.stages);
    const role = roles[index];
    const sourceCount = roles.filter((r) => r === 'source').length;
    const destCount = roles.filter((r) => r === 'destination').length;

    if (role === 'source' && sourceCount <= 1) {
      showAlert('Error', 'At least one source is required', 'error');
      return;
    }
    if (role === 'destination' && destCount <= 1) {
      showAlert('Error', 'At least one destination bin is required', 'error');
      return;
    }

    const stages = formData.stages.filter((_, idx) => idx !== index);
    setFormData({ ...formData, stages: renumberStages(stages) });
  };

  // Changing source type rewrites every source-role stage to the new type
  const handleSourceTypeChange = (value) => {
    const stages = [...formData.stages];
    const roles = computeRoles(stages);
    const updated = stages.map((s, idx) =>
      roles[idx] === 'source'
        ? { ...s, component_type: value, component_id: null, interval_hours: null }
        : s
    );
    setFormData({ ...formData, sourceType: value, stages: updated });
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
      showAlert('Validation Error', 'Route name is required', 'error');
      return;
    }

    const roles = computeRoles(formData.stages);
    const sourceCount = roles.filter((r) => r === 'source').length;
    const destCount = roles.filter((r) => r === 'destination').length;

    if (sourceCount < 1) {
      showAlert('Validation Error', 'At least one source is required', 'error');
      return;
    }
    if (destCount < 1) {
      showAlert('Validation Error', 'At least one destination bin is required', 'error');
      return;
    }

    if (formData.sourceType !== 'godown' && formData.sourceType !== 'bin') {
      showAlert('Validation Error', 'Source type must be a godown or bin', 'error');
      return;
    }

    for (let i = 0; i < formData.stages.length; i++) {
      const stage = formData.stages[i];
      const componentId = stage.component_id ? parseInt(stage.component_id) : null;

      if (!componentId) {
        showAlert('Validation Error', `Please select a component for stage ${i + 1}`, 'error');
        return;
      }
      formData.stages[i].component_id = componentId;

      if (stage.component_type === 'magnet') {
        const intervalValue = parseFloat(stage.interval_hours);
        if (!stage.interval_hours || isNaN(intervalValue) || intervalValue <= 0) {
          showAlert('Validation Error', `Please enter a valid cleaning interval for magnet in stage ${i + 1}`, 'error');
          return;
        }
        formData.stages[i].interval_hours = intervalValue;
      }
    }

    setLoading(true);
    try {
      if (editMode) {
        await routeConfigurationApi.update(currentRoute.id, formData);
        showToast('Route Configuration updated successfully!', 'success');
      } else {
        await routeConfigurationApi.create(formData);
        showToast('Route Configuration created successfully!', 'success');
      }
      setModalVisible(false);
      loadRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save route';
      showToast(errorMessage, 'error');
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
          showToast('Route Configuration deleted successfully!', 'success');
          loadRoutes();
        } catch (error) {
          console.error('Error deleting route:', error);
          const errorMessage = error.response?.data?.detail || 'Failed to delete route';
          showToast(errorMessage, 'error');
        }
      }
    );
  };

  const columns = [
    { label: 'ID', field: 'id', flex: 0.5, key: 'id' },
    { label: 'Name', field: 'name', flex: 1.5, key: 'name' },
    { label: 'Description', field: 'description', flex: 2, key: 'description' },
    { label: 'Stages', field: 'stages', flex: 0.8, key: 'stages_count', render: (value, row) => row.stages?.length || 0 },
  ];

  const renderStage = (stage, index, role, sameRoleSiblings) => {
    const components = getComponentsForType(stage.component_type);

    let roleLabel = 'Stage';
    let typeLockedTo = null;
    if (role === 'source') {
      roleLabel = sameRoleSiblings > 1 ? `Source ${stage.sequence_no}` : 'Source';
      typeLockedTo = formData.sourceType;
    } else if (role === 'destination') {
      const destNum = stage.sequence_no - (formData.stages.length - sameRoleSiblings);
      roleLabel = sameRoleSiblings > 1 ? `Destination Bin ${destNum}` : 'Destination Bin';
      typeLockedTo = 'bin';
    } else {
      roleLabel = `Stage ${stage.sequence_no}`;
    }

    const canRemove =
      (role === 'source' && sameRoleSiblings > 1) ||
      (role === 'destination' && sameRoleSiblings > 1) ||
      role === 'middle';

    const roleStyle =
      role === 'source'
        ? styles.stageSource
        : role === 'destination'
        ? styles.stageDestination
        : styles.stageMiddle;

    return (
      <View key={index} style={[styles.stageContainer, roleStyle]}>
        <View style={styles.stageHeader}>
          <Text style={styles.stageTitle}>{roleLabel}</Text>
          {canRemove && (
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
            Component Type {typeLockedTo ? '(Locked)' : ''}
          </Text>
          <View style={[styles.pickerContainer, typeLockedTo && styles.disabledPicker]}>
            <Picker
              selectedValue={stage.component_type}
              onValueChange={(value) => handleStageChange(index, 'component_type', value)}
              style={styles.picker}
              enabled={!typeLockedTo}
            >
              {(typeLockedTo ? [typeLockedTo] : middleTypes).map((type) => (
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

        {stage.component_type === 'magnet' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Cleaning Interval (Hours) *</Text>
            <TextInput
              style={styles.input}
              value={stage.interval_hours?.toString() || ''}
              onChangeText={(text) => {
                if (text === '' || /^\d*\.?\d*$/.test(text)) {
                  const value = text === '' ? null : text;
                  handleStageChange(index, 'interval_hours', value);
                }
              }}
              placeholder="Enter cleaning interval in hours (e.g., 0.001 for testing)"
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>
              Magnet cleaning interval in decimal hours (e.g., 0.001 for testing, 3 for 3 hours)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderModalContent = () => {
    const roles = computeRoles(formData.stages);
    const sourceCount = roles.filter((r) => r === 'source').length;
    const destCount = roles.filter((r) => r === 'destination').length;

    return (
      <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
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

        <View style={styles.formGroup}>
          <Text style={styles.label}>Source Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.sourceType}
              onValueChange={handleSourceTypeChange}
              style={styles.picker}
            >
              <Picker.Item label="Godown (Raw Wheat → 24h)" value="godown" />
              <Picker.Item label="Bin (24h → 12h)" value="bin" />
            </Picker>
          </View>
          <Text style={styles.helperText}>
            All source rows below will use this type. Destinations are always bins.
          </Text>
        </View>

        <View style={styles.stagesSection}>
          <View style={styles.stagesSectionHeader}>
            <Text style={styles.sectionTitle}>
              Workflow Stages ({sourceCount} source{sourceCount !== 1 ? 's' : ''} → middle → {destCount} destination{destCount !== 1 ? 's' : ''})
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.smallButton, styles.sourceButton]} onPress={handleAddSource}>
              <Text style={styles.smallButtonText}>+ Source</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.middleButton]} onPress={handleAddMiddle}>
              <Text style={styles.smallButtonText}>+ Magnet/Machine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.destButton]} onPress={handleAddDestination}>
              <Text style={styles.smallButtonText}>+ Destination Bin</Text>
            </TouchableOpacity>
          </View>

          {formData.stages.map((stage, index) => {
            const role = roles[index];
            const siblingCount =
              role === 'source' ? sourceCount : role === 'destination' ? destCount : 1;
            return renderStage(stage, index, role, siblingCount);
          })}
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
  };

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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sourceButton: {
    backgroundColor: '#0d6efd',
  },
  middleButton: {
    backgroundColor: '#28a745',
  },
  destButton: {
    backgroundColor: '#fd7e14',
  },
  stageContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderLeftWidth: 4,
  },
  stageSource: {
    borderLeftColor: '#0d6efd',
  },
  stageMiddle: {
    borderLeftColor: '#28a745',
  },
  stageDestination: {
    borderLeftColor: '#fd7e14',
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
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
    fontStyle: 'italic',
  },
});
