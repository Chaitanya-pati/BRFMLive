import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import InputField from "../components/InputField";
import SelectDropdown from "../components/SelectDropdown";
import DatePicker from "../components/DatePicker";
import Button from "../components/Button";
import colors from "../theme/colors";
import { dispatchApi, customerOrderApi, driverApi } from "../api/client";
import { FaTruck, FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export default function DispatchManagementScreen({ navigation }) {
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState(null);
  const [dispatchType, setDispatchType] = useState("TONS"); // TONS or BAGS
  const [formData, setFormData] = useState({
    order_id: "",
    driver_id: "",
    dispatched_quantity_ton: "0",
    dispatched_bags: "0",
    bag_size_id: "",
    state: "",
    city: "",
    warehouse_loader: "",
    actual_dispatch_date: new Date(),
    delivery_date: new Date(),
    status: "DISPATCHED",
    remarks: "",
  });

  const selectedOrder = orders.find(o => o.order_id.toString() === formData.order_id);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, orderRes, driverRes, bagSizeRes] = await Promise.all([
        dispatchApi.getAll(),
        customerOrderApi.getAll(),
        driverApi.getAll(),
        api.get("/bag-sizes"),
      ]);
      setDispatches(disRes.data);
      setOrders(orderRes.data);
      setDrivers(driverRes.data);
      setBagSizes(bagSizeRes.data);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.order_id || !formData.driver_id) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }

    try {
      const payload = {
        ...formData,
        order_id: parseInt(formData.order_id),
        driver_id: parseInt(formData.driver_id),
        dispatched_quantity_ton: parseFloat(formData.dispatched_quantity_ton || 0),
        dispatched_bags: parseInt(formData.dispatched_bags || 0),
        bag_size_id: formData.bag_size_id ? parseInt(formData.bag_size_id) : null,
        actual_dispatch_date: formData.actual_dispatch_date.toISOString(),
        delivery_date: formData.delivery_date.toISOString(),
      };

      if (editingDispatch) {
        await dispatchApi.update(editingDispatch.dispatch_id, payload);
      } else {
        await dispatchApi.create(payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error("Error saving dispatch:", error);
      Alert.alert("Error", "Failed to save dispatch");
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatchApi.delete(id);
            fetchData();
          } catch (error) {
            console.error("Error deleting dispatch:", error);
          }
        },
      },
    ]);
  };

  const columns = [
    { key: "dispatch_id", label: "ID" },
    { 
      key: "order", 
      label: "Order", 
      render: (item) => item.order?.order_code || "N/A" 
    },
    { 
      key: "driver", 
      label: "Driver", 
      render: (item) => item.driver?.driver_name || "N/A" 
    },
    { 
      key: "quantity", 
      label: "Quantity",
      render: (item) => {
        if (item.dispatched_bags > 0) {
          const bagSizeStr = item.bag_size ? ` (${item.bag_size.weight_kg}kg)` : "";
          return `${item.dispatched_bags} Bags${bagSizeStr}`;
        }
        return `${item.dispatched_quantity_ton} Tons`;
      }
    },
    { key: "status", label: "Status" },
    {
      key: "actions",
      label: "Actions",
      render: (item) => (
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => {
            setEditingDispatch(item);
            setDispatchType(item.dispatched_bags > 0 ? "BAGS" : "TONS");
            setFormData({
              order_id: item.order_id.toString(),
              driver_id: item.driver_id.toString(),
              dispatched_quantity_ton: (item.dispatched_quantity_ton || 0).toString(),
              dispatched_bags: (item.dispatched_bags || 0).toString(),
              bag_size_id: item.bag_size_id ? item.bag_size_id.toString() : "",
              state: item.state || "",
              city: item.city || "",
              warehouse_loader: item.warehouse_loader || "",
              actual_dispatch_date: new Date(item.actual_dispatch_date),
              delivery_date: item.delivery_date ? new Date(item.delivery_date) : new Date(),
              status: item.status,
              remarks: item.remarks || "",
            });
            setModalVisible(true);
          }}>
            <FaEdit color={colors.primary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.dispatch_id)}>
            <FaTrash color={colors.error} size={18} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  return (
    <Layout title="Dispatch Management" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dispatch Records</Text>
          <Button
            title="Add Dispatch"
            onPress={() => {
              setEditingDispatch(null);
              setDispatchType("TONS");
              setFormData({
                order_id: "",
                driver_id: "",
                dispatched_quantity_ton: "0",
                dispatched_bags: "0",
                bag_size_id: "",
                state: "",
                city: "",
                warehouse_loader: "",
                actual_dispatch_date: new Date(),
                delivery_date: new Date(),
                status: "DISPATCHED",
                remarks: "",
              });
              setModalVisible(true);
            }}
            icon={<FaPlus color="#fff" />}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <DataTable data={dispatches} columns={columns} />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingDispatch ? "Edit Dispatch" : "New Dispatch"}
        >
          <ScrollView>
            <SelectDropdown
              label="Select Order *"
              options={orders.map(o => ({ label: o.order_code, value: o.order_id.toString() }))}
              value={formData.order_id}
              onSelect={(val) => {
                const order = orders.find(o => o.order_id.toString() === val);
                const isBags = order?.total_bags > 0;
                setDispatchType(isBags ? "BAGS" : "TONS");
                setFormData({ 
                  ...formData, 
                  order_id: val,
                  state: order?.customer?.state || formData.state,
                  city: order?.customer?.city || formData.city,
                  dispatched_quantity_ton: isBags ? "0" : (order?.total_quantity_ton || 0).toString(),
                  dispatched_bags: isBags ? (order?.total_bags || 0).toString() : "0",
                  bag_size_id: order?.bag_size_id ? order.bag_size_id.toString() : "",
                });
              }}
            />

            {selectedOrder && (
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Ordered:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrder.total_quantity_ton} Tons ({selectedOrder.total_bags} Bags)
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer:</Text>
                  <Text style={styles.summaryValue}>{selectedOrder.customer?.name}</Text>
                </View>
                {selectedOrder.order_date && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Order Date:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <SelectDropdown
              label="Select Driver *"
              options={drivers.map(d => ({ label: d.driver_name, value: d.driver_id.toString() }))}
              value={formData.driver_id}
              onSelect={(val) => setFormData({ ...formData, driver_id: val })}
            />
            
            {dispatchType === "TONS" ? (
              <InputField
                label="Quantity (Tons) *"
                value={formData.dispatched_quantity_ton}
                onChangeText={(val) => setFormData({ ...formData, dispatched_quantity_ton: val, dispatched_bags: "0", bag_size_id: "" })}
                keyboardType="numeric"
              />
            ) : (
              <View>
                <SelectDropdown
                  label="Bag Size"
                  options={bagSizes.map(b => ({ label: `${b.weight_kg} kg`, value: b.id.toString() }))}
                  value={formData.bag_size_id}
                  onSelect={(val) => setFormData({ ...formData, bag_size_id: val })}
                />
                <InputField
                  label="Number of Bags *"
                  value={formData.dispatched_bags}
                  onChangeText={(val) => setFormData({ ...formData, dispatched_bags: val, dispatched_quantity_ton: "0" })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <SelectDropdown
              label="Status"
              options={[
                { label: "Dispatched", value: "DISPATCHED" },
                { label: "Delivered", value: "DELIVERED" },
                { label: "Partially Delivered", value: "PARTIAL" },
                { label: "Cancelled", value: "CANCELLED" },
              ]}
              value={formData.status}
              onSelect={(val) => setFormData({ ...formData, status: val })}
            />
            <InputField
              label="Warehouse Loader"
              value={formData.warehouse_loader}
              onChangeText={(val) => setFormData({ ...formData, warehouse_loader: val })}
            />
            <InputField
              label="State"
              value={formData.state}
              onChangeText={(val) => setFormData({ ...formData, state: val })}
            />
            <InputField
              label="City"
              value={formData.city}
              onChangeText={(val) => setFormData({ ...formData, city: val })}
            />
            <DatePicker
              label="Dispatch Date"
              date={formData.actual_dispatch_date}
              onChange={(date) => setFormData({ ...formData, actual_dispatch_date: date })}
            />
            <DatePicker
              label="Delivery Date"
              date={formData.delivery_date}
              onChange={(date) => setFormData({ ...formData, delivery_date: date })}
            />
            <InputField
              label="Remarks"
              value={formData.remarks}
              onChangeText={(val) => setFormData({ ...formData, remarks: val })}
              multiline
            />
            <Button title="Save Dispatch" onPress={handleSave} style={{ marginTop: 20 }} />
          </ScrollView>
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
  title: { fontSize: 20, fontWeight: "bold" },
  actionButtons: { flexDirection: "row", gap: 15 },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  activeTabText: {
    color: colors.primary,
  },
  orderSummary: {
    backgroundColor: "#e0f2fe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#0c4a6e",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "600",
  },
});
