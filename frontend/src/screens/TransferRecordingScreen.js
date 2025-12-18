import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferRecordingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [plannedOrders, setPlannedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [destinationBins, setDestinationBins] = useState([]);
  const [loadingBins, setLoadingBins] = useState(false);

  useEffect(() => {
    fetchPlannedOrders();
  }, []);

  const fetchPlannedOrders = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get("/api/transfer/planned-orders");
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
    setLoadingBins(true);
    try {
      const client = getApiClient();
      const response = await client.get(`/api/transfer/destination-bins/${order.id}`);
      setDestinationBins(response.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch destination bins");
      setSelectedOrder(null);
    } finally {
      setLoadingBins(false);
    }
  };

  const handleStartTransfer = async (destBin) => {
    try {
      const client = getApiClient();
      const response = await client.post("/api/transfer/start", {
        production_order_id: selectedOrder.id,
        destination_bin_id: destBin.bin_id,
      });
      showToast("Transfer started successfully");
      navigation.navigate("MonitorTransfer", { transfer: response.data });
    } catch (error) {
      showAlert("Error", "Failed to start transfer");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading planned orders...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Transfer Recording</Text>

        {!selectedOrder ? (
          <View>
            <Text style={styles.subtitle}>Select Production Order</Text>
            {plannedOrders.length === 0 ? (
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
                      <Text style={styles.orderNumber}>Order: {item.order_number}</Text>
                      <Text style={styles.orderDetail}>Quantity: {item.quantity} kg</Text>
                      <Text style={styles.orderDetail}>
                        Target: {formatISTDateTime(item.target_finish_date)}
                      </Text>
                    </View>
                    <Text style={styles.selectArrow}>→</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : (
          <View>
            <View style={styles.selectedOrderContainer}>
              <Text style={styles.selectedOrderTitle}>{selectedOrder.order_number}</Text>
              <Button
                text="Back to Orders"
                onPress={() => {
                  setSelectedOrder(null);
                  setDestinationBins([]);
                }}
                variant="secondary"
                style={{ marginVertical: 10 }}
              />
            </View>

            <Text style={styles.subtitle}>Select Destination Bin</Text>

            {loadingBins ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : destinationBins.length === 0 ? (
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
                      <Text style={styles.binNumber}>Bin: {item.bin.bin_number}</Text>
                      <Text style={styles.binDetail}>Capacity: {item.bin.capacity} kg</Text>
                      <Text style={styles.binDetail}>To Transfer: {item.quantity} kg</Text>
                    </View>
                    <Button
                      text="START"
                      onPress={() => handleStartTransfer(item)}
                      style={styles.startButton}
                    />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 12,
    color: colors.textSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
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
  selectArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "bold",
  },
  selectedOrderContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedOrderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  binCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
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
  startButton: {
    marginLeft: 12,
    paddingHorizontal: 20,
  },
});
