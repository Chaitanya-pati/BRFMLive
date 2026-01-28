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
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState(null);
  const [formData, setFormData] = useState({
    order_id: "",
    driver_id: "",
    dispatched_quantity_ton: "",
    state: "",
    city: "",
    warehouse_loader: "",
    actual_dispatch_date: new Date(),
    delivery_date: new Date(),
    status: "DISPATCHED",
    remarks: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, orderRes, driverRes] = await Promise.all([
        dispatchApi.getAll(),
        customerOrderApi.getAll(),
        driverApi.getAll(),
      ]);
      setDispatches(disRes.data);
      setOrders(orderRes.data);
      setDrivers(driverRes.data);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.order_id || !formData.driver_id || !formData.dispatched_quantity_ton) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }

    try {
      const payload = {
        ...formData,
        order_id: parseInt(formData.order_id),
        driver_id: parseInt(formData.driver_id),
        dispatched_quantity_ton: parseFloat(formData.dispatched_quantity_ton),
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
    { key: "dispatched_quantity_ton", label: "Qty (Tons)" },
    { key: "status", label: "Status" },
    {
      key: "actions",
      label: "Actions",
      render: (item) => (
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => {
            setEditingDispatch(item);
            setFormData({
              order_id: item.order_id.toString(),
              driver_id: item.driver_id.toString(),
              dispatched_quantity_ton: item.dispatched_quantity_ton.toString(),
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
              setFormData({
                order_id: "",
                driver_id: "",
                dispatched_quantity_ton: "",
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
              onSelect={(val) => setFormData({ ...formData, order_id: val })}
            />
            <SelectDropdown
              label="Select Driver *"
              options={drivers.map(d => ({ label: d.driver_name, value: d.driver_id.toString() }))}
              value={formData.driver_id}
              onSelect={(val) => setFormData({ ...formData, driver_id: val })}
            />
            <InputField
              label="Quantity (Tons) *"
              value={formData.dispatched_quantity_ton}
              onChangeText={(val) => setFormData({ ...formData, dispatched_quantity_ton: val })}
              keyboardType="numeric"
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
});
