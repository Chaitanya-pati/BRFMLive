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
import SelectDropdown from '../components/SelectDropdown';
import InputField from '../components/InputField';
import DynamicTable, { createSelectCell, createNumberCell } from '../components/DynamicTable';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { customerOrderApi, customerApi, finishedGoodApi, bagSizeApi } from '../api/client';
import colors from '../theme/colors';
import { showAlert, showConfirm, showSuccess, showError } from '../utils/customAlerts';
import { useFormSubmission } from '../utils/useFormSubmission';
import { formatISTDate } from '../utils/dateUtils';

const EMPTY_ITEM = {
  finished_good_id: '',
  quantity_type: 'bag',
  quantity_ton: '',
  bag_size_kg: '50',
  number_of_bags: '',
  price_per_bag: '',
  price_per_ton: '',
};

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
    items: [{ ...EMPTY_ITEM }],
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
    setFormData({ ...formData, items: [...formData.items, { ...EMPTY_ITEM }] });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
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
      items: [{ ...EMPTY_ITEM }],
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
      items: order.items.length > 0
        ? order.items.map(item => ({
            finished_good_id: item.finished_good_id,
            quantity_type: item.quantity_type || 'bag',
            quantity_ton: (item.quantity_ton || '').toString(),
            bag_size_kg: item.bag_size ? item.bag_size.weight_kg.toString() : '50',
            number_of_bags: (item.number_of_bags || '').toString(),
            price_per_bag: (item.price_per_bag || '').toString(),
            price_per_ton: (item.price_per_ton || '').toString(),
          }))
        : [{ ...EMPTY_ITEM }],
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
          price_per_bag: item.quantity_type === 'bag' ? parseFloat(item.price_per_bag || 0) : 0,
        })),
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

  const tableColumns = [
    {
      key: 'finished_good_id',
      label: 'Product',
      flex: 2,
      minWidth: 160,
      render: createSelectCell({
        options: finishedGoods.map(fg => ({ label: fg.product_name, value: fg.id })),
        placeholder: 'Select Product',
      }),
    },
    {
      key: 'quantity_type',
      label: 'Unit',
      flex: 1,
      minWidth: 90,
      render: createSelectCell({
        options: [
          { label: 'Bag', value: 'bag' },
          { label: 'Ton', value: 'ton' },
        ],
        placeholder: 'Unit',
      }),
    },
    {
      key: 'bag_size_kg',
      label: 'Bag Size',
      flex: 1,
      minWidth: 100,
      render: createSelectCell({
        options: bagSizes.map(bs => ({ label: `${bs.weight_kg} kg`, value: bs.weight_kg.toString() })),
        placeholder: 'Size',
        disabled: (row) => row.quantity_type !== 'bag',
      }),
    },
    {
      key: 'number_of_bags',
      label: '# Bags',
      flex: 1,
      minWidth: 80,
      render: createNumberCell({
        placeholder: '0',
        disabled: (row) => row.quantity_type !== 'bag',
      }),
    },
    {
      key: 'quantity_ton',
      label: 'Qty (T)',
      flex: 1,
      minWidth: 80,
      render: createNumberCell({
        placeholder: '0.00',
        disabled: (row) => row.quantity_type !== 'ton',
      }),
    },
    {
      key: 'price_per_bag',
      label: 'Price/Bag',
      flex: 1,
      minWidth: 85,
      render: createNumberCell({
        placeholder: '0.00',
        disabled: (row) => row.quantity_type !== 'bag',
      }),
    },
    {
      key: 'price_per_ton',
      label: 'Price/Ton',
      flex: 1,
      minWidth: 85,
      render: createNumberCell({
        placeholder: '0.00',
        disabled: (row) => row.quantity_type !== 'ton',
      }),
    },
  ];

  const columns = [
    { label: 'Order Code', field: 'order_code', width: isMobile ? 120 : 150, key: 'order_code' },
    {
      label: 'Customer',
      field: 'customer_id',
      width: isMobile ? 150 : 200,
      key: 'customer_id',
      render: (id, row) => {
        const customer = customers.find(c => c.customer_id === id);
        return customer ? customer.customer_name : (row.customer?.customer_name || `ID: ${id}`);
      },
    },
    { label: 'Status', field: 'order_status', width: 100, key: 'order_status' },
    {
      label: 'Date',
      field: 'order_date',
      width: 120,
      key: 'order_date',
      render: (v, row) => formatISTDate(v || row.created_at),
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
        width={isMobile ? '98%' : '90%'}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={isMobile ? styles.mobileGrid : styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Order Code *</Text>
              <InputField
                value={formData.order_code}
                onChangeText={(text) => setFormData({ ...formData, order_code: text })}
                placeholder="e.g. ORD-001"
              />
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.label}>Customer *</Text>
              <SelectDropdown
                placeholder="Select Customer"
                value={formData.customer_id}
                onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                options={customers.map(c => ({ label: c.customer_name, value: c.customer_id }))}
              />
            </View>
          </View>

          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>Order Items</Text>
          </View>

          <DynamicTable
            columns={tableColumns}
            rows={formData.items}
            onAddRow={addItem}
            onRemoveRow={removeItem}
            onCellChange={updateItem}
            addLabel="+ Add Item"
            minRows={1}
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Remarks</Text>
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
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editMode ? 'Update Order' : 'Create Order'}</Text>
              )}
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  sectionHeaderContainer: {
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
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
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
