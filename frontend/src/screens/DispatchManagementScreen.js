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
  const [formData, setFormData] = useState({
    order_id: "",
    driver_id: "",
    state: "",
    city: "",
    warehouse_loader: "",
    actual_dispatch_date: new Date(),
    delivery_date: new Date(),
    status: "DISPATCHED",
    remarks: "",
  });
  const [dispatchItems, setDispatchItems] = useState([]);

  const selectedOrder = orders.find(o => o.order_id.toString() === formData.order_id);

  useEffect(() => {
    if (selectedOrder && !editingDispatch) {
      const items = (selectedOrder.items || []).map(item => {
        const weightKg = item.bag_size?.weight_kg || item.bag_size_weight || 0;
        
        let orderedTons = 0;
        if (item.quantity_ton && item.quantity_ton > 0) {
          orderedTons = item.quantity_ton;
        } else if (item.number_of_bags && weightKg) {
          orderedTons = (item.number_of_bags * weightKg) / 1000;
        }

        const orderedBags = item.number_of_bags || 0;
        const dispatchedTons = item.dispatched_qty || 0;
        const dispatchedBags = item.dispatched_bags_total || 0;

        const remainingTons = Math.max(0, orderedTons - dispatchedTons);
        const remainingBags = Math.max(0, orderedBags - dispatchedBags);

        const productName =
          item.finished_good?.product_name ||
          item.finished_good?.name ||
          item.product?.product_name ||
          item.product?.name ||
          item.product_name ||
          "Unknown Product";

        return {
          order_item_id: item.order_item_id,
          finished_good_id: item.finished_good_id,
          product_name: productName,
          unit_type: item.unit_type || (item.number_of_bags > 0 ? 'Bag' : 'Ton'),
          ordered_qty: orderedTons,
          ordered_bags: orderedBags,
          dispatched_so_far: dispatchedTons,
          dispatched_bags_so_far: dispatchedBags,
          remaining_qty: remainingTons,
          remaining_bags: remainingBags,
          dispatched_qty_ton: "0",
          bag_size_id: item.bag_size_id ? item.bag_size_id.toString() : "",
          dispatched_bags: "0",
          weight_kg: weightKg
        };
      });
      setDispatchItems(items);
    }
  }, [selectedOrder, editingDispatch]);

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

    const itemsToDispatch = dispatchItems.filter(item => parseFloat(item.dispatched_qty_ton) > 0 || parseInt(item.dispatched_bags) > 0);
    
    if (itemsToDispatch.length === 0) {
      Alert.alert("Error", "At least ONE item must have quantity > 0");
      return;
    }

    // Validation
    for (const item of itemsToDispatch) {
      const qty = parseFloat(item.dispatched_qty_ton || 0);
      const bags = parseInt(item.dispatched_bags || 0);

      if (qty > item.remaining_qty + 0.0001) {
        Alert.alert("Error", `Quantity for ${item.product_name} exceeds remaining amount (${item.remaining_qty.toFixed(2)}t)`);
        return;
      }
      
      const isBagType = item.unit_type === "Bag" || item.ordered_bags > 0;
      if (isBagType && bags > item.remaining_bags) {
        Alert.alert("Error", `Bag count for ${item.product_name} exceeds remaining bags (${item.remaining_bags})`);
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        order_id: parseInt(formData.order_id),
        driver_id: parseInt(formData.driver_id),
        actual_dispatch_date: formData.actual_dispatch_date.toISOString(),
        delivery_date: formData.delivery_date ? formData.delivery_date.toISOString() : null,
        dispatch_items: itemsToDispatch.map(item => ({
          order_item_id: item.order_item_id,
          finished_good_id: item.finished_good_id,
          dispatched_qty_ton: parseFloat(item.dispatched_qty_ton || 0),
          bag_size_id: item.bag_size_id ? parseInt(item.bag_size_id) : null,
          dispatched_bags: parseInt(item.dispatched_bags || 0)
        }))
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
        if (item.items && item.items.length > 0) {
          const totalTons = item.items.reduce((acc, i) => acc + (i.dispatched_qty_ton || 0), 0);
          return `${item.items.length} items | ${totalTons.toFixed(2)} Tons`;
        }
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
            setFormData({
              order_id: item.order_id.toString(),
              driver_id: item.driver_id.toString(),
              state: item.state || "",
              city: item.city || "",
              warehouse_loader: item.warehouse_loader || "",
              actual_dispatch_date: new Date(item.actual_dispatch_date),
              delivery_date: item.delivery_date ? new Date(item.delivery_date) : new Date(),
              status: item.status,
              remarks: item.remarks || "",
            });
            // Map existing items if any
            if (item.items && item.items.length > 0) {
              setDispatchItems(item.items.map(di => {
                const weightKg = di.bag_size?.weight_kg || di.order_item?.bag_size_weight || 0;
                const orderedQty = di.order_item?.quantity_ton > 0 
                  ? di.order_item.quantity_ton 
                  : ((di.order_item?.number_of_bags || 0) * weightKg) / 1000;

                return {
                  order_item_id: di.order_item_id,
                  finished_good_id: di.finished_good_id,
                  product_name: di.product_name || di.finished_good?.product_name || di.order_item?.product_name || di.order_item?.product?.product_name || di.order_item?.product?.name || di.order_item?.finished_good?.name || "Unknown Product",
                  unit_type: di.order_item?.unit_type || (di.dispatched_bags > 0 ? 'Bag' : 'Ton'),
                  ordered_qty: orderedQty,
                  dispatched_so_far: 0, 
                  remaining_qty: orderedQty,
                  ordered_bags: di.order_item?.number_of_bags || 0,
                  remaining_bags: di.order_item?.number_of_bags || 0,
                  dispatched_qty_ton: di.dispatched_qty_ton.toString(),
                  bag_size_id: di.bag_size_id ? di.bag_size_id.toString() : "",
                  dispatched_bags: di.dispatched_bags ? di.dispatched_bags.toString() : "0",
                  weight_kg: weightKg
                };
              }));
            }
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
              setDispatchItems([]);
              setFormData({
                order_id: "",
                driver_id: "",
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
          <DataTable 
            data={dispatches} 
            columns={columns}
            onEdit={(item) => {
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
            }}
            onDelete={(item) => handleDelete(item.dispatch_id)}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={editingDispatch ? "Edit Dispatch" : "New Dispatch"}
        >
          <ScrollView>
            <SelectDropdown
              label="Select Order *"
              options={orders.map(o => {
                const customerName = o.customer?.customer_name || o.customer_name || 'Unknown';
                const city = o.customer?.city || o.city || '';
                const location = city ? `, ${city}` : '';
                return { 
                  label: `Order #${o.order_id} - ${o.order_code || 'N/A'} (${customerName}${location})`, 
                  value: String(o.order_id || "") 
                };
              })}
              value={formData.order_id}
              onValueChange={(val) => {
                const order = orders.find(o => String(o.order_id) === val);
                setFormData({ 
                  ...formData, 
                  order_id: val,
                  state: order?.customer?.state || formData.state,
                  city: order?.customer?.city || formData.city,
                });
              }}
            />

            {selectedOrder && dispatchItems.length > 0 && (
              <View style={styles.itemsContainer}>
                <Text style={styles.sectionTitle}>Item-wise Dispatch</Text>
                {dispatchItems.map((item, index) => {
                  const isBagType = item.unit_type === "Bag" || item.ordered_bags > 0;
                  return (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemDetail}>
                        Ordered: {item.ordered_qty.toFixed(2)}t {isBagType ? `(${item.ordered_bags} Bags)` : ''} | 
                        Remaining: {item.remaining_qty.toFixed(2)}t {isBagType ? `(${item.remaining_bags} Bags)` : ''}
                      </Text>
                      <View style={styles.itemInputs}>
                        {isBagType ? (
                          <>
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <InputField
                                label="Bag Size"
                                value={`${item.weight_kg} kg`}
                                editable={false}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <InputField
                                label="Bags To Dispatch"
                                value={item.dispatched_bags}
                                onChangeText={(val) => {
                                  const newItems = [...dispatchItems];
                                  newItems[index].dispatched_bags = val;
                                  if (item.weight_kg) {
                                    newItems[index].dispatched_qty_ton = ((parseInt(val || 0) * item.weight_kg) / 1000).toString();
                                  }
                                  setDispatchItems(newItems);
                                }}
                                keyboardType="numeric"
                              />
                            </View>
                          </>
                        ) : (
                          <View style={{ flex: 1 }}>
                            <InputField
                              label="Qty (Tons) To Dispatch"
                              value={item.dispatched_qty_ton}
                              onChangeText={(val) => {
                                const newItems = [...dispatchItems];
                                newItems[index].dispatched_qty_ton = val;
                                setDispatchItems(newItems);
                              }}
                              keyboardType="numeric"
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <SelectDropdown
              label="Select Driver *"
              options={drivers.map(d => ({ label: String(d.driver_name || "Unknown Driver"), value: String(d.driver_id || "") }))}
              value={formData.driver_id}
              onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
            />

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
  itemsContainer: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 12,
  },
  itemRow: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  itemDetail: {
    fontSize: 11,
    color: "#64748b",
    marginVertical: 4,
  },
  itemInputs: {
    flexDirection: "row",
    marginTop: 5,
  },
});
