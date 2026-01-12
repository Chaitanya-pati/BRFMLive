import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal as RNModal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { productionOrderApi, rawProductApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';
import { useBranch } from '../context/BranchContext';

const ORDER_STATUSES = [
  { value: 'CREATED', label: 'Created' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ProductionOrderScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const [orders, setOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date');

  const [formData, setFormData] = useState({
    order_number: '',
    raw_product_id: '',
    quantity: '',
    order_date: new Date().toISOString().split('T')[0],
    target_finish_date: '',
    status: 'CREATED',
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, productsRes] = await Promise.all([
        productionOrderApi.getAll(),
        rawProductApi.getAll(),
      ]);
      setOrders(ordersRes.data);
      setRawProducts(productsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const product = rawProducts.find(p => p.id.toString() === formData.raw_product_id);
    const initial = product ? product.product_initial : 'PO';
    const date = new Date();
    const dateStr = date.getFullYear() + 
                    String(date.getMonth() + 1).padStart(2, '0') + 
                    String(date.getDate()).padStart(2, '0');
    
    // Filter orders for the same product in the current year
    const currentYear = date.getFullYear();
    const productOrdersInYear = orders.filter(o => {
      const orderDate = new Date(o.order_date);
      return o.raw_product_id.toString() === formData.raw_product_id && 
             orderDate.getFullYear() === currentYear;
    });
    
    const nextCount = productOrdersInYear.length + 1;
    return `${initial}-${dateStr}-${nextCount}`;
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentOrder(null);
    setFormData({
      order_number: '',
      raw_product_id: '',
      quantity: '',
      order_date: new Date().toISOString().split('T')[0],
      target_finish_date: '',
      status: 'CREATED',
    });
    setModalVisible(true);
  };

  // Add useEffect to generate order number when raw_product_id changes in Add Mode
  useEffect(() => {
    if (modalVisible && !editMode && formData.raw_product_id && rawProducts.length > 0) {
      setFormData(prev => ({
        ...prev,
        order_number: generateOrderNumber()
      }));
    }
  }, [formData.raw_product_id, modalVisible, editMode]);

  const openEditModal = (order) => {
    setEditMode(true);
    setCurrentOrder(order);
    setFormData({
      order_number: order.order_number,
      raw_product_id: order.raw_product_id?.toString() || '',
      quantity: order.quantity?.toString() || '',
      order_date: order.order_date ? order.order_date.split('T')[0] : '',
      target_finish_date: order.target_finish_date ? order.target_finish_date.split('T')[0] : '',
      status: order.status || 'CREATED',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedOrderNumber = formData.order_number?.trim();
    const quantity = parseFloat(formData.quantity);

    if (!trimmedOrderNumber || !formData.raw_product_id || !quantity || !formData.target_finish_date) {
      await showAlert('Validation Error', 'Please fill in all required fields', 'error');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      await showAlert('Validation Error', 'Quantity must be a positive number', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        order_number: trimmedOrderNumber,
        raw_product_id: parseInt(formData.raw_product_id),
        quantity: quantity,
        order_date: formData.order_date ? new Date(formData.order_date).toISOString() : new Date().toISOString(),
        target_finish_date: new Date(formData.target_finish_date).toISOString(),
        status: formData.status,
        branch_id: activeBranch?.id,
      };

      if (editMode && currentOrder) {
        await productionOrderApi.update(currentOrder.id, {
          order_number: payload.order_number,
          quantity: payload.quantity,
          target_finish_date: payload.target_finish_date,
          status: payload.status,
        });
        await showSuccess('Production order updated successfully');
      } else {
        await productionOrderApi.create(payload);
        await showSuccess('Production order created successfully');
      }

      setModalVisible(false);
      loadData();
    });
  };

  const handleDelete = async (order) => {
    const confirmed = await showConfirm(
      'Delete Production Order',
      `Are you sure you want to delete order "${order.order_number}"?`
    );

    if (confirmed) {
      try {
        await productionOrderApi.delete(order.id);
        await showSuccess('Production order deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting production order:', error);
        showError('Failed to delete production order');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CREATED': return colors.info;
      case 'PLANNED': return colors.primary;
      case 'IN_PROGRESS': return colors.warning;
      case 'COMPLETED': return colors.success;
      case 'CANCELLED': return colors.danger;
      default: return colors.textLight;
    }
  };

  const columns = [
    { key: 'order_number', title: 'Order #', width: 150 },
    { 
      key: 'raw_product', 
      title: 'Product', 
      width: 150,
      render: (item) => item.raw_product?.product_name || 'N/A'
    },
    { key: 'quantity', title: 'Quantity (kg)', width: 120, render: (item) => `${item.quantity} kg` },
    { key: 'order_date', title: 'Order Date', width: 120, render: (item) => formatISTDate(item.order_date) },
    { key: 'target_finish_date', title: 'Target Date', width: 120, render: (item) => formatISTDate(item.target_finish_date) },
    { 
      key: 'status', 
      title: 'Status', 
      width: 120,
      render: (item) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      )
    },
  ];

  const handlePlan = (order) => {
    navigation.navigate('ProductionOrderPlanning', { orderId: order.id });
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, target_finish_date: dateString });
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const renderActions = (item) => (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.planButton} onPress={() => handlePlan(item)}>
        <Text style={styles.buttonText}>Plan</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
        <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Layout title="Production Orders" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Production Orders</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Create Order</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            renderActions={renderActions}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editMode ? 'Edit Production Order' : 'Create Production Order'}
        >
          <View style={styles.form}>
            <Text style={styles.label}>Raw Product *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.raw_product_id}
                onValueChange={(value) => setFormData({ ...formData, raw_product_id: value })}
                style={styles.picker}
                enabled={!editMode}
              >
                <Picker.Item label="Select a product..." value="" />
                {rawProducts.map((product) => (
                  <Picker.Item
                    key={product.id}
                    label={`${product.product_name} (${product.product_initial})`}
                    value={product.id.toString()}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Order Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.lightGray }]}
              value={formData.order_number}
              onChangeText={(text) => setFormData({ ...formData, order_number: text })}
              placeholder="Select a product to generate"
              editable={false}
            />

            <Text style={styles.label}>Quantity (kg) *</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              placeholder="e.g., 5000"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Order Date</Text>
            <TextInput
              style={styles.input}
              value={formData.order_date}
              onChangeText={(text) => setFormData({ ...formData, order_date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Target Finish Date *</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={formData.target_finish_date}
                onChangeText={(text) => setFormData({ ...formData, target_finish_date: text })}
                placeholder="YYYY-MM-DD"
              />
            ) : (
              <>
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: formData.target_finish_date ? colors.textDark : colors.textLight }}>
                    {formData.target_finish_date ? formData.target_finish_date : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.target_finish_date ? new Date(formData.target_finish_date) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )}
                {Platform.OS === 'ios' && showDatePicker && (
                  <View style={styles.datePickerFooter}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.datePickerButton}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {editMode && (
              <>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    style={styles.picker}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <Picker.Item key={status.value} label={status.label} value={status.value} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editMode ? 'Update Order' : 'Create Order'}
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
  planButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
