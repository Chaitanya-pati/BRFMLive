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
  const [productionOrders, setProductionOrders] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [isGrindingStarted, setIsGrindingStarted] = useState(false);

  // Hourly Data Form
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [productionTime, setProductionTime] = useState("");
  const [b1Reading, setB1Reading] = useState("");
  const [loadPerHour, setLoadPerHour] = useState("");
  const [reprocess, setReprocess] = useState("");
  const [refraction, setRefraction] = useState("");
  
  // Production Details (Finished Goods)
  const [productionDetails, setProductionDetails] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [binsRes, ordersRes, bagsRes, fgRes] = await Promise.all([
        client.get("/grinding/available-bins"),
        client.get("/production-orders"),
        client.get("/bag-sizes"),
        client.get("/finished-goods")
      ]);
      setAvailableBins(binsRes.data || []);
      setProductionOrders(ordersRes.data || []);
      setBagSizes(bagsRes.data || []);
      setFinishedGoods(fgRes.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch grinding data");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGrinding = () => {
    if (!selectedOrder || !selectedBin) {
      showAlert("Validation", "Please select Production Order and Bin");
      return;
    }
    setIsGrindingStarted(true);
    showToast("Success", "Grinding process started");
  };

  const handleAddDetail = () => {
    setProductionDetails([...productionDetails, { finished_good_id: "", bag_size_id: "", quantity_bags: "", refraction: "0", reprocess: "0" }]);
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
        production_order_id: selectedOrder,
        production_date: productionDate,
        production_time: productionTime,
        b1_scale_reading: parseFloat(b1Reading),
        load_per_hour_tons: parseFloat(loadPerHour) || 0,
        reprocess: parseFloat(reprocess) || 0,
        refraction: parseFloat(refraction) || 0,
        details: productionDetails.map(d => ({
          ...d,
          quantity_bags: parseInt(d.quantity_bags) || 0,
          refraction: parseFloat(d.refraction) || 0,
          reprocess: parseFloat(d.reprocess) || 0
        }))
      });
      showToast("Success", "Hourly production recorded");
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
        </View>

        {!isGrindingStarted ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Start Grinding</Text>
            <SelectDropdown
              label="Production Order"
              value={selectedOrder}
              onValueChange={setSelectedOrder}
              options={productionOrders.map(o => ({ label: o.order_number, value: o.id }))}
            />
            <SelectDropdown
              label="Select 12-Hour Bin"
              value={selectedBin}
              onValueChange={setSelectedBin}
              options={availableBins.map(b => ({ label: `Bin ${b.bin_number}`, value: b.id }))}
            />
            <Button title="Start Grinding" onPress={handleStartGrinding} />
          </Card>
        ) : (
          <View>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.infoText}>Order: {productionOrders.find(o => o.id === selectedOrder)?.order_number}</Text>
                <Text style={styles.infoText}>Bin: {availableBins.find(b => b.id === selectedBin)?.bin_number}</Text>
              </View>
              <Button title="Change Bin" variant="secondary" size="small" onPress={() => setIsGrindingStarted(false)} />
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
                </View>
              ))}
              <Button title="+ Add Product" variant="secondary" onPress={handleAddDetail} />
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
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  card: { padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.text.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoText: { fontSize: 16, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
});