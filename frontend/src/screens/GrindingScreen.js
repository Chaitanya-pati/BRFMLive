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
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedBagSizeIds, setSelectedBagSizeIds] = useState([]);

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
      
      const bins = binsRes.data || [];
      const bags = bagsRes.data || [];
      const fgs = fgRes.data || [];
      
      setAvailableBins(bins);
      setBagSizes(bags);
      setFinishedGoods(fgs);
      
      // Default: select all products and bag sizes
      setSelectedProductIds(fgs.map(f => f.id));
      setSelectedBagSizeIds(bags.map(b => b.id));
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

  const handleGridUpdate = (fgId, bsId, value) => {
    const newDetails = [...productionDetails];
    const index = newDetails.findIndex(d => d.finished_good_id === fgId && d.bag_size_id === bsId);
    
    if (index > -1) {
      newDetails[index].quantity_bags = value;
    } else {
      newDetails.push({ finished_good_id: fgId, bag_size_id: bsId, quantity_bags: value });
    }
    setProductionDetails(newDetails);
  };

  const toggleProduct = (id) => {
    setSelectedProductIds(prev => {
      const newIds = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      // When a product is selected, ensure we update the productionDetails for its specific bag sizes if needed
      return newIds;
    });
  };

  const toggleBagSize = (id) => {
    setSelectedBagSizeIds(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const renderDynamicGrid = () => {
    const activeFgs = finishedGoods.filter(fg => selectedProductIds.includes(fg.id));
    const activeBags = bagSizes.filter(bs => selectedBagSizeIds.includes(bs.id));

    // Grouping is not strictly necessary if we want to show each FG individually
    // but the user wants to handle different bag sizes for each product.
    // Let's ensure the grid correctly maps FG -> BagSize

    return (
      <View>
        <View style={styles.columnSelector}>
          <Text style={styles.selectorLabel}>Show Products:</Text>
          <View style={styles.chipContainer}>
            {finishedGoods.length > 0 ? finishedGoods.map(fg => (
              <TouchableOpacity 
                key={fg.id} 
                onPress={() => toggleProduct(fg.id)}
                style={[styles.chip, selectedProductIds.includes(fg.id) && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedProductIds.includes(fg.id) && styles.chipTextActive]}>{fg.product_name}</Text>
              </TouchableOpacity>
            )) : <Text style={{fontSize: 12, color: '#999'}}>No finished goods found</Text>}
          </View>
          
          <Text style={styles.selectorLabel}>Show Bag Sizes:</Text>
          <View style={styles.chipContainer}>
            {bagSizes.length > 0 ? bagSizes.map(bs => (
              <TouchableOpacity 
                key={bs.id} 
                onPress={() => toggleBagSize(bs.id)}
                style={[styles.chip, selectedBagSizeIds.includes(bs.id) && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedBagSizeIds.includes(bs.id) && styles.chipTextActive]}>{bs.weight_kg}kg</Text>
              </TouchableOpacity>
            )) : <Text style={{fontSize: 12, color: '#999'}}>No bag sizes found</Text>}
          </View>
        </View>

        {/* Dynamic Header */}
        <View style={styles.excelMainHeaderRow}>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>Date</Text></View>
          <View style={[styles.mainHeaderCell, { width: 80 }]}><Text style={styles.mainHeaderText}>Time</Text></View>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>B1 Scale Reading</Text></View>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>Load / Hr (In Tons)</Text></View>
          
          {activeFgs.map((fg, fgIdx) => {
            // Group bag sizes by product to handle different bag sizes for each product
            // Since activeBags are global, we display all selected bag sizes for each product
            const relevantBags = activeBags;
            
            if (relevantBags.length === 0) return null;

            return (
              <View key={fg.id} style={{ borderRightWidth: 1, borderColor: '#CCC' }}>
                <View style={styles.subHeaderTitle}><Text style={styles.subHeaderText}>{fg.product_name}</Text></View>
                <View style={{ flexDirection: 'row' }}>
                  {relevantBags.map((bs) => (
                    <View key={bs.id} style={styles.subHeaderCell}>
                      <Text style={styles.subHeaderText}>{bs.weight_kg} Kg</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>Reprocess Kgs/Hr</Text></View>
        </View>

        {/* Dynamic Data Row */}
        <View style={styles.excelDataRow}>
          <View style={{ width: 100, padding: 2 }}><InputField value={productionDate} disabled dense /></View>
          <View style={{ width: 80, padding: 2 }}><InputField value={productionTime} onChangeText={setProductionTime} placeholder="8am" dense /></View>
          <View style={{ width: 100, padding: 2 }}><InputField value={b1Reading} onChangeText={setB1Reading} keyboardType="decimal-pad" dense /></View>
          <View style={{ width: 100, padding: 2 }}><InputField value={loadPerHour} onChangeText={setLoadPerHour} keyboardType="decimal-pad" dense /></View>
          
          {activeFgs.map((fg, fgIdx) => {
            const relevantBags = activeBags;
            if (relevantBags.length === 0) return null;

            return (
              <View key={fg.id} style={{ flexDirection: 'row' }}>
                {relevantBags.map((bs) => {
                  const detail = productionDetails.find(d => d.finished_good_id === fg.id && d.bag_size_id === bs.id);
                  return (
                    <View key={bs.id} style={{ width: 80, padding: 2, backgroundColor: getBgColor(fgIdx) }}>
                      <InputField 
                        value={detail?.quantity_bags?.toString() || ""} 
                        onChangeText={(v) => handleGridUpdate(fg.id, bs.id, v)} 
                        keyboardType="numeric" 
                        dense 
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
          <View style={{ width: 100, padding: 2 }}>
            <InputField 
              value={productionDetails.find(d => d.product_code === 'REPROCESS')?.quantity_bags} 
              onChangeText={(v) => handleGridUpdate('REPROCESS', null, v)} 
              keyboardType="numeric" 
              dense 
            />
          </View>
        </View>
      </View>
    );
  };

  const getBgColor = (idx) => {
    const colors = ['#E1BEE7', '#FFE0B2', '#E0E0E0', '#FFCCBC', '#C5CAE9', '#F0F4C3'];
    return colors[idx % colors.length];
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
      
      // Filter out empty lines before submitting
      const validDetails = productionDetails
        .filter(d => d.finished_good_id && d.bag_size_id)
        .map(d => ({
          ...d,
          quantity_bags: parseInt(d.quantity_bags) || 0
        }));

      if (validDetails.length === 0) {
        showAlert("Validation", "Please add at least one finished good entry with product and bag size");
        setLoading(false);
        return;
      }

      await client.post("/grinding/hourly-production", {
        production_order_id: selectedBin.production_order_id,
        production_date: productionDate,
        production_time: productionTime,
        b1_scale_reading: parseFloat(b1Reading),
        load_per_hour_tons: parseFloat(loadPerHour) || 0,
        details: validDetails
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
              
              <View style={styles.excelTopHeader}>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Date</Text>
                  <Text style={styles.topHeaderValue}>{selectedBin?.created_at ? new Date(selectedBin.created_at).toISOString().split('T')[0] : productionDate}</Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Batch No</Text>
                  <Text style={styles.topHeaderValue}>{selectedBin?.order_number || 'N/A'}</Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Product</Text>
                  <Text style={styles.topHeaderValue}>{selectedBin?.raw_product_name || 'Wheat'}</Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Start Date</Text>
                  <Text style={styles.topHeaderValue}>{selectedBin?.created_at ? new Date(selectedBin.created_at).toISOString().split('T')[0] : productionDate}</Text>
                </View>
              </View>

              <ScrollView horizontal>
                {renderDynamicGrid()}
              </ScrollView>

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
  removeText: { color: '#F44336', fontWeight: 'bold' },
  excelHeaderRow: { flexDirection: 'row', backgroundColor: '#F0F0F0', paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomWidth: 1, borderBottomColor: '#DDD' },
  excelHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#666', textAlign: 'center' },
  excelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  addGridBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#FFF' },
  addGridBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  excelTopHeader: { flexDirection: 'row', backgroundColor: '#FFFAD2', borderWidth: 1, borderColor: '#CCC', marginBottom: 15 },
  topHeaderBox: { flex: 1, padding: 8, borderRightWidth: 1, borderColor: '#CCC', alignItems: 'center' },
  topHeaderLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 4 },
  topHeaderValue: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  excelMainHeaderRow: { flexDirection: 'row', backgroundColor: '#FFFAD2' },
  mainHeaderCell: { padding: 10, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  mainHeaderText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  subHeaderTitle: { padding: 5, borderBottomWidth: 1, borderColor: '#CCC', alignItems: 'center', backgroundColor: '#FFFAD2' },
  subHeaderCell: { flex: 1, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#CCC', alignItems: 'center', backgroundColor: '#FFFAD2', minWidth: 80 },
  subHeaderText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  excelDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#CCC' },
  columnSelector: { padding: 10, backgroundColor: '#F9F9F9', borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  selectorLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: '#EEE', borderWidth: 1, borderColor: '#DDD' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: '#666' },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' }
});