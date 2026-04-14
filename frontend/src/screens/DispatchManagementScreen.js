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
import Button from "../components/Button";
import DynamicTable, { createSelectCell, createNumberCell } from "../components/DynamicTable";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import colors from "../theme/colors";
import { dispatchApi, customerOrderApi, driverApi, bagSizeApi, truckApi, finishedGoodApi, deliveryBillApi } from "../api/client";
import { showError, showSuccess, showConfirm } from "../utils/customAlerts";
import { FaPlus, FaTrash, FaTruck, FaTimes } from "react-icons/fa";

export default function DispatchManagementScreen({ navigation }) {
  const [dispatches, setDispatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState(null);

  const [billSettings, setBillSettings] = useState({
    cgst_percent: "",
    sgst_percent: "",
    igst_percent: "",
    terms_of_delivery: "",
    destination: "",
  });

  const [formData, setFormData] = useState({
    truck_id: "",
    driver_id: "",
    warehouse_loader: "",
    remarks: "",
  });

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([]);

  const selectedOrders = selectedOrderIds
    .map(id => orders.find(o => o.order_id.toString() === id))
    .filter(Boolean);

  // Progressive disclosure flags
  const truckSelected = !!formData.truck_id;
  const driverSelected = !!formData.driver_id;
  const ordersSelected = selectedOrderIds.length > 0;

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
        price_per_bag: item.price_per_bag || 0,
        price_per_ton: item.price_per_ton || 0,
        hsn_sac_code: item.finished_good?.hsn_sac_code || null,
      };
    });
  };

  const handleToggleOrder = (orderId) => {
    const idStr = orderId.toString();
    if (selectedOrderIds.includes(idStr)) {
      const order = orders.find(o => o.order_id.toString() === idStr);
      if (order) {
        const orderItemIds = (order.items || []).map(i => i.order_item_id);
        setSelectedOrderIds(prev => prev.filter(id => id !== idStr));
        setDispatchItems(prev => prev.filter(item => !orderItemIds.includes(item.order_item_id)));
      }
    } else {
      const order = orders.find(o => o.order_id.toString() === idStr);
      if (!order) return;
      setSelectedOrderIds(prev => [...prev, idStr]);
      const newItems = buildItemsForOrder(order);
      setDispatchItems(prev => [...prev, ...newItems]);
    }
  };

  const handleOrderSelectionChange = (newIds) => {
    const added = newIds.filter(id => !selectedOrderIds.includes(id));
    const removed = selectedOrderIds.filter(id => !newIds.includes(id));

    let updatedItems = [...dispatchItems];

    removed.forEach(idStr => {
      const order = orders.find(o => o.order_id.toString() === idStr);
      if (order) {
        const orderItemIds = (order.items || []).map(i => i.order_item_id);
        updatedItems = updatedItems.filter(item => !orderItemIds.includes(item.order_item_id));
      }
    });

    added.forEach(idStr => {
      const order = orders.find(o => o.order_id.toString() === idStr);
      if (order) {
        updatedItems = [...updatedItems, ...buildItemsForOrder(order)];
      }
    });

    setSelectedOrderIds(newIds);
    setDispatchItems(updatedItems);
  };

  const handleItemCellChange = (orderItemId, key, value) => {
    setDispatchItems(prev =>
      prev.map(item => {
        if (item.order_item_id !== orderItemId) return item;
        const updated = { ...item, [key]: value };
        if (key === "bag_size_id") {
          const selectedBag = bagSizes.find(bs => String(bs.id) === value);
          if (selectedBag) {
            updated.weight_kg = selectedBag.weight_kg;
            updated.dispatched_qty_ton = (
              (parseInt(updated.dispatched_bags || 0) * selectedBag.weight_kg) / 1000
            ).toString();
          }
        } else if (key === "dispatched_bags") {
          if (item.weight_kg) {
            updated.dispatched_qty_ton = (
              (parseInt(value || 0) * item.weight_kg) / 1000
            ).toString();
          }
        }
        return updated;
      })
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, orderRes, driverRes, bagSizeRes, truckRes, fgRes] = await Promise.all([
        dispatchApi.getAll(),
        customerOrderApi.getAll(),
        driverApi.getAll(),
        bagSizeApi.getAll(),
        truckApi.getAll(),
        finishedGoodApi.getAll(),
      ]);
      setDispatches(disRes.data || []);
      setOrders(orderRes.data || []);
      setDrivers(driverRes.data || []);
      setBagSizes(bagSizeRes.data || []);
      setTrucks((truckRes.data || []).filter(t => t.is_active));
      setFinishedGoods(fgRes.data || []);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
      showError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.truck_id) {
      showError("Please select a truck");
      return;
    }
    if (!formData.driver_id) {
      showError("Please select a driver");
      return;
    }
    if (selectedOrderIds.length === 0) {
      showError("Please select at least one customer order");
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
        showError(`Quantity for ${item.product_name} exceeds remaining (${item.remaining_qty.toFixed(2)}t)`);
        return;
      }
      const isBagType = item.unit_type === "Bag" || item.ordered_bags > 0;
      if (isBagType && bags > item.remaining_bags) {
        showError(`Bag count for ${item.product_name} exceeds remaining bags (${item.remaining_bags})`);
        return;
      }
    }

    try {
      const payload = {
        order_id: null,
        truck_id: parseInt(formData.truck_id),
        driver_id: parseInt(formData.driver_id),
        warehouse_loader: formData.warehouse_loader || "",
        remarks: formData.remarks || "",
        dispatch_items: itemsToDispatch.map(item => ({
          order_item_id: item.order_item_id,
          finished_good_id: item.finished_good_id,
          dispatched_qty_ton: parseFloat(item.dispatched_qty_ton || 0),
          bag_size_id: item.bag_size_id ? parseInt(item.bag_size_id) : null,
          dispatched_bags: parseInt(item.dispatched_bags || 0),
        })),
      };

      let dispatchResult;
      if (editingDispatch) {
        dispatchResult = await dispatchApi.update(editingDispatch.dispatch_id, payload);
      } else {
        dispatchResult = await dispatchApi.create(payload);
      }

      const savedDispatch = dispatchResult?.data;

      // Auto-generate one delivery bill per customer order (new dispatch only)
      if (!editingDispatch && savedDispatch?.dispatch_id) {
        const branchId = typeof localStorage !== "undefined"
          ? parseInt(localStorage.getItem("selectedBranchId") || "0")
          : 0;

        const cgst = parseFloat(billSettings.cgst_percent || 0);
        const sgst = parseFloat(billSettings.sgst_percent || 0);
        const igst = parseFloat(billSettings.igst_percent || 0);

        const billPromises = selectedOrders.map(order => {
          const orderItemIds = (order.items || []).map(i => i.order_item_id);
          const orderItems = itemsToDispatch.filter(di => orderItemIds.includes(di.order_item_id));

          const billItems = orderItems.map(di => {
            const isBag = di.unit_type === "Bag" || di.ordered_bags > 0;
            const bags = parseInt(di.dispatched_bags || 0);
            const tons = parseFloat(di.dispatched_qty_ton || 0);
            const priceBag = parseFloat(di.price_per_bag || 0);
            const priceTon = parseFloat(di.price_per_ton || 0);
            const amount = isBag ? bags * priceBag : tons * priceTon;
            const fg = finishedGoods.find(f => f.id === di.finished_good_id);
            return {
              product_name: di.product_name,
              hsn_sac_code: di.hsn_sac_code || fg?.hsn_sac_code || null,
              quantity_bags: isBag ? bags : 0,
              quantity_ton: tons,
              rate_per_bag: priceBag,
              rate_per_ton: priceTon,
              amount,
            };
          });

          const taxableValue = billItems.reduce((sum, i) => sum + i.amount, 0);
          const cgstAmt = (taxableValue * cgst) / 100;
          const sgstAmt = (taxableValue * sgst) / 100;
          const igstAmt = (taxableValue * igst) / 100;
          const totalTax = cgstAmt + sgstAmt + igstAmt;
          const totalAmount = taxableValue + totalTax;

          return deliveryBillApi.create({
            dispatch_id: savedDispatch.dispatch_id,
            order_id: order.order_id,
            branch_id: branchId || order.branch_id || 1,
            destination: billSettings.destination || order.customer?.customer_name || "",
            terms_of_delivery: billSettings.terms_of_delivery || "",
            taxable_value: taxableValue,
            cgst_percent: cgst,
            cgst_amount: cgstAmt,
            sgst_percent: sgst,
            sgst_amount: sgstAmt,
            igst_percent: igst,
            igst_amount: igstAmt,
            total_tax_amount: totalTax,
            total_amount: totalAmount,
            payment_status: "PENDING",
            items: billItems,
          });
        });

        await Promise.allSettled(billPromises);
      }

      setModalVisible(false);
      showSuccess(
        editingDispatch
          ? "Dispatch updated successfully"
          : `Dispatch created & ${selectedOrders.length} bill${selectedOrders.length !== 1 ? "s" : ""} generated`
      );
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
      showError("Failed to delete dispatch");
    }
  };

  const resetForm = () => {
    setEditingDispatch(null);
    setSelectedOrderIds([]);
    setDispatchItems([]);
    setFormData({ truck_id: "", driver_id: "", warehouse_loader: "", remarks: "" });
    setBillSettings({ cgst_percent: "", sgst_percent: "", igst_percent: "", terms_of_delivery: "", destination: "" });
  };

  const handleEditDispatch = (row) => {
    setEditingDispatch(row);

    const derivedOrderIds = [
      ...new Set(
        (row.items || [])
          .map(di => di.order_item?.order_id)
          .filter(Boolean)
          .map(String)
      ),
    ];
    if (row.order_id && !derivedOrderIds.includes(row.order_id.toString())) {
      derivedOrderIds.push(row.order_id.toString());
    }
    setSelectedOrderIds(derivedOrderIds);

    setFormData({
      truck_id: row.truck_id ? row.truck_id.toString() : "",
      driver_id: row.driver_id.toString(),
      warehouse_loader: row.warehouse_loader || "",
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
          const remainingBags = Math.max(0, (di.order_item?.number_of_bags || 0) - dispatchedBagsByOthers);
          return {
            order_id: di.order_item?.order_id || row.order_id,
            order_item_id: di.order_item_id,
            finished_good_id: di.finished_good_id,
            product_name: di.product_name || di.finished_good?.product_name || "Unknown Product",
            unit_type: di.order_item?.unit_type || (di.order_item?.number_of_bags > 0 ? "Bag" : "Ton"),
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
    setModalVisible(true);
  };

  const columns = [
    { key: "dispatch_id", label: "ID" },
    {
      key: "truck",
      label: "Truck",
      render: (val, row) => row.truck?.truck_number || "—",
    },
    {
      key: "orders",
      label: "Orders",
      render: (val, row) => {
        if (row.order_codes && row.order_codes.length > 0) return row.order_codes.join(", ");
        const codes = [...new Set((row.items || []).map(di => di.order_item?.order?.order_code).filter(Boolean))];
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
          return `${row.items.length} items | ${totalTons.toFixed(2)} T`;
        }
        return `${row.dispatched_quantity_ton || 0} T`;
      },
    },
    { key: "status", label: "Status" },
  ];

  const summaryTotalTons = dispatchItems.reduce((acc, item) => acc + (parseFloat(item.dispatched_qty_ton) || 0), 0);
  const summaryTotalBags = dispatchItems.reduce((acc, item) => acc + (parseInt(item.dispatched_bags) || 0), 0);

  const isBagRow = (row) => row.unit_type === "Bag" || row.ordered_bags > 0;

  const dispatchTableColumns = [
    {
      key: "product_name",
      label: "Product",
      flex: 2,
      minWidth: 150,
      render: (value) => (
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e293b", paddingHorizontal: 4 }}>
          {value || "—"}
        </Text>
      ),
    },
    {
      key: "_ordered",
      label: "Ordered",
      flex: 1.2,
      minWidth: 95,
      render: (_, row) => (
        <Text style={{ fontSize: 11, color: "#374151", paddingHorizontal: 4, lineHeight: 17 }}>
          {row.ordered_qty.toFixed(2)}t{isBagRow(row) ? `\n(${row.ordered_bags} bags)` : ""}
        </Text>
      ),
    },
    {
      key: "_delivered",
      label: "Delivered",
      flex: 1.2,
      minWidth: 95,
      render: (_, row) => (
        <Text style={{ fontSize: 11, color: "#374151", paddingHorizontal: 4, lineHeight: 17 }}>
          {(row.dispatched_so_far || 0).toFixed(2)}t{isBagRow(row) && row.dispatched_bags_so_far > 0 ? `\n(${row.dispatched_bags_so_far} bags)` : ""}
        </Text>
      ),
    },
    {
      key: "_pending",
      label: "Pending",
      flex: 1.2,
      minWidth: 95,
      render: (_, row) => (
        <Text style={{ fontSize: 11, color: colors.error, fontWeight: "600", paddingHorizontal: 4, lineHeight: 17 }}>
          {(row.remaining_qty || 0).toFixed(2)}t{isBagRow(row) && row.remaining_bags > 0 ? `\n(${row.remaining_bags} bags)` : ""}
        </Text>
      ),
    },
    {
      key: "bag_size_id",
      label: "Bag Size",
      flex: 1.2,
      minWidth: 105,
      render: createSelectCell({
        options: () => bagSizes.map(bs => ({ label: `${bs.weight_kg} kg`, value: String(bs.id) })),
        placeholder: "Size",
        disabled: (row) => !isBagRow(row),
      }),
    },
    {
      key: "dispatched_bags",
      label: "# Bags",
      flex: 1,
      minWidth: 80,
      render: createNumberCell({
        placeholder: "0",
        disabled: (row) => !isBagRow(row),
      }),
    },
    {
      key: "dispatched_qty_ton",
      label: "Qty (T)",
      flex: 1,
      minWidth: 80,
      render: createNumberCell({
        placeholder: "0.00",
        disabled: (row) => isBagRow(row),
      }),
    },
  ];

  return (
    <Layout title="Dispatch Management" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dispatch Records</Text>
          <Button
            title="Add Dispatch"
            onPress={() => { resetForm(); setModalVisible(true); }}
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
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEditDispatch(row)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deliveryBtn}
                  onPress={() => navigation.navigate("DriverDelivery", { driverId: row.driver_id?.toString() })}
                >
                  <FaTruck color="#fff" size={15} />
                  <Text style={styles.deliveryBtnText}>Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(row.dispatch_id)}>
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

            {/* ── STEP 1: Truck ── */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, truckSelected && styles.stepBadgeDone]}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Select Truck</Text>
                {truckSelected && (
                  <Text style={styles.stepDoneTag}>
                    {trucks.find(t => t.truck_id.toString() === formData.truck_id)?.truck_number}
                  </Text>
                )}
              </View>
              <SelectDropdown
                label="Truck *"
                options={[
                  { label: "Select truck…", value: "" },
                  ...trucks.map(t => ({
                    label: `${t.truck_number} — ${t.truck_type} / ${t.vehicle_category}`,
                    value: t.truck_id.toString(),
                  })),
                ]}
                value={formData.truck_id}
                onValueChange={(val) => setFormData({ ...formData, truck_id: val })}
              />
            </View>

            {/* ── STEP 2: Driver (visible after truck selected) ── */}
            {truckSelected && (
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepBadge, driverSelected && styles.stepBadgeDone]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepTitle}>Select Driver</Text>
                  {driverSelected && (
                    <Text style={styles.stepDoneTag}>
                      {drivers.find(d => d.driver_id.toString() === formData.driver_id)?.driver_name}
                    </Text>
                  )}
                </View>
                <SelectDropdown
                  label="Driver *"
                  options={[
                    { label: "Select driver…", value: "" },
                    ...drivers.map(d => ({
                      label: d.driver_name,
                      value: d.driver_id.toString(),
                    })),
                  ]}
                  value={formData.driver_id}
                  onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
                />
              </View>
            )}

            {/* ── STEP 3: Customer Orders with Checkboxes (visible after driver selected) ── */}
            {driverSelected && (
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepBadge, ordersSelected && styles.stepBadgeDone]}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepTitle}>Select Customer Orders</Text>
                  {ordersSelected && (
                    <Text style={styles.stepDoneTag}>{selectedOrderIds.length} selected</Text>
                  )}
                </View>

                <MultiSelectDropdown
                  placeholder="Select customer orders…"
                  value={selectedOrderIds}
                  onValueChange={handleOrderSelectionChange}
                  searchable
                  options={orders.map(order => ({
                    value: order.order_id.toString(),
                    label: order.order_code || `Order #${order.order_id}`,
                    sublabel: `${order.customer?.customer_name || order.customer_name || 'Unknown'} · ${(order.items || []).length} item${(order.items || []).length !== 1 ? 's' : ''}`,
                    badge: order.order_status || 'PENDING',
                  }))}
                />

                {/* Per-order item entry — DynamicTable */}
                {selectedOrders.map((order) => {
                  const orderCode = order.order_code || `Order #${order.order_id}`;
                  const customerName = order.customer?.customer_name || order.customer_name || "Unknown";
                  const orderItemIds = (order.items || []).map(i => i.order_item_id);
                  const orderDispatchItems = dispatchItems.filter(di => orderItemIds.includes(di.order_item_id));

                  return (
                    <View key={order.order_id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderCardCode}>{orderCode}</Text>
                          <Text style={styles.orderCardCustomer}>{customerName}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeOrderBtn}
                          onPress={() => handleToggleOrder(order.order_id)}
                        >
                          <FaTimes color={colors.error} size={14} />
                          <Text style={styles.removeOrderText}>Remove</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ padding: 10 }}>
                        {orderDispatchItems.length === 0 ? (
                          <Text style={styles.noItemsText}>No items found for this order.</Text>
                        ) : (
                          <DynamicTable
                            columns={dispatchTableColumns}
                            rows={orderDispatchItems}
                            onCellChange={(rowIndex, key, value) =>
                              handleItemCellChange(orderDispatchItems[rowIndex].order_item_id, key, value)
                            }
                            onRemoveRow={() => {}}
                            showAddButton={false}
                            minRows={orderDispatchItems.length}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── STEP 4: Other Details (visible after orders selected) ── */}
            {ordersSelected && (
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepBadge, styles.stepBadgeDone]}>
                    <Text style={styles.stepBadgeText}>4</Text>
                  </View>
                  <Text style={styles.stepTitle}>Additional Details</Text>
                </View>

                {/* Summary bar */}
                {(summaryTotalTons > 0 || summaryTotalBags > 0) && (
                  <View style={styles.summaryBar}>
                    <Text style={styles.summaryBarTitle}>Dispatch Summary</Text>
                    <View style={styles.summaryBarRow}>
                      <Text style={styles.summaryBarItem}>
                        Orders: <Text style={styles.summaryBarValue}>{selectedOrders.length}</Text>
                      </Text>
                      <Text style={styles.summaryBarItem}>
                        Total Tons: <Text style={styles.summaryBarValue}>{summaryTotalTons.toFixed(2)}</Text>
                      </Text>
                      {summaryTotalBags > 0 && (
                        <Text style={styles.summaryBarItem}>
                          Total Bags: <Text style={styles.summaryBarValue}>{summaryTotalBags}</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* ── Bill Details (auto-generated per customer on save) ── */}
                {!editingDispatch && (
                  <View style={styles.billCard}>
                    <Text style={styles.billCardTitle}>Bill Details</Text>
                    <Text style={styles.billCardNote}>
                      One invoice will be auto-generated per customer order on dispatch.
                    </Text>

                    <View style={styles.billRow}>
                      <View style={styles.billField}>
                        <InputField
                          label="CGST %"
                          value={billSettings.cgst_percent}
                          onChangeText={(v) => setBillSettings({ ...billSettings, cgst_percent: v })}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.billField}>
                        <InputField
                          label="SGST %"
                          value={billSettings.sgst_percent}
                          onChangeText={(v) => setBillSettings({ ...billSettings, sgst_percent: v })}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.billField}>
                        <InputField
                          label="IGST %"
                          value={billSettings.igst_percent}
                          onChangeText={(v) => setBillSettings({ ...billSettings, igst_percent: v })}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <InputField
                      label="Destination"
                      value={billSettings.destination}
                      onChangeText={(v) => setBillSettings({ ...billSettings, destination: v })}
                      placeholder="e.g. Mumbai Warehouse"
                    />
                    <InputField
                      label="Terms of Delivery"
                      value={billSettings.terms_of_delivery}
                      onChangeText={(v) => setBillSettings({ ...billSettings, terms_of_delivery: v })}
                      placeholder="e.g. FOB, CIF…"
                    />
                  </View>
                )}

                <InputField
                  label="Warehouse Loader"
                  value={formData.warehouse_loader}
                  onChangeText={(val) => setFormData({ ...formData, warehouse_loader: val })}
                />
                <InputField
                  label="Remarks"
                  value={formData.remarks}
                  onChangeText={(val) => setFormData({ ...formData, remarks: val })}
                  multiline
                />
                <Button title="Save Dispatch" onPress={handleSave} style={{ marginTop: 20 }} />
              </View>
            )}

          </ScrollView>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold" },
  actionButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  editBtn: { backgroundColor: "#e0f2fe", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#bae6fd" },
  editBtnText: { color: "#0369a1", fontSize: 12, fontWeight: "600" },
  deliveryBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deliveryBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  deleteBtn: { backgroundColor: "#fef2f2", padding: 7, borderRadius: 6, borderWidth: 1, borderColor: "#fecaca", alignItems: "center", justifyContent: "center" },

  // Step cards
  stepCard: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", padding: 16, marginBottom: 12 },
  stepHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#94a3b8", alignItems: "center", justifyContent: "center" },
  stepBadgeDone: { backgroundColor: colors.primary },
  stepBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  stepTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", flex: 1 },
  stepDoneTag: { fontSize: 12, fontWeight: "600", color: colors.primary, backgroundColor: "#eff6ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  emptyText: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 12 },

  // Order cards (item entry)
  orderCard: { backgroundColor: "#f8fafc", borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", marginBottom: 12, overflow: "hidden" },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#e0f2fe", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#bae6fd" },
  orderCardCode: { fontSize: 14, fontWeight: "700", color: "#0369a1" },
  orderCardCustomer: { fontSize: 12, color: "#475569", marginTop: 1 },
  removeOrderBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef2f2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#fecaca" },
  removeOrderText: { color: colors.error, fontSize: 12, fontWeight: "600" },
  noItemsText: { color: "#94a3b8", fontSize: 13, padding: 12, textAlign: "center" },


  // Summary
  summaryBar: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  summaryBarTitle: { fontSize: 13, fontWeight: "700", color: "#15803d", marginBottom: 6 },
  summaryBarRow: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  summaryBarItem: { fontSize: 13, color: "#374151" },
  summaryBarValue: { fontWeight: "700", color: "#15803d" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 10, marginTop: 4, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 6 },

  // Bill Details card
  billCard: { backgroundColor: "#fffbeb", borderRadius: 8, borderWidth: 1, borderColor: "#fde68a", padding: 14, marginBottom: 14 },
  billCardTitle: { fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 3 },
  billCardNote: { fontSize: 12, color: "#a16207", marginBottom: 12 },
  billRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  billField: { flex: 1 },
});
