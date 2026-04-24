import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import SelectDropdown from "../components/SelectDropdown";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert, showConfirm, showSuccess, showError } from "../utils/customAlerts";
import { useBranch } from "../context/BranchContext";

export default function FinishedGoodsManagementScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);

  const [godownModalVisible, setGodownModalVisible] = useState(false);
  const [godownEditMode, setGodownEditMode] = useState(false);
  const [godownEditId, setGodownEditId] = useState(null);
  const [movementModalVisible, setMovementModalVisible] = useState(false);

  const [godownForm, setGodownForm] = useState({
    godown_code: "",
    godown_name: "",
    capacity_bags: "",
    location: "",
  });
  const [movementForm, setMovementForm] = useState({
    movement_type: "IN",
    from_godown_id: null,
    to_godown_id: null,
    finished_good_id: null,
    bag_size_id: null,
    quantity_bags: "",
    remarks: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [gRes, fgRes, bsRes] = await Promise.all([
        client.get("/finished-goods-godown"),
        client.get("/finished-goods"),
        client.get("/bag-sizes"),
      ]);
      setGodowns(gRes.data || []);
      setFinishedGoods(fgRes.data || []);
      setBagSizes(bsRes.data || []);
      if (gRes.data?.length > 0) {
        const stillSelected =
          selectedGodown && gRes.data.find((g) => g.id === selectedGodown.id);
        handleSelectGodown(stillSelected || gRes.data[0]);
      } else {
        setSelectedGodown(null);
        setStocks([]);
      }
    } catch (error) {
      showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGodown = async (godown) => {
    setSelectedGodown(godown);
    if (!godown) return setStocks([]);
    try {
      const client = getApiClient();
      const res = await client.get(
        `/finished-goods-godown-stock?godown_id=${godown.id}`,
      );
      setStocks(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const openAddGodown = () => {
    setGodownEditMode(false);
    setGodownEditId(null);
    setGodownForm({
      godown_code: "",
      godown_name: "",
      capacity_bags: "",
      location: "",
    });
    setGodownModalVisible(true);
  };

  const openEditGodown = (g) => {
    setGodownEditMode(true);
    setGodownEditId(g.id);
    setGodownForm({
      godown_code: g.godown_code || "",
      godown_name: g.godown_name || "",
      capacity_bags: g.capacity_bags != null ? String(g.capacity_bags) : "",
      location: g.location || "",
    });
    setGodownModalVisible(true);
  };

  const handleSaveGodown = async () => {
    if (!godownForm.godown_code || !godownForm.godown_name) {
      return showError("Please fill required fields");
    }
    setLoading(true);
    try {
      const client = getApiClient();
      const payload = {
        ...godownForm,
        capacity_bags: parseInt(godownForm.capacity_bags) || 0,
        branch_id: activeBranch?.id,
      };
      if (godownEditMode && godownEditId) {
        await client.put(`/finished-goods-godown/${godownEditId}`, payload);
        showSuccess("Godown updated");
      } else {
        await client.post("/finished-goods-godown", payload);
        showSuccess("Godown created");
      }
      setGodownModalVisible(false);
      fetchInitialData();
    } catch (error) {
      showError(error.response?.data?.detail || "Failed to save godown");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGodown = async (g) => {
    const ok = await showConfirm(
      "Delete godown",
      `Are you sure you want to delete "${g.godown_name}"?`,
    );
    if (!ok) return;
    try {
      const client = getApiClient();
      await client.delete(`/finished-goods-godown/${g.id}`);
      showSuccess("Godown deleted");
      fetchInitialData();
    } catch (error) {
      showError(error.response?.data?.detail || "Failed to delete godown");
    }
  };

  const handleMovement = async () => {
    if (
      !movementForm.finished_good_id ||
      !movementForm.bag_size_id ||
      !movementForm.quantity_bags
    )
      return showError("Please fill required fields");

    const qty = parseInt(movementForm.quantity_bags);
    if (isNaN(qty) || qty <= 0)
      return showError("Enter a valid quantity greater than zero");

    if (
      movementForm.movement_type === "OUT" ||
      movementForm.movement_type === "TRANSFER"
    ) {
      const currentStock = stocks.find(
        (s) =>
          s.finished_good_id === movementForm.finished_good_id &&
          s.bag_size_id === movementForm.bag_size_id,
      );
      if (!currentStock || currentStock.quantity_bags < qty) {
        return showError(
          `Insufficient stock. Available: ${currentStock ? currentStock.quantity_bags : 0} bags`,
        );
      }
    }

    if (movementForm.movement_type === "TRANSFER") {
      if (!movementForm.to_godown_id)
        return showError("Select destination godown");
      if (selectedGodown.id === movementForm.to_godown_id) {
        return showError("Source and destination godowns cannot be the same");
      }
    }

    setLoading(true);
    try {
      const client = getApiClient();
      const payload = {
        ...movementForm,
        quantity_bags: qty,
        from_godown_id:
          movementForm.movement_type === "OUT" ||
          movementForm.movement_type === "TRANSFER"
            ? selectedGodown.id
            : null,
        to_godown_id:
          movementForm.movement_type === "IN" ||
          movementForm.movement_type === "TRANSFER"
            ? movementForm.movement_type === "TRANSFER"
              ? movementForm.to_godown_id
              : selectedGodown.id
            : null,
      };
      await client.post("/finished-goods-godown-movement", payload);
      showSuccess("Movement recorded");
      setMovementModalVisible(false);
      setMovementForm({
        movement_type: "IN",
        from_godown_id: null,
        to_godown_id: null,
        finished_good_id: null,
        bag_size_id: null,
        quantity_bags: "",
        remarks: "",
      });
      handleSelectGodown(selectedGodown);
    } catch (error) {
      showError(error.response?.data?.detail || "Movement failed");
    } finally {
      setLoading(false);
    }
  };

  const godownColumns = [
    { label: "Code", field: "godown_code", key: "godown_code", flex: 1 },
    { label: "Godown Name", field: "godown_name", key: "godown_name", flex: 1.5 },
    {
      label: "Capacity (Bags)",
      field: "capacity_bags",
      key: "capacity_bags",
      flex: 1,
      render: (v) => (v != null ? v : "-"),
    },
    { label: "Location", field: "location", key: "location", flex: 1.2, render: (v) => v || "-" },
  ];

  const stockColumns = [
    {
      label: "Product",
      field: "finished_good_id",
      key: "finished_good_id",
      flex: 1.6,
      render: (v) =>
        finishedGoods.find((f) => f.id === v)?.product_name || `#${v}`,
    },
    {
      label: "Bag Size",
      field: "bag_size_id",
      key: "bag_size_id",
      flex: 1,
      render: (v) => {
        const b = bagSizes.find((b) => b.id === v);
        return b ? `${b.weight_kg} kg` : `#${v}`;
      },
    },
    {
      label: "Quantity (Bags)",
      field: "quantity_bags",
      key: "quantity_bags",
      flex: 1,
    },
  ];

  return (
    <Layout title="Finished Goods Godown" navigation={navigation}>
      <ScrollView style={styles.container}>
        {loading && godowns.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary || "#3b82f6"} />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Godowns</Text>
              <DataTable
                columns={godownColumns}
                data={godowns}
                onAdd={openAddGodown}
                onEdit={openEditGodown}
                onDelete={handleDeleteGodown}
                onCustomAction={handleSelectGodown}
                customActionLabel="View Stock"
                searchPlaceholder="Search godowns..."
              />
            </View>

            {selectedGodown && (
              <View style={styles.section}>
                <View style={styles.stockHeader}>
                  <Text style={styles.sectionTitle}>
                    Stock — {selectedGodown.godown_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setMovementModalVisible(true)}
                  >
                    <Text style={styles.primaryBtnText}>+ Move Stock</Text>
                  </TouchableOpacity>
                </View>
                <DataTable
                  columns={stockColumns}
                  data={stocks}
                  searchPlaceholder="Search stock..."
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Godown Modal */}
      <Modal
        visible={godownModalVisible}
        onClose={() => setGodownModalVisible(false)}
        title={godownEditMode ? "Edit Godown" : "Add Godown"}
      >
        <View>
          <Text style={styles.label}>Godown Code *</Text>
          <TextInput
            style={styles.input}
            value={godownForm.godown_code}
            onChangeText={(v) => setGodownForm({ ...godownForm, godown_code: v })}
            placeholder="e.g. WH-01"
          />
          <Text style={styles.label}>Godown Name *</Text>
          <TextInput
            style={styles.input}
            value={godownForm.godown_name}
            onChangeText={(v) => setGodownForm({ ...godownForm, godown_name: v })}
            placeholder="e.g. Main Warehouse"
          />
          <Text style={styles.label}>Capacity (Bags)</Text>
          <TextInput
            style={styles.input}
            value={godownForm.capacity_bags}
            onChangeText={(v) =>
              setGodownForm({ ...godownForm, capacity_bags: v.replace(/[^0-9]/g, "") })
            }
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={godownForm.location}
            onChangeText={(v) => setGodownForm({ ...godownForm, location: v })}
            placeholder="Optional"
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setGodownModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSaveGodown}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? "Saving..." : godownEditMode ? "Update" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal
        visible={movementModalVisible}
        onClose={() => setMovementModalVisible(false)}
        title="Stock Movement"
      >
        <View>
          <Text style={styles.modalSubtitle}>
            From: {selectedGodown?.godown_name}
          </Text>
          <View style={styles.movementTypeRow}>
            {["IN", "OUT", "TRANSFER"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeBtn,
                  movementForm.movement_type === type && styles.typeBtnActive,
                ]}
                onPress={() =>
                  setMovementForm({ ...movementForm, movement_type: type })
                }
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    movementForm.movement_type === type && styles.typeBtnTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SelectDropdown
            label="Product"
            options={finishedGoods.map((f) => ({ label: f.product_name, value: f.id }))}
            selectedValue={movementForm.finished_good_id}
            onValueChange={(v) =>
              setMovementForm({ ...movementForm, finished_good_id: v })
            }
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SelectDropdown
                label="Bag Size"
                options={bagSizes.map((b) => ({ label: `${b.weight_kg} kg`, value: b.id }))}
                selectedValue={movementForm.bag_size_id}
                onValueChange={(v) =>
                  setMovementForm({ ...movementForm, bag_size_id: v })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity (Bags)</Text>
              <TextInput
                style={styles.input}
                value={movementForm.quantity_bags}
                onChangeText={(v) =>
                  setMovementForm({
                    ...movementForm,
                    quantity_bags: v.replace(/[^0-9]/g, ""),
                  })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          {movementForm.movement_type === "TRANSFER" && (
            <SelectDropdown
              label="To Destination Godown"
              options={godowns
                .filter((g) => g.id !== selectedGodown?.id)
                .map((g) => ({ label: g.godown_name, value: g.id }))}
              selectedValue={movementForm.to_godown_id}
              onValueChange={(v) =>
                setMovementForm({ ...movementForm, to_godown_id: v })
              }
            />
          )}

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={styles.input}
            value={movementForm.remarks}
            onChangeText={(v) => setMovementForm({ ...movementForm, remarks: v })}
            placeholder="Optional"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setMovementModalVisible(false)}
              disabled={loading}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleMovement}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? "Saving..." : "Confirm Movement"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  section: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  modalSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  movementTypeRow: { flexDirection: "row", gap: 8, marginVertical: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  typeBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  typeBtnText: { color: "#374151", fontWeight: "600", fontSize: 13 },
  typeBtnTextActive: { color: "#fff" },

  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnGhostText: { color: "#374151", fontWeight: "600" },
  btnPrimary: { backgroundColor: "#3b82f6" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
});
