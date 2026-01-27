import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { customerOrderApi, customerApi, finishedGoodApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

export default function CustomerOrderMasterScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  const [formData, setFormData] = useState({
    order_code: '',
    customer_id: '',
    order_status: 'PENDING',
    remarks: '',
    items: [{ finished_good_id: '', quantity_ton: '' }]
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadFinishedGoods();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await customerOrderApi.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadFinishedGoods = async () => {
    try {
      const response = await finishedGoodApi.getAll();
      setFinishedGoods(response.data);
    } catch (error) {
      console.error('Error loading finished goods:', error);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { finished_good_id: '', quantity_ton: '' }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentOrder(null);
    setFormData({
      order_code: `ORD-${Date.now()}`,
      customer_id: '',
      order_status: 'PENDING',
      remarks: '',
      items: [{ finished_good_id: '', quantity_ton: '' }]
    });
    setModalVisible(true);
  };

  const openEditModal = (order) => {
    setEditMode(true);
    setCurrentOrder(order);
    setFormData({
      order_code: order.order_code,
      customer_id: order.customer_id,
      order_status: order.order_status,
      remarks: order.remarks || '',
      items: order.items.length > 0 ? order.items.map(item => ({
        finished_good_id: item.finished_good_id,
        quantity_ton: item.quantity_ton.toString()
      })) : [{ finished_good_id: '', quantity_ton: '' }]
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.customer_id || !formData.order_code) {
      await showAlert('Validation Error', 'Please select a customer and order code', 'error');
      return;
    }

    const validItems = formData.items.filter(item => item.finished_good_id && item.quantity_ton);
    if (validItems.length === 0) {
      await showAlert('Validation Error', 'Please add at least one item with quantity', 'error');
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        order_code: formData.order_code,
        customer_id: parseInt(formData.customer_id),
        order_status: formData.order_status,
        remarks: formData.remarks,
        items: validItems.map(item => ({
          finished_good_id: parseInt(item.finished_good_id),
          quantity_ton: parseFloat(item.quantity_ton)
        }))
      };

      if (editMode && currentOrder) {
        await customerOrderApi.update(currentOrder.order_id, payload);
        showSuccess('Order updated successfully');
      } else {
        await customerOrderApi.create(payload);
        showSuccess('Order created successfully');
      }

      setModalVisible(false);
      await loadOrders();
    }, 'customer_order');
  };

  const handleDelete = async (order) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete order ${order.order_code}?`
    );

    if (confirmed) {
      try {
        await customerOrderApi.delete(order.order_id);
        showSuccess('Order deleted successfully');
        loadOrders();
      } catch (error) {
        showError('Failed to delete order');
      }
    }
  };

  const columns = [
    { label: 'Order Code', field: 'order_code', width: 150 },
    { 
      label: 'Customer', 
      field: 'customer_id', 
      width: 200,
      render: (id) => customers.find(c => c.customer_id === id)?.customer_name || `ID: ${id}`
    },
    { label: 'Status', field: 'order_status', width: 120 },
    { 
      label: 'Date', 
      field: 'order_date', 
      width: 150,
      render: (v) => formatISTDate(v)
    },
  ];

  return (
    <Layout title="Customer Order Management" navigation={navigation} currentRoute="CustomerOrderMaster">
      <DataTable
        columns={columns}
        data={orders}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Order' : 'New Customer Order'}
        width="80%"
      >
        <ScrollView style={styles.form}>
          <Text style={styles.label}>Order Code *</Text>
          <TextInput
            style={styles.input}
            value={formData.order_code}
            onChangeText={(text) => setFormData({ ...formData, order_code: text })}
          />

          <Text style={styles.label}>Customer *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.customer_id}
              onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
            >
              <Picker.Item label="Select Customer" value="" />
              {customers.map(c => (
                <Picker.Item key={c.customer_id} label={c.customer_name} value={c.customer_id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.sectionHeader}>Order Items</Text>
          {formData.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={[styles.pickerContainer, { flex: 2 }]}>
                <Picker
                  selectedValue={item.finished_good_id}
                  onValueChange={(val) => updateItem(index, 'finished_good_id', val)}
                >
                  <Picker.Item label="Select Product" value="" />
                  {finishedGoods.map(fg => (
                    <Picker.Item key={fg.id} label={fg.product_name} value={fg.id} />
                  ))}
                </Picker>
              </View>
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Qty (Ton)"
                value={item.quantity_ton}
                onChangeText={(val) => updateItem(index, 'quantity_ton', val)}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                <Text style={{ color: colors.error }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addItem} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            multiline
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSubmitting}>
              <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : 'Save Order'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: 20 },
  label: { fontWeight: '600', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, backgroundColor: '#fff' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, backgroundColor: '#fff' },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 25, marginBottom: 10, color: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  removeBtn: { padding: 10, marginLeft: 5 },
  addBtn: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5, alignSelf: 'flex-start', marginTop: 5 },
  addBtnText: { color: colors.primary, fontWeight: '600' },
  textArea: { height: 60, textAlignVertical: 'top' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, gap: 15 },
  cancelBtn: { padding: 15, borderRadius: 5, borderWidth: 1, borderColor: '#ddd' },
  saveBtn: { padding: 15, borderRadius: 5, backgroundColor: colors.primary },
  saveBtnText: { color: '#fff', fontWeight: '700' }
});
