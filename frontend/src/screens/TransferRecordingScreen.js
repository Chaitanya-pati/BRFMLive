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
  TextInput,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { transfer12HourApi } from "../api/client";
import { showSuccess, showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferRecordingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [transfers, setTransfers] = useState([]);
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
      const [ordersRes, transfersRes] = await Promise.all([
        transfer12HourApi.getAvailableProductionOrders(),
        transfer12HourApi.getSessions(),
      ]);

      const orders = ordersRes.data || [];
      const allTransfers = transfersRes.data || [];

      // Get 24-hour transfer records
      const transfer24hRes = await fetch("/api/24hour-transfer/records");
      const transfer24h = await transfer24hRes.json();

      // Combine and sort orders by created_at descending
      const combinedOrders = orders.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      // Enrich orders with transfer status
      const enrichedOrders = combinedOrders.map((order) => {
        const orderTransfers = [
          ...(allTransfers.filter((t) => t.production_order_id === order.id) || []),
          ...(transfer24h.filter((t) => t.production_order_id === order.id) || []),
        ];

        // Determine combined status
        const completedCount = orderTransfers.filter(
          (t) => t.status === "COMPLETED"
        ).length;
        const totalCount = orderTransfers.length;

        let status = "CREATED";
        if (totalCount > 0) {
          if (completedCount === totalCount) {
            status = "COMPLETED";
          } else if (completedCount > 0) {
            status = "IN_PROGRESS";
          } else {
            status = "PLANNED";
          }
        }

        return {
          ...order,
          transfers: orderTransfers,
          combinedStatus: status,
          completedCount,
          totalCount,
        };
      });

      setProductionOrders(enrichedOrders);
      setTransfers([...(allTransfers || []), ...(transfer24h || [])]);
    } catch (error) {
      showError("Error", "Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureParameters = (transfer) => {
    setSelectedTransfer(transfer);
    setWaterAdded(transfer.water_added?.toString() || "");
    setMoistureLevel(transfer.moisture_level?.toString() || "");
    setShowParametersModal(true);
  };

  const handleSaveParameters = async () => {
    if (!selectedTransfer) return;

    setSavingParams(true);
    try {
      await transfer12HourApi.updateTransfer(selectedTransfer.id, {
        water_added: parseFloat(waterAdded) || null,
        moisture_level: parseFloat(moistureLevel) || null,
      });

      showSuccess("Success", "Parameters saved successfully");
      setShowParametersModal(false);
      loadData();
    } catch (error) {
      showError("Error", "Failed to save parameters");
      console.error(error);
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
          {order.transfers.map((transfer) => (
            <View key={transfer.id} style={styles.transferDetail}>
              <View style={styles.transferHeader}>
                <Text style={styles.transferLabel}>
                  {transfer.source_bin_number || transfer.source_bin_id} →{" "}
                  {transfer.destination_bin_number || transfer.destination_bin_id}
                </Text>
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

              {transfer.status === "COMPLETED" &&
                (transfer.water_added === null ||
                  transfer.moisture_level === null) && (
                  <Button
                    title="Add Parameters"
                    onPress={() => handleCaptureParameters(transfer)}
                    style={styles.paramButton}
                  />
                )}

              {transfer.water_added !== null && (
                <Text style={styles.paramValue}>
                  Water: {transfer.water_added}L
                </Text>
              )}
              {transfer.moisture_level !== null && (
                <Text style={styles.paramValue}>
                  Moisture: {transfer.moisture_level}%
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  return (
    <Layout title="24-Hour Transfer Records" navigation={navigation}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <ScrollView>
            {productionOrders.length === 0 ? (
              <Text style={styles.emptyText}>
                No production orders found
              </Text>
            ) : (
              productionOrders.map(renderOrderCard)
            )}
          </ScrollView>
        )}

        <Modal visible={showParametersModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Transfer Parameters</Text>

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
  transferDetail: {
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  paramButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  paramValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
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
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
});
