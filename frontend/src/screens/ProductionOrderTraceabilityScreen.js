import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
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
      
      // In a real scenario, we'd have a single endpoint for this.
      // For now, we'll fetch what we can or simulate the structure.
      const res = await client.get(`/production-orders/${selectedOrderId}`);
      
      // Placeholder for future multi-stage data integration
      setLifecycleData({
        order: res.data,
        stages: [
          { name: "Date Created", status: "Completed", date: res.data.order_date, details: `Order #${res.data.order_number} created` },
          { name: "Planning", status: res.data.status !== "CREATED" ? "Completed" : "Pending", details: "Production planning and scheduling" },
          { name: "Raw Wheat Transfer (24h)", status: "Pending", details: "Transfer to 24-hour tempering bins" },
          { name: "12 Hours Bin Transfer", status: "Pending", details: "Transfer to 12-hour conditioning bins" },
          { name: "Hourly Grinding Results", status: "Pending", details: "Quality checks during grinding" },
          { name: "Granulation Results", status: "Pending", details: "Final product granulation analysis" }
        ]
      });

      showToast("Success", "Traceability data loaded");
    } catch (error) {
      console.error("Traceability fetch error:", error);
      showError("Failed to fetch traceability data");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Layout title="Order Traceability" navigation={navigation}>
      <View style={styles.container}>
        <Card style={styles.searchCard}>
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
            <Text style={styles.resultsTitle}>Lifecycle: {lifecycleData.order.order_number}</Text>
            {lifecycleData.stages.map((stage, index) => (
              <View key={index} style={styles.stageItem}>
                <View style={styles.stageLineContainer}>
                  <View style={[styles.stageDot, { backgroundColor: stage.status === "Completed" ? colors.success : colors.textLight }]} />
                  {index < lifecycleData.stages.length - 1 && <View style={styles.stageLine} />}
                </View>
                <View style={styles.stageContent}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <Text style={styles.stageStatus}>{stage.status}</Text>
                  <Text style={styles.stageDetails}>{stage.details}</Text>
                  {stage.date && <Text style={styles.stageDate}>{formatISTDate(stage.date)}</Text>}
                </View>
              </View>
            ))}
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
  searchCard: { padding: 16, marginBottom: 16 },
  dateRow: { flexDirection: 'row', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: colors.text },
  searchRow: { flexDirection: 'row', marginBottom: 12 },
  searchInput: { flex: 1, height: 45, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  globalSearchBtn: { width: 45, height: 45, backgroundColor: colors.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  btnText: { color: '#fff', fontSize: 18 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 16, backgroundColor: '#fff', overflow: 'hidden' },
  picker: { height: 45 },
  searchBtn: { marginTop: 8 },
  resultsContainer: { flex: 1 },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: colors.primary },
  stageItem: { flexDirection: 'row', marginBottom: 0 },
  stageLineContainer: { width: 30, alignItems: 'center' },
  stageDot: { width: 14, height: 14, borderRadius: 7, zIndex: 1 },
  stageLine: { width: 2, flex: 1, backgroundColor: '#ddd', marginVertical: -2 },
  stageContent: { flex: 1, paddingBottom: 20, paddingLeft: 8 },
  stageName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  stageStatus: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginTop: 2 },
  stageDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  stageDate: { fontSize: 12, color: colors.primary, marginTop: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' }
});