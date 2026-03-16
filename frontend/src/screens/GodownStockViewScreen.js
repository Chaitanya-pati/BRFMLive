import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { finishedGoodsGodownApi, finishedGoodApi, bagSizeApi } from "../api/client";
import { showAlert } from "../utils/customAlerts";

export default function GodownStockViewScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const [loading, setLoading] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [gRes, fgRes, bsRes] = await Promise.all([
        finishedGoodsGodownApi.getAll(),
        finishedGoodApi.getAll(),
        bagSizeApi.getAll(),
      ]);
      setGodowns(gRes.data || []);
      setFinishedGoods(fgRes.data || []);
      setBagSizes(bsRes.data || []);
      if (gRes.data?.length > 0) handleSelectGodown(gRes.data[0]);
    } catch (error) {
      showAlert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGodown = async (godown) => {
    setSelectedGodown(godown);
    setLoading(true);
    try {
      const res = await finishedGoodsGodownApi.getStock(godown.id);
      setStocks(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalBags = stocks.reduce((sum, s) => sum + (s.quantity_bags || 0), 0);

  return (
    <Layout navigation={navigation}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        <View style={styles.header}>
          <Text style={styles.title}>Godown Stock View</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          {godowns.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.tab, selectedGodown?.id === g.id && styles.activeTab]}
              onPress={() => handleSelectGodown(g)}
            >
              <Text style={[styles.tabText, selectedGodown?.id === g.id && styles.activeTabText]}>
                {g.godown_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : selectedGodown ? (
          <View style={styles.card}>

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Current Stock</Text>
                <Text style={styles.cardSubtitle}>{selectedGodown.godown_name}</Text>
              </View>
              {stocks.length > 0 && (
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeLabel}>Total Bags</Text>
                  <Text style={styles.summaryBadgeValue}>{totalBags}</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {stocks.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.colProduct]}>Product</Text>
                  <Text style={[styles.headerCell, styles.colBagSize]}>Bag Size</Text>
                  <Text style={[styles.headerCell, styles.colQty, { textAlign: "right" }]}>
                    Qty (Bags)
                  </Text>
                </View>

                {stocks.map((s, index) => {
                  const productName =
                    finishedGoods.find((f) => f.id === s.finished_good_id)?.product_name || "Unknown";
                  const bagWeight =
                    bagSizes.find((b) => b.id === s.bag_size_id)?.weight_kg || "?";
                  return (
                    <View
                      key={s.id}
                      style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                    >
                      <Text style={[styles.dataCell, styles.colProduct]} numberOfLines={2}>
                        {productName}
                      </Text>
                      <Text style={[styles.dataCell, styles.colBagSize]}>
                        {bagWeight}kg
                      </Text>
                      <Text style={[styles.dataCell, styles.colQty, styles.qtyValue]}>
                        {s.quantity_bags}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, styles.colProduct]}>Total</Text>
                  <Text style={[styles.totalLabel, styles.colBagSize]} />
                  <Text style={[styles.totalValue, styles.colQty]}>{totalBags}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No stock available in this godown</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },

  tabScroll: {
    marginBottom: 20,
  },
  tabScrollContent: {
    paddingBottom: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: "#EFEFEF",
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#FFF",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8EBF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  summaryBadge: {
    backgroundColor: "#EEF3FF",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 90,
  },
  summaryBadgeLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  summaryBadgeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginHorizontal: 0,
  },

  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: "#E8EBF0",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#FAFBFC",
  },
  totalRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: "#EEF3FF",
    borderTopWidth: 1.5,
    borderColor: "#D0DCFF",
    alignItems: "center",
  },

  colProduct: {
    flex: 3,
    paddingRight: 8,
  },
  colBagSize: {
    flex: 2,
    paddingRight: 8,
  },
  colQty: {
    flex: 1,
    textAlign: "right",
  },

  headerCell: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A92A6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dataCell: {
    fontSize: 14,
    color: "#2D3748",
  },
  qtyValue: {
    fontWeight: "700",
    color: colors.primary,
    fontSize: 15,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D3748",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "right",
  },

  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#AAB0BE",
  },
});
