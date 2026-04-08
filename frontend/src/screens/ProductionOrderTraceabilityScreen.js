import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert, showError } from "../utils/customAlerts";
import { formatISTDate } from "../utils/dateUtils";
import { Picker } from "@react-native-picker/picker";
import DatePicker from "../components/DatePicker";

const STATUS_CONFIG = {
  Completed: { bg: "#E8F7EF", text: "#1A7A4A", dot: "#22C55E", border: "#22C55E" },
  Pending:   { bg: "#F3F4F6", text: "#6B7280", dot: "#D1D5DB", border: "#D1D5DB" },
  default:   { bg: "#EEF2FF", text: "#4F46E5", dot: "#818CF8", border: "#818CF8" },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.default;
}

function parseDetailLine(line) {
  return line.split("|").map(part => {
    const [label, ...rest] = part.trim().split(":");
    const raw = rest.join(":").trim();
    const value = raw === "None" || raw === "NoneL" || raw === "None%" || raw === "" ? "—" : raw;
    return { label: label?.trim(), value };
  }).filter(p => p.label);
}

function DetailChips({ text }) {
  if (!text) return null;
  const lines = text.split("\n").filter(Boolean);
  return (
    <View style={styles.detailLinesContainer}>
      {lines.map((line, li) => {
        const parts = parseDetailLine(line);
        if (parts.length === 0) return <Text key={li} style={styles.detailPlain}>{line}</Text>;
        return (
          <View key={li} style={styles.detailChipRow}>
            {parts.map((p, pi) => (
              <View key={pi} style={styles.detailChip}>
                <Text style={styles.detailChipLabel}>{p.label}</Text>
                <Text style={styles.detailChipValue}>{p.value}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

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

  useEffect(() => { loadOrdersByRange(); }, [startDate, endDate]);

  const loadOrdersByRange = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.get(`/production-orders?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
      setOrders(res.data);
      setFilteredOrders(res.data);
    } catch {
      showError("Failed to load production orders for the selected range");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    setFilteredOrders(orders.filter(o =>
      o.order_number.toLowerCase().includes(text.toLowerCase()) ||
      (o.raw_product?.product_name || "").toLowerCase().includes(text.toLowerCase())
    ));
  };

  const handleGlobalSearch = async () => {
    if (!searchText.trim()) return;
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.get(`/production-orders?search=${searchText}`);
      setFilteredOrders(res.data);
      showToast(res.data.length > 0 ? "Success" : "Info",
        res.data.length > 0 ? `Found ${res.data.length} order(s)` : "No orders found");
    } catch {
      showError("Global search failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchLifecycleData = async () => {
    if (!selectedOrderId) { showAlert("Warning", "Please select a production order first"); return; }
    try {
      setSearching(true);
      setLifecycleData(null);
      const client = getApiClient();
      const res = await client.get(`/production-orders/${selectedOrderId}/traceability`);
      setLifecycleData(res.data);
      showToast("Success", "Traceability data loaded");
    } catch {
      showError("Failed to fetch traceability data");
    } finally {
      setSearching(false);
    }
  };

  const godownBreakdown = lifecycleData?.godown_breakdown || [];
  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const completedCount = (lifecycleData?.stages || []).filter(s => s.status === "Completed").length;
  const totalCount = (lifecycleData?.stages || []).length;

  return (
    <Layout title="Order Traceability" navigation={navigation}>
      <View style={styles.container}>
        <Card style={styles.searchCard}>
          <Text style={styles.cardTitle}>Search Production Order</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <DatePicker label="From" value={startDate} onChange={setStartDate} />
            </View>
            <View style={{ flex: 1 }}>
              <DatePicker label="To" value={endDate} onChange={setEndDate} />
            </View>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by order no. or product..."
              placeholderTextColor="#9CA3AF"
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
              onValueChange={(v) => setSelectedOrderId(v)}
              style={styles.picker}
            >
              <Picker.Item label="— Select Production Order —" value={null} />
              {filteredOrders.map(o => (
                <Picker.Item
                  key={o.id}
                  label={`${o.order_number}  ·  ${o.raw_product?.product_name || 'N/A'}  ·  ${o.quantity_kg || 0} kg`}
                  value={o.id}
                />
              ))}
            </Picker>
          </View>
          <Button title="View Traceability" onPress={fetchLifecycleData} loading={searching} style={styles.searchBtn} />
        </Card>

        {lifecycleData && (
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.detailShell}>

              {selectedOrder && (
                <View style={styles.orderHeaderCard}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderHeaderKicker}>Production Order</Text>
                    <Text style={styles.orderHeaderNumber}>{selectedOrder.order_number}</Text>
                    <Text style={styles.orderHeaderSub}>{selectedOrder.raw_product?.product_name || 'N/A'}  ·  {selectedOrder.quantity_kg || 0} kg</Text>
                  </View>
                  <View style={styles.orderHeaderRight}>
                    <Text style={styles.orderProgressNum}>{completedCount}/{totalCount}</Text>
                    <Text style={styles.orderProgressLabel}>Steps Done</Text>
                  </View>
                </View>
              )}

              <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>Lifecycle Timeline</Text>
                {lifecycleData.stages.map((stage, index) => {
                  const cfg = getStatusConfig(stage.status);
                  const isLast = index === lifecycleData.stages.length - 1;
                  const isGrinding = stage.name === "Hourly Grinding Results";
                  return (
                    <View key={index} style={styles.stageRow}>
                      <View style={styles.stageLeft}>
                        <View style={[styles.stepCircle, { backgroundColor: cfg.dot }]}>
                          <Text style={styles.stepNum}>{index + 1}</Text>
                        </View>
                        {!isLast && <View style={[styles.stepLine, { backgroundColor: cfg.dot === "#22C55E" ? "#BBF7D0" : "#E5E7EB" }]} />}
                      </View>

                      <View style={[styles.stageCard, { borderLeftColor: cfg.border }]}>
                        <View style={styles.stageCardHeader}>
                          <Text style={styles.stageName}>{stage.name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{stage.status}</Text>
                          </View>
                        </View>

                        {stage.date && (
                          <Text style={styles.stageDate}>{formatISTDate(stage.date)}</Text>
                        )}

                        {stage.details && stage.details.includes("|") ? (
                          <DetailChips text={stage.details} />
                        ) : stage.details ? (
                          <Text style={styles.detailPlain}>{stage.details}</Text>
                        ) : null}

                        {isGrinding && godownBreakdown.length > 0 && (
                          <View style={styles.godownSection}>
                            <View style={styles.godownSectionHeader}>
                              <Text style={styles.godownSectionTitle}>Godown Storage Details</Text>
                            </View>
                            {(() => {
                              const grouped = {};
                              godownBreakdown.forEach(item => {
                                if (!grouped[item.product_name]) grouped[item.product_name] = [];
                                grouped[item.product_name].push(item);
                              });
                              return Object.entries(grouped).map(([productName, items]) => (
                                <View key={productName} style={styles.godownProductBlock}>
                                  <Text style={styles.godownProductName}>{productName}</Text>
                                  {items.map((item, idx) => (
                                    <View key={idx} style={styles.godownRow}>
                                      <View style={styles.godownRowLeft}>
                                        <Text style={styles.godownGodownName}>{item.godown_name}</Text>
                                        {item.godown_code ? <Text style={styles.godownCode}>{item.godown_code}</Text> : null}
                                      </View>
                                      <View style={styles.godownRowRight}>
                                        <Text style={styles.godownBagSize}>{item.bag_size}</Text>
                                        <Text style={styles.godownBags}>{item.total_bags} bags</Text>
                                        <Text style={styles.godownQty}>{Number(item.total_quantity_kg || 0).toFixed(2)} kg</Text>
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              ));
                            })()}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
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
  container: { flex: 1, padding: 16, backgroundColor: "#F7F8FA" },

  searchCard: { padding: 16, marginBottom: 16, borderRadius: 18, backgroundColor: "#fff", elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 14 },
  dateRow: { flexDirection: "row", marginBottom: 12 },
  searchRow: { flexDirection: "row", marginBottom: 12 },
  searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, backgroundColor: "#F9FAFB", fontSize: 14, color: colors.text },
  globalSearchBtn: { width: 44, height: 44, backgroundColor: colors.primary, borderRadius: 10, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  btnText: { fontSize: 18 },
  pickerContainer: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, marginBottom: 14, backgroundColor: "#F9FAFB", overflow: "hidden" },
  picker: { height: 46 },
  searchBtn: { marginTop: 4 },

  resultsContainer: { flex: 1 },
  detailShell: { gap: 14, paddingBottom: 32 },

  orderHeaderCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  orderHeaderLeft: { flex: 1 },
  orderHeaderKicker: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  orderHeaderNumber: { fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 4 },
  orderHeaderSub: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  orderHeaderRight: { alignItems: "center", marginLeft: 16 },
  orderProgressNum: { fontSize: 28, fontWeight: "900", color: "#fff" },
  orderProgressLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },

  timelineCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 20 },

  stageRow: { flexDirection: "row", marginBottom: 0 },
  stageLeft: { width: 36, alignItems: "center" },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", zIndex: 1 },
  stepNum: { fontSize: 12, fontWeight: "800", color: "#fff" },
  stepLine: { width: 2, flex: 1, marginVertical: 4 },

  stageCard: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  stageCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  stageName: { fontSize: 15, fontWeight: "800", color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  stageDate: { fontSize: 12, color: colors.primary, fontWeight: "600", marginBottom: 8 },

  detailLinesContainer: { gap: 6, marginTop: 4 },
  detailChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  detailChip: { backgroundColor: "#EEF2FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  detailChipLabel: { fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  detailChipValue: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  detailPlain: { fontSize: 13, color: "#6B7280", lineHeight: 20, marginTop: 4 },

  godownSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12 },
  godownSectionHeader: { marginBottom: 10 },
  godownSectionTitle: { fontSize: 11, fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  godownProductBlock: { marginBottom: 12 },
  godownProductName: { fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 6 },
  godownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  godownRowLeft: { flex: 1, marginRight: 8 },
  godownGodownName: { fontSize: 13, fontWeight: "700", color: colors.text },
  godownCode: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  godownRowRight: { alignItems: "flex-end" },
  godownBagSize: { fontSize: 11, color: colors.textSecondary },
  godownBags: { fontSize: 14, fontWeight: "800", color: colors.primary },
  godownQty: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.6)", justifyContent: "center", alignItems: "center" },
});
