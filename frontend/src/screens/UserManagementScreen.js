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
import SelectDropdown from '../components/SelectDropdown';

export default function UserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({ 
    username: '', 
    email: '',
    full_name: '',
    password: '', 
    role: 'user',
    branch_ids: [] 
  });
  const [selectedBranches, setSelectedBranches] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, branchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/branches`)
      ]);
      
      const usersData = await usersRes.json();
      const branchesData = await branchesRes.json();
      
      setUsers(usersData);
      setBranches(branchesData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentUser({ username: '', email: '', full_name: '', password: '', role: 'user', branch_ids: [] });
    setSelectedBranches([]);
    setEditMode(false);
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setCurrentUser({
      ...user,
      branch_ids: user.branches.map(b => b.id),
      password: ''
    });
    setSelectedBranches(user.branches.map(b => b.id));
    setEditMode(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentUser.username) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (!currentUser.email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!currentUser.full_name) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    if (!editMode && !currentUser.password) {
      Alert.alert('Error', 'Password is required for new users');
      return;
    }

    try {
      const url = editMode 
        ? `${API_BASE_URL}/api/users/${currentUser.id}`
        : `${API_BASE_URL}/api/users`;
      
      const method = editMode ? 'PUT' : 'POST';

      const payload = {
        username: currentUser.username,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: currentUser.role || 'user',
        branch_ids: selectedBranches,
      };

      if (currentUser.password && currentUser.password.trim() !== '') {
        payload.password = currentUser.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save user');
      }

      Alert.alert('Success', `User ${editMode ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete user "${user.username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Failed to delete user');
              }

              Alert.alert('Success', 'User deleted successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleBranch = (branchId) => {
    setSelectedBranches(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId);
      } else {
        return [...prev, branchId];
      }
    });
  };

  const columns = [
    { label: 'Username', field: 'username' },
    { label: 'Full Name', field: 'full_name' },
    { label: 'Email', field: 'email' },
    { label: 'Role', field: 'role' },
    { 
      label: 'Branches', 
      field: 'branches',
      render: (value, user) => {
        if (!user || !user.branches || user.branches.length === 0) {
          return 'None';
        }
        return user.branches.map(b => b.name).join(', ');
      }
    },
  ];

  if (loading) {
    return (
      <Layout navigation={navigation} title="User Management">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} title="User Management">
      <Card>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Users</Text>
          <Button title="+ Add User" onPress={handleAdd} />
        </View>

        <DataTable
          columns={columns}
          data={users}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit User' : 'Add User'}
      >
        <InputField
          label="Username"
          value={currentUser.username}
          onChangeText={(text) => setCurrentUser({ ...currentUser, username: text })}
          placeholder="Enter username"
          autoCapitalize="none"
        />

        <InputField
          label="Full Name"
          value={currentUser.full_name}
          onChangeText={(text) => setCurrentUser({ ...currentUser, full_name: text })}
          placeholder="Enter full name"
        />

        <InputField
          label="Email"
          value={currentUser.email}
          onChangeText={(text) => setCurrentUser({ ...currentUser, email: text })}
          placeholder="Enter email address"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <SelectDropdown
          label="Role"
          value={currentUser.role}
          onValueChange={(value) => setCurrentUser({ ...currentUser, role: value })}
          items={[
            { label: 'User', value: 'user' },
            { label: 'Operator', value: 'operator' },
            { label: 'Manager', value: 'manager' },
            { label: 'Admin', value: 'admin' },
          ]}
        />

        <InputField
          label={editMode ? "Password (leave blank to keep current)" : "Password"}
          value={currentUser.password}
          onChangeText={(text) => setCurrentUser({ ...currentUser, password: text })}
          placeholder="Enter password"
          secureTextEntry
        />

        <Text style={styles.branchLabel}>Select Branches</Text>
        <View style={styles.branchList}>
          {branches.length === 0 ? (
            <Text style={styles.noBranches}>No branches available. Create branches first.</Text>
          ) : (
            branches.map(branch => (
              <Button
                key={branch.id}
                title={branch.name}
                onPress={() => toggleBranch(branch.id)}
                variant={selectedBranches.includes(branch.id) ? 'primary' : 'secondary'}
                style={styles.branchButton}
              />
            ))
          )}
        </View>

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
  branchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  branchList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  branchButton: {
    marginRight: 10,
    marginBottom: 10,
  },
  noBranches: {
    color: '#999',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
