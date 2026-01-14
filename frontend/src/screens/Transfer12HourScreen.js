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
  SELECT_TYPE: "SELECT_TYPE",
  SELECT_ORDER: "SELECT_ORDER",
  CONFIGURE_BINS: "CONFIGURE_BINS",
  SESSION_ACTIVE: "SESSION_ACTIVE",
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

  const [stage, setStage] = useState(STAGES.SELECT_TYPE);
  const [transferType, setTransferType] = useState("NORMAL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [selectedSourceBin, setSelectedSourceBin] = useState(null);
  const [selectedDestinationBin, setSelectedDestinationBin] = useState(null);
  
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
      const response = await client.get("/12hour-transfer/production-orders");
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
      // Use the plural endpoint for listing active sessions or history
      // If the backend has no list endpoint yet, we might need to handle it gracefully
      const response = await client.get("/12hour-transfer/sessions");
      setSessions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      // Fallback to empty if not found
      setSessions([]);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const client = getApiClient();
      const [sourceResponse, destResponse] = await Promise.all([
        client.get(`/12hour-transfer/available-source-bins/${order.id}`),
        client.get("/12hour-transfer/available-destination-bins"),
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

  const handleStartTransfer = async () => {
    if (!selectedSourceBin || !selectedDestinationBin) {
      showAlert("Validation Error", "Please select both source and destination bins");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      const endpoint = transferType === "NORMAL" 
        ? "/12hour-transfer/create-session-normal" 
        : "/12hour-transfer/create-session-special";
        
      const response = await client.post(endpoint, {
        production_order_id: selectedOrder.id,
        transfer_type: transferType,
        source_bin_id: selectedSourceBin,
        destination_bin_id: selectedDestinationBin,
        // Include special transfer manual fields if applicable
        special_source_bin_id: transferType === "SPECIAL" ? specialSourceBin : null,
        special_destination_bin_id: transferType === "SPECIAL" ? specialDestinationBin : null,
        manual_quantity: transferType === "SPECIAL" && manualQuantity ? parseFloat(manualQuantity) : null,
      });
      
      showToast("Success", "Transfer started");
      setSelectedSession(response.data);
      setTransferStartTime(Date.now());
      setElapsedSeconds(0);
      setStage(STAGES.SESSION_ACTIVE);
      fetchSessions();
    } catch (error) {
      showAlert("Error", "Failed to start transfer");
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
    if (!transferQuantity || parseFloat(transferQuantity) <= 0) {
      showAlert("Validation Error", "Please enter a valid transfer quantity");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      await client.post("/12hour-transfer/record", {
        source_bin_id: selectedSourceBin,
        destination_bin_id: selectedDestinationBin,
        quantity_transferred: parseFloat(transferQuantity),
        water_added: waterAdded ? parseFloat(waterAdded) : null,
        moisture_level: moistureLevel ? parseFloat(moistureLevel) : null,
      }, {
        params: { session_id: selectedSession.id }
      });

      showToast("Success", "Transfer recorded");
      setShowQuantityModal(false);
      
      if (isDiverting) {
        setShowBinSelectionModal(true);
      } else {
        setTransferQuantity("");
        setWaterAdded("");
        setMoistureLevel("");
      }
    } catch (error) {
      showAlert("Error", "Failed to record transfer");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBins = () => {
    if (!nextDestinationBin) {
      showAlert("Validation Error", "Please select next destination bin");
      return;
    }

    setSelectedDestinationBin(nextDestinationBin);
    setNextDestinationBin(null);
    setIsDiverting(false);
    setShowBinSelectionModal(false);
    setTransferQuantity("");
    setWaterAdded("");
    setMoistureLevel("");
    showToast("Success", "Destination bin updated");
  };

  const handleGoBack = () => {
    setSelectedOrder(null);
    setSelectedSourceBin(null);
    setSelectedDestinationBin(null);
    setStage(STAGES.SELECT_TYPE);
  };

  const handleStopTransfer = () => {
    setTransferStartTime(null);
    setElapsedSeconds(0);
    handleGoBack();
    showToast("Success", "Transfer stopped");
  };

  const handleOpenRecordModal = () => {
    setIsDiverting(false);
    setShowQuantityModal(true);
  };

  const renderSelectType = () => (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>12-Hour Transfer</Text>
      </View>
      <View style={[styles.typeGrid, isMobile && styles.typeGridMobile]}>
        {TRANSFER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[styles.typeCard, transferType === type.value && styles.typeCardSelected]}
            onPress={() => setTransferType(type.value)}
          >
            <Text style={styles.typeLabel}>{type.label}</Text>
            <Text style={styles.typeDescription}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button title="Continue" onPress={() => setStage(STAGES.SELECT_ORDER)} />
    </ScrollView>
  );

  const renderSelectOrder = () => (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Select Order</Text>
      </View>
      <FlatList
        data={productionOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.orderCard}>
            <Text>Order No: {item.order_number}</Text>
            <Button title="Select" onPress={() => handleSelectOrder(item)} />
          </Card>
        )}
      />
      <Button title="Back" onPress={handleGoBack} variant="secondary" />
    </ScrollView>
  );

  const renderConfigureBins = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.mappingCard}>
        <Text style={styles.cardSectionTitle}>Normal Mapping</Text>
        <SelectDropdown
          label="Source Bin"
          value={selectedSourceBin}
          onValueChange={setSelectedSourceBin}
          options={sourceBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
        />
        <SelectDropdown
          label="Destination Bin"
          value={selectedDestinationBin}
          onValueChange={setSelectedDestinationBin}
          options={destinationBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
        />
      </Card>

      {transferType === "SPECIAL" && (
        <Card style={styles.mappingCard}>
          <Text style={styles.cardSectionTitle}>Special Manual Transfer</Text>
          <SelectDropdown
            label="Manual Source Bin"
            value={specialSourceBin}
            onValueChange={setSpecialSourceBin}
            options={sourceBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
          />
          <SelectDropdown
            label="Manual Destination Bin"
            value={specialDestinationBin}
            onValueChange={setSpecialDestinationBin}
            options={destinationBins.map((bin) => ({ label: bin.bin_number, value: bin.id }))}
          />
          <InputField
            label="Quantity to Transfer"
            value={manualQuantity}
            onChangeText={setManualQuantity}
            keyboardType="decimal-pad"
            placeholder="Enter quantity"
          />
        </Card>
      )}

      <Button title="Start Transfer" onPress={handleStartTransfer} loading={loading} />
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
        <Text style={styles.detailsText}>Source Bin: {sourceBins.find(b => b.id.toString() === selectedSourceBin.toString())?.bin_number}</Text>
        <Text style={styles.detailsText}>Destination Bin: {destinationBins.find(b => b.id.toString() === selectedDestinationBin.toString())?.bin_number}</Text>
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
                  bin.id.toString() !== selectedDestinationBin.toString() && 
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
      <Button title="Stop Transfer" onPress={handleStopTransfer} variant="secondary" />
    </ScrollView>
  );

  const [activeTab, setActiveTab] = useState("TRANSFER");

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "TRANSFER" && styles.activeTab]}
        onPress={() => setActiveTab("TRANSFER")}
      >
        <Text style={[styles.tabText, activeTab === "TRANSFER" && styles.activeTabText]}>Transfer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "HISTORY" && styles.activeTab]}
        onPress={() => setActiveTab("HISTORY")}
      >
        <Text style={[styles.tabText, activeTab === "HISTORY" && styles.activeTabText]}>History</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <ScrollView style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>Session #{item.id}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#e6f4ea' : '#fef7e0' }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.sessionDetail}>Type: {item.transfer_type}</Text>
            <Text style={styles.sessionDetail}>Date: {formatISTDateTime(item.created_at)}</Text>
            <Button 
              title="View Details" 
              variant="secondary" 
              size="small"
              onPress={() => showAlert("Details", `Production Order: ${item.production_order_id}\nStatus: ${item.status}`)} 
            />
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No transfer history found</Text>}
      />
    </ScrollView>
  );

  return (
    <Layout navigation={navigation}>
      {stage === STAGES.SELECT_TYPE && renderTabs()}
      
      {activeTab === "TRANSFER" ? (
        <>
          {stage === STAGES.SELECT_TYPE && renderSelectType()}
          {stage === STAGES.SELECT_ORDER && renderSelectOrder()}
          {stage === STAGES.CONFIGURE_BINS && renderConfigureBins()}
          {stage === STAGES.SESSION_ACTIVE && renderSessionActive()}
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
  modalOverlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { width: "90%", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  sessionCard: { padding: 16, marginBottom: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.text.secondary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sessionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  sessionDetail: { fontSize: 14, color: colors.text.secondary, marginBottom: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: colors.text.secondary, fontSize: 16 },
});