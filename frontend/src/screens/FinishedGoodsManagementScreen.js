import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  useWindowDimensions 
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import Card from "../components/Card";
import SelectDropdown from "../components/SelectDropdown";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

import { useBranch } from "../context/BranchContext";

export default function FinishedGoodsManagementScreen({ navigation }) {
  const { activeBranch } = useBranch();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [bagSizes, setBagSizes] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState(null);
  
  const [godownModalVisible, setGodownModalVisible] = useState(false);
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  
  const [godownForm, setGodownForm] = useState({ godown_code: "", godown_name: "", capacity_bags: "", location: "" });
  const [movementForm, setMovementForm] = useState({ 
    movement_type: "IN", 
    from_godown_id: null, 
    to_godown_id: null, 
    finished_good_id: null, 
    bag_size_id: null, 
    quantity_bags: "", 
    remarks: "" 
  });

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
      const res = await client.get(`/finished-goods-godown-stock?godown_id=${godown.id}`);
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
      const payload = { 
        ...godownForm, 
        capacity_bags: parseInt(godownForm.capacity_bags) || 0,
        branch_id: activeBranch?.id 
      };
      await client.post("/finished-goods-godown", payload);
      showToast("Success", "Godown created");
      setGodownModalVisible(false);
      setGodownForm({ godown_code: "", godown_name: "", capacity_bags: "", location: "" });
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
        quantity_bags: qty,
        from_godown_id: (movementForm.movement_type === 'OUT' || movementForm.movement_type === 'TRANSFER') ? selectedGodown.id : null,
        to_godown_id: (movementForm.movement_type === 'IN' || movementForm.movement_type === 'TRANSFER') ? (movementForm.movement_type === 'TRANSFER' ? movementForm.to_godown_id : selectedGodown.id) : null,
      };
      await client.post("/finished-goods-godown-movement", payload);
      showToast("Success", "Movement recorded");
      setMovementModalVisible(false);
      setMovementForm({ 
        movement_type: "IN", 
        from_godown_id: null, 
        to_godown_id: null, 
        finished_good_id: null, 
        bag_size_id: null, 
        quantity_bags: "", 
        remarks: "" 
      });
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
          <View>
            <Text style={styles.title}>FG Godown Management</Text>
            <Text style={styles.subtitle}>Manage storage and movement of finished products</Text>
          </View>
          <Button title="+ Add Godown" onPress={() => setGodownModalVisible(true)} small />
        </View>

        <View style={styles.godownSelector}>
          <Text style={styles.sectionLabel}>Select Godown</Text>
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
        </View>

        {selectedGodown && (
          <Card style={styles.stockCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{selectedGodown.godown_name}</Text>
                <Text style={styles.cardSubtitle}>Current Inventory</Text>
              </View>
              <Button title="Move Stock" onPress={() => setMovementModalVisible(true)} small secondary />
            </View>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, {flex: 2}]}>Product</Text>
                <Text style={styles.headerCell}>Bag Size</Text>
                <Text style={[styles.headerCell, {textAlign: 'right'}]}>Bags</Text>
              </View>
              {stocks.length > 0 ? stocks.map((s, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.cell, {flex: 2, fontWeight: '500'}]}>
                    {finishedGoods.find(f => f.id === s.finished_good_id)?.product_name || s.finished_good_id}
                  </Text>
                  <Text style={styles.cell}>
                    {bagSizes.find(b => b.id === s.bag_size_id)?.weight_kg || s.bag_size_id}kg
                  </Text>
                  <Text style={[styles.cell, styles.stockValue]}>{s.quantity_bags}</Text>
                </View>
              )) : (
                <View style={styles.emptyView}>
                  <Text style={styles.emptyText}>This godown is currently empty</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Add Godown Modal */}
        <Modal visible={godownModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add New Godown</Text>
              <InputField label="Godown Code" placeholder="e.g. WH-01" value={godownForm.godown_code} onChangeText={v => setGodownForm({...godownForm, godown_code: v})} />
              <InputField label="Godown Name" placeholder="e.g. Main Warehouse" value={godownForm.godown_name} onChangeText={v => setGodownForm({...godownForm, godown_name: v})} />
              <InputField label="Capacity (Bags)" placeholder="0" value={godownForm.capacity_bags} onChangeText={v => setGodownForm({...godownForm, capacity_bags: v})} keyboardType="numeric" />
              <InputField label="Location" placeholder="Optional" value={godownForm.location} onChangeText={v => setGodownForm({...godownForm, location: v})} />
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={() => setGodownModalVisible(false)} variant="secondary" style={{flex: 1, marginRight: 10}} />
                <Button title="Save Godown" onPress={handleCreateGodown} loading={loading} style={{flex: 1}} />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Stock Movement Modal */}
        <Modal visible={movementModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Stock Movement</Text>
              <Text style={styles.modalSubtitle}>From: {selectedGodown?.godown_name}</Text>
              
              <View style={styles.movementTypeContainer}>
                {['IN', 'OUT', 'TRANSFER'].map(type => (
                  <TouchableOpacity 
                    key={type}
                    style={[styles.typeButton, movementForm.movement_type === type && styles.activeTypeButton]}
                    onPress={() => setMovementForm({...movementForm, movement_type: type})}
                  >
                    <Text style={[styles.typeButtonText, movementForm.movement_type === type && styles.activeTypeButtonText]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SelectDropdown 
                label="Product" 
                options={finishedGoods.map(f => ({label: f.product_name, value: f.id}))}
                selectedValue={movementForm.finished_good_id}
                onValueChange={v => setMovementForm({...movementForm, finished_good_id: v})}
              />
              
              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}>
                  <SelectDropdown 
                    label="Bag Size" 
                    options={bagSizes.map(b => ({label: b.weight_kg + 'kg', value: b.id}))}
                    selectedValue={movementForm.bag_size_id}
                    onValueChange={v => setMovementForm({...movementForm, bag_size_id: v})}
                  />
                </View>
                <View style={{flex: 1}}>
                  <InputField label="Quantity (Bags)" value={movementForm.quantity_bags} onChangeText={v => setMovementForm({...movementForm, quantity_bags: v})} keyboardType="numeric" />
                </View>
              </View>

              {movementForm.movement_type === 'TRANSFER' && (
                <SelectDropdown 
                  label="To Destination Godown" 
                  options={godowns.filter(g => g.id !== selectedGodown?.id).map(g => ({label: g.godown_name, value: g.id}))}
                  selectedValue={movementForm.to_godown_id}
                  onValueChange={v => setMovementForm({...movementForm, to_godown_id: v})}
                />
              )}
              
              <InputField label="Remarks" placeholder="Optional" value={movementForm.remarks} onChangeText={v => setMovementForm({...movementForm, remarks: v})} />
              
              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={() => setMovementModalVisible(false)} variant="secondary" style={{flex: 1, marginRight: 10}} />
                <Button title="Confirm Movement" onPress={handleMovement} loading={loading} style={{flex: 1}} />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 },
  godownSelector: { marginBottom: 24 },
  tabScroll: { paddingBottom: 5 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', marginRight: 12, borderWidth: 1, borderColor: '#DDD', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: '#666', fontWeight: '600' },
  activeTabText: { color: '#FFF' },
  stockCard: { padding: 20, borderRadius: 16, marginBottom: 30 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#888' },
  table: { marginTop: 5 },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' },
  headerCell: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#666' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F5F5F5', alignItems: 'center' },
  cell: { flex: 1, fontSize: 14, color: '#333' },
  stockValue: { fontWeight: 'bold', color: colors.primary, textAlign: 'right' },
  emptyView: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 24, borderRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  movementTypeContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTypeButton: { backgroundColor: colors.primary },
  typeButtonText: { fontWeight: 'bold', color: '#666' },
  activeTypeButtonText: { color: '#FFF' },
  modalButtons: { flexDirection: 'row', marginTop: 24 }
});
