import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient, productionOrderApi } from "../api/client";
import { showToast, showAlert, showError } from "../utils/customAlerts";
import { formatISTDate } from "../utils/dateUtils";
import { Picker } from "@react-native-picker/picker";
import DatePicker from "../components/DatePicker";

export default function ProductionOrderTraceabilityScreen({ navigation }) {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lifecycleData, setLifecycleData] = useState(null);

  useEffect(() => {
    loadOrdersByRange();
  }, [startDate, endDate]);

  const loadOrdersByRange = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      // Assuming backend supports date range filtering
      const res = await client.get(`/production-orders?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
      setOrders(res.data);
      setFilteredOrders(res.data);
    } catch (error) {
      console.error("Error loading orders:", error);
      showError("Failed to load production orders for the selected range");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    // Local filter
    const filtered = orders.filter(o => 
      o.order_number.toLowerCase().includes(text.toLowerCase()) ||
      (o.raw_product?.product_name || "").toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  const handleGlobalSearch = async () => {
    if (!searchText.trim()) return;
    
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.get(`/production-orders?search=${searchText}`);
      setFilteredOrders(res.data);
      if (res.data.length > 0) {
        showToast("Success", `Found ${res.data.length} orders matching "${searchText}"`);
      } else {
        showToast("Info", "No orders found matching your search");
      }
    } catch (error) {
      console.error("Global search error:", error);
      showError("Global search failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchLifecycleData = async () => {
    if (!selectedOrderId) {
      showAlert("Warning", "Please select a production order first");
      return;
    }

    try {
      setSearching(true);
      setLifecycleData(null);
      const client = getApiClient();
      
      const res = await client.get(`/production-orders/${selectedOrderId}/traceability`);
      setLifecycleData(res.data);

      showToast("Success", "Traceability data loaded");
    } catch (error) {
      console.error("Traceability fetch error:", error);
      showError("Failed to fetch traceability data");
    } finally {
      setSearching(false);
    }
  };

  const getProductionSummary = () => {
    const breakdown = lifecycleData?.production_summary || [];
    const totalBags = breakdown.reduce((sum, item) => sum + (item.total_bags || 0), 0);
    return {
      totalBags,
      totalItems: breakdown.length,
      breakdown,
    };
  };

  return (
    <Layout title="Order Traceability" navigation={navigation}>
      <View style={styles.container}>
        <Card style={styles.searchCard}>
          <View style={styles.filterGrid}>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipLabel}>Date Range</Text>
              <Text style={styles.filterChipValue}>{formatISTDate(startDate).split(" ")[0]} → {formatISTDate(endDate).split(" ")[0]}</Text>
            </View>
            <View style={styles.filterChip}>
              <Text style={styles.filterChipLabel}>Orders Loaded</Text>
              <Text style={styles.filterChipValue}>{filteredOrders.length}</Text>
            </View>
          </View>

          <Text style={styles.label}>Date Range Filter</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <DatePicker label="From" value={startDate} onChange={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <DatePicker label="To" value={endDate} onChange={setEndDate} />
            </View>
          </View>

          <Text style={styles.label}>Search & Select Production Order</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Type to filter, Enter for global search..."
              value={searchText}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleGlobalSearch}
            />
            <TouchableOpacity style={styles.globalSearchBtn} onPress={handleGlobalSearch}>
              <Text style={styles.btnText}>🔍</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedOrderId}
              onValueChange={(itemValue) => setSelectedOrderId(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="-- Select Production Order --" value={null} />
              {filteredOrders.map(o => (
                <Picker.Item 
                  key={o.id} 
                  label={`${o.order_number} - ${o.raw_product?.product_name || 'N/A'}`} 
                  value={o.id} 
                />
              ))}
            </Picker>
          </View>

          <Button 
            title="Search Traceability" 
            onPress={fetchLifecycleData} 
            loading={searching}
            style={styles.searchBtn}
          />
        </Card>

        {lifecycleData && (
          <ScrollView style={styles.resultsContainer}>
            {(() => {
              const summary = getProductionSummary();
              return (
                <View style={styles.detailShell}>
                  <View style={styles.heroCard}>
                    <Text style={styles.heroKicker}>Production Order Traceability</Text>
                    <Text style={styles.heroTitle}>{lifecycleData.order_number}</Text>
                    <Text style={styles.heroSubTitle}>
                      {lifecycleData.raw_product_name || lifecycleData.product_name || "Production traceability"}
                    </Text>
                    <View style={styles.heroStatsRow}>
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Stages</Text>
                        <Text style={styles.heroStatValue}>{lifecycleData.stages?.length || 0}</Text>
                      </View>
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Items</Text>
                        <Text style={styles.heroStatValue}>{summary.totalItems}</Text>
                      </View>
                      <View style={styles.heroStat}>
                        <Text style={styles.heroStatLabel}>Bags</Text>
                        <Text style={styles.heroStatValue}>{summary.totalBags}</Text>
                      </View>
                    </View>
                  </View>

                  {summary.breakdown.length > 0 && (
                    <View style={styles.breakdownCard}>
                      <Text style={styles.sectionTitle}>Produced Bags by Product & Bag Size</Text>
                      <View style={styles.breakdownGrid}>
                        {summary.breakdown.map((item, index) => (
                          <View key={`${item.product_name}-${item.bag_size}-${index}`} style={styles.breakdownChip}>
                            <Text style={styles.breakdownProduct}>{item.product_name}</Text>
                            <Text style={styles.breakdownBag}>{item.bag_size}</Text>
                            <Text style={styles.breakdownCount}>{item.total_bags} bags</Text>
                            <Text style={styles.breakdownQty}>{Number(item.total_quantity_kg || 0).toFixed(2)} kg</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.timelineCard}>
                    <Text style={styles.sectionTitle}>Lifecycle Timeline</Text>
                    {lifecycleData.stages.map((stage, index) => (
                      <View key={index} style={styles.stageItem}>
                        <View style={styles.stageLineContainer}>
                          <View style={[styles.stageDot, { backgroundColor: stage.status === "Completed" ? colors.success : colors.textLight }]} />
                          {index < lifecycleData.stages.length - 1 && <View style={styles.stageLine} />}
                        </View>
                        <View style={styles.stageContent}>
                          <Text style={styles.stageName}>{stage.name}</Text>
                          <View style={[styles.stagePill, stage.status === "Completed" ? styles.stagePillDone : styles.stagePillOther]}>
                            <Text style={styles.stageStatus}>{stage.status}</Text>
                          </View>
                          <Text style={styles.stageDetails}>{stage.details}</Text>
                          {stage.date && <Text style={styles.stageDate}>{formatISTDate(stage.date)}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </ScrollView>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchCard: { padding: 16, marginBottom: 16, borderRadius: 18, backgroundColor: "#fff", elevation: 3 },
  filterGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  filterChip: { flex: 1, backgroundColor: "#F7FAFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E6EEF9" },
  filterChipLabel: { fontSize: 10, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, fontWeight: "600" },
  filterChipValue: { fontSize: 13, color: colors.text, fontWeight: "800" },
  dateRow: { flexDirection: 'row', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: colors.text },
  searchRow: { flexDirection: 'row', marginBottom: 12 },
  searchInput: { flex: 1, height: 45, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  globalSearchBtn: { width: 45, height: 45, backgroundColor: colors.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  btnText: { color: '#fff', fontSize: 18 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 16, backgroundColor: '#fff', overflow: 'hidden' },
  picker: { height: 45 },
  searchBtn: { marginTop: 8 },
  resultsContainer: { flex: 1, marginTop: 4 },
  detailShell: { gap: 14, paddingBottom: 20 },
  heroCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  heroKicker: { color: colors.primary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: 4 },
  heroSubTitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 14 },
  heroStatsRow: { flexDirection: "row", gap: 8 },
  heroStat: { flex: 1, backgroundColor: "#F7FAFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E6EEF9" },
  heroStatLabel: { color: colors.textSecondary, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, fontWeight: "600" },
  heroStatValue: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  timelineCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  breakdownCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  breakdownChip: { width: "48%", backgroundColor: "#F8FAFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5ECFF" },
  breakdownProduct: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 4 },
  breakdownBag: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  breakdownCount: { fontSize: 15, fontWeight: "800", color: colors.primary },
  breakdownQty: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: "600" },
  stageItem: { flexDirection: 'row', marginBottom: 0 },
  stageLineContainer: { width: 30, alignItems: 'center' },
  stageDot: { width: 14, height: 14, borderRadius: 7, zIndex: 1 },
  stageLine: { width: 2, flex: 1, backgroundColor: '#ddd', marginVertical: -2 },
  stageContent: { flex: 1, paddingBottom: 20, paddingLeft: 8 },
  stageName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  stagePill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, marginBottom: 6 },
  stagePillDone: { backgroundColor: "#E8F7EF" },
  stagePillOther: { backgroundColor: "#EEF2FF" },
  stageStatus: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  stageDetails: { fontSize: 14, color: '#666', marginTop: 4, lineHeight: 20 },
  stageDate: { fontSize: 12, color: colors.primary, marginTop: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' }
});