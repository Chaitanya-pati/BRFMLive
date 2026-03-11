import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showError } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function TransferRecordingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

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

          // Only count 24-hour transfers for the details screen
          const allTransfers = transfers24h;

          if (allTransfers.length === 0) {
            return null; // Skip orders with no transfers
          }

          // Calculate combined status (based on 24-hour transfers only)
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
    <TouchableOpacity
      key={order.id}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("TransferRecordingDetails", { order })
      }
    >
      <Card style={styles.orderCard}>
        <View style={styles.cardHeader}>
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

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(order.completedCount / order.totalCount) * 100}%`,
              },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{order.totalCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={[styles.statValue, { color: "#059669" }]}>
              {order.completedCount}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: "#f59e0b" }]}>
              {order.totalCount - order.completedCount}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.actionText}>View Details →</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Layout title="24-Hour Transfer Records" navigation={navigation}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : productionOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No production orders found</Text>
            <Text style={styles.emptySubtext}>
              Production orders with transfers will appear here
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.listContainer}>
              {productionOrders.map(renderOrderCard)}
            </View>
          </ScrollView>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.info,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
