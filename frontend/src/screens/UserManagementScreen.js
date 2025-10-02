import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { userApi } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserManagementScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    loadAuthToken();
  }, []);

  const loadAuthToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    setAuthToken(token);
    if (token) {
      fetchUsers(token);
    }
  };

  const fetchUsers = async (token) => {
    try {
      const response = await userApi.getAll(token || authToken);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userApi.delete(userId, authToken);
              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async (data) => {
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, data, authToken);
        Alert.alert('Success', 'User updated successfully');
      } else {
        await userApi.create(data, authToken);
        Alert.alert('Success', 'User created successfully');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save user');
    }
  };

  const fields = [
    { name: 'username', label: 'Username', type: 'text', required: !editingUser },
    { name: 'email', label: 'Email', type: 'email', required: !editingUser },
    { name: 'full_name', label: 'Full Name', type: 'text', required: true },
    { 
      name: 'role', 
      label: 'Role', 
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true 
    },
    { name: 'password', label: 'Password', type: 'password', required: !editingUser },
    { 
      name: 'is_active', 
      label: 'Active', 
      type: 'select',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
      required: false 
    },
  ];

  const columns = [
    { key: 'username', title: 'Username' },
    { key: 'email', title: 'Email' },
    { key: 'full_name', title: 'Full Name' },
    { key: 'role', title: 'Role' },
    { key: 'is_active', title: 'Status', render: (value) => value ? 'Active' : 'Inactive' },
  ];

  return (
    <Layout title="User Management" navigation={navigation} currentRoute={route.name}>
      <DataTable
        title="User Management"
        data={users}
        columns={columns}
        onAdd={handleAddUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        loading={loading}
      />
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        fields={fields}
        onSubmit={handleSubmit}
        defaultValues={editingUser || {}}
      />
    </Layout>
  );
}
