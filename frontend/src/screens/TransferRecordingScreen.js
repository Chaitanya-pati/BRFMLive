import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

const STAGES = {
  SELECT_ORDER: "SELECT_ORDER",
  SELECT_BIN: "SELECT_BIN",
  TRANSFER_IN_PROGRESS: "TRANSFER_IN_PROGRESS",
  PARAMETERS_INPUT: "PARAMETERS_INPUT",
  DIVERT_OR_STOP: "DIVERT_OR_STOP",
  HISTORY: "HISTORY",
};

export default function TransferRecordingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Data states
  const [plannedOrders, setPlannedOrders] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI states
  const [stage, setStage] = useState(STAGES.SELECT_ORDER);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [currentTransfer, setCurrentTransfer] = useState(null);
  const [timer, setTimer] = useState(0);

  // Parameters states
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");
  const [errors, setErrors] = useState({});

  // Timer effect
  useEffect(() => {
    let interval;
    if (stage === STAGES.TRANSFER_IN_PROGRESS) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  // Fetch planned orders on mount
  useEffect(() => {
    fetchPlannedOrders();
  }, []);

  const fetchPlannedOrders = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get("/transfer/planned-orders");
      setPlannedOrders(response.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch planned orders");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get(`/transfer/destination-bins/${order.id}`);
      setDestinationBins(response.data || []);
      
      // Fetch transfer history for this order
      const historyResponse = await client.get(`/transfer/order/${order.id}/history`);
      setTransferHistory(historyResponse.data || []);
      
      setStage(STAGES.SELECT_BIN);
    } catch (error) {
      showAlert("Error", "Failed to fetch destination bins");
      setSelectedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransfer = async (destBin) => {
    setSelectedBin(destBin);
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.post("/transfer/start", {
        production_order_id: selectedOrder.id,
        destination_bin_id: destBin.bin_id,
      });
      // Store the planned quantity from the selection
      const transferData = {
        ...response.data,
        quantity_planned: destBin.quantity
      };
      setCurrentTransfer(transferData);
      setTimer(0);
      setWaterAdded("");
      setMoistureLevel("");
      setErrors({});
      setStage(STAGES.TRANSFER_IN_PROGRESS);
    } catch (error) {
      showAlert("Error", "Failed to start transfer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTransfer = () => {
    setStage(STAGES.PARAMETERS_INPUT);
  };

  const validateParameters = () => {
    const newErrors = {};

    if (!waterAdded || waterAdded.trim() === "") {
      newErrors.waterAdded = "Water added is required";
    } else if (isNaN(parseFloat(waterAdded))) {
      newErrors.waterAdded = "Must be a number";
    } else if (parseFloat(waterAdded) < 0) {
      newErrors.waterAdded = "Cannot be negative";
    }

    if (!moistureLevel || moistureLevel.trim() === "") {
      newErrors.moistureLevel = "Moisture level is required";
    } else if (isNaN(parseFloat(moistureLevel))) {
      newErrors.moistureLevel = "Must be a number";
    } else if (parseFloat(moistureLevel) < 0 || parseFloat(moistureLevel) > 100) {
      newErrors.moistureLevel = "Must be 0-100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStopTransfer = async () => {
    if (!validateParameters()) return;

    setLoading(true);
    try {
      const client = getApiClient();
      await client.post(`/transfer/${currentTransfer.id}/complete`, {
        water_added: parseFloat(waterAdded),
        moisture_level: parseFloat(moistureLevel),
      });
      showToast("Transfer completed successfully");
      
      // Refresh history
      const historyResponse = await client.get(`/transfer/order/${selectedOrder.id}/history`);
      setTransferHistory(historyResponse.data || []);
      
      // Reset to select bin stage
      setCurrentTransfer(null);
      setWaterAdded("");
      setMoistureLevel("");
      setErrors({});
      setStage(STAGES.SELECT_BIN);
    } catch (error) {
      showAlert("Error", "Failed to complete transfer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDivertBin = async (nextBin) => {
    if (!validateParameters()) return;

    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.post(
        `/transfer/${currentTransfer.id}/divert/${nextBin.bin_id}`,
        {
          water_added: parseFloat(waterAdded),
          moisture_level: parseFloat(moistureLevel),
        }
      );
      
      showToast("Transfer diverted successfully");
      
      // Start new transfer
      const nextBinTransferData = {
        ...response.data,
        quantity_planned: nextBin.quantity
      };
      setCurrentTransfer(nextBinTransferData);
      setTimer(0);
      setWaterAdded("");
      setMoistureLevel("");
      setErrors({});
      setSelectedBin(nextBin);
      
      // Refresh history
      const historyResponse = await client.get(`/transfer/order/${selectedOrder.id}/history`);
      setTransferHistory(historyResponse.data || []);
      
      setStage(STAGES.TRANSFER_IN_PROGRESS);
    } catch (error) {
      showAlert("Error", "Failed to divert transfer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate available bins for divert using useMemo to prevent hook violations
  const availableBinsForDivert = useMemo(() => {
    if (!selectedBin || !destinationBins) return [];
    
    // Get completed transfer bin IDs
    const completedBinIds = transferHistory
      .filter(t => t.status === 'COMPLETED')
      .map(t => t.destination_bin_id);
    
    return destinationBins.filter(
      (bin) => bin.bin_id !== selectedBin.bin_id && !completedBinIds.includes(bin.bin_id)
    );
  }, [destinationBins, selectedBin, transferHistory]);

  // STAGE: SELECT ORDER
  if (stage === STAGES.SELECT_ORDER) {
    return (
      <Layout>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Transfer Recording</Text>
          <Text style={styles.subtitle}>Select Production Order</Text>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : plannedOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No planned orders available</Text>
            </View>
          ) : (
            <FlatList
              data={plannedOrders}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.orderCard}
                  onPress={() => handleSelectOrder(item)}
                >
                  <View style={styles.orderCardContent}>
                    <Text style={styles.orderNumber}>{item.order_number}</Text>
                    <Text style={styles.orderDetail}>Qty: {item.quantity} kg</Text>
                    <Text style={styles.orderDetail}>Target: {formatISTDateTime(item.target_finish_date)}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </ScrollView>
      </Layout>
    );
  }

  // STAGE: SELECT BIN
  if (stage === STAGES.SELECT_BIN) {
    return (
      <Layout>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Destination Bin</Text>
            <Button
              title="← Back"
              onPress={() => {
                setStage(STAGES.SELECT_ORDER);
                setSelectedOrder(null);
                setDestinationBins([]);
              }}
              variant="secondary"
              style={styles.backBtn}
            />
          </View>

          <View style={styles.orderInfoCard}>
            <Text style={styles.orderInfoTitle}>{selectedOrder.order_number}</Text>
            <Text style={styles.orderInfoDetail}>Total Quantity: {selectedOrder.quantity} kg</Text>
          </View>

          <Text style={styles.subtitle}>Available Bins</Text>

          {destinationBins.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No destination bins configured</Text>
            </View>
          ) : (
            <FlatList
              data={destinationBins}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.binCard}>
                  <View style={styles.binCardContent}>
                    <Text style={styles.binNumber}>{item.bin.bin_number}</Text>
                    <Text style={styles.binDetail}>Capacity: {item.bin.capacity} kg</Text>
                    <Text style={styles.binDetail}>To Transfer: {item.quantity} kg</Text>
                  </View>
                  <Button
                    title="START"
                    onPress={() => handleStartTransfer(item)}
                    style={styles.startBtn}
                  />
                </View>
              )}
            />
          )}

          {transferHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent Transfers</Text>
              {transferHistory.slice(0, 3).map((transfer) => (
                <View key={transfer?.id} style={styles.historyCard}>
                  <Text style={styles.historyBin}>To Bin: {transfer?.destination_bin?.bin_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: transfer?.status === 'COMPLETED' ? '#10b981' : '#f97316' }]}>
                    <Text style={styles.statusText}>{transfer?.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Layout>
    );
  }

  // STAGE: TRANSFER IN PROGRESS
  if (stage === STAGES.TRANSFER_IN_PROGRESS && currentTransfer) {
    return (
      <Layout>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Transfer In Progress</Text>

          <View style={styles.monitoringCard}>
            <View style={styles.timerSection}>
              <Text style={styles.timerLabel}>Duration</Text>
              <Text style={styles.timerDisplay}>{formatTime(timer)}</Text>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>To Bin:</Text>
                <Text style={styles.value}>{currentTransfer?.destination_bin?.bin_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Qty Transferred:</Text>
                <Text style={styles.value}>{currentTransfer?.quantity_transferred || 0} kg</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Qty Planned:</Text>
                <Text style={styles.value}>{currentTransfer?.quantity_planned} kg</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Started:</Text>
                <Text style={styles.value}>{formatISTDateTime(currentTransfer?.transfer_start_time)}</Text>
              </View>
            </View>

            {selectedOrder?.source_bins && selectedOrder.source_bins.length > 0 && (
              <View style={styles.blendSection}>
                <Text style={styles.blendTitle}>Source Blend %:</Text>
                {selectedOrder.source_bins.map((bin, idx) => (
                  <View key={idx} style={styles.blendRow}>
                    <Text style={styles.blendLabel}>{bin?.bin?.bin_number}:</Text>
                    <Text style={styles.blendValue}>{bin?.blend_percentage}%</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <Button
              title="Stop Transfer"
              onPress={handleCompleteTransfer}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </Layout>
    );
  }

  // STAGE: PARAMETERS INPUT
  if (stage === STAGES.PARAMETERS_INPUT) {
    return (
      <Layout>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
          <ScrollView style={styles.container}>
            <Text style={styles.title}>Complete Transfer</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>Enter parameters before stopping or diverting</Text>
            </View>

            <View style={styles.binContext}>
              <Text style={styles.binContextLabel}>Current Bin: {currentTransfer?.destination_bin?.bin_number}</Text>
            </View>

            <InputField
              label="Water Added (Litres)"
              placeholder="Enter amount"
              value={waterAdded}
              onChangeText={setWaterAdded}
              keyboardType="decimal-pad"
              error={errors.waterAdded}
            />

            <InputField
              label="Moisture Level (%)"
              placeholder="0-100"
              value={moistureLevel}
              onChangeText={setMoistureLevel}
              keyboardType="decimal-pad"
              error={errors.moistureLevel}
            />

            <View style={styles.actionButtons}>
              {availableBinsForDivert.length > 0 && (
                <View>
                  <Text style={styles.divertLabel}>Divert to Next Bin:</Text>
                  <FlatList
                    data={availableBinsForDivert}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <Button
                        title={`Divert to ${item.bin.bin_number}`}
                        onPress={() => handleDivertBin(item)}
                        loading={loading}
                        style={styles.divertBtn}
                      />
                    )}
                  />
                </View>
              )}

              <Button
                title="Stop Transfer"
                onPress={handleStopTransfer}
                loading={loading}
                style={styles.stopBtn}
              />

              <Button
                title="Back"
                onPress={() => setStage(STAGES.TRANSFER_IN_PROGRESS)}
                variant="secondary"
                style={styles.backBtn}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Layout>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContainer: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginVertical: 12,
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  orderCardContent: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  orderDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  arrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "bold",
  },
  orderInfoCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  orderInfoDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  binCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  binCardContent: {
    flex: 1,
  },
  binNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  binDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  startBtn: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  historySection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyBin: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.white,
  },
  monitoringCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: "monospace",
  },
  detailsSection: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  blendSection: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 10,
  },
  blendTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  blendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  blendLabel: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  blendValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    marginVertical: 8,
  },
  infoCard: {
    backgroundColor: colors.lightGray,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  binContext: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  binContextLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionButtons: {
    gap: 12,
    marginVertical: 20,
  },
  divertLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  divertBtn: {
    marginVertical: 8,
    backgroundColor: "#06b6d4",
    paddingVertical: 12,
  },
  stopBtn: {
    marginVertical: 12,
    backgroundColor: "#10b981",
    paddingVertical: 14,
  },
});
