import React, { useState, useEffect } from "react";
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

export default function TransferRecordingDetailsScreen({ route, navigation }) {
  const { order } = route.params;
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showParametersModal, setShowParametersModal] = useState(false);
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");
  const [savingParams, setSavingParams] = useState(false);

  const handleCaptureParameters = (transfer, isFrom24h) => {
    setSelectedTransfer({
      ...transfer,
      isFrom24h,
    });
    setWaterAdded(transfer.water_added?.toString() || "");
    setMoistureLevel(transfer.moisture_level?.toString() || "");
    setShowParametersModal(true);
  };

  const handleSaveParameters = async () => {
    if (!selectedTransfer) return;

    setSavingParams(true);
    try {
      const client = getApiClient();
      const endpoint = selectedTransfer.isFrom24h
        ? `/24hour-transfer/records/${selectedTransfer.id}`
        : `/12hour-transfer/records/${selectedTransfer.id}`;

      await client.patch(endpoint, {
        water_added: waterAdded ? parseFloat(waterAdded) : null,
        moisture_level: moistureLevel ? parseFloat(moistureLevel) : null,
      });

      showSuccess("Success", "Parameters saved successfully");
      setShowParametersModal(false);
      navigation.goBack();
    } catch (error) {
      showError("Error", "Failed to save parameters");
      console.error("Error saving parameters:", error);
    } finally {
      setSavingParams(false);
    }
  };

  const renderTransferItem = (transfer, isFrom24h) => {
    const hasParameters =
      transfer.water_added !== null && transfer.moisture_level !== null;
    const isCompleted = transfer.status === "COMPLETED";
    const needsParameters = isCompleted && !hasParameters;

    return (
      <Card key={transfer.id} style={styles.transferCard}>
        <View style={styles.transferTypeTag}>
          <Text style={styles.transferTypeText}>
            {isFrom24h ? "24-HOUR" : "12-HOUR"}
          </Text>
        </View>

        <View style={styles.transferContent}>
          <View style={styles.transferTitleRow}>
            <Text style={styles.transferTitle}>
              {transfer.source_bin_id
                ? `Bin ${transfer.source_bin_id} → Bin ${transfer.destination_bin_id}`
                : `To Bin ${transfer.destination_bin_id}`}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    transfer.status === "COMPLETED" ? "#d1fae5" : "#fef3c7",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      transfer.status === "COMPLETED" ? "#059669" : "#b45309",
                  },
                ]}
              >
                {transfer.status}
              </Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            {transfer.quantity_transferred && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {transfer.quantity_transferred} kg
                </Text>
              </View>
            )}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Water Added</Text>
              <Text style={styles.detailValue}>
                {transfer.water_added !== null ? `${transfer.water_added}L` : "—"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Moisture Level</Text>
              <Text style={styles.detailValue}>
                {transfer.moisture_level !== null
                  ? `${transfer.moisture_level}%`
                  : "—"}
              </Text>
            </View>
          </View>

          {transfer.transfer_start_time && (
            <Text style={styles.timestamp}>
              Started: {formatISTDateTime(transfer.transfer_start_time)}
            </Text>
          )}

          {needsParameters && (
            <TouchableOpacity
              style={styles.paramButtonLarge}
              onPress={() => handleCaptureParameters(transfer, isFrom24h)}
            >
              <Text style={styles.paramButtonTextLarge}>
                ➕ Add Water & Moisture Parameters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{order.order_number}</Text>
          <Text style={styles.headerSubtitle}>
            {formatISTDateTime(order.created_at)}
          </Text>
        </View>
        <View
          style={[
            styles.headerStatusBadge,
            {
              backgroundColor:
                order.combinedStatus === "COMPLETED"
                  ? "#d1fae5"
                  : order.combinedStatus === "IN_PROGRESS"
                  ? "#fef3c7"
                  : "#dbeafe",
            },
          ]}
        >
          <Text
            style={[
              styles.headerStatusText,
              {
                color:
                  order.combinedStatus === "COMPLETED"
                    ? "#059669"
                    : order.combinedStatus === "IN_PROGRESS"
                    ? "#b45309"
                    : "#1e40af",
              },
            ]}
          >
            {order.combinedStatus}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Transfers</Text>
            <Text style={styles.statValue}>{order.totalCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{order.completedCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>
              {order.totalCount - order.completedCount}
            </Text>
          </View>
        </View>

        {order.transfers24h.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>24-Hour Transfers</Text>
            <Text style={styles.sectionSubtitle}>
              {order.transfers24h.filter((t) => t.status === "COMPLETED").length}/
              {order.transfers24h.length} completed
            </Text>
            {order.transfers24h.map((t) => renderTransferItem(t, true))}
          </View>
        )}

      </ScrollView>

      <Modal visible={showParametersModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSubtitle}>
              Enter water and moisture details for this transfer
            </Text>

            <InputField
              label="Water Added (Litres)"
              value={waterAdded}
              onChangeText={setWaterAdded}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <InputField
              label="Moisture Level (%)"
              value={moistureLevel}
              onChangeText={setMoistureLevel}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowParametersModal(false)}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save"
                onPress={handleSaveParameters}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  transferCard: {
    marginBottom: 12,
    overflow: "hidden",
  },
  transferTypeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  transferTypeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  transferContent: {
    padding: 12,
  },
  transferTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transferTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  detailItem: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  paramButtonLarge: {
    backgroundColor: colors.info,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  paramButtonTextLarge: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
});
