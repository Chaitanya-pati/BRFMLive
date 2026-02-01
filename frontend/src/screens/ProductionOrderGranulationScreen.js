import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient, productionOrderApi } from "../api/client";
import { showToast, showAlert, showError } from "../utils/customAlerts";
import { formatISTDate } from "../utils/dateUtils";

export default function ProductionOrderGranulationScreen({ route, navigation }) {
  const { orderId: initialOrderId } = route.params || {};
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [templates, setTemplates] = useState({});
  const [granulationRecords, setGranulationRecords] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderAndTemplates(selectedOrderId);
    }
  }, [selectedOrderId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await productionOrderApi.getAll();
      const filtered = res.data.filter(o => o.status !== 'CREATED');
      setOrders(filtered);
    } catch (error) {
      console.error("Error loading orders:", error);
      showError("Failed to load production orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderAndTemplates = async (orderId) => {
    try {
      setLoadingDetails(true);
      const client = getApiClient();
      const orderRes = await client.get(`/production-orders/${orderId}`);
      if (!orderRes.data) {
        throw new Error("Order not found");
      }
      setOrder(orderRes.data);

      // Fetch ALL templates instead of just those in the order
      const templatesRes = await client.get(`/granulation-templates`);
      const allTemplates = templatesRes.data || [];
      
      const templatesMap = {};
      allTemplates.forEach(t => {
        if (t.is_active) {
          templatesMap[t.finished_good_id] = t;
        }
      });
      setTemplates(templatesMap);

      let recordsRes = { data: [] };
      try {
        recordsRes = await client.get(`/production-orders/${orderId}/granulation`);
      } catch (e) {
        console.log("No existing granulation records");
      }

      if (recordsRes.data && recordsRes.data.length > 0) {
        setGranulationRecords(recordsRes.data.map(r => ({
          ...r,
          id: r.id || Date.now() + Math.random(),
          finished_good_name: r.finished_good?.product_name || r.finished_good_name || "Product",
          values: r.granulation_values || {}
        })));
      } else {
        // Create initial records for ALL finished goods that have a template
        const initialRecords = allTemplates
          .filter(t => t.is_active && t.finished_good)
          .map(t => {
            const defaultValues = {};
            // The JSON column contains a "columns" key with the list of strings
            const columns = t.columns_definition?.columns || [];
            columns.forEach(col => {
              defaultValues[col] = "";
            });
            return {
              id: Date.now() + Math.random(),
              finished_good_id: t.finished_good_id,
              finished_good_name: t.finished_good.product_name || "Product",
              values: defaultValues
            };
          });
        setGranulationRecords(initialRecords);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      showAlert("Error", error.message || "Failed to load order data");
      setOrder(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const addRow = (fgId, fgName) => {
    setGranulationRecords([...granulationRecords, {
      id: Date.now() + Math.random(),
      finished_good_id: fgId,
      finished_good_name: fgName,
      values: {}
    }]);
  };

  const removeRow = (id) => {
    setGranulationRecords(granulationRecords.filter(r => r.id !== id));
  };

  const updateValue = (id, col, val) => {
    setGranulationRecords(granulationRecords.map(r => 
      r.id === id ? { ...r, values: { ...r.values, [col]: val } } : r
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const client = getApiClient();
      
      // Separate records by finished good to ensure clean structure if needed, 
      // but the backend currently expects a flat list of records.
      // However, we should only save the actual data.
      
      await client.post(`/production-orders/${selectedOrderId}/granulation`, {
        records: granulationRecords.map(r => ({
          finished_good_id: r.finished_good_id,
          granulation_values: r.values
        }))
      });
      showToast("Success", "Granulation records saved");
      setOrder(null);
      setSelectedOrderId(null);
      loadOrders();
    } catch (error) {
      console.error("Save error:", error);
      showAlert("Error", "Failed to save records. " + (error.response?.data?.detail || ""));
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CREATED': return colors.info;
      case 'PLANNED': return colors.primary;
      case 'IN_PROGRESS': return colors.warning;
      case 'COMPLETED': return colors.success;
      case 'CANCELLED': return colors.danger;
      default: return colors.textLight;
    }
  };

  const renderOrderCard = ({ item }) => (
    <Card style={styles.orderSelectionCard}>
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderNumberText}>{item.order_number}</Text>
          <Text style={styles.productNameText}>{item.raw_product?.product_name || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderCardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <Text style={styles.detailValue}>{item.quantity} kg</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatISTDate(item.order_date)}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.recordButton} 
        onPress={() => setSelectedOrderId(item.id)}
      >
        <Text style={styles.recordButtonText}>Record Granulation Data</Text>
      </TouchableOpacity>
    </Card>
  );

  if (!selectedOrderId) {
    return (
      <Layout title="Granulation Recording" navigation={navigation}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Production Order</Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <FlatList
              data={orders}
              renderItem={renderOrderCard}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No production orders available for granulation.</Text>
              }
            />
          )}
        </View>
      </Layout>
    );
  }

  if (loadingDetails) {
    return (
      <Layout title="Production Granulation" navigation={navigation}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </Layout>
    );
  }

  const fgGroups = granulationRecords.reduce((acc, r) => {
    if (!acc[r.finished_good_id]) acc[r.finished_good_id] = { name: r.finished_good_name, records: [] };
    acc[r.finished_good_id].records.push(r);
    return acc;
  }, {});

  const renderExcelHeader = () => {
    return (
      <View style={styles.excelHeaderRow}>
        <View style={[styles.excelHeaderCell, styles.excelFixedCol, { backgroundColor: '#e8f0fe' }]}>
          <Text style={styles.excelHeaderText}>Granulation</Text>
        </View>
        {Object.keys(fgGroups).map(fgId => {
          const group = fgGroups[fgId];
          const template = templates[fgId];
          const cols = template?.columns_definition?.columns || [];
          return (
            <View key={fgId} style={[styles.excelProductGroup, { width: Math.max(cols.length * 80, 100) }]}>
              <View style={styles.excelProductHeader}>
                <Text style={styles.excelProductText}>{group.name}</Text>
                <TouchableOpacity onPress={() => addRow(fgId, group.name)}>
                  <Text style={styles.addText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.excelSubHeaderRow}>
                {cols.map(c => (
                  <View key={c} style={[styles.excelSubHeaderCell, { width: 80 }]}>
                    <Text style={styles.excelSubHeaderText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderExcelRows = () => {
    const maxRows = 10;
    const rows = Array.from({ length: maxRows });

    return rows.map((_, rowIndex) => (
      <View key={rowIndex} style={styles.excelDataRow}>
        <View style={[styles.excelDataCell, styles.excelFixedCol, { backgroundColor: '#fff' }]}>
          <Text style={styles.excelRowIndexText}>{rowIndex + 1}</Text>
        </View>
        {Object.keys(fgGroups).map(fgId => {
          const group = fgGroups[fgId];
          const template = templates[fgId];
          const cols = template?.columns_definition?.columns || [];
          const record = group.records[rowIndex];
          
          return (
            <View key={fgId} style={[styles.excelProductDataGroup, { width: Math.max(cols.length * 80, 100) }]}>
              {cols.map(c => (
                <View key={c} style={[styles.excelDataCell, { width: 80 }]}>
                  <TextInput
                    style={styles.excelInput}
                    value={record ? String(record.values[c] || "") : ""}
                    onChangeText={(v) => {
                      if (record) {
                        updateValue(record.id, c, v);
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="-"
                  />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    ));
  };

  return (
    <Layout title="Production Granulation" navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.orderInfo}>Order: {order?.order_number}</Text>
          <TouchableOpacity onPress={() => { setSelectedOrderId(null); setOrder(null); }}>
            <Text style={{color: colors.primary, fontWeight: 'bold'}}>Change Order</Text>
          </TouchableOpacity>
        </View>
        
        {Object.keys(fgGroups).length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No finished goods found for this order.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.excelScrollView}>
              <View style={styles.excelMainContainer}>
                {renderExcelHeader()}
                <ScrollView showsVerticalScrollIndicator={true}>
                  {renderExcelRows()}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.footerButtons}>
          <Button title="Save Records" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          <View style={{ width: 10 }} />
          <Button title="Cancel" variant="outline" onPress={() => { setSelectedOrderId(null); setOrder(null); }} style={{ flex: 1 }} />
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8 },
  orderInfo: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  
  excelScrollView: { flex: 1, borderTopWidth: 1, borderTopColor: '#000', borderLeftWidth: 1, borderLeftColor: '#000' },
  excelMainContainer: { backgroundColor: '#fff' },
  excelHeaderRow: { flexDirection: 'row' },
  excelHeaderCell: { height: 60, borderRightWidth: 1, borderRightColor: '#000', borderBottomWidth: 1, borderBottomColor: '#000', justifyContent: 'center', alignItems: 'center' },
  excelFixedCol: { width: 60, zIndex: 1 },
  excelHeaderText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  
  excelProductGroup: { borderRightWidth: 1, borderRightColor: '#000' },
  excelProductHeader: { height: 30, backgroundColor: '#d9e2f3', borderBottomWidth: 1, borderBottomColor: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 5 },
  excelProductText: { fontWeight: 'bold', fontSize: 12, textAlign: 'center', flex: 1 },
  addText: { color: colors.primary, fontWeight: 'bold', fontSize: 18, marginLeft: 5 },
  
  excelSubHeaderRow: { flexDirection: 'row' },
  excelSubHeaderCell: { height: 30, backgroundColor: '#f2f2f2', borderRightWidth: 1, borderRightColor: '#000', borderBottomWidth: 1, borderBottomColor: '#000', justifyContent: 'center', alignItems: 'center' },
  excelSubHeaderText: { fontSize: 11, fontWeight: '600' },
  
  excelDataRow: { flexDirection: 'row' },
  excelProductDataGroup: { flexDirection: 'row', borderRightWidth: 1, borderRightColor: '#000' },
  excelDataCell: { height: 35, borderRightWidth: 1, borderRightColor: '#000', borderBottomWidth: 1, borderBottomColor: '#000', justifyContent: 'center' },
  excelRowIndexText: { textAlign: 'center', fontSize: 12, color: '#666' },
  excelInput: { height: '100%', paddingHorizontal: 4, fontSize: 12, textAlign: 'center' },
  
  footerButtons: { flexDirection: 'row', marginTop: 15, paddingBottom: 10 },
  orderSelectionCard: { marginBottom: 15, padding: 18, borderRadius: 12 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  orderNumberText: { fontSize: 19, fontWeight: 'bold', color: colors.primary },
  productNameText: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  orderCardDetails: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15, marginBottom: 15 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 5 },
  detailValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  recordButton: { backgroundColor: colors.success, padding: 14, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  recordButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 80, fontSize: 17 }
});