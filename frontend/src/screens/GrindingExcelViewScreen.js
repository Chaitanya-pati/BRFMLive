import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showAlert } from "../utils/customAlerts";

export default function GrindingExcelViewScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [productionData, setProductionData] = useState([]);

  useEffect(() => {
    fetchProductionData();
  }, []);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get("/grinding/hourly-production");
      setProductionData(response.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch production data");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, { width: 100 }]}>Date</Text>
      <Text style={[styles.headerText, { width: 80 }]}>Time</Text>
      <Text style={[styles.headerText, { width: 100 }]}>B1 Scale</Text>
      <Text style={[styles.headerText, { width: 100 }]}>Load/Hr</Text>
      <Text style={[styles.headerText, { width: 120 }]}>Product</Text>
      <Text style={[styles.headerText, { width: 80 }]}>Bag Size</Text>
      <Text style={[styles.headerText, { width: 80 }]}>Qty</Text>
    </View>
  );

  const renderRows = () => {
    return productionData.map((row) => (
      <View key={row.id} style={styles.rowGroup}>
        {row.details && row.details.length > 0 ? (
          row.details.map((detail, idx) => (
            <View key={`${row.id}-${idx}`} style={styles.tableRow}>
              <Text style={[styles.cellText, { width: 100 }]}>{idx === 0 ? new Date(row.production_date).toLocaleDateString() : ""}</Text>
              <Text style={[styles.cellText, { width: 80 }]}>{idx === 0 ? row.production_time : ""}</Text>
              <Text style={[styles.cellText, { width: 100 }]}>{idx === 0 ? row.b1_scale_reading : ""}</Text>
              <Text style={[styles.cellText, { width: 100 }]}>{idx === 0 ? row.load_per_hour_tons : ""}</Text>
              <Text style={[styles.cellText, { width: 120 }]}>{detail.finished_good_id}</Text>
              <Text style={[styles.cellText, { width: 80 }]}>{detail.bag_size_id}</Text>
              <Text style={[styles.cellText, { width: 80 }]}>{detail.quantity_bags}</Text>
            </View>
          ))
        ) : (
          <View style={styles.tableRow}>
            <Text style={[styles.cellText, { width: 100 }]}>{new Date(row.production_date).toLocaleDateString()}</Text>
            <Text style={[styles.cellText, { width: 80 }]}>{row.production_time}</Text>
            <Text style={[styles.cellText, { width: 100 }]}>{row.b1_scale_reading}</Text>
            <Text style={[styles.cellText, { width: 100 }]}>{row.load_per_hour_tons}</Text>
            <Text style={[styles.cellText, { width: 120 }]}>-</Text>
            <Text style={[styles.cellText, { width: 80 }]}>-</Text>
            <Text style={[styles.cellText, { width: 80 }]}>-</Text>
          </View>
        )}
      </View>
    ));
  };

  return (
    <Layout navigation={navigation}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Grinding Entry - Excel View</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchProductionData}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <ScrollView horizontal>
            <View>
              {renderHeader()}
              <ScrollView>
                {renderRows()}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  refreshButton: { backgroundColor: colors.primary, padding: 10, borderRadius: 5 },
  refreshButtonText: { color: '#fff', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.primary, padding: 12, borderRadius: 4 },
  headerText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  rowGroup: { borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
  cellText: { fontSize: 13, textAlign: 'center', color: '#333' },
});