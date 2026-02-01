import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import DataTable from "../components/DataTable";
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
      // Only show orders that are PLANNED or IN_PROGRESS or COMPLETED
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
      const orderRes = await client.get(`/api/production-orders/${orderId}`);
      if (!orderRes.data) {
        throw new Error("Order not found");
      }
      setOrder(orderRes.data);

      const destBins = orderRes.data.destination_bins || [];
      const fgIds = [...new Set(destBins.map(db => db.finished_good_id).filter(id => id))];
      
      const templatesMap = {};
      for (const fgId of fgIds) {
        try {
          const tRes = await client.get(`/api/granulation-templates/finished-good/${fgId}`);
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
        recordsRes = await client.get(`/api/production-orders/${orderId}/granulation`);
      } catch (e) {
        console.log("No existing granulation records");
      }

      if (recordsRes.data && recordsRes.data.length > 0) {
        setGranulationRecords(recordsRes.data.map(r => ({
          ...r,
          id: r.id || Date.now() + Math.random()
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
      await client.post(`/api/production-orders/${selectedOrderId}/granulation`, {
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
                  <Text style={styles.addText}>+ Add Entry</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView horizontal>
                <View>
                  <View style={styles.tableHeader}>
                    {cols.map(c => <Text key={c} style={styles.headerCol}>{c}</Text>)}
                    <Text style={styles.headerAction}>Action</Text>
                  </View>
                  {group.records.map(r => (
                    <View key={r.id} style={styles.tableRow}>
                      {cols.map(c => (
                        <TextInput
                          key={c}
                          style={styles.input}
                          value={String(r.values[c] || "")}
                          onChangeText={(v) => updateValue(r.id, c, v)}
                          keyboardType="numeric"
                        />
                      ))}
                      <TouchableOpacity onPress={() => removeRow(r.id)} style={styles.removeBtn}>
                        <Text style={{color: colors.danger}}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          );
        })}

        <View style={{marginVertical: 20}}>
          <Button title="Save Records" onPress={handleSave} loading={saving} />
          <View style={{height: 10}} />
          <Button title="Cancel" variant="outline" onPress={() => { setSelectedOrderId(null); setOrder(null); }} />
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  orderInfo: { fontSize: 18, fontWeight: 'bold' },
  fgCard: { marginBottom: 20, padding: 10 },
  fgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fgName: { fontSize: 16, fontWeight: 'bold' },
  addText: { color: colors.primary, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5 },
  headerCol: { width: 80, textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  headerAction: { width: 50, textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, alignItems: 'center' },
  input: { width: 80, height: 35, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', marginHorizontal: 2, borderRadius: 4, backgroundColor: '#fff' },
  removeBtn: { width: 50, alignItems: 'center' },
  orderSelectionCard: { marginBottom: 15, padding: 15 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  orderNumberText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  productNameText: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  orderCardDetails: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, marginBottom: 15 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  recordButton: { backgroundColor: colors.success, padding: 12, borderRadius: 8, alignItems: 'center' },
  recordButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 50, fontSize: 16 }
});