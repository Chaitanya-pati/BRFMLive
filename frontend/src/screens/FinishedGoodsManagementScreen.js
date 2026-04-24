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
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showConfirm, showSuccess, showError } from "../utils/customAlerts";
import { useBranch } from "../context/BranchContext";

export default function FinishedGoodsManagementScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [godowns, setGodowns] = useState([]);

  const [godownModalVisible, setGodownModalVisible] = useState(false);
  const [godownEditMode, setGodownEditMode] = useState(false);
  const [godownEditId, setGodownEditId] = useState(null);

  const [godownForm, setGodownForm] = useState({
    godown_code: "",
    godown_name: "",
    capacity_bags: "",
    location: "",
  });

  useEffect(() => {
    fetchGodowns();
  }, []);

  const fetchGodowns = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const res = await client.get("/finished-goods-godown");
      setGodowns(res.data || []);
    } catch (error) {
      showError("Failed to load godowns");
    } finally {
      setLoading(false);
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
      fetchGodowns();
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
      fetchGodowns();
    } catch (error) {
      showError(error.response?.data?.detail || "Failed to delete godown");
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

  return (
    <Layout title="Finished Goods Godown" navigation={navigation}>
      <ScrollView style={styles.container}>
        {loading && godowns.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary || "#3b82f6"} />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Godowns</Text>
            <DataTable
              columns={godownColumns}
              data={godowns}
              onAdd={openAddGodown}
              onEdit={openEditGodown}
              onDelete={handleDeleteGodown}
              searchPlaceholder="Search godowns..."
            />
          </View>
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
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnGhostText: { color: "#374151", fontWeight: "600" },
  btnPrimary: { backgroundColor: "#3b82f6" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
});
