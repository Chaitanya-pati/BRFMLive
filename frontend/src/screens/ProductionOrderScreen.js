import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { productionOrderApi, rawProductApi } from "../api/client";
import colors from "../theme/colors";
import {
  showAlert,
  showConfirm,
  showSuccess,
  showError,
} from "../utils/customAlerts";
import { useFormSubmission } from "../utils/useFormSubmission";
import { useBranch } from "../context/BranchContext";

const ORDER_STATUSES = [
  { value: "CREATED", label: "Created" },
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const todayStr = () => new Date().toISOString().split("T")[0];

const getJulianDay = (dateStr) => {
  const date = new Date(dateStr + "T00:00:00");
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return String(day).padStart(3, "0");
};

export default function ProductionOrderScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const [orders, setOrders] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    order_number: "",
    raw_product_id: "",
    quantity: "",
    order_date: todayStr(),
    status: "CREATED",
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
      console.error("Error loading data:", error);
      showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = (productId, orderDateStr, existingOrders, excludeId = null) => {
    const product = rawProducts.find((p) => p.id.toString() === productId);
    if (!product) return "";

    const initial = product.product_initial || "PO";
    const julianStr = getJulianDay(orderDateStr);
    const baseNumber = `${initial}-${julianStr}`;

    const sameProductSameDay = existingOrders.filter((o) => {
      if (excludeId && o.id === excludeId) return false;
      const existingDate = o.order_date ? o.order_date.split("T")[0] : "";
      return (
        o.raw_product_id.toString() === productId &&
        existingDate === orderDateStr
      );
    });

    if (sameProductSameDay.length === 0) {
      return baseNumber;
    }

    const suffixes = "abcdefghijklmnopqrstuvwxyz".split("");
    for (const suffix of suffixes) {
      const candidate = `${baseNumber}-${suffix}`;
      const taken = existingOrders.some(
        (o) => o.order_number === candidate && o.id !== excludeId
      );
      if (!taken) return candidate;
    }
    return `${baseNumber}-${Date.now()}`;
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentOrder(null);
    setFormData({
      order_number: "",
      raw_product_id: "",
      quantity: "",
      order_date: todayStr(),
      status: "CREATED",
    });
    setModalVisible(true);
  };

  useEffect(() => {
    if (modalVisible && !editMode && formData.raw_product_id && formData.order_date && rawProducts.length > 0) {
      const newNum = generateOrderNumber(formData.raw_product_id, formData.order_date, orders, null);
      setFormData((prev) => ({ ...prev, order_number: newNum }));
    }
  }, [formData.raw_product_id, formData.order_date, modalVisible, editMode, orders, rawProducts]);

  const openEditModal = (order) => {
    setEditMode(true);
    setCurrentOrder(order);
    setFormData({
      order_number: order.order_number,
      raw_product_id: order.raw_product_id?.toString() || "",
      quantity: order.quantity?.toString() || "",
      order_date: order.order_date ? order.order_date.split("T")[0] : todayStr(),
      status: order.status || "CREATED",
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const trimmedOrderNumber = formData.order_number?.trim();
    const quantity = parseFloat(formData.quantity);

    if (!trimmedOrderNumber || !formData.raw_product_id || !quantity) {
      await showAlert("Validation Error", "Please fill in all required fields", "error");
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      await showAlert("Validation Error", "Quantity must be a positive number", "error");
      return;
    }

    await handleFormSubmission(async () => {
      const payload = {
        order_number: trimmedOrderNumber,
        raw_product_id: parseInt(formData.raw_product_id),
        quantity: quantity,
        order_date: formData.order_date
          ? new Date(formData.order_date).toISOString()
          : new Date().toISOString(),
        status: formData.status,
        branch_id: activeBranch?.id,
      };

      if (editMode && currentOrder) {
        await productionOrderApi.update(currentOrder.id, {
          order_number: payload.order_number,
          quantity: payload.quantity,
          status: payload.status,
        });
        await showSuccess("Production order updated successfully");
      } else {
        await productionOrderApi.create(payload);
        await showSuccess("Production order created successfully");
      }

      setModalVisible(false);
      loadData();
    });
  };

  const handleDelete = async (order) => {
    const confirmed = await showConfirm(
      "Delete Production Order",
      `Are you sure you want to delete order "${order.order_number}"?`,
    );

    if (confirmed) {
      try {
        await productionOrderApi.delete(order.id);
        await showSuccess("Production order deleted successfully");
        loadData();
      } catch (error) {
        console.error("Error deleting production order:", error);
        showError("Failed to delete production order");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CREATED": return colors.info;
      case "PLANNED": return colors.primary;
      case "IN_PROGRESS": return colors.warning;
      case "COMPLETED": return colors.success;
      case "CANCELLED": return colors.danger;
      default: return colors.textLight;
    }
  };

  const columns = [
    { key: "order_number", label: "Order #", flex: 1.5 },
    {
      key: "raw_product",
      label: "Product",
      flex: 1,
      render: (val) => val?.product_name || "N/A",
    },
    {
      key: "quantity",
      label: "Quantity (kg)",
      flex: 1,
      align: "center",
      render: (val) => `${val} kg`,
    },
    {
      key: "order_date",
      label: "Order Date",
      flex: 1,
      align: "center",
      type: "date",
    },
    {
      key: "status",
      label: "Status",
      flex: 1,
      align: "center",
      render: (val) => (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(val) }]}>
          <Text style={styles.statusText}>{val}</Text>
        </View>
      ),
    },
  ];

  const handlePlan = (order) => {
    navigation.navigate("ProductionOrderPlanning", { orderId: order.id });
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, order_date: dateString }));
    }
  };

  const handleWebDateChange = (value) => {
    setFormData((prev) => ({ ...prev, order_date: value }));
  };

  const getPickerDate = () => {
    return formData.order_date ? new Date(formData.order_date + "T00:00:00") : new Date();
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
          title={editMode ? "Edit Production Order" : "Create Production Order"}
        >
          <View style={styles.form}>

            {/* 1. Order Date */}
            <Text style={styles.label}>Order Date *</Text>
            {Platform.OS === "web" ? (
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => handleWebDateChange(e.target.value)}
                disabled={editMode}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #ced4da",
                  fontSize: "14px",
                  backgroundColor: editMode ? "#f5f5f5" : "#fff",
                  marginBottom: "16px",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <TouchableOpacity
                style={[styles.input, editMode && { backgroundColor: colors.lightGray }]}
                onPress={() => !editMode && setShowDatePicker(true)}
              >
                <Text style={{ color: formData.order_date ? colors.textPrimary : colors.textSecondary }}>
                  {formData.order_date || "Select order date"}
                </Text>
              </TouchableOpacity>
            )}

            {Platform.OS !== "web" && showDatePicker && (
              <DateTimePicker
                value={getPickerDate()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
            )}

            {/* 2. Raw Product */}
            <Text style={styles.label}>Raw Product *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.raw_product_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, raw_product_id: value }))
                }
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

            {/* 3. Order Number (auto-generated) */}
            <Text style={styles.label}>Order Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.lightGray }]}
              value={formData.order_number}
              placeholder="Select date & product to generate"
              editable={false}
            />

            {/* 4. Quantity */}
            <Text style={styles.label}>Quantity (kg) *</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, quantity: text }))
              }
              placeholder="e.g., 5000"
              keyboardType="numeric"
            />

            {editMode && (
              <>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                    style={styles.picker}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <Picker.Item
                        key={status.value}
                        label={status.label}
                        value={status.value}
                      />
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
                  {editMode ? "Update Order" : "Create Order"}
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
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: colors.text },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  planButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.textPrimary, fontSize: 12, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  form: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
    justifyContent: "center",
    minHeight: 48,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: { height: 50 },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
