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
    // Show button if water_added OR moisture_level is missing or 0
    const needsParameters =
      transfer.status === "COMPLETED" &&
      (transfer.water_added === null ||
        transfer.water_added === 0 ||
        transfer.moisture_level === null ||
        transfer.moisture_level === 0);

    return (
      <Card key={transfer.id} style={styles.transferCard}>
        <View style={styles.transferCardContent}>
          {/* Header: Bin info and status */}
          <View style={styles.transferHeader}>
            <View style={styles.binInfo}>
              <Text style={styles.binLabel}>
                {transfer.source_bin_id
                  ? `Bin ${transfer.source_bin_id} → Bin ${transfer.destination_bin_id}`
                  : `To Bin ${transfer.destination_bin_id}`}
              </Text>
              <Text style={styles.transferTime}>
                {transfer.transfer_start_time
                  ? formatISTDateTime(transfer.transfer_start_time)
                  : ""}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    transfer.status === "COMPLETED"
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color: transfer.status === "COMPLETED" ? "#fff" : "#fff",
                  },
                ]}
              >
                {transfer.status}
              </Text>
            </View>
          </View>

          {/* Details: Quantity, Water, Moisture */}
          <View style={styles.detailsRow}>
            {transfer.quantity_transferred && (
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {transfer.quantity_transferred} kg
                </Text>
              </View>
            )}

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Water Added</Text>
              <Text style={styles.detailValue}>
                {transfer.water_added !== null ? `${transfer.water_added}L` : "—"}
              </Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Moisture</Text>
              <Text style={styles.detailValue}>
                {transfer.moisture_level !== null
                  ? `${transfer.moisture_level}%`
                  : "—"}
              </Text>
            </View>
          </View>

          {/* Add Parameters Button */}
          {needsParameters && (
            <TouchableOpacity
              style={styles.paramButton}
              onPress={() => handleCaptureParameters(transfer, isFrom24h)}
            >
              <Text style={styles.paramButtonText}>
                ➕ Add Water & Moisture
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
        <View style={styles.headerInfo}>
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
                  ? colors.success
                  : order.combinedStatus === "IN_PROGRESS"
                  ? colors.warning
                  : colors.primaryLight,
            },
          ]}
        >
          <Text style={styles.headerStatusText}>
            {order.combinedStatus}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
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

        {/* Transfer List */}
        {order.transfers24h.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>24-HOUR TRANSFERS</Text>
              <Text style={styles.sectionBadge}>
                {order.transfers24h.filter((t) => t.status === "COMPLETED")
                  .length}/{order.transfers24h.length}
              </Text>
            </View>
            <View style={styles.transfersList}>
              {order.transfers24h.map((t) => renderTransferItem(t, true))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Parameters Modal */}
      <Modal visible={showParametersModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSubtitle}>
              Enter water and moisture details
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sectionBadge: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  transfersList: {
    gap: 10,
  },
  transferCard: {
    overflow: "hidden",
  },
  transferCardContent: {
    padding: 12,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  binInfo: {
    flex: 1,
    marginRight: 10,
  },
  binLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 3,
  },
  transferTime: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 70,
    alignItems: "center",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  detailBox: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    fontSize: 9,
    color: colors.text.secondary,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.primary,
  },
  paramButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: "center",
  },
  paramButtonText: {
    color: "#fff",
    fontSize: 12,
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
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
});
