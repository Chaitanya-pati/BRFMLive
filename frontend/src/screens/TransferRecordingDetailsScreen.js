import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import Card from "../components/Card";
import Button from "../components/Button";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showSuccess, showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferRecordingDetailsScreen({ route, navigation }) {
  const { order } = route.params;

  const [destBins, setDestBins] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state — shared for Start, Complete, and Parameters actions
  const [modal, setModal] = useState(null);
  // modal = { type: 'start'|'complete'|'params', transfer?: {}, bin?: {} }

  const [formQty, setFormQty] = useState("");
  const [formWater, setFormWater] = useState("");
  const [formMoisture, setFormMoisture] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [binsRes, historyRes] = await Promise.all([
        client.get(`/transfer/destination-bins/${order.id}`),
        client.get(`/transfer/order/${order.id}/history`),
      ]);
      setDestBins(binsRes.data || []);
      setTransfers(historyRes.data || []);
    } catch (err) {
      console.error("Error loading transfer details:", err);
      showError("Error", "Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- helpers ----------
  const getTransferForBin = (binId) =>
    transfers.find((t) => t.destination_bin_id === binId);

  // Bins from destination config that don't yet have any active/completed record
  const plannedBins = destBins.filter((db_) => {
    const existing = getTransferForBin(db_.bin_id);
    return !existing; // no record at all
  });

  const inProgressTransfers = transfers.filter(
    (t) => t.status === "IN_PROGRESS"
  );

  const completedTransfers = transfers.filter(
    (t) => t.status === "COMPLETED"
  );

  // ---------- Open modals ----------
  const openStartModal = (bin) => {
    setFormWater("");
    setFormMoisture("");
    setModal({ type: "start", bin });
  };

  const openCompleteModal = (transfer) => {
    setFormQty("");
    setFormWater(transfer.water_added?.toString() || "");
    setFormMoisture(transfer.moisture_level?.toString() || "");
    setModal({ type: "complete", transfer });
  };

  const openParamsModal = (transfer) => {
    setFormWater(transfer.water_added?.toString() || "");
    setFormMoisture(transfer.moisture_level?.toString() || "");
    setModal({ type: "params", transfer });
  };

  const closeModal = () => setModal(null);

  // ---------- Actions ----------
  const handleStart = async () => {
    if (!modal?.bin) return;
    setSaving(true);
    try {
      const client = getApiClient();
      await client.post("/transfer/start", {
        production_order_id: order.id,
        destination_bin_id: modal.bin.bin_id,
        water_added: formWater ? parseFloat(formWater) : null,
        moisture_level: formMoisture ? parseFloat(formMoisture) : null,
      });
      await showSuccess("Transfer started successfully");
      closeModal();
      loadData();
    } catch (err) {
      console.error("Start error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to start transfer");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!modal?.transfer) return;
    if (!formQty || isNaN(parseFloat(formQty))) {
      showError("Validation", "Please enter a valid quantity");
      return;
    }
    setSaving(true);
    try {
      const client = getApiClient();
      await client.post(`/transfer/${modal.transfer.id}/complete`, {
        quantity_transferred: parseFloat(formQty),
        water_added: formWater ? parseFloat(formWater) : null,
        moisture_level: formMoisture ? parseFloat(formMoisture) : null,
      });
      await showSuccess("Transfer completed");
      closeModal();
      loadData();
    } catch (err) {
      console.error("Complete error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to complete transfer");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParams = async () => {
    if (!modal?.transfer) return;
    setSaving(true);
    try {
      const client = getApiClient();
      await client.patch(`/24hour-transfer/records/${modal.transfer.id}`, {
        water_added: formWater ? parseFloat(formWater) : null,
        moisture_level: formMoisture ? parseFloat(formMoisture) : null,
      });
      await showSuccess("Parameters saved");
      closeModal();
      loadData();
    } catch (err) {
      console.error("Params error:", err);
      showError("Error", "Failed to save parameters");
    } finally {
      setSaving(false);
    }
  };

  const totalCount = transfers.length;
  const completedCount = completedTransfers.length;

  // ---------- Render helpers ----------
  const binDisplayName = (bin) => {
    if (bin?.bin) return bin.bin.bin_number || `Bin #${bin.bin_id}`;
    if (bin?.bin_number) return bin.bin_number;
    return `Bin #${bin?.bin_id ?? "?"}`;
  };

  const transferBinName = (t) => {
    if (t.destination_bin?.bin_number) return t.destination_bin.bin_number;
    return `Bin #${t.destination_bin_id}`;
  };

  const statusColor = (s) =>
    s === "COMPLETED" ? "#059669" : s === "IN_PROGRESS" ? "#f59e0b" : "#3b82f6";

  // ---------- UI ----------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{order.order_number}</Text>
          <Text style={styles.headerSubtitle}>
            {formatISTDateTime(order.created_at)}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBox label="Planned" value={plannedBins.length} color="#3b82f6" />
            <StatBox label="In Progress" value={inProgressTransfers.length} color="#f59e0b" />
            <StatBox label="Completed" value={completedCount} color="#059669" />
            <StatBox label="Total Bins" value={destBins.length} color={colors.primary} />
          </View>

          {/* PLANNED BINS */}
          {plannedBins.length > 0 && (
            <Section title="PLANNED — NOT STARTED" color="#3b82f6">
              {plannedBins.map((bin) => (
                <Card key={bin.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemTitle}>→ {binDisplayName(bin)}</Text>
                      <Text style={styles.itemSub}>
                        Planned Qty: {bin.quantity} kg
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: "#3b82f622", borderColor: "#3b82f6" }]}>
                      <Text style={[styles.statusPillText, { color: "#3b82f6" }]}>PLANNED</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#3b82f6" }]}
                    onPress={() => openStartModal(bin)}
                  >
                    <Text style={styles.actionBtnText}>▶ Start Transfer</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </Section>
          )}

          {/* IN PROGRESS */}
          {inProgressTransfers.length > 0 && (
            <Section title="IN PROGRESS" color="#f59e0b">
              {inProgressTransfers.map((t) => (
                <Card key={t.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemTitle}>→ {transferBinName(t)}</Text>
                      <Text style={styles.itemSub}>
                        Started: {t.transfer_start_time ? formatISTDateTime(t.transfer_start_time) : "—"}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b" }]}>
                      <Text style={[styles.statusPillText, { color: "#f59e0b" }]}>IN PROGRESS</Text>
                    </View>
                  </View>
                  <View style={styles.detailsRow}>
                    <DetailBox label="Water Added" value={t.water_added != null ? `${t.water_added} L` : "—"} />
                    <DetailBox label="Moisture" value={t.moisture_level != null ? `${t.moisture_level}%` : "—"} />
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#059669" }]}
                    onPress={() => openCompleteModal(t)}
                  >
                    <Text style={styles.actionBtnText}>✓ Complete Transfer</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </Section>
          )}

          {/* COMPLETED */}
          {completedTransfers.length > 0 && (
            <Section title="COMPLETED" color="#059669">
              {completedTransfers.map((t) => {
                const needsParams =
                  (t.water_added === null || t.water_added === 0) ||
                  (t.moisture_level === null || t.moisture_level === 0);
                return (
                  <Card key={t.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemTitle}>→ {transferBinName(t)}</Text>
                        <Text style={styles.itemSub}>
                          {t.transfer_start_time ? formatISTDateTime(t.transfer_start_time) : "—"}
                          {t.transfer_end_time ? ` → ${formatISTDateTime(t.transfer_end_time)}` : ""}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: "#05996922", borderColor: "#059669" }]}>
                        <Text style={[styles.statusPillText, { color: "#059669" }]}>COMPLETED</Text>
                      </View>
                    </View>
                    <View style={styles.detailsRow}>
                      <DetailBox label="Quantity" value={t.quantity_transferred != null ? `${t.quantity_transferred} kg` : "—"} />
                      <DetailBox label="Water Added" value={t.water_added != null ? `${t.water_added} L` : "—"} />
                      <DetailBox label="Moisture" value={t.moisture_level != null ? `${t.moisture_level}%` : "—"} />
                    </View>
                    {needsParams && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#6366f1" }]}
                        onPress={() => openParamsModal(t)}
                      >
                        <Text style={styles.actionBtnText}>➕ Add Water & Moisture</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })}
            </Section>
          )}

          {plannedBins.length === 0 && transfers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Transfer Data</Text>
              <Text style={styles.emptySub}>
                No destination bins have been planned for this order yet.{"\n"}
                Go to Production Planning to set up bins first.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ---- START TRANSFER MODAL ---- */}
      <Modal visible={modal?.type === "start"} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Transfer</Text>
            <Text style={styles.modalSub}>
              Bin: {modal?.bin ? binDisplayName(modal.bin) : ""}{"\n"}
              Planned Qty: {modal?.bin?.quantity} kg
            </Text>
            <InputField
              label="Water Added (Litres) — optional"
              value={formWater}
              onChangeText={setFormWater}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%) — optional"
              value={formMoisture}
              onChangeText={setFormMoisture}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Start" onPress={handleStart} loading={saving} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- COMPLETE TRANSFER MODAL ---- */}
      <Modal visible={modal?.type === "complete"} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Transfer</Text>
            <Text style={styles.modalSub}>
              Bin: {modal?.transfer ? transferBinName(modal.transfer) : ""}
            </Text>
            <InputField
              label="Quantity Transferred (kg)"
              value={formQty}
              onChangeText={setFormQty}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Water Added (Litres)"
              value={formWater}
              onChangeText={setFormWater}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%)"
              value={formMoisture}
              onChangeText={setFormMoisture}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Complete" onPress={handleComplete} loading={saving} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- ADD PARAMS MODAL ---- */}
      <Modal visible={modal?.type === "params"} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSub}>Update water and moisture details</Text>
            <InputField
              label="Water Added (Litres)"
              value={formWater}
              onChangeText={setFormWater}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%)"
              value={formMoisture}
              onChangeText={setFormMoisture}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={closeModal} variant="secondary" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Save" onPress={handleSaveParams} loading={saving} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, color, children }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailBox({ label, value }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  headerBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { fontSize: 13, fontWeight: "600", color: colors.primary, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: colors.text?.primary || "#111" },
  headerSubtitle: { fontSize: 10, color: colors.text?.secondary || "#6b7280", marginTop: 2 },
  refreshBtn: {
    padding: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  refreshBtnText: { fontSize: 16, color: colors.primary },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  content: { flex: 1, padding: 14 },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 9, color: colors.text?.secondary || "#6b7280", fontWeight: "600", marginTop: 2 },

  section: { marginBottom: 16 },
  sectionHeader: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  sectionBody: { gap: 10 },

  itemCard: { marginBottom: 0 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemLeft: { flex: 1, marginRight: 10 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text?.primary || "#111" },
  itemSub: { fontSize: 11, color: colors.text?.secondary || "#6b7280", marginTop: 3 },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: "700" },

  detailsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  detailBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  detailLabel: { fontSize: 9, color: "#9ca3af", fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 12, fontWeight: "700", color: "#374151" },

  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151", marginBottom: 8 },
  emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 20 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    maxWidth: 420,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
