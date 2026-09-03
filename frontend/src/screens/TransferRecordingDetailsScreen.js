import React, { useState, useEffect, useCallback } from "react";
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
import BinVisual from "../components/BinVisual";
import BinNumberHighlight from "../components/BinNumberHighlight";
import MagnetCleaningPanel from "../components/MagnetCleaningPanel";
import colors from "../theme/colors";
import { getApiClient, productionLabTestApi } from "../api/client";
import { showSuccess, showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";
import { redirectAfterAllTransfersComplete } from "../utils/processRedirects";

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
  const { order, returnToPipeline } = route.params;

  const goBackOrPipeline = () => {
    if (returnToPipeline) {
      navigation.navigate('ProductionPipeline', { orderId: order.id });
    } else {
      navigation.goBack();
    }
  };

  const [sourceBins, setSourceBins] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [availableBins, setAvailableBins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Start modal state
  const [startModal, setStartModal] = useState(false);
  const [startBinId, setStartBinId] = useState("");
  const [startWater, setStartWater] = useState("");
  const [startSaving, setStartSaving] = useState(false);

  // Complete modal state
  const [completeModal, setCompleteModal] = useState(null); // { transfer }
  const [formQty, setFormQty] = useState("");
  const [formMoisture, setFormMoisture] = useState("");
  const [saving, setSaving] = useState(false);

  // Lab test state
  const [labTest, setLabTest] = useState(null);
  const [labTestModal, setLabTestModal] = useState(false);
  const [labTestForm, setLabTestForm] = useState({ moisture: "", gluten: "", sedimentation_value: "", tested_by: "" });
  const [savingLabTest, setSavingLabTest] = useState(false);

  // Params modal (edit moisture/water on completed)
  const [paramsModal, setParamsModal] = useState(null);
  const [paramWater, setParamWater] = useState("");
  const [paramMoisture, setParamMoisture] = useState("");
  const [savingParams, setSavingParams] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [historyRes, planningRes, binsRes, labTestRes] = await Promise.all([
        client.get(`/transfer/order/${order.id}/history`),
        client.get(`/production-orders/${order.id}/planning`).catch(() => ({ data: null })),
        client.get("/bins/destination"),
        productionLabTestApi.getByOrder(order.id).catch(() => ({ data: null })),
      ]);
      setTransfers(historyRes.data || []);
      setSourceBins(planningRes.data?.source_bins || []);
      setAvailableBins(binsRes.data || []);
      setLabTest(labTestRes.data || null);
    } catch (err) {
      console.error("Error loading transfer details:", err);
      showError("Error", "Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- derived state ----------
  const inProgressTransfers = transfers.filter((t) => t.status === "IN_PROGRESS");
  const completedTransfers = transfers.filter((t) => t.status === "COMPLETED");

  // Total planned (raw wheat) quantity from source bin configuration
  const totalPlannedQty = sourceBins.reduce(
    (sum, sb) => sum + (parseFloat(sb.quantity) || 0),
    0
  );
  // Total raw wheat already pulled into 24-hour bins (counts both completed
  // and currently running transfers — running ones reserve their share too).
  const totalTransferredQty = transfers.reduce(
    (sum, t) => sum + (parseFloat(t.quantity_transferred) || 0),
    0
  );
  // When the planned quantity is fully consumed, the raw wheat bins are
  // "locked" in the Pipeline view → the 24-hour transfer must lock too.
  const planLocked =
    totalPlannedQty > 0 && totalTransferredQty >= totalPlannedQty - 0.0001;
  const orderQuantity = parseFloat(order.quantity) || totalPlannedQty;
  const remainingQty = Math.max(orderQuantity - totalTransferredQty, 0);

  const canStartNew = inProgressTransfers.length === 0 && !planLocked;

  const getAvailableCapacity = (bin, reservedQuantity = 0) => {
    if (!bin) return 0;
    return Math.max(
      (parseFloat(bin.capacity) || 0) -
        (parseFloat(bin.current_quantity) || 0) +
        reservedQuantity,
      0
    );
  };

  const startDestinationBin = availableBins.find(
    (bin) => String(bin.id) === String(startBinId)
  );
  const startAvailableCapacity = getAvailableCapacity(startDestinationBin);

  const completeDestinationBin = completeModal
    ? availableBins.find(
        (bin) => Number(bin.id) === Number(completeModal.transfer.destination_bin_id)
      ) || completeModal.transfer.destination_bin
    : null;
  const completeOtherTransferredQty = completeModal
    ? transfers.reduce(
        (sum, t) =>
          t.id === completeModal.transfer.id
            ? sum
            : sum + (parseFloat(t.quantity_transferred) || 0),
        0
      )
    : 0;
  const completeOrderRemaining = Math.max(
    orderQuantity - completeOtherTransferredQty,
    0
  );
  const completeCapacityRemaining = getAvailableCapacity(
    completeDestinationBin,
    parseFloat(completeModal?.transfer?.quantity_transferred) || 0
  );
  const completeAllowedQuantity = Math.min(
    completeOrderRemaining,
    completeCapacityRemaining
  );
  const enteredCompleteQty = parseFloat(formQty);
  const completeQuantityExceedsLimit =
    Number.isFinite(enteredCompleteQty) &&
    enteredCompleteQty > completeAllowedQuantity + 0.0001;

  // ---------- START MODAL ----------
  const openStartModal = () => {
    const binWithCapacity = availableBins.find(
      (bin) => getAvailableCapacity(bin) > 0.0001
    );
    setStartBinId(binWithCapacity ? String(binWithCapacity.id) : "");
    setStartWater("");
    setStartModal(true);
  };

  const handleConfirmStart = async () => {
    if (!startBinId) {
      showError("Validation", "Please select a destination bin");
      return;
    }
    if (startAvailableCapacity <= 0.0001) {
      showError(
        "Destination Bin Full",
        `This bin has no available capacity. It can hold ${(
          parseFloat(startDestinationBin?.capacity) || 0
        ).toFixed(2)} T and currently contains ${(
          parseFloat(startDestinationBin?.current_quantity) || 0
        ).toFixed(2)} T.`
      );
      return;
    }
    if (remainingQty <= 0.0001) {
      showError(
        "Production Order Complete",
        "There is no remaining production order quantity available to transfer."
      );
      return;
    }
    setStartSaving(true);
    try {
      const client = getApiClient();
      await client.post("/transfer/start", {
        production_order_id: order.id,
        destination_bin_id: parseInt(startBinId, 10),
        water_added: startWater ? parseFloat(startWater) : null,
      });
      await showSuccess("Transfer started");
      setStartModal(false);
      if (returnToPipeline) {
        navigation.navigate('ProductionPipeline', { orderId: order.id });
        return;
      }
      loadData();
    } catch (err) {
      console.error("Start error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to start transfer");
    } finally {
      setStartSaving(false);
    }
  };

  // ---------- COMPLETE modal ----------
  const openCompleteModal = (transfer) => {
    setFormQty("");
    setFormMoisture(transfer.moisture_level?.toString() || "");
    setCompleteModal({ transfer });
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    const qty = parseFloat(formQty);
    if (!formQty || isNaN(qty) || qty <= 0) {
      showError("Validation", "Please enter a valid quantity");
      return;
    }
    if (qty > completeAllowedQuantity + 0.0001) {
      const reasons = [];
      if (qty > completeCapacityRemaining + 0.0001) {
        reasons.push(
          `destination bin has only ${completeCapacityRemaining.toFixed(2)} T available`
        );
      }
      if (qty > completeOrderRemaining + 0.0001) {
        reasons.push(
          `production order has only ${completeOrderRemaining.toFixed(2)} T remaining`
        );
      }
      showError(
        "Transfer Quantity Too High",
        `Enter ${completeAllowedQuantity.toFixed(2)} T or less: ${reasons.join(
          " and "
        )}.`
      );
      return;
    }
    setSaving(true);
    try {
      const client = getApiClient();
      await client.post(`/transfer/${completeModal.transfer.id}/complete`, {
        quantity_transferred: qty,
        moisture_level: formMoisture ? parseFloat(formMoisture) : null,
      });
      await showSuccess("Transfer completed");
      setCompleteModal(null);

      const freshHistory = await client.get(`/transfer/order/${order.id}/history`);
      const freshTransfers = freshHistory.data || [];
      const freshCompleted = freshTransfers.filter((t) => t.status === "COMPLETED");
      setTransfers(freshTransfers);

      // Redirect if all started transfers are now completed and at least one done
      if (freshCompleted.length > 0 && freshCompleted.length === freshTransfers.length) {
        redirectAfterAllTransfersComplete(navigation, returnToPipeline, order.id);
      } else if (returnToPipeline) {
        navigation.navigate('ProductionPipeline', { orderId: order.id });
      }
    } catch (err) {
      console.error("Complete error:", err);
      showError("Error", err?.response?.data?.detail || "Failed to complete transfer");
    } finally {
      setSaving(false);
    }
  };

  // ---------- PARAMS modal (edit water/moisture on completed) ----------
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

  // ---------- LAB TEST SUBMIT ----------
  const handleSubmitLabTest = async () => {
    const { moisture, gluten, sedimentation_value, tested_by } = labTestForm;
    if (!moisture || !gluten || !sedimentation_value) {
      showError("Validation", "Moisture %, Gluten %, and Sedimentation Value are required");
      return;
    }
    const m = parseFloat(moisture);
    const g = parseFloat(gluten);
    const sv = parseFloat(sedimentation_value);
    if (isNaN(m) || isNaN(g) || isNaN(sv)) {
      showError("Validation", "Please enter valid numeric values");
      return;
    }
    setSavingLabTest(true);
    try {
      const res = await productionLabTestApi.create({
        production_order_id: order.id,
        moisture: m,
        gluten: g,
        sedimentation_value: sv,
        tested_by: tested_by.trim() || null,
      });
      setLabTest(res.data);
      setLabTestModal(false);
      setLabTestForm({ moisture: "", gluten: "", sedimentation_value: "", tested_by: "" });
      await showSuccess("Lab test recorded successfully");
    } catch (err) {
      showError("Error", err?.response?.data?.detail || "Failed to save lab test");
    } finally {
      setSavingLabTest(false);
    }
  };

  // ---------- name helpers ----------
  const transferBinName = (t) =>
    t.destination_bin?.bin_number || `Bin #${t.destination_bin_id}`;

  // ---------- UI ----------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={goBackOrPipeline}>
          <Text style={styles.backButton}>{returnToPipeline ? '← Pipeline' : '← Back'}</Text>
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
            <StatBox label="In Progress" value={inProgressTransfers.length} color="#f59e0b" />
            <StatBox label="Completed" value={completedTransfers.length} color="#059669" />
            <StatBox label="Total" value={transfers.length} color={colors.primary} />
          </View>

          {/* ---- START NEW TRANSFER ---- */}
          <Section title="24-HOUR TRANSFER" color="#3b82f6">
            {/* LAB TEST GATE */}
            {labTest ? (
              <View style={styles.labTestCard}>
                <View style={styles.labTestHeader}>
                  <Text style={styles.labTestTitle}>✅ Lab Test Recorded</Text>
                  {labTest.tested_by ? (
                    <Text style={styles.labTestMeta}>By: {labTest.tested_by}</Text>
                  ) : null}
                </View>
                <View style={styles.labTestValues}>
                  <View style={styles.labTestItem}>
                    <Text style={styles.labTestLabel}>Moisture</Text>
                    <Text style={styles.labTestValue}>{labTest.moisture}%</Text>
                  </View>
                  <View style={styles.labTestItem}>
                    <Text style={styles.labTestLabel}>Gluten</Text>
                    <Text style={styles.labTestValue}>{labTest.gluten}%</Text>
                  </View>
                  <View style={styles.labTestItem}>
                    <Text style={styles.labTestLabel}>SV</Text>
                    <Text style={styles.labTestValue}>{labTest.sedimentation_value}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.labTestRequired}>
                <Text style={styles.labTestRequiredIcon}>🧪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labTestRequiredTitle}>Lab Test Required</Text>
                  <Text style={styles.labTestRequiredSub}>
                    Submit Moisture %, Gluten %, and Sedimentation Value before starting a transfer.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.labTestSubmitBtn}
                  onPress={() => {
                    setLabTestForm({ moisture: "", gluten: "", sedimentation_value: "", tested_by: "" });
                    setLabTestModal(true);
                  }}
                >
                  <Text style={styles.labTestSubmitBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            )}

            <Card style={styles.itemCard}>
              {sourceBins.length > 0 && (
                <View style={styles.sourceSummary}>
                  <Text style={styles.sourceSummaryTitle}>Source Bins</Text>
                  {sourceBins.map((sb, i) => {
                    const binName = sb.bin_number || (sb.bin && sb.bin.bin_number) || `Bin #${sb.bin_id}`;
                    return (
                      <View key={sb.bin_id || i} style={styles.sourceSummaryRow}>
                        <Text style={styles.sourceSummaryBin}>{binName}</Text>
                        <Text style={styles.sourceSummaryPct}>{sb.blend_percentage}%</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {totalPlannedQty > 0 && (
                <View style={styles.planSummary}>
                  <Text style={styles.planSummaryLabel}>Plan Progress</Text>
                  <Text style={styles.planSummaryValue}>
                    {totalTransferredQty.toFixed(2)} T / {totalPlannedQty.toFixed(2)} T
                    {planLocked ? "  🔒" : `  • ${remainingQty.toFixed(2)} T left`}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: planLocked
                      ? "#9ca3af"
                      : canStartNew && labTest
                      ? "#3b82f6"
                      : "#9ca3af",
                  },
                ]}
                onPress={openStartModal}
                disabled={!canStartNew || !labTest}
              >
                <Text style={styles.actionBtnText}>
                  {planLocked
                    ? "🔒 Plan Limit Reached — 24h Transfer Locked"
                    : !labTest
                    ? "⚠️ Submit Lab Test First"
                    : inProgressTransfers.length === 0
                    ? "▶ Start New Transfer"
                    : "⏳ Transfer In Progress"}
                </Text>
              </TouchableOpacity>
            </Card>
          </Section>

          {/* ---- IN PROGRESS ---- */}
          {inProgressTransfers.length > 0 && (
            <Section title="IN PROGRESS" color="#f59e0b">
              {inProgressTransfers.map((t) => (
                <Card key={t.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.itemTitle}>Destination:</Text>
                        <BinNumberHighlight value={transferBinName(t)} compact />
                      </View>
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

                  <View style={styles.detailsRow}>
                    <DetailBox label="Destination Bin" value={transferBinName(t)} />
                    <DetailBox
                      label="Water Added"
                      value={t.water_added != null ? `${t.water_added} L` : "—"}
                    />
                    <DetailBox
                      label="Moisture"
                      value={t.moisture_level != null ? `${t.moisture_level}%` : "—"}
                    />
                  </View>

                  {sourceBins.length > 0 && (
                    <SourceBinsBreakdown sourceBins={sourceBins} />
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#059669" }]}
                    onPress={() => openCompleteModal(t)}
                  >
                    <Text style={styles.actionBtnText}>✓ Complete Transfer</Text>
                  </TouchableOpacity>

                  <MagnetCleaningPanel
                    productionOrderId={order.id}
                    sourceBinId={sourceBins[0]?.bin_id || null}
                    destinationBinId={t.destination_bin_id}
                    sourceName={
                      sourceBins[0]?.bin_number ||
                      sourceBins[0]?.bin?.bin_number ||
                      (sourceBins[0]?.bin_id
                        ? `Bin #${sourceBins[0].bin_id}`
                        : "Source")
                    }
                    destName={transferBinName(t)}
                    runningTime={t.transfer_start_time ? "in progress" : ""}
                  />
                </Card>
              ))}
            </Section>
          )}

          {/* ---- COMPLETED ---- */}
          {completedTransfers.length > 0 && (
            <Section title="COMPLETED" color="#059669">
              {completedTransfers.map((t) => {
                const needsParams = t.moisture_level == null;
                return (
                  <Card key={t.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemTitleRow}>
                          <Text style={styles.itemTitle}>Destination:</Text>
                          <BinNumberHighlight value={transferBinName(t)} compact />
                        </View>
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
                      <DetailBox label="Qty Transferred" value={t.quantity_transferred != null ? `${t.quantity_transferred} T` : "—"} />
                      <DetailBox label="Water Added" value={t.water_added != null ? `${t.water_added} L` : "—"} />
                      <DetailBox label="Moisture" value={t.moisture_level != null ? `${t.moisture_level}%` : "—"} />
                    </View>
                    {sourceBins.length > 0 && (
                      <SourceBinsBreakdown sourceBins={sourceBins} />
                    )}
                    {needsParams && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#6366f1" }]}
                        onPress={() => openParamsModal(t)}
                      >
                        <Text style={styles.actionBtnText}>➕ Add Moisture Data</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })}
            </Section>
          )}

          {transfers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Transfers Yet</Text>
              <Text style={styles.emptySub}>
                Use the "Start New Transfer" button above to begin.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ---- LAB TEST MODAL ---- */}
      <Modal visible={labTestModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>🧪 Lab Test — Raw Wheat</Text>
            <Text style={styles.modalSub}>
              Order: {order.order_number}
            </Text>

            <InputField
              label="Moisture (%)*"
              value={labTestForm.moisture}
              onChangeText={(v) => setLabTestForm((f) => ({ ...f, moisture: v }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 12.5"
            />
            <InputField
              label="Gluten (%)*"
              value={labTestForm.gluten}
              onChangeText={(v) => setLabTestForm((f) => ({ ...f, gluten: v }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 28.0"
            />
            <InputField
              label="Sedimentation Value (SV)*"
              value={labTestForm.sedimentation_value}
              onChangeText={(v) => setLabTestForm((f) => ({ ...f, sedimentation_value: v }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 35"
            />
            <InputField
              label="Tested By (optional)"
              value={labTestForm.tested_by}
              onChangeText={(v) => setLabTestForm((f) => ({ ...f, tested_by: v }))}
              placeholder="Name of lab technician"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setLabTestModal(false)}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Submit Lab Test"
                onPress={handleSubmitLabTest}
                loading={savingLabTest}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- START TRANSFER MODAL ---- */}
      <Modal visible={startModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Transfer</Text>
            <Text style={styles.modalSub}>Select destination bin and enter water added</Text>

            <Text style={styles.fieldLabel}>Destination Bin (24-Hour Bin)</Text>
            {availableBins.length === 0 ? (
              <Text style={styles.noBinsText}>No 24-hour bins available</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.binPickerRow}>
                {availableBins.map((bin) => (
                  <View key={bin.id} style={{ marginRight: 10 }}>
                    <BinVisual
                      binNumber={bin.bin_number}
                      capacity={bin.capacity}
                      currentQuantity={bin.current_quantity}
                      size="sm"
                      isSelected={startBinId === String(bin.id)}
                      onPress={() => setStartBinId(String(bin.id))}
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            <InputField
              label="Water Added (Litres) — optional"
              value={startWater}
              onChangeText={setStartWater}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setStartModal(false)}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Start Transfer"
                onPress={handleConfirmStart}
                loading={startSaving}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- COMPLETE TRANSFER MODAL ---- */}
      <Modal visible={!!completeModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Transfer</Text>
            <Text style={styles.modalSub}>
              Bin: {completeModal ? transferBinName(completeModal.transfer) : ""}
            </Text>

            <InputField
              label="Quantity Transferred (T)"
              value={formQty}
              onChangeText={setFormQty}
              keyboardType="decimal-pad"
              placeholder="Enter quantity"
              error={
                completeQuantityExceedsLimit
                  ? `Maximum allowed: ${completeAllowedQuantity.toFixed(2)} T`
                  : undefined
              }
            />
            <View
              style={[
                styles.limitNotice,
                completeQuantityExceedsLimit && styles.limitNoticeError,
              ]}
            >
              <Text style={styles.limitNoticeText}>
                Destination capacity available: {completeCapacityRemaining.toFixed(2)} T
              </Text>
              <Text style={styles.limitNoticeText}>
                Production order remaining: {completeOrderRemaining.toFixed(2)} T
              </Text>
            </View>
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
                disabled={
                  saving ||
                  !formQty ||
                  !Number.isFinite(enteredCompleteQty) ||
                  enteredCompleteQty <= 0 ||
                  completeQuantityExceedsLimit
                }
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ---- PARAMS MODAL (edit water/moisture on completed) ---- */}
      <Modal visible={!!paramsModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Transfer Parameters</Text>
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

// ---------- Source bins breakdown (no specific quantity needed) ----------
function SourceBinsBreakdown({ sourceBins }) {
  if (!sourceBins || sourceBins.length === 0) return null;
  return (
    <View style={styles.srcBreakdownWrap}>
      <Text style={styles.srcBreakdownTitle}>Source Bin Blend</Text>
      {sourceBins.map((sb, i) => {
        const binName = sb.bin_number || (sb.bin && sb.bin.bin_number) || `Bin #${sb.bin_id}`;
        return (
          <View key={sb.bin_id || i} style={styles.srcBreakdownRow}>
                        <BinNumberHighlight
                          value={binName}
                          compact
                          textStyle={styles.srcBreakdownBin}
                        />
            <Text style={styles.srcBreakdownPct}>{sb.blend_percentage}%</Text>
          </View>
        );
      })}
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
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  sectionBody: { gap: 8 },

  itemCard: { marginBottom: 0 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemLeft: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text?.primary || "#111" },
  itemSub: { fontSize: 11, color: colors.text?.secondary || "#6b7280", marginTop: 3 },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  timerText: { fontSize: 10, fontWeight: "600", color: "#92400e" },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  detailBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 80,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  detailLabel: { fontSize: 9, color: "#6b7280", fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 12, fontWeight: "700", color: "#111827" },

  actionBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  sourceSummary: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  sourceSummaryTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sourceSummaryBin: { fontSize: 12, fontWeight: "600", color: "#0c4a6e" },
  sourceSummaryPct: { fontSize: 12, fontWeight: "700", color: "#0369a1" },

  planSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  planSummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planSummaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350f",
  },
  limitNotice: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  limitNoticeError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  limitNoticeText: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },

  srcBreakdownWrap: {
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  srcBreakdownTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  srcBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  srcBreakdownBin: { fontSize: 11, color: "#374151", fontWeight: "600" },
  srcBreakdownPct: { fontSize: 11, color: "#6366f1", fontWeight: "700" },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 20 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: { width: "100%", maxWidth: 440 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 16 },
  modalActions: { flexDirection: "row", marginTop: 16 },

  binPickerRow: {
    marginVertical: 8,
    paddingBottom: 4,
  },
  noBinsText: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginVertical: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  nativeSelect: {
    width: "100%",
    padding: 10,
    fontSize: 14,
    border: "none",
    backgroundColor: "transparent",
    color: "#111827",
    outlineStyle: "none",
  },

  // ---- Lab Test styles ----
  labTestCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86efac",
    padding: 12,
    marginBottom: 10,
  },
  labTestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labTestTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },
  labTestMeta: {
    fontSize: 11,
    color: "#6b7280",
  },
  labTestValues: {
    flexDirection: "row",
    gap: 8,
  },
  labTestItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  labTestLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  labTestValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#15803d",
  },
  labTestRequired: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fdba74",
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  labTestRequiredIcon: {
    fontSize: 24,
  },
  labTestRequiredTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c2410c",
    marginBottom: 2,
  },
  labTestRequiredSub: {
    fontSize: 11,
    color: "#92400e",
    lineHeight: 16,
  },
  labTestSubmitBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  labTestSubmitBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
