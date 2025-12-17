import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { finishedGoodApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';
import { useBranch } from '../context/BranchContext';

export default function FinishedGoodsMasterScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    product_name: '',
    product_initial: '',
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await finishedGoodApi.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading finished goods:', error);
      showError('Failed to load finished goods');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentProduct(null);
    setFormData({
      product_name: '',
      product_initial: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (product) => {
    setEditMode(true);
    setCurrentProduct(product);
    setFormData({
      product_name: product.product_name,
      product_initial: product.product_initial,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedName = formData.product_name?.trim();
    const trimmedInitial = formData.product_initial?.trim();

    if (!trimmedName || !trimmedInitial) {
      await showAlert('Validation Error', 'Please fill in all required fields', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        product_name: trimmedName,
        product_initial: trimmedInitial.toUpperCase(),
        branch_id: activeBranch?.id,
      };

      if (editMode && currentProduct) {
        await finishedGoodApi.update(currentProduct.id, payload);
        await showSuccess('Finished good updated successfully');
      } else {
        await finishedGoodApi.create(payload);
        await showSuccess('Finished good created successfully');
      }

      setModalVisible(false);
      loadProducts();
    });
  };

  const handleDelete = async (product) => {
    const confirmed = await showConfirm(
      'Delete Finished Good',
      `Are you sure you want to delete "${product.product_name}"?`
    );

    if (confirmed) {
      try {
        await finishedGoodApi.delete(product.id);
        await showSuccess('Finished good deleted successfully');
        loadProducts();
      } catch (error) {
        console.error('Error deleting finished good:', error);
        showError('Failed to delete finished good');
      }
    }
  };

  const columns = [
    { key: 'product_name', title: 'Product Name', width: 200 },
    { key: 'product_initial', title: 'Initial', width: 100 },
    { key: 'created_at', title: 'Created', width: 150, render: (item) => formatISTDate(item.created_at) },
  ];

  const renderActions = (item) => (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Layout title="Finished Goods Master" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Finished Goods</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Finished Good</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <DataTable
            columns={columns}
            data={products}
            renderActions={renderActions}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? 'Edit Finished Good' : 'Add Finished Good'}
        >
          <View style={styles.form}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.product_name}
              onChangeText={(text) => setFormData({ ...formData, product_name: text })}
              placeholder="e.g., Chakki Ata, Suji, Maida"
            />

            <Text style={styles.label}>Product Initial (Short Code) *</Text>
            <TextInput
              style={styles.input}
              value={formData.product_initial}
              onChangeText={(text) => setFormData({ ...formData, product_initial: text.toUpperCase() })}
              placeholder="e.g., CA, SU, MA"
              maxLength={10}
            />

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editMode ? 'Update' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.info,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
