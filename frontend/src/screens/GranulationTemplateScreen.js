import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showError, showSuccess, showConfirm } from "../utils/customAlerts";
import { formatISTDate } from "../utils/dateUtils";

const EMPTY_FORM = () => ({
  finished_good_id: null,
  columns: [{ id: Date.now(), label: "" }],
  is_active: true,
});

export default function GranulationTemplateScreen({ navigation }) {
  const [templates, setTemplates] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [tmplRes, fgRes] = await Promise.all([
        client.get("/granulation-templates"),
        client.get("/finished-goods"),
      ]);
      setTemplates(tmplRes.data || []);
      setFinishedGoods(fgRes.data || []);
    } catch {
      showError("Failed to load granulation templates");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setFormData(EMPTY_FORM());
    setModalVisible(true);
  };

  const openEdit = (row) => {
    const cols = (row.columns_definition?.columns || []).map((label) => ({
      id: Math.random(),
      label,
    }));
    setEditMode(true);
    setCurrentId(row.id);
    setFormData({
      finished_good_id: row.finished_good_id,
      columns: cols.length > 0 ? cols : [{ id: Date.now(), label: "" }],
      is_active: row.is_active !== false,
    });
    setModalVisible(true);
  };

  const handleDelete = async (row) => {
    const ok = await showConfirm(
      "Delete Template",
      `Delete template for "${row.finished_good?.product_name || "this product"}"?`
    );
    if (!ok) return;
    try {
      const client = getApiClient();
      await client.delete(`/granulation-templates/${row.id}`);
      showSuccess("Template deleted");
      loadAll();
    } catch {
      showError("Failed to delete template");
    }
  };

  const addColumn = () => {
    setFormData((f) => ({
      ...f,
      columns: [...f.columns, { id: Math.random(), label: "" }],
    }));
  };

  const removeColumn = (id) => {
    setFormData((f) => ({
      ...f,
      columns: f.columns.length > 1 ? f.columns.filter((c) => c.id !== id) : f.columns,
    }));
  };

  const updateColumnLabel = (id, label) => {
    setFormData((f) => ({
      ...f,
      columns: f.columns.map((c) => (c.id === id ? { ...c, label } : c)),
    }));
  };

  const submit = async () => {
    if (!formData.finished_good_id) {
      showError("Please select a Finished Good");
      return;
    }
    const validCols = formData.columns.filter((c) => c.label.trim() !== "");
    if (validCols.length === 0) {
      showError("Please add at least one column label");
      return;
    }
    setSubmitting(true);
    try {
      const client = getApiClient();
      const payload = {
        finished_good_id: formData.finished_good_id,
        columns_definition: { columns: validCols.map((c) => c.label.trim()) },
        is_active: formData.is_active,
      };
      if (editMode && currentId) {
        await client.put(`/granulation-templates/${currentId}`, payload);
        showSuccess("Template updated");
      } else {
        await client.post("/granulation-templates", payload);
        showSuccess("Template saved");
      }
      setModalVisible(false);
      loadAll();
    } catch {
      showError("Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      label: "Finished Good",
      key: "finished_good",
      flex: 2,
      render: (v, row) => row.finished_good?.product_name || "-",
    },
    {
      label: "Sieve Columns",
      key: "columns_definition",
      flex: 3,
      render: (v) =>
        (v?.columns || []).join(" | ") || "-",
    },
    {
      label: "Status",
      key: "is_active",
      flex: 1,
      render: (v) => (v ? "Active" : "Inactive"),
    },
    {
      label: "Created",
      key: "created_at",
      flex: 1,
      render: (v) => (v ? formatISTDate(v) : "-"),
    },
  ];

  return (
    <Layout title="Granulation Template" navigation={navigation}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary || "#3b82f6"} />
        </View>
      ) : (
        <DataTable
          columns={columns}
          data={templates}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search templates..."
        />
      )}

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? "Edit Granulation Template" : "Add Granulation Template"}
      >
        <View>
          <Text style={styles.label}>Finished Good *</Text>
          <View style={styles.selectBox}>
            <select
              value={formData.finished_good_id ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  finished_good_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              style={{ width: "100%", paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12, fontSize: 14, border: "none", backgroundColor: "transparent" }}
            >
              <option value="">Select a Finished Good</option>
              {finishedGoods.map((fg) => (
                <option key={fg.id} value={fg.id}>
                  {fg.product_name}
                </option>
              ))}
            </select>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>
            Sieve Column Labels
          </Text>
          {formData.columns.map((col, index) => (
            <View key={col.id} style={styles.columnRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={col.label}
                onChangeText={(v) => updateColumnLabel(col.id, v)}
                placeholder={index === 0 ? "e.g. 1000 µ or Throughs" : "Column label"}
              />
              <TouchableOpacity
                onPress={() => removeColumn(col.id)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addColBtn} onPress={addColumn}>
            <Text style={styles.addColText}>+ Add Column</Text>
          </TouchableOpacity>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Status</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                formData.is_active ? styles.toggleOn : styles.toggleOff,
              ]}
              onPress={() =>
                setFormData({ ...formData, is_active: !formData.is_active })
              }
            >
              <Text style={styles.toggleText}>
                {formData.is_active ? "Active" : "Inactive"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setModalVisible(false)}
              disabled={submitting}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={submit}
              disabled={submitting}
            >
              <Text style={styles.btnPrimaryText}>
                {submitting ? "Saving..." : editMode ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fff",
  },
  selectBox: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    backgroundColor: "#fff", overflow: "hidden",
  },
  columnRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  removeBtn: { padding: 8 },
  removeText: { color: "#ef4444", fontSize: 18, fontWeight: "bold" },
  addColBtn: { paddingVertical: 8, alignSelf: "flex-start" },
  addColText: { color: colors.primary || "#3b82f6", fontWeight: "700", fontSize: 14 },
  statusRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 16,
  },
  toggle: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  toggleOn: { backgroundColor: "#10b981" },
  toggleOff: { backgroundColor: "#9ca3af" },
  toggleText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnGhostText: { color: "#374151", fontWeight: "600" },
  btnPrimary: { backgroundColor: "#3b82f6" },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
});
