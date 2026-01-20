import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
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
};

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

  const [selectedSourceBin, setSelectedSourceBin] = useState(null);
  const [selectedDestinationBin, setSelectedDestinationBin] = useState(null);
  
  const [specialSourceBin, setSpecialSourceBin] = useState(null);
  const [specialDestinationBin, setSpecialDestinationBin] = useState(null);
  const [manualQuantity, setManualQuantity] = useState("");

  const [transferQuantity, setTransferQuantity] = useState("");
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");

  const [activeTab, setActiveTab] = useState("TRANSFER");

  useEffect(() => {
    fetchProductionOrders();
    fetchSessions();
  }, []);

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
      setSessions(response.data || []);
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
      const [binsResponse, transferRecordsResponse] = await Promise.all([
        client.get("/bins"),
        client.get("/24hour-transfer/records")
      ]);
      
      const allBins = binsResponse.data || [];
      const transferRecords = transferRecordsResponse.data || [];
      
      // Get unique source bin IDs from 24-hour transfer records for this production order
      const validSourceBinIds = [...new Set(
        transferRecords
          .filter(record => 
            (record.production_order_id === order.id || record.production_order_id?.toString() === order.id?.toString())
          )
          .map(record => record.source_bin_id)
      )];

      // Source bins: 24 hours bin, Active, current_quantity > 0, and present in 24h transfer records for this order
      const filteredSource = allBins.filter(bin => 
        bin.bin_type === "24 hours bin" && 
        bin.status === "Active" && 
        (bin.current_quantity || 0) > 0 &&
        validSourceBinIds.includes(bin.id)
      );
      
      // Destination bins: 12 hours bin, Active, and has available space (current_quantity < capacity)
      const filteredDest = allBins.filter(bin => 
        bin.bin_type === "12 hours bin" && 
        bin.status === "Active" && 
        (bin.current_quantity || 0) < (bin.capacity || 0)
      );

      setSourceBins(filteredSource);
      setDestinationBins(filteredDest);
      setStage(STAGES.CONFIGURE_BINS);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showAlert("Error", "Failed to fetch bins or transfer records");
    } finally {
      setLoading(false);
    }
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

  const handleGoBack = () => {
    setSelectedOrder(null);
    setSelectedSourceBin(null);
    setSelectedDestinationBin(null);
    setSpecialSourceBin(null);
    setSpecialDestinationBin(null);
    setManualQuantity("");
    setTransferQuantity("");
    setWaterAdded("");
    setMoistureLevel("");
    setStage(STAGES.SELECT_ORDER);
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
      <Button title="Back" onPress={handleGoBack} variant="secondary" />
    </ScrollView>
  );

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
  orderCard: { padding: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mappingCard: { padding: 16, marginBottom: 16 },
  cardSectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: colors.primary },
  orderNumber: { fontSize: 16, fontWeight: "bold", color: colors.text.primary },
  orderDetail: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  selectText: { color: colors.primary, fontWeight: "600" },
  subHeading: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  sessionCard: { padding: 16, marginBottom: 10 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.text.secondary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
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
