import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { showError, showSuccess, showConfirm } from "../utils/customAlerts";
import { FaPlus, FaTrash, FaTruck, FaTimes } from "react-icons/fa";

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
    driver_id: "",
    state: "",
    city: "",
    warehouse_loader: "",
    actual_dispatch_date: new Date(),
    delivery_date: new Date(),
    remarks: "",
  });

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([]);
  const [orderPickerValue, setOrderPickerValue] = useState("");

  const selectedOrders = selectedOrderIds
    .map(id => orders.find(o => o.order_id.toString() === id))
    .filter(Boolean);

  const availableOrderOptions = orders
    .filter(o => !selectedOrderIds.includes(o.order_id.toString()))
    .map(o => {
      const customerName = o.customer?.customer_name || o.customer_name || "Unknown";
      const city = o.customer?.city || o.city || "";
      const location = city ? `, ${city}` : "";
      return {
        label: `${o.order_code || "N/A"} - ${customerName}${location}`,
        value: o.order_id.toString(),
      };
    });

  const buildItemsForOrder = (order) => {
    return (order.items || []).map(item => {
      const masterBagSize = bagSizes.find(bs => Number(bs.id) === Number(item.bag_size_id));
      const weightKg = masterBagSize?.weight_kg || item.bag_size_weight || 0;

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
        order_id: order.order_id,
        order_item_id: item.order_item_id,
        finished_good_id: item.finished_good_id,
        product_name: productName,
        unit_type: item.unit_type || (item.number_of_bags > 0 ? "Bag" : "Ton"),
        ordered_qty: orderedTons,
        ordered_bags: orderedBags,
        dispatched_so_far: dispatchedTons,
        dispatched_bags_so_far: dispatchedBags,
        remaining_qty: remainingTons,
        remaining_bags: remainingBags,
        dispatched_qty_ton: "0",
        bag_size_id: item.bag_size_id ? item.bag_size_id.toString() : "",
        dispatched_bags: "0",
        weight_kg: weightKg,
      };
    });
  };

  const handleAddOrder = (orderId) => {
    if (!orderId || selectedOrderIds.includes(orderId)) return;
    const order = orders.find(o => o.order_id.toString() === orderId);
    if (!order) return;

    setSelectedOrderIds(prev => [...prev, orderId]);
    const newItems = buildItemsForOrder(order);
    setDispatchItems(prev => [...prev, ...newItems]);

    // Auto-fill state/city from the first order added
    if (selectedOrderIds.length === 0) {
      const customerStateName = order.customer?.state;
      const matchedState = states.find(s => s.state_name === customerStateName);
      setFormData(prev => ({
        ...prev,
        state: matchedState ? matchedState.state_id.toString() : prev.state,
        city: order.customer?.city || prev.city,
      }));
    }
    setOrderPickerValue("");
  };

  const handleRemoveOrder = (orderId) => {
    const order = orders.find(o => o.order_id.toString() === orderId);
    if (!order) return;
    const orderItemIds = (order.items || []).map(item => item.order_item_id);
    setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    setDispatchItems(prev => prev.filter(item => !orderItemIds.includes(item.order_item_id)));
  };

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
      showError("Failed to fetch data");
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
    if (selectedOrderIds.length === 0) {
      showError("Please add at least one order");
      return;
    }
    if (!formData.driver_id) {
      showError("Please select a driver");
      return;
    }

    const itemsToDispatch = dispatchItems.filter(
      item => parseFloat(item.dispatched_qty_ton) > 0 || parseInt(item.dispatched_bags) > 0
    );

    if (itemsToDispatch.length === 0) {
      showError("At least one item must have quantity > 0");
      return;
    }

    for (const item of itemsToDispatch) {
      const qty = parseFloat(item.dispatched_qty_ton || 0);
      const bags = parseInt(item.dispatched_bags || 0);

      if (qty > item.remaining_qty + 0.0001) {
        showError(
          `Quantity for ${item.product_name} exceeds remaining amount (${item.remaining_qty.toFixed(2)}t)`
        );
        return;
      }

      const isBagType = item.unit_type === "Bag" || item.ordered_bags > 0;
      if (isBagType && bags > item.remaining_bags) {
        showError(
          `Bag count for ${item.product_name} exceeds remaining bags (${item.remaining_bags})`
        );
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        order_id: null,
        driver_id: parseInt(formData.driver_id),
        actual_dispatch_date: formData.actual_dispatch_date.toISOString(),
        delivery_date: formData.delivery_date ? formData.delivery_date.toISOString() : null,
        dispatch_items: itemsToDispatch.map(item => ({
          order_item_id: item.order_item_id,
          finished_good_id: item.finished_good_id,
          dispatched_qty_ton: parseFloat(item.dispatched_qty_ton || 0),
          bag_size_id: item.bag_size_id ? parseInt(item.bag_size_id) : null,
          dispatched_bags: parseInt(item.dispatched_bags || 0),
        })),
      };

      if (editingDispatch) {
        await dispatchApi.update(editingDispatch.dispatch_id, payload);
      } else {
        await dispatchApi.create(payload);
      }
      setModalVisible(false);
      showSuccess(editingDispatch ? "Dispatch updated successfully" : "Dispatch created successfully");
      fetchData();
    } catch (error) {
      console.error("Error saving dispatch:", error);
      showError("Failed to save dispatch");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm("Delete Dispatch", "Are you sure you want to delete this dispatch?");
    if (!confirmed) return;
    try {
      await dispatchApi.delete(id);
      showSuccess("Dispatch deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting dispatch:", error);
      showError("Failed to delete dispatch");
    }
  };

  const resetForm = () => {
    setEditingDispatch(null);
    setSelectedOrderIds([]);
    setDispatchItems([]);
    setOrderPickerValue("");
    setFormData({
      driver_id: "",
      state: "",
      city: "",
      warehouse_loader: "",
      actual_dispatch_date: new Date(),
      delivery_date: new Date(),
      remarks: "",
    });
  };

  const handleEditDispatch = (row) => {
    setEditingDispatch(row);

    // Derive selected order IDs from items
    const derivedOrderIds = [
      ...new Set(
        (row.items || [])
          .map(di => di.order_item?.order_id)
          .filter(Boolean)
          .map(String)
      ),
    ];
    // Include direct order_id if set (legacy)
    if (row.order_id && !derivedOrderIds.includes(row.order_id.toString())) {
      derivedOrderIds.push(row.order_id.toString());
    }
    setSelectedOrderIds(derivedOrderIds);

    setFormData({
      driver_id: row.driver_id.toString(),
      state: row.state || "",
      city: row.city || "",
      warehouse_loader: row.warehouse_loader || "",
      actual_dispatch_date: new Date(row.actual_dispatch_date),
      delivery_date: row.delivery_date ? new Date(row.delivery_date) : new Date(),
      remarks: row.remarks || "",
    });

    if (row.items && row.items.length > 0) {
      setDispatchItems(
        row.items.map(di => {
          const weightKg = di.bag_size?.weight_kg || di.order_item?.bag_size_weight || 0;
          const orderedQty =
            di.order_item?.quantity_ton > 0
              ? di.order_item.quantity_ton
              : ((di.order_item?.number_of_bags || 0) * weightKg) / 1000;
          const totalDispatched = di.order_item?.dispatched_qty || 0;
          const totalDispatchedBags = di.order_item?.dispatched_bags_total || 0;
          const currentQty = di.dispatched_qty_ton || 0;
          const currentBags = di.dispatched_bags || 0;
          const dispatchedByOthers = Math.max(0, totalDispatched - currentQty);
          const dispatchedBagsByOthers = Math.max(0, totalDispatchedBags - currentBags);
          const remainingQty = Math.max(0, orderedQty - dispatchedByOthers);
          const remainingBags = Math.max(
            0,
            (di.order_item?.number_of_bags || 0) - dispatchedBagsByOthers
          );
          return {
            order_id: di.order_item?.order_id || row.order_id,
            order_item_id: di.order_item_id,
            finished_good_id: di.finished_good_id,
            product_name:
              di.product_name ||
              di.finished_good?.product_name ||
              di.order_item?.finished_good?.product_name ||
              "Unknown Product",
            unit_type:
              di.order_item?.unit_type || (di.order_item?.number_of_bags > 0 ? "Bag" : "Ton"),
            ordered_qty: orderedQty,
            dispatched_so_far: dispatchedByOthers,
            dispatched_bags_so_far: dispatchedBagsByOthers,
            remaining_qty: remainingQty,
            ordered_bags: di.order_item?.number_of_bags || 0,
            remaining_bags: remainingBags,
            dispatched_qty_ton: di.dispatched_qty_ton.toString(),
            bag_size_id: di.bag_size_id ? di.bag_size_id.toString() : "",
            dispatched_bags: di.dispatched_bags ? di.dispatched_bags.toString() : "0",
            weight_kg: weightKg,
          };
        })
      );
    }
    setOrderPickerValue("");
    setModalVisible(true);
  };

  const columns = [
    { key: "dispatch_id", label: "ID" },
    {
      key: "orders",
      label: "Orders",
      render: (val, row) => {
        if (row.order_codes && row.order_codes.length > 0) {
          return row.order_codes.join(", ");
        }
        const codes = [
          ...new Set(
            (row.items || [])
              .map(di => di.order_item?.order?.order_code)
              .filter(Boolean)
          ),
        ];
        if (codes.length > 0) return codes.join(", ");
        return row.order?.order_code || (row.order_id ? `Order #${row.order_id}` : "—");
      },
    },
    {
      key: "driver_id",
      label: "Driver",
      render: (val, row) => row.driver?.driver_name || `Driver #${row.driver_id}`,
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (val, row) => {
        if (row.items && row.items.length > 0) {
          const totalTons = row.items.reduce((acc, i) => acc + (i.dispatched_qty_ton || 0), 0);
          return `${row.items.length} items | ${totalTons.toFixed(2)} Tons`;
        }
        if (row.dispatched_bags > 0) {
          const bagSizeStr = row.bag_size ? ` (${row.bag_size.weight_kg}kg)` : "";
          return `${row.dispatched_bags} Bags${bagSizeStr}`;
        }
        return `${row.dispatched_quantity_ton || 0} Tons`;
      },
    },
    { key: "status", label: "Status" },
  ];

  // Compute summary totals across all entered items
  const summaryTotalTons = dispatchItems.reduce(
    (acc, item) => acc + (parseFloat(item.dispatched_qty_ton) || 0),
    0
  );
  const summaryTotalBags = dispatchItems.reduce(
    (acc, item) => acc + (parseInt(item.dispatched_bags) || 0),
    0
  );

  return (
    <Layout title="Dispatch Management" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dispatch Records</Text>
          <Button
            title="Add Dispatch"
            onPress={() => {
              resetForm();
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
            renderActions={(row) => (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleEditDispatch(row)}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deliveryBtn}
                  onPress={() =>
                    navigation.navigate("DriverDelivery", {
                      driverId: row.driver_id?.toString(),
                    })
                  }
                >
                  <FaTruck color="#fff" size={15} />
                  <Text style={styles.deliveryBtnText}>Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(row.dispatch_id)}
                >
                  <FaTrash color={colors.error} size={16} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <Modal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); resetForm(); }}
          title={editingDispatch ? "Edit Dispatch" : "New Dispatch"}
        >
          <ScrollView>
            {/* ── Stage 1: Add Orders ── */}
            <Text style={styles.sectionTitle}>Step 1 — Customer Orders</Text>

            <View style={styles.addOrderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <SelectDropdown
                  label="Add Order"
                  options={[{ label: "Select order to add…", value: "" }, ...availableOrderOptions]}
                  value={orderPickerValue}
                  onValueChange={(val) => {
                    setOrderPickerValue(val);
                    if (val) handleAddOrder(val);
                  }}
                />
              </View>
            </View>

            {selectedOrders.length === 0 && (
              <View style={styles.emptyOrdersHint}>
                <Text style={styles.emptyOrdersText}>No orders added yet. Select an order above.</Text>
              </View>
            )}

            {/* ── Stage 2: Per-order item entry ── */}
            {selectedOrders.map((order) => {
              const orderCode = order.order_code || `Order #${order.order_id}`;
              const customerName = order.customer?.customer_name || order.customer_name || "Unknown";
              const orderItemIds = (order.items || []).map(i => i.order_item_id);
              const orderDispatchItems = dispatchItems.filter(di =>
                orderItemIds.includes(di.order_item_id)
              );

              return (
                <View key={order.order_id} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderCardCode}>{orderCode}</Text>
                      <Text style={styles.orderCardCustomer}>{customerName}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeOrderBtn}
                      onPress={() => handleRemoveOrder(order.order_id.toString())}
                    >
                      <FaTimes color={colors.error} size={14} />
                      <Text style={styles.removeOrderText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  {orderDispatchItems.length === 0 ? (
                    <Text style={styles.noItemsText}>No items found for this order.</Text>
                  ) : (
                    orderDispatchItems.map((item, index) => {
                      const globalIndex = dispatchItems.findIndex(
                        di => di.order_item_id === item.order_item_id
                      );
                      const isBagType = item.unit_type === "Bag" || item.ordered_bags > 0;
                      const deliveredQty = item.dispatched_so_far || 0;
                      const deliveredBags = item.dispatched_bags_so_far || 0;
                      const pendingQty = Math.max(0, item.ordered_qty - deliveredQty);
                      const pendingBags = Math.max(0, item.ordered_bags - deliveredBags);

                      return (
                        <View key={index} style={styles.itemRow}>
                          <Text style={styles.itemName}>{item.product_name}</Text>
                          <View style={styles.infoGrid}>
                            <View style={styles.infoCol}>
                              <Text style={styles.infoLabel}>Ordered</Text>
                              <Text style={styles.infoValue}>
                                {item.ordered_qty.toFixed(2)}t{" "}
                                {isBagType ? `(${item.ordered_bags} Bags)` : ""}
                              </Text>
                            </View>
                            <View style={styles.infoCol}>
                              <Text style={styles.infoLabel}>Delivered</Text>
                              <Text style={styles.infoValue}>
                                {deliveredQty.toFixed(2)}t{" "}
                                {isBagType ? `(${deliveredBags} Bags)` : ""}
                              </Text>
                            </View>
                            <View style={styles.infoCol}>
                              <Text style={[styles.infoLabel, { color: colors.error }]}>Pending</Text>
                              <Text style={[styles.infoValue, { color: colors.error }]}>
                                {pendingQty.toFixed(2)}t{" "}
                                {isBagType ? `(${pendingBags} Bags)` : ""}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.itemInputs}>
                            {isBagType ? (
                              <>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                  <SelectDropdown
                                    label="Bag Size"
                                    options={bagSizes.map(bs => ({
                                      label: `${bs.weight_kg} kg`,
                                      value: String(bs.id),
                                    }))}
                                    value={item.bag_size_id}
                                    onValueChange={(val) => {
                                      const newItems = [...dispatchItems];
                                      newItems[globalIndex].bag_size_id = val;
                                      const selectedBag = bagSizes.find(bs => String(bs.id) === val);
                                      if (selectedBag) {
                                        newItems[globalIndex].weight_kg = selectedBag.weight_kg;
                                        newItems[globalIndex].dispatched_qty_ton = (
                                          (parseInt(newItems[globalIndex].dispatched_bags || 0) *
                                            selectedBag.weight_kg) /
                                          1000
                                        ).toString();
                                      }
                                      setDispatchItems(newItems);
                                    }}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <InputField
                                    label="Bags To Dispatch"
                                    value={item.dispatched_bags}
                                    onChangeText={(val) => {
                                      const newItems = [...dispatchItems];
                                      newItems[globalIndex].dispatched_bags = val;
                                      if (item.weight_kg) {
                                        newItems[globalIndex].dispatched_qty_ton = (
                                          (parseInt(val || 0) * item.weight_kg) /
                                          1000
                                        ).toString();
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
                                    newItems[globalIndex].dispatched_qty_ton = val;
                                    setDispatchItems(newItems);
                                  }}
                                  keyboardType="numeric"
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })}

            {/* ── Summary Bar ── */}
            {dispatchItems.some(
              item => parseFloat(item.dispatched_qty_ton) > 0 || parseInt(item.dispatched_bags) > 0
            ) && (
              <View style={styles.summaryBar}>
                <Text style={styles.summaryBarTitle}>Summary</Text>
                <View style={styles.summaryBarRow}>
                  <Text style={styles.summaryBarItem}>
                    Orders: <Text style={styles.summaryBarValue}>{selectedOrders.length}</Text>
                  </Text>
                  <Text style={styles.summaryBarItem}>
                    Total Tons:{" "}
                    <Text style={styles.summaryBarValue}>{summaryTotalTons.toFixed(2)}</Text>
                  </Text>
                  {summaryTotalBags > 0 && (
                    <Text style={styles.summaryBarItem}>
                      Total Bags:{" "}
                      <Text style={styles.summaryBarValue}>{summaryTotalBags}</Text>
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ── Dispatch Details ── */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Step 2 — Dispatch Details</Text>

            <SelectDropdown
              label="Select Driver *"
              options={drivers.map(d => ({
                label: String(d.driver_name || "Unknown Driver"),
                value: String(d.driver_id || ""),
              }))}
              value={formData.driver_id}
              onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
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
  actionButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  editBtn: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  editBtnText: { color: "#0369a1", fontSize: 12, fontWeight: "600" },
  deliveryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deliveryBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  deleteBtn: {
    backgroundColor: "#fef2f2",
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
  },
  addOrderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  emptyOrdersHint: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  emptyOrdersText: { fontSize: 13, color: "#94a3b8" },
  orderCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 12,
    overflow: "hidden",
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#bae6fd",
  },
  orderCardCode: { fontSize: 14, fontWeight: "700", color: "#0369a1" },
  orderCardCustomer: { fontSize: 12, color: "#475569", marginTop: 1 },
  removeOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  removeOrderText: { fontSize: 12, color: colors.error, fontWeight: "600" },
  noItemsText: { fontSize: 13, color: "#94a3b8", padding: 12 },
  itemRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  itemName: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
  infoGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#64748b", fontWeight: "600", marginBottom: 2 },
  infoValue: { fontSize: 12, color: "#0f172a", fontWeight: "500" },
  itemInputs: { flexDirection: "row", gap: 8 },
  summaryBar: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
    marginBottom: 12,
    marginTop: 4,
  },
  summaryBarTitle: { fontSize: 13, fontWeight: "700", color: "#064e3b", marginBottom: 8 },
  summaryBarRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  summaryBarItem: { fontSize: 13, color: "#374151" },
  summaryBarValue: { fontWeight: "700", color: "#059669" },
});
