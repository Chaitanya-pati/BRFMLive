import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showSuccess, showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferRecordingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showParametersModal, setShowParametersModal] = useState(false);
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");
  const [savingParams, setSavingParams] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      
      // Fetch all required data in parallel
      const [ordersRes, records24hRes, records12hRes] = await Promise.all([
        client.get("/production-orders"),
        client.get("/24hour-transfer/records"),
        client.get("/12hour-transfer/records"),
      ]);

      const orders = ordersRes.data || [];
      const records24h = records24hRes.data || [];
      const records12h = records12hRes.data || [];

      // Combine and process orders
      const enrichedOrders = orders
        .map((order) => {
          // Get all transfers for this order (both 24h and 12h)
          const transfers24h = records24h.filter(
            (t) => t.production_order_id === order.id
          );
          const transfers12h = records12h.filter(
            (t) => t.production_order_id === order.id
          );
          
          const allTransfers = [...transfers24h, ...transfers12h];
          
          if (allTransfers.length === 0) {
            return null; // Skip orders with no transfers
          }

          // Calculate combined status
          const completedCount = allTransfers.filter(
            (t) => t.status === "COMPLETED"
          ).length;
          const totalCount = allTransfers.length;

          let combinedStatus = "CREATED";
          if (totalCount > 0) {
            if (completedCount === totalCount) {
              combinedStatus = "COMPLETED";
            } else if (completedCount > 0) {
              combinedStatus = "IN_PROGRESS";
            } else {
              combinedStatus = "PLANNED";
            }
          }

          return {
            ...order,
            allTransfers,
            transfers24h,
            transfers12h,
            completedCount,
            totalCount,
            combinedStatus,
          };
        })
        .filter((order) => order !== null)
        // Sort by created_at descending
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });

      setProductionOrders(enrichedOrders);
    } catch (error) {
      showError("Error", "Failed to load data");
      console.error("Error loading transfer records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureParameters = (transfer, isFrom24h = false) => {
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
      loadData();
    } catch (error) {
      showError("Error", "Failed to save parameters");
      console.error("Error saving parameters:", error);
    } finally {
      setSavingParams(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "#059669";
      case "IN_PROGRESS":
        return "#f59e0b";
      case "PLANNED":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getTransferType = (transfer) => {
    return transfer.source_bin_id ? "12-Hour" : "24-Hour";
  };

  const renderTransferItem = (transfer, isFrom24h) => {
    const hasParameters =
      transfer.water_added !== null && transfer.moisture_level !== null;
    const isCompleted = transfer.status === "COMPLETED";
    const needsParameters = isCompleted && !hasParameters;

    return (
      <View key={transfer.id} style={styles.transferDetail}>
        <View style={styles.transferHeader}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferType}>{getTransferType(transfer)}</Text>
            <Text style={styles.transferLabel}>
              {transfer.source_bin_id
                ? `${transfer.source_bin_id} → ${transfer.destination_bin_id}`
                : `Bin ${transfer.destination_bin_id}`}
            </Text>
          </View>
          <Text
            style={[
              styles.transferStatus,
              {
                color:
                  transfer.status === "COMPLETED" ? "#059669" : "#f59e0b",
              },
            ]}
          >
            {transfer.status}
          </Text>
        </View>

        {transfer.quantity_transferred && (
          <Text style={styles.paramValue}>
            Qty: {transfer.quantity_transferred} kg
          </Text>
        )}

        {transfer.water_added !== null && (
          <Text style={styles.paramValue}>Water: {transfer.water_added}L</Text>
        )}
        {transfer.moisture_level !== null && (
          <Text style={styles.paramValue}>
            Moisture: {transfer.moisture_level}%
          </Text>
        )}

        {needsParameters && (
          <TouchableOpacity
            style={styles.paramButton}
            onPress={() => handleCaptureParameters(transfer, isFrom24h)}
          >
            <Text style={styles.paramButtonText}>+ Add Parameters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderOrderCard = (order) => (
    <Card key={order.id} style={styles.orderCard}>
      <TouchableOpacity
        onPress={() =>
          setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
        }
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Text style={styles.orderDate}>
              {formatISTDateTime(order.created_at)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.combinedStatus) },
            ]}
          >
            <Text style={styles.statusText}>{order.combinedStatus}</Text>
          </View>
        </View>

        {order.totalCount > 0 && (
          <Text style={styles.transferCount}>
            Transfers: {order.completedCount}/{order.totalCount} completed
          </Text>
        )}
      </TouchableOpacity>

      {expandedOrderId === order.id && (
        <View style={styles.expandedContent}>
          {order.transfers24h.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>24-Hour Transfers</Text>
              {order.transfers24h.map((t) => renderTransferItem(t, true))}
            </View>
          )}

          {order.transfers12h.length > 0 && (
            <View style={{ marginTop: order.transfers24h.length > 0 ? 12 : 0 }}>
              <Text style={styles.sectionTitle}>12-Hour Transfers</Text>
              {order.transfers12h.map((t) => renderTransferItem(t, false))}
            </View>
          )}
        </View>
      )}
    </Card>
  );

  return (
    <Layout title="24-Hour Transfer Records" navigation={navigation}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : productionOrders.length === 0 ? (
          <Text style={styles.emptyText}>No production orders found</Text>
        ) : (
          <ScrollView>
            {productionOrders.map(renderOrderCard)}
          </ScrollView>
        )}

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
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  orderCard: {
    marginBottom: 12,
    paddingBottom: 0,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  transferCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  transferDetail: {
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transferInfo: {
    flex: 1,
  },
  transferType: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  transferLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  transferStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  paramValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  paramButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.info,
    borderRadius: 6,
    alignItems: "center",
  },
  paramButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 32,
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
