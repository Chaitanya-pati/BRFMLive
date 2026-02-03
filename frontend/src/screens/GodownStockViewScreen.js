import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import Layout from "../components/Layout";
import Card from "../components/Card";
import colors from "../theme/colors";
import { finishedGoodsGodownApi, finishedGoodApi, bagSizeApi } from "../api/client";
import { showAlert } from "../utils/customAlerts";

export default function GodownStockViewScreen({ navigation }) {
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
        bagSizeApi.getAll()
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

  return (
    <Layout navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Godown Stock View</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {godowns.map(g => (
            <TouchableOpacity 
              key={g.id} 
              style={[styles.tab, selectedGodown?.id === g.id && styles.activeTab]} 
              onPress={() => handleSelectGodown(g)}
            >
              <Text style={[styles.tabText, selectedGodown?.id === g.id && styles.activeTabText]}>{g.godown_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : selectedGodown && (
          <Card style={styles.stockCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Stock: {selectedGodown.godown_name}</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, {flex: 2}]}>Product</Text>
                <Text style={styles.cell}>Bag Size</Text>
                <Text style={styles.cell}>Quantity (Bags)</Text>
              </View>
              {stocks.length > 0 ? stocks.map(s => (
                <View key={s.id} style={styles.tableRow}>
                  <Text style={[styles.cell, {flex: 2}]}>{finishedGoods.find(f => f.id === s.finished_good_id)?.product_name || "Unknown"}</Text>
                  <Text style={styles.cell}>{bagSizes.find(b => b.id === s.bag_size_id)?.weight_kg || "Unknown"}kg</Text>
                  <Text style={[styles.cell, styles.stockValue]}>{s.quantity_bags}</Text>
                </View>
              )) : <Text style={styles.emptyText}>No stock available in this godown</Text>}
            </View>
          </Card>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  tabScroll: { marginBottom: 15 },
  tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEE', marginRight: 10 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: '#666' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },
  stockCard: { padding: 15 },
  cardHeader: { marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  table: { borderTopWidth: 1, borderColor: '#EEE' },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  cell: { flex: 1, fontSize: 13, color: '#333' },
  stockValue: { fontWeight: 'bold', color: colors.primary, textAlign: 'right' },
  emptyText: { textAlign: 'center', padding: 20, color: '#999' }
});
