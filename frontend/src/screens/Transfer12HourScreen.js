import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import SelectDropdown from "../components/SelectDropdown";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

const STAGES = {
  SELECT_ORDER: "SELECT_ORDER",
  CONFIGURE_BINS: "CONFIGURE_BINS",
  HISTORY: "HISTORY",
};

const formatTimer = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const TRANSFER_TYPES = [
  { label: "Normal Transfer", value: "NORMAL", description: "Standard transfer" },
  { label: "Special Transfer", value: "SPECIAL", description: "Custom transfer" },
];

export default function Transfer12HourScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [productionOrders, setProductionOrders] = useState([]);
  const [sourceBins, setSourceBins] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState(STAGES.SELECT_ORDER);
  const [transferType, setTransferType] = useState("NORMAL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [selectedSourceBin, setSelectedSourceBin] = useState(null);
  const [selectedDestinationBin, setSelectedDestinationBin] = useState(null);
  const [subType, setSubType] = useState("NORMAL");
  
  // Special transfer manual fields
  const [specialSourceBin, setSpecialSourceBin] = useState(null);
  const [specialDestinationBin, setSpecialDestinationBin] = useState(null);
  const [manualQuantity, setManualQuantity] = useState("");

  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [transferQuantity, setTransferQuantity] = useState("");
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");
  const [transferStartTime, setTransferStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    fetchProductionOrders();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!transferStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - transferStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [transferStartTime]);

  const fetchProductionOrders = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.get("/production-orders");
      setProductionOrders(response.data || []);
    } catch (error) {
      showAlert("Error", "Failed to fetch production orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const client = getApiClient();
      const response = await client.get("/12hour-transfer/records");
      const recordData = response.data || [];
      setSessions(recordData);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      setSessions([]);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const client = getApiClient();
      const [sourceResponse, destResponse] = await Promise.all([
        client.get("/bins"),
        client.get("/bins"),
      ]);
      setSourceBins(sourceResponse.data || []);
      setDestinationBins(destResponse.data || []);
      setStage(STAGES.CONFIGURE_BINS);
    } catch (error) {
      showAlert("Error", "Failed to fetch bins");
    } finally {
      setLoading(false);
    }
  };

  const [isDiverting, setIsDiverting] = useState(false);
  const [nextDestinationBin, setNextDestinationBin] = useState(null);
  const [showBinSelectionModal, setShowBinSelectionModal] = useState(false);

  const handleDivertToBin = () => {
    setIsDiverting(true);
    setShowQuantityModal(true);
  };

  const handleRecordTransfer = async () => {
    const isManualSpecial = transferType === "SPECIAL";
    const source = isManualSpecial ? specialSourceBin : selectedSourceBin;
    const dest = isManualSpecial ? specialDestinationBin : selectedDestinationBin;
    const qty = isManualSpecial ? manualQuantity : transferQuantity;

    if (!source || !dest) {
      showAlert("Validation Error", "Please select both source and destination bins");
      return;
    }

    if (!qty || parseFloat(qty) <= 0) {
      showAlert("Validation Error", "Please enter a valid transfer quantity");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      
      await client.post("/12hour-transfer/records", {
        production_order_id: selectedOrder.id,
        source_bin_id: source,
        destination_bin_id: dest,
        quantity_transferred: parseFloat(qty),
        water_added: waterAdded ? parseFloat(waterAdded) : null,
        moisture_level: moistureLevel ? parseFloat(moistureLevel) : null,
        transfer_type: transferType,
        status: "COMPLETED"
      });

      showToast("Success", "Transfer recorded");
      handleGoBack();
      fetchSessions();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to record transfer";
      showAlert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectOrder = () => (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Select Production Order</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <View>
          {productionOrders.map((item) => (
            <TouchableOpacity key={item.id.toString()} onPress={() => handleSelectOrder(item)}>
              <Card style={styles.orderCard}>
                <View>
                  <Text style={styles.orderNumber}>Order No: {item.order_number}</Text>
                  <Text style={styles.orderDetail}>{item.product_name || 'Wheat Transfer'}</Text>
                </View>
                <Text style={styles.selectText}>Select ›</Text>
              </Card>
            </TouchableOpacity>
          ))}
          {productionOrders.length === 0 && <Text style={styles.emptyText}>No active production orders found</Text>}
        </View>
      )}
    </ScrollView>
  );

  const renderConfigureBins = () => (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Record Transfer</Text>
        <Text style={styles.subHeading}>Order: {selectedOrder?.order_number}</Text>
      </View>

      <View style={styles.subTypeSelector}>
        <TouchableOpacity 
          style={[styles.subTypeTab, transferType === "NORMAL" && styles.activeSubTypeTab]} 
          onPress={() => setTransferType("NORMAL")}
        >
          <Text style={[styles.subTypeTabText, transferType === "NORMAL" && styles.activeSubTypeTabText]}>Normal Mapping</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.subTypeTab, transferType === "SPECIAL" && styles.activeSubTypeTab]} 
          onPress={() => setTransferType("SPECIAL")}
        >
          <Text style={[styles.subTypeTabText, transferType === "SPECIAL" && styles.activeSubTypeTabText]}>Special Manual Transfer</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.mappingCard}>
        <Text style={styles.cardSectionTitle}>{transferType === "NORMAL" ? "Normal Mapping" : "Special Manual Transfer"}</Text>
        <SelectDropdown
          label="Source Bin"
          value={transferType === "NORMAL" ? selectedSourceBin : specialSourceBin}
          onValueChange={transferType === "NORMAL" ? setSelectedSourceBin : setSpecialSourceBin}
          options={sourceBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
        />
        <SelectDropdown
          label="Destination Bin"
          value={transferType === "NORMAL" ? selectedDestinationBin : specialDestinationBin}
          onValueChange={transferType === "NORMAL" ? setSelectedDestinationBin : setSpecialDestinationBin}
          options={destinationBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
        />
        <InputField
          label="Quantity transferred"
          value={transferType === "NORMAL" ? transferQuantity : manualQuantity}
          onChangeText={transferType === "NORMAL" ? setTransferQuantity : setManualQuantity}
          keyboardType="decimal-pad"
          placeholder="Enter quantity"
        />
        <InputField
          label="Water Added"
          value={waterAdded}
          onChangeText={setWaterAdded}
          keyboardType="decimal-pad"
          placeholder="Optional"
        />
        <InputField
          label="Moisture Level"
          value={moistureLevel}
          onChangeText={setMoistureLevel}
          keyboardType="decimal-pad"
          placeholder="Optional"
        />
      </Card>

      <Button title="Record Transfer" onPress={handleRecordTransfer} loading={loading} />
      <Button title="Back" onPress={() => setStage(STAGES.SELECT_ORDER)} variant="secondary" />
    </ScrollView>
  );

  const renderSessionActive = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.timerCard}>
        <Text style={styles.timerLabel}>Transfer Time</Text>
        <Text style={styles.timerValue}>{formatTimer(elapsedSeconds)}</Text>
      </Card>
      <Card style={styles.sessionDetailsCard}>
        <Text style={styles.detailsText}>Session ID: {selectedSession?.id}</Text>
        <Text style={styles.detailsText}>Status: {selectedSession?.status}</Text>
        <Text style={styles.detailsText}>Source Bin: {sourceBins.find(b => b.id.toString() === selectedSourceBin?.toString())?.bin_number || selectedSourceBin}</Text>
        <Text style={styles.detailsText}>Destination Bin: {destinationBins.find(b => b.id.toString() === selectedDestinationBin?.toString())?.bin_number || selectedDestinationBin}</Text>
      </Card>
      <Button title="Divert Transfer" onPress={handleDivertToBin} />
      {showQuantityModal && (
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Transfer Details</Text>
            <InputField label="Quantity" value={transferQuantity} onChangeText={setTransferQuantity} keyboardType="decimal-pad" />
            <InputField label="Water Added" value={waterAdded} onChangeText={setWaterAdded} keyboardType="decimal-pad" />
            <InputField label="Moisture Level" value={moistureLevel} onChangeText={setMoistureLevel} keyboardType="decimal-pad" />
            <Button title="Save & Continue" onPress={handleRecordTransfer} loading={loading} />
            <Button title="Cancel" onPress={() => { setShowQuantityModal(false); setIsDiverting(false); }} variant="secondary" />
          </Card>
        </View>
      )}

      {showBinSelectionModal && (
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Next Destination Bin</Text>
            <SelectDropdown
              label="Next Destination Bin"
              value={nextDestinationBin}
              onValueChange={setNextDestinationBin}
              options={destinationBins
                .filter((bin) => 
                  bin.id.toString() !== selectedDestinationBin?.toString() && 
                  (bin.capacity - bin.current_quantity) > 0 &&
                  bin.status === "Active"
                )
                .map((bin) => ({ label: bin.bin_number, value: bin.id }))
              }
            />
            <Button title="Update Bin" onPress={handleUpdateBins} style={{ marginTop: 10 }} />
          </Card>
        </View>
      )}
      <Button title="Stop Transfer" onPress={() => setShowStopModal(true)} variant="secondary" />

      {showStopModal && (
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Transfer</Text>
            <InputField 
              label="Total Quantity Transferred" 
              value={transferQuantity} 
              onChangeText={setTransferQuantity} 
              keyboardType="decimal-pad" 
              placeholder="Enter final quantity"
            />
            <InputField 
              label="Water Added" 
              value={waterAdded} 
              onChangeText={setWaterAdded} 
              keyboardType="decimal-pad" 
              placeholder="Total water added"
            />
            <InputField 
              label="Moisture Level" 
              value={moistureLevel} 
              onChangeText={setMoistureLevel} 
              keyboardType="decimal-pad" 
              placeholder="Final moisture level"
            />
            <Button title="Confirm & Stop" onPress={handleStopTransfer} loading={loading} />
            <Button title="Cancel" onPress={() => setShowStopModal(false)} variant="secondary" />
          </Card>
        </View>
      )}
    </ScrollView>
  );

  const [activeTab, setActiveTab] = useState("TRANSFER");

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "TRANSFER" && styles.activeTab]}
        onPress={() => {
          setActiveTab("TRANSFER");
          setStage(STAGES.SELECT_ORDER);
        }}
      >
        <Text style={[styles.tabText, activeTab === "TRANSFER" && styles.activeTabText]}>Record Transfer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "HISTORY" && styles.activeTab]}
        onPress={() => {
          setActiveTab("HISTORY");
          fetchSessions();
        }}
      >
        <Text style={[styles.tabText, activeTab === "HISTORY" && styles.activeTabText]}>History</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Transfer History</Text>
      </View>
      <View>
        {sessions.map((item) => (
          <Card key={item.id.toString()} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>Record #{item.id}</Text>
              <Text style={[styles.statusBadge, { 
                backgroundColor: item.status === 'COMPLETED' ? '#e6f4ea' : '#fef7e0',
                color: item.status === 'COMPLETED' ? '#1e7e34' : '#856404',
              }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.sessionDetail}>Type: {item.transfer_type}</Text>
            <Text style={styles.sessionDetail}>Order: {item.production_order_number || 'N/A'}</Text>
            <Text style={styles.sessionDetail}>From Bin: {item.source_bin_number || item.source_bin_id}</Text>
            <Text style={styles.sessionDetail}>To Bin: {item.destination_bin_number || item.destination_bin_id}</Text>
            <Text style={styles.sessionDetail}>Qty: {item.quantity_transferred} units</Text>
            <Text style={styles.sessionDetail}>Date: {formatISTDateTime(item.created_at)}</Text>
          </Card>
        ))}
        {sessions.length === 0 && <Text style={styles.emptyText}>No transfer records found</Text>}
      </View>
    </ScrollView>
  );

  return (
    <Layout navigation={navigation}>
      {renderTabs()}
      {activeTab === "TRANSFER" ? (
        <>
          {stage === STAGES.SELECT_ORDER && renderSelectOrder()}
          {stage === STAGES.CONFIGURE_BINS && renderConfigureBins()}
        </>
      ) : (
        renderHistory()
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerSection: { marginBottom: 20 },
  mainHeading: { fontSize: 24, fontWeight: "bold" },
  typeGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeGridMobile: { flexDirection: "column" },
  typeCard: { flex: 1, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  typeCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "10" },
  typeLabel: { fontSize: 16, fontWeight: "600" },
  typeDescription: { fontSize: 12, color: colors.text.secondary },
  orderCard: { padding: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mappingCard: { padding: 16, marginBottom: 16 },
  cardSectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: colors.primary },
  timerCard: { padding: 20, marginBottom: 16, backgroundColor: colors.primary, borderRadius: 8, alignItems: "center" },
  timerLabel: { fontSize: 14, color: "#fff", marginBottom: 8 },
  timerValue: { fontSize: 48, fontWeight: "bold", color: "#fff", fontFamily: "monospace" },
  sessionDetailsCard: { padding: 16, marginBottom: 16, backgroundColor: "#f5f5f5", borderRadius: 8 },
  detailsText: { fontSize: 14, marginBottom: 8, color: colors.text.primary },
  orderNumber: { fontSize: 16, fontWeight: "bold", color: colors.text.primary },
  orderDetail: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  selectText: { color: colors.primary, fontWeight: "600" },
  subHeading: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  inputRow: { flexDirection: 'row', marginTop: 8 },
  modalOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { width: "90%", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  sessionCard: { padding: 16, marginBottom: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.text.secondary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  activeWarningCard: { padding: 16, backgroundColor: '#fff3cd', borderColor: '#ffeeba', borderWidth: 1, marginBottom: 16 },
  activeWarningText: { color: '#856404', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subTypeSelector: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 },
  subTypeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeSubTypeTab: { backgroundColor: colors.primary },
  subTypeTabText: { color: colors.text.secondary, fontWeight: '600' },
  activeSubTypeTabText: { color: '#fff' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  sessionDetail: { fontSize: 14, color: colors.text.secondary, marginBottom: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.text.secondary, fontSize: 16 },
});
