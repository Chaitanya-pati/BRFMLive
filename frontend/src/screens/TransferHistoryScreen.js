import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showAlert } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferHistoryScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTransfer, setExpandedTransfer] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchTransferHistory();
    }
  }, [orderId]);

  const fetchTransferHistory = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get(`/api/transfer/order/${orderId}/history`);
      setTransfers(response.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch transfer history");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return colors.success || "#4CAF50";
      case "IN_PROGRESS":
        return colors.warning || "#FF9800";
      case "PLANNED":
        return colors.info || "#2196F3";
      default:
        return colors.textSecondary;
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transfer history...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Transfer History</Text>
          <Button
            text="New Transfer"
            onPress={() => navigation.navigate("TransferRecording")}
            style={styles.newButton}
          />
        </View>

        {transfers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transfers recorded yet</Text>
          </View>
        ) : (
          <FlatList
            data={transfers}
            scrollEnabled={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.transferCard}
                onPress={() =>
                  setExpandedTransfer(expandedTransfer === item.id ? null : item.id)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderContent}>
                    <Text style={styles.cardTitle}>
                      {item.source_bin.bin_number} → {item.destination_bin.bin_number}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedTransfer === item.id ? "▼" : "▶"}
                  </Text>
                </View>

                {expandedTransfer === item.id && (
                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantity Planned:</Text>
                      <Text style={styles.detailValue}>{item.quantity_planned} kg</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantity Transferred:</Text>
                      <Text style={styles.detailValue}>
                        {item.quantity_transferred || "N/A"} kg
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Start Time:</Text>
                      <Text style={styles.detailValue}>
                        {formatISTDateTime(item.transfer_start_time)}
                      </Text>
                    </View>

                    {item.transfer_end_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>End Time:</Text>
                        <Text style={styles.detailValue}>
                          {formatISTDateTime(item.transfer_end_time)}
                        </Text>
                      </View>
                    )}

                    {item.transfer_end_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration:</Text>
                        <Text style={styles.detailValue}>
                          {calculateDuration(
                            item.transfer_start_time,
                            item.transfer_end_time
                          )}
                        </Text>
                      </View>
                    )}

                    {item.water_added !== null && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Water Added:</Text>
                        <Text style={styles.detailValue}>{item.water_added} kg</Text>
                      </View>
                    )}

                    {item.moisture_level !== null && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Moisture Level:</Text>
                        <Text style={styles.detailValue}>{item.moisture_level}%</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  newButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  transferCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.lightGray,
  },
  cardHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.white,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  cardDetails: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: "500",
  },
});
