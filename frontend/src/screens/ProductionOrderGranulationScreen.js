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

      const destBins = orderRes.data.destination_bins || [];
      const fgIds = [...new Set(destBins.map(db => db.finished_good_id).filter(id => id))];
      
      const templatesMap = {};
      for (const fgId of fgIds) {
        try {
          const tRes = await client.get(`/granulation-templates/finished-good/${fgId}`);
          if (tRes.data) {
            templatesMap[fgId] = tRes.data;
          }
        } catch (e) {
          console.log(`No template for FG ${fgId}`);
        }
      }
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
        const initialRecords = destBins.map(db => ({
          id: Date.now() + Math.random(),
          finished_good_id: db.finished_good_id,
          finished_good_name: db.bin?.material_type || "Product",
          values: {}
        }));
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
      showAlert("Error", "Failed to save records");
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

  return (
    <Layout title="Production Granulation" navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.orderInfo}>Order: {order?.order_number}</Text>
          <TouchableOpacity onPress={() => { setSelectedOrderId(null); setOrder(null); }}>
            <Text style={{color: colors.primary, fontWeight: 'bold'}}>Change Order</Text>
          </TouchableOpacity>
        </View>
        
        {Object.keys(fgGroups).map(fgId => {
          const group = fgGroups[fgId];
          const template = templates[fgId];
          const cols = template?.columns_definition?.columns || [];

          return (
            <Card key={fgId} style={styles.fgCard}>
              <View style={styles.fgHeader}>
                <Text style={styles.fgName}>{group.name}</Text>
                <TouchableOpacity onPress={() => addRow(fgId, group.name)}>
                  <Text style={styles.addText}>+ Add Row</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.excelContainer}>
                  <View style={styles.excelHeaderRow}>
                    {cols.map(c => (
                      <View key={c} style={[styles.excelHeaderCell, { width: 100 }]}>
                        <Text style={styles.excelHeaderText}>{c}</Text>
                      </View>
                    ))}
                    <View style={[styles.excelHeaderCell, { width: 60 }]}>
                      <Text style={styles.excelHeaderText}>Action</Text>
                    </View>
                  </View>
                  
                  {group.records.map((r, index) => (
                    <View key={r.id} style={[styles.excelDataRow, index % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
                      {cols.map(c => (
                        <View key={c} style={[styles.excelDataCell, { width: 100 }]}>
                          <TextInput
                            style={styles.excelInput}
                            value={String(r.values[c] || "")}
                            onChangeText={(v) => updateValue(r.id, c, v)}
                            keyboardType="numeric"
                            placeholder="-"
                          />
                        </View>
                      ))}
                      <View style={[styles.excelDataCell, { width: 60, alignItems: 'center' }]}>
                        <TouchableOpacity onPress={() => removeRow(r.id)}>
                          <Text style={{color: colors.danger, fontWeight: 'bold'}}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          );
        })}

        <View style={styles.footerButtons}>
          <Button title="Save Records" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          <View style={{ width: 10 }} />
          <Button title="Cancel" variant="outline" onPress={() => { setSelectedOrderId(null); setOrder(null); }} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8 },
  orderInfo: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  fgCard: { marginBottom: 25, padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: colors.primary },
  fgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f0f4f8', borderBottomWidth: 1, borderBottomColor: '#e1e8ed' },
  fgName: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  addText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
  
  excelContainer: { backgroundColor: '#fff' },
  excelHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f3f4', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  excelHeaderCell: { padding: 10, borderRightWidth: 1, borderRightColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  excelHeaderText: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  excelDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  excelDataCell: { borderRightWidth: 1, borderRightColor: '#eee', justifyContent: 'center' },
  excelInput: { height: 40, paddingHorizontal: 8, fontSize: 14, textAlign: 'center', backgroundColor: '#fff' },
  
  footerButtons: { flexDirection: 'row', marginVertical: 30, paddingBottom: 40 },
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