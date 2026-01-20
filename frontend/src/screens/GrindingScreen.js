import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import SelectDropdown from "../components/SelectDropdown";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

export default function GrindingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(false);
  const [availableBins, setAvailableBins] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);

  const [selectedBin, setSelectedBin] = useState(null);
  const [isGrindingStarted, setIsGrindingStarted] = useState(false);

  // Hourly Data Form
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [productionTime, setProductionTime] = useState("");
  const [b1Reading, setB1Reading] = useState("");
  const [loadPerHour, setLoadPerHour] = useState("");
  
  const [productionDetails, setProductionDetails] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [binsRes, bagsRes, fgRes] = await Promise.all([
        client.get("/grinding/available-bins"),
        client.get("/bag-sizes"),
        client.get("/finished-goods")
      ]);
      setAvailableBins(binsRes.data || []);
      setBagSizes(bagsRes.data || []);
      setFinishedGoods(fgRes.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch grinding data");
    } finally {
      setLoading(false);
    }
  };

  const handleBinSelect = (bin) => {
    if (!bin.production_order_id) {
      showAlert("Error", "No Production Order found for this bin in transfer records");
      return;
    }
    setSelectedBin(bin);
    setIsGrindingStarted(true);
    showToast("Success", `Grinding started for Bin ${bin.bin_number}`);
  };

  const handleAddDetail = () => {
    setProductionDetails([...productionDetails, { finished_good_id: "", bag_size_id: "", quantity_bags: "" }]);
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...productionDetails];
    newDetails[index][field] = value;
    setProductionDetails(newDetails);
  };

  const handleSubmitHourly = async () => {
    if (!productionTime || !b1Reading) {
      showAlert("Validation", "Please enter Time and B1 Reading");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      await client.post("/grinding/hourly-production", {
        production_order_id: selectedBin.production_order_id,
        production_date: productionDate,
        production_time: productionTime,
        b1_scale_reading: parseFloat(b1Reading),
        load_per_hour_tons: parseFloat(loadPerHour) || 0,
        details: productionDetails.map(d => ({
          ...d,
          quantity_bags: parseInt(d.quantity_bags) || 0
        }))
      });
      showToast("Success", "Hourly production recorded");
      navigation.navigate('GrindingExcelView');
      // Reset form
      setProductionTime("");
      setB1Reading("");
      setLoadPerHour("");
      setProductionDetails([]);
    } catch (error) {
      showAlert("Error", "Failed to save hourly production");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Grinding Process</Text>
          <TouchableOpacity 
            style={styles.excelButton} 
            onPress={() => navigation.navigate('GrindingExcelView')}
          >
            <Text style={styles.excelButtonText}>View Data</Text>
          </TouchableOpacity>
        </View>

        {!isGrindingStarted ? (
          <View style={styles.binListSection}>
            <Text style={styles.sectionTitle}>Select a Filled 12-Hour Bin to Start</Text>
            {loading && availableBins.length === 0 ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : availableBins.length > 0 ? (
              availableBins.map((bin) => (
                <TouchableOpacity 
                  key={bin.id} 
                  style={styles.binCard}
                  onPress={() => handleBinSelect(bin)}
                >
                  <View style={styles.binIconContainer}>
                    <Text style={styles.binIcon}>📦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.binName}>Bin {bin.bin_number}</Text>
                    <Text style={styles.binOrder}>Order: {bin.order_number || 'None Found'}</Text>
                    <Text style={styles.binStatus}>Status: {bin.status || 'Ready'}</Text>
                  </View>
                  <View style={styles.startBadge}>
                    <Text style={styles.startBadgeText}>START</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noBinsText}>No filled 12-hour bins available</Text>
            )}
          </View>
        ) : (
          <View>
            <Card style={styles.activeInfoCard}>
              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.activeLabel}>Order</Text>
                  <Text style={styles.activeValue}>{selectedBin?.order_number}</Text>
                </View>
                <View>
                  <Text style={styles.activeLabel}>Bin</Text>
                  <Text style={styles.activeValue}>Bin {selectedBin?.bin_number}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsGrindingStarted(false)}>
                  <Text style={styles.changeText}>Change Bin</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Hourly Production Entry</Text>
              <View style={styles.grid}>
                <InputField label="Time" value={productionTime} onChangeText={setProductionTime} placeholder="e.g. 10:00 AM" />
                <InputField label="B1 Scale Reading" value={b1Reading} onChangeText={setB1Reading} keyboardType="decimal-pad" />
                <InputField label="Load/Hour (Tons)" value={loadPerHour} onChangeText={setLoadPerHour} keyboardType="decimal-pad" />
              </View>

              <Text style={[styles.cardTitle, { marginTop: 20 }]}>Finished Goods Production</Text>
              {productionDetails.map((detail, index) => (
                <View key={index} style={styles.detailRow}>
                  <SelectDropdown
                    label="Product"
                    value={detail.finished_good_id}
                    onValueChange={(v) => updateDetail(index, 'finished_good_id', v)}
                    options={finishedGoods.map(fg => ({ label: fg.product_name, value: fg.id }))}
                  />
                  <SelectDropdown
                    label="Bag Size"
                    value={detail.bag_size_id}
                    onValueChange={(v) => updateDetail(index, 'bag_size_id', v)}
                    options={bagSizes.map(bs => ({ label: `${bs.weight_kg}kg`, value: bs.id }))}
                  />
                  <InputField
                    label="Quantity (Bags)"
                    value={detail.quantity_bags}
                    onChangeText={(v) => updateDetail(index, 'quantity_bags', v)}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity 
                    onPress={() => setProductionDetails(productionDetails.filter((_, i) => i !== index))}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Button title="+ Add Product Line" variant="secondary" onPress={handleAddDetail} />
              <View style={{ marginTop: 20 }}>
                <Button title="Submit Hourly Data" onPress={handleSubmitHourly} loading={loading} />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  excelButton: { backgroundColor: colors.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  excelButtonText: { color: '#fff', fontWeight: 'bold' },
  card: { padding: 16, marginBottom: 16, borderRadius: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.text.primary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: colors.text.primary, textAlign: 'center' },
  binListSection: { marginBottom: 20 },
  binCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  binIconContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#E3F2FD', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  binIcon: { fontSize: 26 },
  binName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  binOrder: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 2 },
  binStatus: { fontSize: 13, color: '#666', marginTop: 2 },
  startBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  startBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  noBinsText: { textAlign: 'center', padding: 20, color: '#999', fontStyle: 'italic' },
  activeInfoCard: { padding: 15, marginBottom: 16, backgroundColor: '#E8F5E9', borderLeftWidth: 5, borderLeftColor: '#4CAF50', borderRadius: 10 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  activeValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  changeText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailRow: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 15 },
  removeBtn: { alignSelf: 'flex-end', marginTop: 5 },
  removeText: { color: '#F44336', fontWeight: 'bold' }
});