
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import notify from '../utils/notifications';
import { branchApi } from '../api/client';
import colors from '../theme/colors';

export default function BranchManagementScreen({ navigation }) {
  const [branches, setBranches] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    is_active: 1,
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await branchApi.getAll();
      setBranches(response.data);
    } catch (error) {
      console.error('Error loading branches:', error);
      notify.showError('Failed to load branches');
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentBranch(null);
    setFormData({
      branch_name: '',
      branch_code: '',
      address: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      is_active: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (branch) => {
    setEditMode(true);
    setCurrentBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.branch_name || !formData.branch_code) {
      notify.showWarning('Branch Name and Branch Code are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        branch_name: formData.branch_name.trim(),
        branch_code: formData.branch_code.trim().toUpperCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        is_active: formData.is_active,
      };

      if (editMode && currentBranch) {
        await branchApi.update(currentBranch.id, payload);
        notify.showSuccess('Branch updated successfully');
      } else {
        await branchApi.create(payload);
        notify.showSuccess('Branch created successfully');
      }

      setModalVisible(false);
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      notify.showError(
        error.response?.data?.detail || 'Failed to save branch'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (branch) => {
    notify.showConfirm(
      'Confirm Delete',
      `Are you sure you want to deactivate branch "${branch.branch_name}"?`,
      async () => {
        try {
          await branchApi.delete(branch.id);
          notify.showSuccess('Branch deactivated successfully');
          loadBranches();
        } catch (error) {
          console.error('Error deleting branch:', error);
          notify.showError('Failed to deactivate branch');
        }
      }
    );
  };

  const columns = [
    { field: 'id', label: 'ID', flex: 0.5 },
    { field: 'branch_name', label: 'Branch Name', flex: 1.5 },
    { field: 'branch_code', label: 'Code', flex: 0.8 },
    { field: 'city', label: 'City', flex: 1 },
    { field: 'state', label: 'State', flex: 1 },
    { field: 'phone', label: 'Phone', flex: 1 },
    { field: 'email', label: 'Email', flex: 1.2 },
    { 
      field: 'is_active', 
      label: 'Status', 
      flex: 0.8,
      render: (value) => (
        <Text style={value === 1 ? styles.activeText : styles.inactiveText}>
          {value === 1 ? 'Active' : 'Inactive'}
        </Text>
      )
    },
  ];

  return (
    <Layout navigation={navigation} title="Branch Management">
      <View style={styles.container}>
        <DataTable
          columns={columns}
          data={branches}
          onAdd={openAddModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? 'Edit Branch' : 'Add New Branch'}
        >
          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Branch Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.branch_name}
              onChangeText={(text) =>
                setFormData({ ...formData, branch_name: text })
              }
              placeholder="Enter branch name"
            />

            <Text style={styles.label}>Branch Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.branch_code}
              onChangeText={(text) =>
                setFormData({ ...formData, branch_code: text.toUpperCase() })
              }
              placeholder="Enter branch code (e.g., MAIN, NORTH)"
              maxLength={10}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              placeholder="Enter address"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="Enter city"
            />

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={formData.state}
              onChangeText={(text) =>
                setFormData({ ...formData, state: text })
              }
              placeholder="Enter state"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) =>
                setFormData({ ...formData, phone: text })
              }
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) =>
                setFormData({ ...formData, email: text })
              }
              placeholder="Enter email"
              keyboardType="email-address"
            />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  loading && { opacity: 0.5 },
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : editMode ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  activeText: {
    color: '#059669',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
