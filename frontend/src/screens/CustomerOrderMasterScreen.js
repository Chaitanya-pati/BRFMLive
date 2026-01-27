import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { customerOrderApi, customerApi, finishedGoodApi, bagSizeApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

export default function CustomerOrderMasterScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  const [formData, setFormData] = useState({
    order_code: '',
    customer_id: '',
    order_status: 'PENDING',
    remarks: '',
    items: [{ finished_good_id: '', quantity_type: 'bag', quantity_ton: '', bag_size_kg: '50', number_of_bags: '', price_per_ton: '', price_per_bag: '' }]
  });

  const { isSubmitting, handleFormSubmission } = useFormSubmission();

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadFinishedGoods();
    loadBagSizes();
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

  const loadBagSizes = async () => {
    try {
      const response = await bagSizeApi.getAll();
      setBagSizes(response.data);
    } catch (error) {
      console.error('Error loading bag sizes:', error);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { finished_good_id: '', quantity_type: 'bag', quantity_ton: '', bag_size_kg: '50', number_of_bags: '', price_per_ton: '', price_per_bag: '' }]
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
      items: [{ finished_good_id: '', quantity_type: 'bag', quantity_ton: '', bag_size_kg: '50', number_of_bags: '', price_per_ton: '', price_per_bag: '' }]
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
        quantity_type: item.quantity_type || 'bag',
        quantity_ton: (item.quantity_ton || '').toString(),
        bag_size_kg: item.bag_size ? item.bag_size.weight_kg.toString() : '50',
        number_of_bags: (item.number_of_bags || '').toString(),
        price_per_ton: (item.price_per_ton || '').toString(),
        price_per_bag: (item.price_per_bag || '').toString()
      })) : [{ finished_good_id: '', quantity_type: 'bag', quantity_ton: '', bag_size_kg: '50', number_of_bags: '', price_per_ton: '', price_per_bag: '' }]
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.customer_id || !formData.order_code) {
      await showAlert('Validation Error', 'Please select a customer and order code', 'error');
      return;
    }

    const validItems = formData.items.filter(item => {
      if (!item.finished_good_id) return false;
      if (item.quantity_type === 'ton') return item.quantity_ton;
      if (item.quantity_type === 'bag') return item.number_of_bags && item.bag_size_kg;
      return false;
    });

    if (validItems.length === 0) {
      await showAlert('Validation Error', 'Please add at least one item with valid quantity', 'error');
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
          quantity_type: item.quantity_type,
          quantity_ton: item.quantity_type === 'ton' ? parseFloat(item.quantity_ton) : 0,
          price_per_ton: item.quantity_type === 'ton' ? parseFloat(item.price_per_ton || 0) : 0,
          bag_size_weight: item.quantity_type === 'bag' ? parseInt(item.bag_size_kg) : null,
          number_of_bags: item.quantity_type === 'bag' ? parseInt(item.number_of_bags) : 0,
          price_per_bag: item.quantity_type === 'bag' ? parseFloat(item.price_per_bag || 0) : 0
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
    { label: 'Order Code', field: 'order_code', width: isMobile ? 120 : 150 },
    { 
      label: 'Customer', 
      field: 'customer_id', 
      width: isMobile ? 150 : 200,
      render: (id) => customers.find(c => c.customer_id === id)?.customer_name || `ID: ${id}`
    },
    { label: 'Status', field: 'order_status', width: 100 },
    { 
      label: 'Date', 
      field: 'order_date', 
      width: 120,
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
        width={isMobile ? "95%" : "80%"}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={isMobile ? styles.mobileGrid : styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Order Code *</Text>
              <TextInput
                style={styles.input}
                value={formData.order_code}
                onChangeText={(text) => setFormData({ ...formData, order_code: text })}
              />
            </View>

            <View style={styles.gridItem}>
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
            </View>
          </View>

          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Order Items</Text>
            <TouchableOpacity onPress={addItem} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {formData.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemIndex}>Item #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                  <Text style={{ color: colors.error }}>Remove ✕</Text>
                </TouchableOpacity>
              </View>

              <View style={isMobile ? styles.mobileGrid : styles.grid}>
                <View style={[styles.gridItem, { flex: 2 }]}>
                  <Text style={styles.subLabel}>Product</Text>
                  <View style={styles.pickerContainer}>
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
                </View>

                <View style={[styles.gridItem, { flex: 1 }]}>
                  <Text style={styles.subLabel}>Unit Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={item.quantity_type}
                      onValueChange={(val) => updateItem(index, 'quantity_type', val)}
                    >
                      <Picker.Item label="Bag" value="bag" />
                      <Picker.Item label="Ton" value="ton" />
                    </Picker>
                  </View>
                </View>
              </View>

              {item.quantity_type === 'ton' ? (
                <View style={isMobile ? styles.mobileGrid : styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Quantity (Ton)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={item.quantity_ton}
                      onChangeText={(val) => updateItem(index, 'quantity_ton', val)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Price / Ton</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={item.price_per_ton}
                      onChangeText={(val) => updateItem(index, 'price_per_ton', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ) : (
                <View style={isMobile ? styles.mobileGrid : styles.grid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Bag Size</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={item.bag_size_kg}
                        onValueChange={(val) => updateItem(index, 'bag_size_kg', val)}
                      >
                        <Picker.Item label="Select Size" value="" />
                        {bagSizes.map(bs => (
                          <Picker.Item key={bs.id} label={`${bs.weight_kg} kg`} value={bs.weight_kg.toString()} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Number of Bags</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={item.number_of_bags}
                      onChangeText={(val) => updateItem(index, 'number_of_bags', val)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.subLabel}>Price / Bag</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={item.price_per_bag}
                      onChangeText={(val) => updateItem(index, 'price_per_bag', val)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            multiline
            placeholder="Additional notes..."
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSubmitting}>
              <Text style={styles.saveBtnText}>{isSubmitting ? 'Saving...' : (editMode ? 'Update Order' : 'Create Order')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: { 
    paddingBottom: 20,
    maxHeight: Platform.OS === 'web' ? '80vh' : 'auto',
  },
  grid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  mobileGrid: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 10,
  },
  gridItem: {
    flex: 1,
  },
  label: { 
    fontWeight: '600', 
    marginTop: 15, 
    marginBottom: 8,
    color: '#374151',
    fontSize: 14,
  },
  subLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 6, 
    padding: 10, 
    backgroundColor: '#fff',
    fontSize: 14,
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 6, 
    backgroundColor: '#fff',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.primary 
  },
  itemCard: { 
    marginBottom: 20, 
    padding: 15, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      default: { elevation: 2 }
    })
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemIndex: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: 14,
  },
  removeBtn: { 
    padding: 5,
  },
  addBtn: { 
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f3f4f6', 
    borderRadius: 6, 
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  addBtnText: { 
    color: colors.primary, 
    fontWeight: '600',
    fontSize: 13,
  },
  textArea: { 
    height: 80, 
    textAlignVertical: 'top' 
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 30, 
    gap: 12,
    marginBottom: 20,
  },
  cancelBtn: { 
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveBtn: { 
    paddingVertical: 12,
    paddingHorizontal: 25, 
    borderRadius: 6, 
    backgroundColor: colors.primary,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnText: { 
    color: '#fff', 
    fontWeight: '700' 
  }
});
