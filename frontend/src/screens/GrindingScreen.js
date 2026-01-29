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
  const [silos, setSilos] = useState([]);

  const [selectedBin, setSelectedBin] = useState(null);
  const [isGrindingStarted, setIsGrindingStarted] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productBagSizeMap, setProductBagSizeMap] = useState({});
  const [selectedSiloIds, setSelectedSiloIds] = useState([]);

  // Hourly Data Form - Multiple Rows
  const [productionRows, setProductionRows] = useState([
    {
      id: Date.now(),
      productionDate: new Date().toISOString().split('T')[0],
      productionTime: "",
      b1Reading: "",
      loadPerHour: "",
      productionDetails: []
    }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [binsRes, bagsRes, fgRes, silosRes] = await Promise.all([
        client.get("/grinding/available-bins"),
        client.get("/bag-sizes"),
        client.get("/finished-goods"),
        client.get("/silos")
      ]);
      
      const bins = binsRes.data || [];
      const bags = bagsRes.data || [];
      const fgs = fgRes.data || [];
      const sls = silosRes.data || [];
      
      setAvailableBins(bins);
      setBagSizes(bags);
      setFinishedGoods(fgs);
      setSilos(sls);
      
      // Default: select all products and all bag sizes for each
      setSelectedProductIds(fgs.map(f => f.id));
      
      const initialMap = {};
      fgs.forEach(fg => {
        initialMap[fg.id] = bags.map(b => b.id);
      });
      setProductBagSizeMap(initialMap);
    } catch (error) {
      showAlert("Error", "Failed to fetch grinding data");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingProductionData = async (orderId) => {
    try {
      const client = getApiClient();
      const res = await client.get("/grinding/hourly-production");
      
      // Filter data for the current production order
      const existingData = (res.data || []).filter(row => row.production_order_id === orderId);
      
      // Sort existing data by created_at or production_time to maintain order
      const sortedData = existingData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      if (sortedData.length > 0) {
        const formattedRows = sortedData.map(row => ({
          id: row.id,
          productionDate: row.production_date,
          productionTime: row.production_time,
          b1Reading: row.b1_scale_reading?.toString(),
          loadPerHour: row.load_per_hour_tons?.toString(),
          productionDetails: row.details || [],
          isSubmitted: true
        }));
        
        // Add one empty row for new entry
        formattedRows.push({
          id: Date.now(),
          productionDate: new Date().toISOString().split('T')[0],
          productionTime: "",
          b1Reading: "",
          loadPerHour: "",
          productionDetails: [],
          isSubmitted: false
        });
        
        setProductionRows(formattedRows);
      } else {
        setProductionRows([{
          id: Date.now(),
          productionDate: new Date().toISOString().split('T')[0],
          productionTime: "",
          b1Reading: "",
          loadPerHour: "",
          productionDetails: [],
          isSubmitted: false
        }]);
      }
    } catch (error) {
      console.error("Failed to fetch existing production data", error);
    }
  };

  const handleBinSelect = (bin) => {
    if (!bin.production_order_id) {
      showAlert("Error", "No Production Order found for this bin in transfer records");
      return;
    }
    setSelectedBin(bin);
    setIsGrindingStarted(true);
    fetchExistingProductionData(bin.production_order_id);
    showToast("Success", `Grinding started for Bin ${bin.bin_number}`);
  };

  const handleAddRow = () => {
    setProductionRows([...productionRows, {
      id: Date.now(),
      productionDate: new Date().toISOString().split('T')[0],
      productionTime: "",
      b1Reading: "",
      loadPerHour: "",
      productionDetails: [],
      isSubmitted: false
    }]);
  };

  const handleRemoveRow = (rowId) => {
    if (productionRows.length > 1) {
      setProductionRows(productionRows.filter(r => r.id !== rowId));
    }
  };

  const handleRowUpdate = (rowId, field, value) => {
    setProductionRows(productionRows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const handleGridUpdate = (rowId, fgId, bsId, value, isSilo = false, siloId = null, field = 'quantity_kg') => {
    setProductionRows(productionRows.map(row => {
      if (row.id !== rowId) return row;
      
      if (isSilo) {
        const newSiloDetails = [...(row.siloDetails || [])];
        const index = newSiloDetails.findIndex(d => d.finished_good_id === fgId && d.silo_id === siloId);
        
        if (index > -1) {
          newSiloDetails[index][field] = value;
        } else {
          newSiloDetails.push({ finished_good_id: fgId, silo_id: siloId, quantity_kg: field === 'quantity_kg' ? value : "", moisture_percent: field === 'moisture_percent' ? value : "" });
        }
        return { ...row, siloDetails: newSiloDetails };
      } else {
        const newDetails = [...row.productionDetails];
        const index = newDetails.findIndex(d => d.finished_good_id === fgId && d.bag_size_id === bsId);
        
        if (index > -1) {
          newDetails[index].quantity_bags = value;
        } else {
          newDetails.push({ finished_good_id: fgId, bag_size_id: bsId, quantity_bags: value });
        }
        return { ...row, productionDetails: newDetails };
      }
    }));
  };

  const toggleSilo = (id) => {
    setSelectedSiloIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleProduct = (id) => {
    setSelectedProductIds(prev => {
      const newIds = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      return newIds;
    });
  };

  const toggleBagSizeForProduct = (fgId, bsId) => {
    setProductBagSizeMap(prev => {
      const currentBags = prev[fgId] || [];
      const newBags = currentBags.includes(bsId) 
        ? currentBags.filter(id => id !== bsId) 
        : [...currentBags, bsId];
      return { ...prev, [fgId]: newBags };
    });
  };

  const renderDynamicGrid = () => {
    const activeFgs = finishedGoods.filter(fg => selectedProductIds.includes(fg.id));

    return (
      <View>
        <View style={styles.columnSelector}>
          <Text style={styles.selectorLabel}>Select Products & Bag Sizes:</Text>
          <View style={styles.productBagConfigContainer}>
            {finishedGoods.length > 0 ? finishedGoods.map(fg => (
              <View key={fg.id} style={styles.productConfigCard}>
                <TouchableOpacity 
                  onPress={() => toggleProduct(fg.id)}
                  style={[styles.productChip, selectedProductIds.includes(fg.id) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedProductIds.includes(fg.id) && styles.chipTextActive]}>{fg.product_name}</Text>
                </TouchableOpacity>
                
                {selectedProductIds.includes(fg.id) && (
                  <View style={styles.bagSizeChipContainer}>
                    {bagSizes.map(bs => (
                      <TouchableOpacity 
                        key={bs.id} 
                        onPress={() => toggleBagSizeForProduct(fg.id, bs.id)}
                        style={[styles.miniChip, productBagSizeMap[fg.id]?.includes(bs.id) && styles.chipActive]}
                      >
                        <Text style={[styles.miniChipText, productBagSizeMap[fg.id]?.includes(bs.id) && styles.chipTextActive]}>{bs.weight_kg}k</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {selectedProductIds.includes(fg.id) && fg.product_name.toLowerCase().includes('maida') && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 5 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 5 }}>Select Silos:</Text>
                    <View style={styles.bagSizeChipContainer}>
                      {silos.map(s => (
                        <TouchableOpacity 
                          key={s.silo_id} 
                          onPress={() => toggleSilo(s.silo_id)}
                          style={[styles.miniChip, { backgroundColor: '#E1F5FE' }, selectedSiloIds.includes(s.silo_id) && { backgroundColor: '#0288D1' }]}
                        >
                          <Text style={[styles.miniChipText, selectedSiloIds.includes(s.silo_id) && { color: '#FFF' }]}>{s.silo_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )) : <Text style={{fontSize: 12, color: '#999'}}>No finished goods found</Text>}
          </View>
        </View>

        {/* Dynamic Header */}
        <View style={styles.excelMainHeaderRow}>
          <View style={[styles.mainHeaderCell, { width: 40 }]}><Text style={styles.mainHeaderText}>#</Text></View>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>Date</Text></View>
          <View style={[styles.mainHeaderCell, { width: 80 }]}><Text style={styles.mainHeaderText}>Time</Text></View>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>B1 Scale Reading</Text></View>
          <View style={[styles.mainHeaderCell, { width: 100 }]}><Text style={styles.mainHeaderText}>Load / Hr (In Tons)</Text></View>
          
          {activeFgs.map((fg, fgIdx) => {
            const activeBagIds = productBagSizeMap[fg.id] || [];
            const relevantBags = bagSizes.filter(bs => activeBagIds.includes(bs.id));
            const isMaida = fg.product_name.toLowerCase().includes('maida');
            const relevantSilos = isMaida ? silos.filter(s => selectedSiloIds.includes(s.silo_id)) : [];
            
            if (relevantBags.length === 0 && relevantSilos.length === 0) return null;

            return (
              <View key={fg.id} style={{ borderRightWidth: 1, borderColor: '#CCC' }}>
                <View style={styles.subHeaderTitle}><Text style={styles.subHeaderText}>{fg.product_name}</Text></View>
                <View style={{ flexDirection: 'row' }}>
                  {relevantBags.map((bs) => (
                    <View key={bs.id} style={styles.subHeaderCell}>
                      <Text style={styles.subHeaderText}>{bs.weight_kg} Kg</Text>
                    </View>
                  ))}
                  {relevantSilos.map((s) => (
                    <View key={s.silo_id} style={[styles.subHeaderCell, { backgroundColor: '#E1F5FE', minWidth: 160 }]}>
                      <Text style={styles.subHeaderText}>{s.silo_name} (Tons / Moist%)</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <View style={[styles.mainHeaderCell, { width: 100, backgroundColor: '#FFFAD2' }]}><Text style={styles.mainHeaderText}>Reprocess Kgs/Hr</Text></View>
          <View style={[styles.mainHeaderCell, { width: 50 }]}><Text style={styles.mainHeaderText}>Act</Text></View>
        </View>

        {/* Dynamic Data Rows */}
        {productionRows.map((row, rowIdx) => (
          <View key={row.id} style={[styles.excelDataRow, row.isSubmitted && { backgroundColor: '#F0F0F0' }]}>
            <View style={{ width: 40, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: '#CCC' }}>
              <Text style={{ fontSize: 10 }}>{rowIdx + 1}</Text>
            </View>
            <View style={{ width: 100, padding: 2 }}><InputField value={row.productionDate} disabled={row.isSubmitted} dense /></View>
            <View style={{ width: 80, padding: 2 }}><InputField value={row.productionTime} onChangeText={(v) => handleRowUpdate(row.id, 'productionTime', v)} placeholder="8am" disabled={row.isSubmitted} dense /></View>
            <View style={{ width: 100, padding: 2 }}><InputField value={row.b1Reading} onChangeText={(v) => handleRowUpdate(row.id, 'b1Reading', v)} keyboardType="decimal-pad" disabled={row.isSubmitted} dense /></View>
            <View style={{ width: 100, padding: 2 }}><InputField value={row.loadPerHour} onChangeText={(v) => handleRowUpdate(row.id, 'loadPerHour', v)} keyboardType="decimal-pad" disabled={row.isSubmitted} dense /></View>
            
            {activeFgs.map((fg, fgIdx) => {
              const activeBagIds = productBagSizeMap[fg.id] || [];
              const relevantBags = bagSizes.filter(bs => activeBagIds.includes(bs.id));
              const isMaida = fg.product_name.toLowerCase().includes('maida');
              const relevantSilos = isMaida ? silos.filter(s => selectedSiloIds.includes(s.silo_id)) : [];

              if (relevantBags.length === 0 && relevantSilos.length === 0) return null;

              return (
                <View key={fg.id} style={{ flexDirection: 'row' }}>
                  {relevantBags.map((bs) => {
                    const detail = row.productionDetails?.find(d => d.finished_good_id === fg.id && d.bag_size_id === bs.id);
                    return (
                      <View key={bs.id} style={{ width: 80, padding: 2, backgroundColor: getBgColor(fgIdx) }}>
                        <InputField 
                          value={detail?.quantity_bags?.toString() || ""} 
                          onChangeText={(v) => handleGridUpdate(row.id, fg.id, bs.id, v)} 
                          keyboardType="numeric" 
                          disabled={row.isSubmitted}
                          dense 
                        />
                      </View>
                    );
                  })}
                  {relevantSilos.map((s) => {
                    const siloDetail = row.siloDetails?.find(d => d.finished_good_id === fg.id && d.silo_id === s.silo_id);
                    return (
                      <View key={s.silo_id} style={{ width: 160, padding: 2, backgroundColor: '#E1F5FE', flexDirection: 'row', gap: 2 }}>
                        <View style={{ flex: 1 }}>
                          <InputField 
                            placeholder="Qty (T)"
                            value={siloDetail?.quantity_kg?.toString() || ""} 
                            onChangeText={(v) => handleGridUpdate(row.id, fg.id, null, v, true, s.silo_id, 'quantity_kg')} 
                            keyboardType="numeric" 
                            disabled={row.isSubmitted}
                            dense 
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <InputField 
                            placeholder="Moist %"
                            value={siloDetail?.moisture_percent?.toString() || ""} 
                            onChangeText={(v) => handleGridUpdate(row.id, fg.id, null, v, true, s.silo_id, 'moisture_percent')} 
                            keyboardType="numeric" 
                            disabled={row.isSubmitted}
                            dense 
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ width: 100, padding: 2, backgroundColor: '#FFFAD2' }}>
              <InputField 
                value={row.productionDetails.find(d => d.finished_good_id === 'REPROCESS')?.quantity_bags?.toString() || ""} 
                onChangeText={(v) => handleGridUpdate(row.id, 'REPROCESS', null, v)} 
                keyboardType="numeric" 
                disabled={row.isSubmitted}
                dense 
              />
            </View>
            <View style={{ width: 50, padding: 2, justifyContent: 'center', alignItems: 'center' }}>
              {!row.isSubmitted && (
                <TouchableOpacity onPress={() => handleRemoveRow(row.id)}>
                  <Text style={{ color: '#F44336', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addRowBtn} onPress={handleAddRow}>
          <Text style={styles.addRowBtnText}>+ Add New Entry Row</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getBgColor = (idx) => {
    const colors = ['#E1BEE7', '#FFE0B2', '#E0E0E0', '#FFCCBC', '#C5CAE9', '#F0F4C3'];
    return colors[idx % colors.length];
  };

  const handleSubmitHourly = async () => {
    const newRows = productionRows.filter(r => !r.isSubmitted);
    
    if (newRows.length === 0) {
      showAlert("Info", "All rows are already submitted");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      
      for (const row of newRows) {
        if (!row.productionTime || !row.b1Reading) continue;

        const validDetails = row.productionDetails
          .filter(d => d.finished_good_id)
          .map(d => ({
            ...d,
            quantity_bags: parseInt(d.quantity_bags) || 0
          }));

        const validSiloDetails = (row.siloDetails || [])
          .filter(d => d.finished_good_id && d.silo_id)
          .map(d => ({
            ...d,
            quantity_kg: parseFloat(d.quantity_kg) || 0,
            moisture_percent: parseFloat(d.moisture_percent) || null
          }));

        if (validDetails.length === 0 && validSiloDetails.length === 0) continue;

        await client.post("/grinding/hourly-production", {
          production_order_id: selectedBin.production_order_id,
          production_date: row.productionDate,
          production_time: row.productionTime,
          b1_scale_reading: parseFloat(row.b1Reading),
          load_per_hour_tons: parseFloat(row.loadPerHour) || 0,
          details: validDetails,
          silo_details: validSiloDetails
        });
      }

      showToast("Success", "Hourly production recorded");
      fetchExistingProductionData(selectedBin.production_order_id);
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
  columnSelector: { padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  selectorLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  productBagConfigContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productConfigCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#DDD', 
    padding: 8, 
    minWidth: 150,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EEE', marginBottom: 8 },
  bagSizeChipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingLeft: 5 },
  miniChip: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, backgroundColor: '#F0F0F0', borderWidth: 0.5, borderColor: '#CCC' },
  miniChipText: { fontSize: 9, color: '#666' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: '#666' },
  chipTextActive: { color: '#FFF', fontWeight: 'bold' },
  addRowBtn: { 
    marginVertical: 15, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: colors.primary, 
    borderStyle: 'dashed', 
    borderRadius: 8, 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  addRowBtnText: { color: colors.primary, fontWeight: 'bold' }
});