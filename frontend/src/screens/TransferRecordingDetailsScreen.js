import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import Card from "../components/Card";
import Button from "../components/Button";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showSuccess, showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

// ----- Live elapsed timer hook -----
function useElapsedTimer(startTimeStr) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!startTimeStr) return;
    const tick = () => {
      const start = new Date(startTimeStr);
      const now = new Date();
      const diffMs = now - start;
      if (diffMs < 0) { setElapsed("0s"); return; }
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      if (h > 0) setElapsed(`${h}h ${m}m ${s}s`);
      else if (m > 0) setElapsed(`${m}m ${s}s`);
      else setElapsed(`${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTimeStr]);
  return elapsed;
}

// ----- Timer badge component -----
function TimerBadge({ startTime }) {
  const elapsed = useElapsedTimer(startTime);
  return (
    <View style={styles.timerBadge}>
      <View style={styles.timerDot} />
      <Text style={styles.timerText}>{elapsed}</Text>
    </View>
  );
}

export default function TransferRecordingDetailsScreen({ route, navigation }) {
  const { order } = route.params;

  const [destBins, setDestBins] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingBinId, setStartingBinId] = useState(null); // bin being started

  // Complete modal state
  const [completeModal, setCompleteModal] = useState(null); // { transfer, plannedQty }
  const [formQty, setFormQty] = useState("");
  const [formWater, setFormWater] = useState("");
  const [formMoisture, setFormMoisture] = useState("");
  const [saving, setSaving] = useState(false);

  // Params modal (add water/moisture to completed)
  const [paramsModal, setParamsModal] = useState(null);
  const [paramWater, setParamWater] = useState("");
  const [paramMoisture, setParamMoisture] = useState("");
  const [savingParams, setSavingParams] = useState(false);

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

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- derived state ----------
  const getTransferForBin = (binId) =>
    transfers.find((t) => t.destination_bin_id === binId);

  const plannedBins = destBins.filter((db_) => !getTransferForBin(db_.bin_id));
  const inProgressTransfers = transfers.filter((t) => t.status === "IN_PROGRESS");
  const completedTransfers = transfers.filter((t) => t.status === "COMPLETED");

  // Helper: find planned qty for a given destination_bin_id
  const plannedQtyForBin = (binId) => {
    const b = destBins.find((d) => d.bin_id === binId);
    return b?.quantity ?? 0;
  };

  // ---------- START (no modal — immediate) ----------
  const handleStart = async (bin) => {
    setStartingBinId(bin.bin_id);
    try {
      const client = getApiClient();
      await client.post("/transfer/start", {
        production_order_id: order.id,
        destination_bin_id: bin.bin_id,
      });
      await showSuccess("Transfer started");
      loadData();
    } catch (err) {
      console.error("Start error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to start transfer");
    } finally {
      setStartingBinId(null);
    }
  };

  // ---------- COMPLETE modal ----------
  const openCompleteModal = (transfer) => {
    const pq = plannedQtyForBin(transfer.destination_bin_id);
    setFormQty(pq > 0 ? String(pq) : "");
    setFormWater(transfer.water_added?.toString() || "");
    setFormMoisture(transfer.moisture_level?.toString() || "");
    setCompleteModal({ transfer, plannedQty: pq });
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    const qty = parseFloat(formQty);
    if (!formQty || isNaN(qty) || qty <= 0) {
      showError("Validation", "Please enter a valid quantity");
      return;
    }
    setSaving(true);
    try {
      const client = getApiClient();
      await client.post(`/transfer/${completeModal.transfer.id}/complete`, {
        quantity_transferred: qty,
        water_added: formWater ? parseFloat(formWater) : null,
        moisture_level: formMoisture ? parseFloat(formMoisture) : null,
      });
      await showSuccess("Transfer completed");
      setCompleteModal(null);
      loadData();
    } catch (err) {
      console.error("Complete error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to complete transfer");
    } finally {
      setSaving(false);
    }
  };

  // ---------- PARAMS modal (add water/moisture to completed) ----------
  const openParamsModal = (transfer) => {
    setParamWater(transfer.water_added?.toString() || "");
    setParamMoisture(transfer.moisture_level?.toString() || "");
    setParamsModal(transfer);
  };

  const handleSaveParams = async () => {
    if (!paramsModal) return;
    setSavingParams(true);
    try {
      const client = getApiClient();
      await client.patch(`/24hour-transfer/records/${paramsModal.id}`, {
        water_added: paramWater ? parseFloat(paramWater) : null,
        moisture_level: paramMoisture ? parseFloat(paramMoisture) : null,
      });
      await showSuccess("Parameters saved");
      setParamsModal(null);
      loadData();
    } catch (err) {
      console.error("Params error:", err);
      showError("Error", "Failed to save parameters");
    } finally {
      setSavingParams(false);
    }
  };

  // ---------- name helpers ----------
  const binDisplayName = (bin) =>
    bin?.bin?.bin_number || `Bin #${bin?.bin_id ?? "?"}`;

  const transferBinName = (t) =>
    t.destination_bin?.bin_number || `Bin #${t.destination_bin_id}`;

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
            <StatBox label="Completed" value={completedTransfers.length} color="#059669" />
            <StatBox label="Total Bins" value={destBins.length} color={colors.primary} />
          </View>

          {/* ---- PLANNED BINS ---- */}
          {plannedBins.length > 0 && (
            <Section title="PLANNED — NOT STARTED" color="#3b82f6">
              {plannedBins.map((bin) => (
                <Card key={bin.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemTitle}>
                        Destination: {binDisplayName(bin)}
                      </Text>
                      <Text style={styles.itemSub}>
                        Planned Quantity: {bin.quantity} kg
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: "#3b82f622", borderColor: "#3b82f6" }]}>
                      <Text style={[styles.statusPillText, { color: "#3b82f6" }]}>PLANNED</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#3b82f6", opacity: startingBinId === bin.bin_id ? 0.6 : 1 }]}
                    onPress={() => handleStart(bin)}
                    disabled={startingBinId === bin.bin_id}
                  >
                    {startingBinId === bin.bin_id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>▶ Start Transfer</Text>
                    )}
                  </TouchableOpacity>
                </Card>
              ))}
            </Section>
          )}

          {/* ---- IN PROGRESS ---- */}
          {inProgressTransfers.length > 0 && (
            <Section title="IN PROGRESS" color="#f59e0b">
              {inProgressTransfers.map((t) => (
                <Card key={t.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemTitle}>
                        Destination: {transferBinName(t)}
                      </Text>
                      <Text style={styles.itemSub}>
                        Started: {t.transfer_start_time ? formatISTDateTime(t.transfer_start_time) : "—"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={[styles.statusPill, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b" }]}>
                        <Text style={[styles.statusPillText, { color: "#f59e0b" }]}>IN PROGRESS</Text>
                      </View>
                      {t.transfer_start_time && (
                        <TimerBadge startTime={t.transfer_start_time} />
                      )}
                    </View>
                  </View>

                  {/* Transfer details row */}
                  <View style={styles.detailsRow}>
                    <DetailBox
                      label="Destination Bin"
                      value={transferBinName(t)}
                    />
                    <DetailBox
                      label="Planned Qty"
                      value={`${plannedQtyForBin(t.destination_bin_id)} kg`}
                    />
                    <DetailBox
                      label="Water Added"
                      value={t.water_added != null ? `${t.water_added} L` : "—"}
                    />
                    <DetailBox
                      label="Moisture"
                      value={t.moisture_level != null ? `${t.moisture_level}%` : "—"}
                    />
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

          {/* ---- COMPLETED ---- */}
          {completedTransfers.length > 0 && (
            <Section title="COMPLETED" color="#059669">
              {completedTransfers.map((t) => {
                const needsParams =
                  t.water_added == null ||
                  t.moisture_level == null;
                return (
                  <Card key={t.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemTitle}>
                          Destination: {transferBinName(t)}
                        </Text>
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
                      <DetailBox label="Destination Bin" value={transferBinName(t)} />
                      <DetailBox label="Qty Transferred" value={t.quantity_transferred != null ? `${t.quantity_transferred} kg` : "—"} />
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
                Go to Production Planning to configure bins first.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ---- COMPLETE TRANSFER MODAL ---- */}
      <Modal visible={!!completeModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Transfer</Text>
            <Text style={styles.modalSub}>
              Bin: {completeModal ? transferBinName(completeModal.transfer) : ""}
            </Text>

            <InputField
              label="Quantity Transferred (kg)"
              value={formQty}
              onChangeText={setFormQty}
              keyboardType="decimal-pad"
              placeholder="Enter quantity"
            />
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
              <Button
                title="Cancel"
                onPress={() => setCompleteModal(null)}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Complete"
                onPress={handleComplete}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- ADD PARAMS MODAL ---- */}
      <Modal visible={!!paramsModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSub}>Update water and moisture details</Text>
            <InputField
              label="Water Added (Litres)"
              value={paramWater}
              onChangeText={setParamWater}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%)"
              value={paramMoisture}
              onChangeText={setParamMoisture}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setParamsModal(null)}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save"
                onPress={handleSaveParams}
                loading={savingParams}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

// ---------- Sub-components ----------
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

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
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

  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    fontVariant: ["tabular-nums"],
  },

  detailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  detailBox: {
    flex: 1,
    minWidth: 80,
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
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
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
  modalCard: { width: "90%", maxWidth: 420, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 14, lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
