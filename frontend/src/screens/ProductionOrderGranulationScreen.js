import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

export default function ProductionOrderGranulationScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [templates, setTemplates] = useState({});
  const [granulationRecords, setGranulationRecords] = useState([]);

  useEffect(() => {
    if (orderId) {
      fetchOrderAndTemplates();
    }
  }, [orderId]);

  const fetchOrderAndTemplates = async () => {
    try {
      const client = getApiClient();
      const orderRes = await client.get(`/api/production-orders/${orderId}`);
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

      const recordsRes = await client.get(`/api/production-orders/${orderId}/granulation`);
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
      showAlert("Error", "Failed to load order data");
    } finally {
      setLoading(false);
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
      await client.post(`/api/production-orders/${orderId}/granulation`, {
        records: granulationRecords.map(r => ({
          finished_good_id: r.finished_good_id,
          granulation_values: r.values
        }))
      });
      showToast("Success", "Granulation records saved");
      navigation.goBack();
    } catch (error) {
      showAlert("Error", "Failed to save records");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} />;

  const fgGroups = granulationRecords.reduce((acc, r) => {
    if (!acc[r.finished_good_id]) acc[r.finished_good_id] = { name: r.finished_good_name, records: [] };
    acc[r.finished_good_id].records.push(r);
    return acc;
  }, {});

  return (
    <Layout title="Production Granulation" navigation={navigation}>
      <ScrollView style={styles.container}>
        <Text style={styles.orderInfo}>Order: {order?.order_number}</Text>
        
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
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  orderInfo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  fgCard: { marginBottom: 20, padding: 10 },
  fgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fgName: { fontSize: 16, fontWeight: 'bold' },
  addText: { color: colors.primary, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5 },
  headerCol: { width: 80, textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  headerAction: { width: 50, textAlign: 'center', fontWeight: 'bold', fontSize: 12 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, alignItems: 'center' },
  input: { width: 80, height: 35, borderWidth: 1, borderColor: '#ddd', textAlign: 'center', marginHorizontal: 2, borderRadius: 4 },
  removeBtn: { width: 50, alignItems: 'center' }
});