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
import { dispatchApi, customerOrderApi, driverApi, bagSizeApi, stateCityApi } from "../api/client";
import { FaTruck, FaPlus, FaEdit, FaTrash } from "react-icons/fa";

export default function DispatchManagementScreen({ navigation }) {
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
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
    fetchStates();
  }, []);

  useEffect(() => {
    if (formData.state) {
      fetchCities(formData.state);
    } else {
      setCities([]);
    }
  }, [formData.state]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, orderRes, driverRes, bagSizeRes] = await Promise.all([
        dispatchApi.getAll(),
        customerOrderApi.getAll(),
        driverApi.getAll(),
        bagSizeApi.getAll(),
      ]);
      
      setDispatches(disRes.data || []);
      setOrders(orderRes.data || []);
      setDrivers(driverRes.data || []);
      setBagSizes(bagSizeRes.data || []);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const stateList = await stateCityApi.getStates();
      setStates(stateList || []);
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchCities = async (stateId) => {
    try {
      const cityList = await stateCityApi.getCities(stateId);
      setCities(cityList || []);
    } catch (error) {
      console.error("Error fetching cities:", error);
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
      key: "order_id", 
      label: "Order", 
      render: (item) => item.order?.order_code || `Order #${item.order_id}`
    },
    { 
      key: "driver_id", 
      label: "Driver", 
      render: (item) => item.driver?.driver_name || `Driver #${item.driver_id}`
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
              options={orders.map(o => ({ label: `Order #${o.order_id} - ${o.order_code || 'N/A'}`, value: String(o.order_id || "") }))}
              value={formData.order_id}
              onValueChange={(val) => {
                const order = orders.find(o => String(o.order_id) === val);
                // Check if any item in the order is bag-based
                const hasBags = order?.items?.some(item => item.unit_type === 'Bag' || item.number_of_bags > 0);
                setDispatchType(hasBags ? "BAGS" : "TONS");
                
                // Calculate defaults
                const totalTons = order?.items?.reduce((acc, item) => acc + (parseFloat(item.quantity_ton) || 0), 0) || 0;
                const totalBags = order?.items?.reduce((acc, item) => acc + (parseInt(item.number_of_bags) || 0), 0) || 0;
                
                setFormData({ 
                  ...formData, 
                  order_id: val,
                  state: order?.customer?.state || formData.state,
                  city: order?.customer?.city || formData.city,
                  dispatched_quantity_ton: totalTons.toString(),
                  dispatched_bags: totalBags.toString(),
                  bag_size_id: order?.items?.find(item => item.bag_size_id)?.bag_size_id?.toString() || "",
                });
              }}
            />

            {selectedOrder && (
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order Code:</Text>
                  <Text style={styles.summaryValue}>{selectedOrder.order_code}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer:</Text>
                  <Text style={styles.summaryValue}>{selectedOrder.customer?.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Quantity:</Text>
                  <Text style={styles.summaryValue}>
                    {(selectedOrder.items?.reduce((acc, item) => acc + (parseFloat(item.quantity_ton) || 0), 0) || 0).toFixed(2)} Tons
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Bags:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedOrder.items?.reduce((acc, item) => acc + (parseInt(item.number_of_bags) || 0), 0) || 0} Bags
                  </Text>
                </View>
                {selectedOrder.order_date && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Order Date:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#bae6fd', paddingTop: 8 }}>
                    <Text style={[styles.summaryLabel, { fontWeight: 'bold', marginBottom: 4 }]}>Items:</Text>
                    {selectedOrder.items.map((item, index) => (
                      <View key={index} style={[styles.summaryRow, { marginBottom: 6 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.summaryValue}>
                            • {item.product?.name || item.finished_good?.name || 'Product'} 
                          </Text>
                          {item.unit_type === 'Bag' && item.bag_size_weight && (
                            <Text style={[styles.summaryValue, { fontSize: 10, marginLeft: 10, color: '#0c4a6e' }]}>
                              Weight: {item.bag_size_weight} kg
                            </Text>
                          )}
                        </View>
                        <Text style={styles.summaryValue}>
                          {item.unit_type === 'Bag' || item.number_of_bags > 0 
                            ? `${item.number_of_bags} Bags` 
                            : `${item.quantity_ton} Tons`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <SelectDropdown
              label="Select Driver *"
              options={drivers.map(d => ({ label: String(d.driver_name || "Unknown Driver"), value: String(d.driver_id || "") }))}
              value={formData.driver_id}
              onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
            />
            
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, dispatchType === "TONS" && styles.activeTab]} 
                onPress={() => setDispatchType("TONS")}
              >
                <Text style={[styles.tabText, dispatchType === "TONS" && styles.activeTabText]}>Tons</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, dispatchType === "BAGS" && styles.activeTab]} 
                onPress={() => setDispatchType("BAGS")}
              >
                <Text style={[styles.tabText, dispatchType === "BAGS" && styles.activeTabText]}>Bags</Text>
              </TouchableOpacity>
            </View>

            {dispatchType === "TONS" ? (
              <InputField
                label="Quantity (Tons) *"
                value={formData.dispatched_quantity_ton}
                onChangeText={(val) => setFormData({ ...formData, dispatched_quantity_ton: val })}
                keyboardType="numeric"
              />
            ) : (
              <View>
                <SelectDropdown
                  label="Bag Size"
                  options={bagSizes.map(b => ({ label: `${b.weight_kg} kg`, value: b.id.toString() }))}
                  value={formData.bag_size_id}
                  onValueChange={(val) => setFormData({ ...formData, bag_size_id: val })}
                />
                <InputField
                  label="Number of Bags *"
                  value={formData.dispatched_bags}
                  onChangeText={(val) => setFormData({ ...formData, dispatched_bags: val })}
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
              onValueChange={(val) => setFormData({ ...formData, status: val })}
            />
            <InputField
              label="Warehouse Loader"
              value={formData.warehouse_loader}
              onChangeText={(val) => setFormData({ ...formData, warehouse_loader: val })}
            />
            <SelectDropdown
              label="State"
              options={states.map(s => ({ label: s.state_name, value: s.state_id.toString() }))}
              value={formData.state}
              onValueChange={(val) => setFormData({ ...formData, state: val })}
            />
            <InputField
              label="City"
              value={formData.city}
              onChangeText={(val) => setFormData({ ...formData, city: val })}
            />
            <DatePicker
              label="Dispatch Date"
              value={formData.actual_dispatch_date}
              onChange={(date) => setFormData({ ...formData, actual_dispatch_date: date })}
            />
            <DatePicker
              label="Delivery Date"
              value={formData.delivery_date}
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
