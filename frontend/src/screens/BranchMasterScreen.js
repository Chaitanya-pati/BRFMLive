import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../api/client';
import Layout from '../components/Layout';
import colors from '../theme/colors';
import Card from '../components/Card';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

export default function BranchMasterScreen({ navigation }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBranch, setCurrentBranch] = useState({ name: '', description: '' });

  // Placeholder for a notification function, assuming it exists elsewhere or will be implemented
  const showNotification = (message, type) => {
    // In a real app, this would trigger a toast or notification component
    Alert.alert(type === 'success' ? 'Success' : 'Error', message);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches`);
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      showNotification('Failed to fetch branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentBranch({ name: '', description: '' });
    setEditMode(false);
    setModalVisible(true);
  };

  const handleEdit = (branch) => {
    setCurrentBranch(branch);
    setEditMode(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentBranch.name) {
      showNotification('Branch name is required', 'error');
      return;
    }

    try {
      const url = editMode
        ? `${API_BASE_URL}/api/branches/${currentBranch.id}`
        : `${API_BASE_URL}/api/branches`;

      const method = editMode ? 'PUT' : 'POST';

      const payload = {
        name: currentBranch.name,
        description: currentBranch.description || '',
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Failed to ${editMode ? 'update' : 'create'} branch`);
      }

      showNotification(`Branch ${editMode ? 'updated' : 'created'} successfully`, 'success');
      setModalVisible(false);
      fetchBranches();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleDelete = (branch) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete branch "${branch.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/branches/${branch.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete branch');
              }

              showNotification('Branch deleted successfully', 'success');
              fetchBranches();
            } catch (error) {
              showNotification(error.message, 'error');
            }
          },
        },
      ]
    );
  };

  const columns = [
    { label: 'Branch Name', field: 'name' },
    { label: 'Description', field: 'description' },
  ];

  if (loading) {
    return (
      <Layout navigation={navigation} title="Branch Master">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} title="Branch Master">
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Branches</Text>
          <Button title="+ Add Branch" onPress={handleAdd} />
        </View>

        <DataTable
          columns={columns}
          data={branches}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Branch' : 'Add Branch'}
      >
        <InputField
          label="Branch Name"
          value={currentBranch.name}
          onChangeText={(text) => setCurrentBranch({ ...currentBranch, name: text })}
          placeholder="Enter branch name"
        />

        <InputField
          label="Description"
          value={currentBranch.description}
          onChangeText={(text) => setCurrentBranch({ ...currentBranch, description: text })}
          placeholder="Enter description (optional)"
          multiline
          numberOfLines={3}
        />

        <View style={styles.modalButtons}>
          <Button
            title="Cancel"
            onPress={() => setModalVisible(false)}
            variant="secondary"
            style={{ flex: 1, marginRight: 10 }}
          />
          <Button
            title={editMode ? 'Update' : 'Create'}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
});