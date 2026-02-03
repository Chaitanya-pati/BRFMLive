import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList } from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import Card from "../components/Card";
import SelectDropdown from "../components/SelectDropdown";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

export default function FinishedGoodsManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);
  
  const [godownModalVisible, setGodownModalVisible] = useState(false);
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  
  const [godownForm, setGodownForm] = useState({ godown_code: "", godown_name: "", capacity_bags: "", location: "" });
  const [movementForm, setMovementForm] = useState({ movement_type: "IN", from_godown_id: null, to_godown_id: null, finished_good_id: null, bag_size_id: null, quantity_bags: "", remarks: "" });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [gRes, fgRes, bsRes] = await Promise.all([
        client.get("/finished-goods-godown"),
        client.get("/finished-goods"),
        client.get("/bag-sizes")
      ]);
      setGodowns(gRes.data || []);
      setFinishedGoods(fgRes.data || []);
      setBagSizes(bsRes.data || []);
      if (gRes.data?.length > 0) handleSelectGodown(gRes.data[0]);
    } catch (error) {
      showAlert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGodown = async (godown) => {
    setSelectedGodown(godown);
    try {
      const client = getApiClient();
      const res = await client.get(\`/finished-goods-godown-stock?godown_id=\${godown.id}\`);
      setStocks(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateGodown = async () => {
    if (!godownForm.godown_code || !godownForm.godown_name) return showAlert("Error", "Fill required fields");
    setLoading(true);
    try {
      const client = getApiClient();
      await client.post("/finished-goods-godown", { ...godownForm, capacity_bags: parseInt(godownForm.capacity_bags) || 0 });
      showToast("Success", "Godown created");
      setGodownModalVisible(false);
      fetchInitialData();
    } catch (error) {
      showAlert("Error", "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const handleMovement = async () => {
    if (!movementForm.finished_good_id || !movementForm.bag_size_id || !movementForm.quantity_bags) return showAlert("Error", "Fill required fields");
    
    const qty = parseInt(movementForm.quantity_bags);
    if (isNaN(qty) || qty <= 0) return showAlert("Error", "Enter a valid quantity greater than zero");

    if (movementForm.movement_type === 'OUT' || movementForm.movement_type === 'TRANSFER') {
      const currentStock = stocks.find(s => s.finished_good_id === movementForm.finished_good_id && s.bag_size_id === movementForm.bag_size_id);
      if (!currentStock || currentStock.quantity_bags < qty) {
        return showAlert("Error", `Insufficient stock. Available: ${currentStock ? currentStock.quantity_bags : 0} bags`);
      }
    }

    if (movementForm.movement_type === 'TRANSFER') {
      if (!movementForm.to_godown_id) return showAlert("Error", "Select destination godown");
      if (selectedGodown.id === movementForm.to_godown_id) {
        return showAlert("Error", "Source and destination godowns cannot be the same");
      }
    }

    setLoading(true);
    try {
      const client = getApiClient();
      const payload = { 
        ...movementForm, 
        quantity_bags: parseInt(movementForm.quantity_bags),
        to_godown_id: movementForm.movement_type === 'IN' || movementForm.movement_type === 'TRANSFER' ? (movementForm.movement_type === 'TRANSFER' ? movementForm.to_godown_id : selectedGodown.id) : null,
        from_godown_id: movementForm.movement_type === 'OUT' || movementForm.movement_type === 'TRANSFER' ? (movementForm.movement_type === 'TRANSFER' ? movementForm.from_godown_id : selectedGodown.id) : null,
      };
      await client.post("/finished-goods-godown-movement", payload);
      showToast("Success", "Movement recorded");
      setMovementModalVisible(false);
      handleSelectGodown(selectedGodown);
    } catch (error) {
      showAlert("Error", error.response?.data?.detail || "Movement failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>FG Godown Management</Text>
          <Button title="+ Add Godown" onPress={() => setGodownModalVisible(true)} small />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {godowns.map(g => (
            <TouchableOpacity 
              key={g.id} 
              style={[styles.tab, selectedGodown?.id === g.id && styles.activeTab]} 
              onPress={() => handleSelectGodown(g)}
            >
              <Text style={[styles.tabText, selectedGodown?.id === g.id && styles.activeTabText]}>{g.godown_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedGodown && (
          <Card style={styles.stockCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current Stock: {selectedGodown.godown_name}</Text>
              <Button title="Stock Movement" onPress={() => setMovementModalVisible(true)} small secondary />
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, {flex: 2}]}>Product</Text>
                <Text style={styles.cell}>Bag Size</Text>
                <Text style={styles.cell}>Quantity</Text>
              </View>
              {stocks.length > 0 ? stocks.map(s => (
                <View key={s.id} style={styles.tableRow}>
                  <Text style={[styles.cell, {flex: 2}]}>{finishedGoods.find(f => f.id === s.finished_good_id)?.product_name || s.finished_good_id}</Text>
                  <Text style={styles.cell}>{bagSizes.find(b => b.id === s.bag_size_id)?.weight_kg || s.bag_size_id}kg</Text>
                  <Text style={[styles.cell, styles.stockValue]}>{s.quantity_bags}</Text>
                </View>
              )) : <Text style={styles.emptyText}>No stock available</Text>}
            </View>
          </Card>
        )}

        <Modal visible={godownModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Godown</Text>
              <InputField label="Godown Code" value={godownForm.godown_code} onChangeText={v => setGodownForm({...godownForm, godown_code: v})} />
              <InputField label="Godown Name" value={godownForm.godown_name} onChangeText={v => setGodownForm({...godownForm, godown_name: v})} />
              <InputField label="Capacity (Bags)" value={godownForm.capacity_bags} onChangeText={v => setGodownForm({...godownForm, capacity_bags: v})} keyboardType="numeric" />
              <InputField label="Location" value={godownForm.location} onChangeText={v => setGodownForm({...godownForm, location: v})} />
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={() => setGodownModalVisible(false)} secondary style={{flex: 1, marginRight: 10}} />
                <Button title="Save" onPress={handleCreateGodown} loading={loading} style={{flex: 1}} />
              </View>
            </Card>
          </View>
        </Modal>

        <Modal visible={movementModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Stock Movement</Text>
              <SelectDropdown 
                label="Movement Type" 
                options={[{label: 'IN', value: 'IN'}, {label: 'OUT', value: 'OUT'}, {label: 'TRANSFER', value: 'TRANSFER'}]}
                selectedValue={movementForm.movement_type}
                onValueChange={v => setMovementForm({...movementForm, movement_type: v})}
              />
              <SelectDropdown 
                label="Finished Good" 
                options={finishedGoods.map(f => ({label: f.product_name, value: f.id}))}
                selectedValue={movementForm.finished_good_id}
                onValueChange={v => setMovementForm({...movementForm, finished_good_id: v})}
              />
              <SelectDropdown 
                label="Bag Size" 
                options={bagSizes.map(b => ({label: b.weight_kg + 'kg', value: b.id}))}
                selectedValue={movementForm.bag_size_id}
                onValueChange={v => setMovementForm({...movementForm, bag_size_id: v})}
              />
              <InputField label="Quantity (Bags)" value={movementForm.quantity_bags} onChangeText={v => setMovementForm({...movementForm, quantity_bags: v})} keyboardType="numeric" />
              {movementForm.movement_type === 'TRANSFER' && (
                <SelectDropdown 
                  label="To Godown" 
                  options={godowns.filter(g => g.id !== selectedGodown?.id).map(g => ({label: g.godown_name, value: g.id}))}
                  selectedValue={movementForm.to_godown_id}
                  onValueChange={v => setMovementForm({...movementForm, to_godown_id: v, from_godown_id: selectedGodown.id})}
                />
              )}
              <InputField label="Remarks" value={movementForm.remarks} onChangeText={v => setMovementForm({...movementForm, remarks: v})} />
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={() => setMovementModalVisible(false)} secondary style={{flex: 1, marginRight: 10}} />
                <Button title="Record" onPress={handleMovement} loading={loading} style={{flex: 1}} />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  tabScroll: { marginBottom: 15 },
  tab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EEE', marginRight: 10 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: '#666' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },
  stockCard: { padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  table: { borderTopWidth: 1, borderColor: '#EEE' },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  cell: { flex: 1, fontSize: 13, color: '#333' },
  stockValue: { fontWeight: 'bold', color: colors.primary, textAlign: 'right' },
  emptyText: { textAlign: 'center', padding: 20, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalButtons: { flexDirection: 'row', marginTop: 20 }
});
