import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
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
  TRANSFER_ACTIVE: "TRANSFER_ACTIVE",
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

  const [selectedSourceBin, setSelectedSourceBin] = useState("");
  const [selectedDestinationBin, setSelectedDestinationBin] = useState("");
  const [binDetailsMap, setBinDetailsMap] = useState({});
  
  const [specialSourceBin, setSpecialSourceBin] = useState("");
  const [specialDestinationBin, setSpecialDestinationBin] = useState("");

  const [transferQuantity, setTransferQuantity] = useState("");
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");

  const [activeTab, setActiveTab] = useState("TRANSFER");
  
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  // Modal state
  const [showDataModal, setShowDataModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  
  // To track if we need to show parameters modal at start
  const [showStartParamsModal, setShowStartParamsModal] = useState(false);
  
  // For transfer details display
  const [transfer12hRecords, setTransfer12hRecords] = useState([]);
  
  // Parameters modal state
  const [showParametersModal, setShowParametersModal] = useState(false);
  const [selectedTransfer12h, setSelectedTransfer12h] = useState(null);
  const [paramsWaterAdded, setParamsWaterAdded] = useState("");
  const [paramsMoistureLevel, setParamsMoistureLevel] = useState("");
  const [savingParams, setSavingParams] = useState(false);
  
  // Stop transfer modal state
  const [showStopModal, setShowStopModal] = useState(false);
  const [selectedTransferToStop, setSelectedTransferToStop] = useState(null);
  const [stoppingTransfer, setStoppingTransfer] = useState(false);
  
  // Track active transfer being viewed in TRANSFER_ACTIVE stage
  const [activeTransferRecord, setActiveTransferRecord] = useState(null);

  useEffect(() => {
    fetchProductionOrders();
    fetchSessions();
    fetch12HourRecords();
    fetchAllBins(); // Ensure we have all bins for name lookup
    return () => clearInterval(timerRef.current);
  }, []);
  
  const fetch12HourRecords = async () => {
    try {
      const client = getApiClient();
      const response = await client.get("/12hour-transfer/records");
      setTransfer12hRecords(response.data || []);
    } catch (error) {
      console.error("Failed to fetch 12-hour records:", error);
    }
  };

  useEffect(() => {
    if (stage === STAGES.TRANSFER_ACTIVE) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      // Don't reset timer to 0 - it might be set from calculateElapsedSeconds
      if (stage !== STAGES.SELECT_ORDER && stage !== STAGES.CONFIGURE_BINS) {
        // Only reset if we're not in a view mode
      }
    }
  }, [stage]);

  const fetchAllBins = async () => {
    try {
      const client = getApiClient();
      const response = await client.get("/bins");
      const allBins = response.data || [];
      // We need these for display names regardless of current stage filters
      setSourceBins(prev => prev.length > 0 ? prev : allBins);
      setDestinationBins(prev => prev.length > 0 ? prev : allBins);
    } catch (error) {
      console.error("Failed to fetch all bins:", error);
    }
  };

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateElapsedSeconds = (startTimeISO) => {
    if (!startTimeISO) return 0;
    try {
      const startTime = new Date(startTimeISO);
      const now = new Date();
      const elapsedMs = now.getTime() - startTime.getTime();
      return Math.floor(elapsedMs / 1000);
    } catch (error) {
      console.error("Error calculating elapsed time:", error);
      return 0;
    }
  };

  const handleOpenParametersModal = (transfer) => {
    setSelectedTransfer12h(transfer);
    setParamsWaterAdded(transfer.water_added?.toString() || "");
    setParamsMoistureLevel(transfer.moisture_level?.toString() || "");
    setShowParametersModal(true);
  };

  const handleSaveParameters = async () => {
    if (!selectedTransfer12h) return;
    setSavingParams(true);
    try {
      const client = getApiClient();
      await client.patch(`/12hour-transfer/records/${selectedTransfer12h.id}`, {
        water_added: paramsWaterAdded ? parseFloat(paramsWaterAdded) : null,
        moisture_level: paramsMoistureLevel ? parseFloat(paramsMoistureLevel) : null,
      });
      showToast("Success", "Parameters saved successfully");
      setShowParametersModal(false);
      fetch12HourRecords();
      fetchSessions();
    } catch (error) {
      showAlert("Error", "Failed to save parameters");
      console.error("Error saving parameters:", error);
    } finally {
      setSavingParams(false);
    }
  };

  const handleOpenStopModal = (transfer) => {
    // Navigate to TRANSFER_ACTIVE stage to handle stop/divert
    setActiveTransferRecord(transfer);
    setCurrentRecordId(transfer.id);
    
    // Calculate elapsed time from transfer start
    const elapsedSeconds = calculateElapsedSeconds(transfer.transfer_start_time);
    console.log("Redirecting to Transfer Active. Elapsed seconds:", elapsedSeconds, "Start time:", transfer.transfer_start_time);
    setTimer(elapsedSeconds);
    
    // Set the stage to start the timer interval
    setStage(STAGES.TRANSFER_ACTIVE);
    setActiveTab("TRANSFER");
  };

  const handleStopTransfer = async () => {
    // Updated to work from TRANSFER_ACTIVE stage
    const recordToStop = activeTransferRecord || selectedTransferToStop;
    if (!recordToStop) return;
    setStoppingTransfer(true);
    try {
      const client = getApiClient();
      await client.patch(`/12hour-transfer/records/${recordToStop.id}`, {
        status: "COMPLETED",
        transfer_end_time: new Date().toISOString(),
      });
      showToast("Success", "Transfer stopped and marked as completed");
      setShowStopModal(false);
      setActiveTransferRecord(null);
      setTimer(0);
      setStage(STAGES.SELECT_ORDER);
      setActiveTab("HISTORY");
      fetch12HourRecords();
      fetchSessions();
    } catch (error) {
      showAlert("Error", "Failed to stop transfer");
      console.error("Error stopping transfer:", error);
    } finally {
      setStoppingTransfer(false);
    }
  };

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
      const [binsResponse, transfer24hResponse, transfer12hResponse] = await Promise.all([
        client.get("/bins"),
        client.get("/24hour-transfer/records"),
        client.get("/12hour-transfer/records")
      ]);
      
      const allBins = binsResponse.data || [];
      const transfer24hRecords = transfer24hResponse.data || [];
      const transfer12hRecords = transfer12hResponse.data || [];
      
      // Store 24h records for moisture/water lookup
      const order24hRecords = transfer24hRecords.filter(record => 
        Number(record.production_order_id) === Number(order.id) && record.status === "COMPLETED"
      );

      // Filter 12-hour records to find completed destination bins for this order
      const completed12hBinIds = transfer12hRecords
        .filter(record => 
          Number(record.production_order_id) === Number(order.id) && record.status === "COMPLETED"
        )
        .map(record => Number(record.destination_bin_id));

      console.log("Completed 12h destination bins:", completed12hBinIds);

      const validSourceBinIds = order24hRecords.map(record => Number(record.destination_bin_id));

      const filteredSource = allBins.filter(bin => 
        (bin.bin_type === "24 hours bin" || bin.bin_type === "24HOUR" || (bin.bin_type && bin.bin_type.toLowerCase().includes("24"))) && 
        bin.status === "Active" && 
        validSourceBinIds.includes(Number(bin.id))
      );
      
      // Filter destination bins: exclude completed 12-hour bins
      const filteredDest = allBins.filter(bin => 
        (bin.bin_type === "12 hours bin" || bin.bin_type === "12HOUR" || (bin.bin_type && bin.bin_type.toLowerCase().includes("12"))) && 
        bin.status === "Active" &&
        !completed12hBinIds.includes(Number(bin.id)) // Exclude completed bins
      );

      console.log("Available destination bins for order", order.id, ":", filteredDest.map(b => b.bin_number));

      setSourceBins(filteredSource);
      setDestinationBins(filteredDest);
      // Map bin ID to its 24h transfer details
      const detailsMap = {};
      order24hRecords.forEach(r => {
        detailsMap[r.destination_bin_id] = {
          water_added: r.water_added,
          moisture_level: r.moisture_level
        };
      });
      setBinDetailsMap(detailsMap);
      setStage(STAGES.CONFIGURE_BINS);
    } catch (error) {
      showAlert("Error", "Failed to fetch bins or transfer records");
      console.error("Error in handleSelectOrder:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransfer = async () => {
    const isManualSpecial = transferType === "SPECIAL";
    const source = isManualSpecial ? specialSourceBin : selectedSourceBin;
    const dest = isManualSpecial ? specialDestinationBin : selectedDestinationBin;

    console.log("handleStartTransfer triggered:", { 
      transferType, 
      source,
      dest,
      selectedOrderId: selectedOrder?.id
    });

    if (!selectedOrder) {
      showAlert("Validation Error", "Please select a production order first");
      return;
    }

    if (!source || source === "" || source === "null" || !dest || dest === "" || dest === "null") {
      showAlert("Validation Error", "Please select both source and destination bins");
      return;
    }

    // Check if parameters are already captured in the 24h transfer record
    const autoDetails = binDetailsMap[source];
    const hasWater = autoDetails?.water_added !== null && autoDetails?.water_added !== 0 && autoDetails?.water_added !== undefined;
    const hasMoisture = autoDetails?.moisture_level !== null && autoDetails?.moisture_level !== 0 && autoDetails?.moisture_level !== undefined;

    if (hasWater && hasMoisture) {
      // Both parameters are already captured - directly start transfer
      console.log("Parameters already captured, starting transfer directly:", autoDetails);
      setWaterAdded(autoDetails.water_added?.toString() || "");
      setMoistureLevel(autoDetails.moisture_level?.toString() || "");
      proceedWithStartTransfer(source, dest);
    } else {
      // Parameters missing - show modal to capture them
      console.log("Parameters missing, showing capture modal. Has water:", hasWater, "Has moisture:", hasMoisture);
      setWaterAdded(autoDetails?.water_added?.toString() || "");
      setMoistureLevel(autoDetails?.moisture_level?.toString() || "");
      setShowStartParamsModal(true);
    }
  };

  const proceedWithStartTransfer = async (source, dest) => {
    console.log("API Call - Start Transfer:", { source, dest, type: transferType });
    setLoading(true);
    try {
      const client = getApiClient();
      
      // First, save the captured parameters to the 24-hour bin
      const sourceBinFromDetails = sourceBins.find(b => b.id.toString() === source.toString());
      const order24hRecords = binDetailsMap;
      let sourceBinRecordId = null;
      
      // Find the 24-hour transfer record for this source bin
      try {
        const records24h = await client.get("/24hour-transfer/records");
        const matchingRecord = records24h.data.find(r => 
          r.destination_bin_id === parseInt(source) && 
          r.production_order_id === parseInt(selectedOrder.id) && 
          r.status === "COMPLETED"
        );
        if (matchingRecord) {
          sourceBinRecordId = matchingRecord.id;
          // Update 24-hour bin with captured parameters
          if (waterAdded || moistureLevel) {
            console.log("Saving parameters to 24-hour bin record:", sourceBinRecordId);
            await client.patch(`/24hour-transfer/records/${sourceBinRecordId}`, {
              water_added: waterAdded ? parseFloat(waterAdded) : null,
              moisture_level: moistureLevel ? parseFloat(moistureLevel) : null
            });
            console.log("✅ Parameters saved to 24-hour bin");
          }
        }
      } catch (e) {
        console.log("Could not update 24-hour bin:", e.message);
      }
      
      // Now create the 12-hour transfer record
      const response = await client.post("/12hour-transfer/records", {
        production_order_id: parseInt(selectedOrder.id),
        source_bin_id: parseInt(source),
        destination_bin_id: parseInt(dest),
        transfer_type: transferType,
        status: "IN_PROGRESS",
        transfer_start_time: new Date().toISOString(),
        water_added: waterAdded ? parseFloat(waterAdded) : null,
        moisture_level: moistureLevel ? parseFloat(moistureLevel) : null,
      });

      setCurrentRecordId(response.data.id);
      // Start fresh transfer with timer at 0
      setTimer(0);
      setStage(STAGES.TRANSFER_ACTIVE);
      setShowStartParamsModal(false);
      showToast("Success", "Transfer started");
    } catch (error) {
      showAlert("Error", error.response?.data?.detail || "Failed to start transfer");
    } finally {
      setLoading(false);
    }
  };

  const initiateStopOrDivert = (status) => {
    setPendingStatus(status);
    setShowDataModal(true);
  };

  const handleSaveAndAction = async () => {
    if (!transferQuantity || parseFloat(transferQuantity) <= 0) {
      showAlert("Validation Error", "Please enter quantity transferred");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      await client.patch(`/12hour-transfer/records/${currentRecordId}`, {
        quantity_transferred: parseFloat(transferQuantity),
        water_added: waterAdded ? parseFloat(waterAdded) : null,
        moisture_level: moistureLevel ? parseFloat(moistureLevel) : null,
        status: pendingStatus,
        transfer_end_time: new Date().toISOString()
      });

      showToast("Success", `Transfer ${pendingStatus.toLowerCase()}`);
      
      const statusWasDiverted = pendingStatus === "DIVERTED";
      
      // Reset data entry fields
      setTransferQuantity("");
      setWaterAdded("");
      setMoistureLevel("");
      setShowDataModal(false);
      
      if (statusWasDiverted) {
        // If diverted, go back to configuration to select NEW destination
        // Keep selected order and source bin, but reset destination
        setSelectedDestinationBin(null);
        setSpecialDestinationBin(null);
        setStage(STAGES.CONFIGURE_BINS);
      } else {
        // If completed, go back to order selection or records
        handleGoBack();
        fetchSessions();
      }
    } catch (error) {
      showAlert("Error", error.response?.data?.detail || "Failed to update transfer");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setSelectedOrder(null);
    setSelectedSourceBin("");
    setSelectedDestinationBin("");
    setSpecialSourceBin("");
    setSpecialDestinationBin("");
    setTransferQuantity("");
    setWaterAdded("");
    setMoistureLevel("");
    setCurrentRecordId(null);
    setStage(STAGES.SELECT_ORDER);
  };

  const renderSelectOrder = () => {
    const getOrderStats = (orderId) => {
      const orderRecords = transfer12hRecords.filter(r => r.production_order_id === orderId);
      const completed = orderRecords.filter(r => r.status === "COMPLETED").length;
      const inProgress = orderRecords.filter(r => r.status === "IN_PROGRESS").length;
      return { total: orderRecords.length, completed, inProgress };
    };

    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.mainHeading}>Select Production Order</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View>
            {productionOrders.map((item) => {
              const stats = getOrderStats(item.id);
              return (
                <TouchableOpacity key={item.id.toString()} onPress={() => handleSelectOrder(item)}>
                  <Card style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderNumber}>Order No: {item.order_number}</Text>
                        <Text style={styles.orderDetail}>{item.product_name || 'Wheat Transfer'}</Text>
                      </View>
                      <Text style={styles.selectText}>Select ›</Text>
                    </View>
                    
                    {stats.total > 0 && (
                      <View style={styles.statsRowCompact}>
                        <View style={styles.statItemCompact}>
                          <Text style={styles.statLabelCompact}>Total</Text>
                          <Text style={styles.statValueCompact}>{stats.total}</Text>
                        </View>
                        <View style={styles.statItemCompact}>
                          <Text style={styles.statLabelCompact}>Completed</Text>
                          <Text style={[styles.statValueCompact, { color: "#059669" }]}>{stats.completed}</Text>
                        </View>
                        <View style={styles.statItemCompact}>
                          <Text style={styles.statLabelCompact}>In Progress</Text>
                          <Text style={[styles.statValueCompact, { color: "#f59e0b" }]}>{stats.inProgress}</Text>
                        </View>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
            {productionOrders.length === 0 && <Text style={styles.emptyText}>No active production orders found</Text>}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderConfigureBins = () => {
    const orderTransfers = transfer12hRecords.filter(
      r => r.production_order_id === selectedOrder?.id && (r.status === "COMPLETED" || r.status === "IN_PROGRESS")
    );

    return (
      <>
        <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.mainHeading}>Configure Transfer</Text>
          <Text style={styles.subHeading}>Order: {selectedOrder?.order_number}</Text>
        </View>

        <View style={styles.subTypeSelector}>
          <TouchableOpacity 
            style={[styles.subTypeTab, transferType === "NORMAL" && styles.activeSubTypeTab]} 
            onPress={() => {
              setTransferType("NORMAL");
              setSelectedSourceBin("");
              setSelectedDestinationBin("");
            }}
          >
            <Text style={[styles.subTypeTabText, transferType === "NORMAL" && styles.activeSubTypeTabText]}>Normal Mapping</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTypeTab, transferType === "SPECIAL" && styles.activeSubTypeTab]} 
            onPress={() => {
              setTransferType("SPECIAL");
              setSpecialSourceBin("");
              setSpecialDestinationBin("");
            }}
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
            options={sourceBins.map((bin) => ({ label: bin.bin_number, value: bin.id.toString() }))}
          />
          <SelectDropdown
            label="Destination Bin"
            value={transferType === "NORMAL" ? selectedDestinationBin : specialDestinationBin}
            onValueChange={transferType === "NORMAL" ? setSelectedDestinationBin : setSpecialDestinationBin}
            options={destinationBins.map((bin) => ({ label: bin.bin_number, value: bin.id.toString() }))}
          />
        </Card>

        <Button 
          title="Start Transfer" 
          onPress={() => {
            console.log("Button 'Start Transfer' clicked");
            handleStartTransfer();
          }} 
          loading={loading} 
        />
        <Button title="Back" onPress={handleGoBack} variant="secondary" />

        {orderTransfers.length > 0 && (
          <View style={styles.transferHistorySection}>
            <Text style={styles.transferHistorySectionTitle}>Transfer History</Text>
            {orderTransfers.map((transfer) => (
              <Card key={transfer.id} style={styles.transferHistoryCard}>
                <View style={styles.transferHistoryCardHeader}>
                  <View style={styles.transferHistoryCardLeft}>
                    <Text style={styles.transferHistoryCardBin}>
                      Bin {transfer.source_bin_id} → Bin {transfer.destination_bin_id}
                    </Text>
                    <Text style={styles.transferHistoryCardTime}>
                      {formatISTDateTime(transfer.transfer_start_time)}
                    </Text>
                  </View>
                  <View style={[
                    styles.transferStatusBadge,
                    { backgroundColor: transfer.status === "COMPLETED" ? "#10b981" : transfer.status === "IN_PROGRESS" ? "#f59e0b" : "#6b7280" }
                  ]}>
                    <Text style={styles.transferStatusText}>
                      {transfer.status}
                    </Text>
                  </View>
                </View>
                {transfer.quantity_transferred !== null && (
                  <View style={styles.transferDetailsGridRow}>
                    <View style={styles.transferDetailCol}>
                      <Text style={styles.transferDetailLabel}>Qty</Text>
                      <Text style={styles.transferDetailValue}>{transfer.quantity_transferred} kg</Text>
                    </View>
                    <View style={styles.transferDetailCol}>
                      <Text style={styles.transferDetailLabel}>Water</Text>
                      <Text style={styles.transferDetailValue}>
                        {transfer.water_added !== null ? `${transfer.water_added}L` : "—"}
                      </Text>
                    </View>
                    <View style={styles.transferDetailCol}>
                      <Text style={styles.transferDetailLabel}>Moisture</Text>
                      <Text style={styles.transferDetailValue}>
                        {transfer.moisture_level !== null ? `${transfer.moisture_level}%` : "—"}
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* Action Buttons */}
                <View style={styles.transferActionButtons}>
                  {transfer.status === "COMPLETED" && (transfer.water_added === null || transfer.water_added === 0 || transfer.moisture_level === null || transfer.moisture_level === 0) && (
                    <TouchableOpacity
                      style={styles.transferActionButton}
                      onPress={() => handleOpenParametersModal(transfer)}
                    >
                      <Text style={styles.transferActionButtonText}>➕ Add Water & Moisture</Text>
                    </TouchableOpacity>
                  )}
                  {transfer.status === "IN_PROGRESS" && (
                    <TouchableOpacity
                      style={[styles.transferActionButton, { backgroundColor: '#ea4335' }]}
                      onPress={() => handleOpenStopModal(transfer)}
                    >
                      <Text style={styles.transferActionButtonText}>⏹ Stop Transfer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
        </ScrollView>
    </>
    );
  };

  const renderTransferActive = () => {
    // If viewing an existing transfer from history, use that data
    let isManualSpecial = false;
    let sourceBinId, destBinId;
    
    if (activeTransferRecord) {
      sourceBinId = activeTransferRecord.source_bin_id;
      destBinId = activeTransferRecord.destination_bin_id;
      // Determine type from the record
      isManualSpecial = activeTransferRecord.transfer_type === "SPECIAL";
    } else {
      // New transfer being started
      isManualSpecial = transferType === "SPECIAL";
      sourceBinId = isManualSpecial ? specialSourceBin : selectedSourceBin;
      destBinId = isManualSpecial ? specialDestinationBin : selectedDestinationBin;
    }
    
    // Improved lookup to avoid "Unknown"
    const sourceBinName = sourceBins.find(b => Number(b.id) === Number(sourceBinId))?.bin_number || "Bin #" + sourceBinId;
    const destBinName = destinationBins.find(b => Number(b.id) === Number(destBinId))?.bin_number || "Bin #" + destBinId;

    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.mainHeading}>Transfer In Progress</Text>
          <Text style={styles.subHeading}>
            Order: {activeTransferRecord?.production_order_number || selectedOrder?.order_number || 'N/A'}
          </Text>
        </View>

        <Card style={styles.timerCard}>
          <Text style={styles.timerLabel}>Duration</Text>
          <Text style={styles.timerText}>{formatTimer(timer)}</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{sourceBinName}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>{destBinName}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#fbbc05'}]} onPress={() => initiateStopOrDivert("DIVERTED")}>
            <Text style={styles.buttonText}>Divert Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#ea4335'}]} onPress={() => initiateStopOrDivert("COMPLETED")}>
            <Text style={styles.buttonText}>Stop Transfer</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showDataModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Transfer Data</Text>
              <Text style={styles.modalSubtitle}>Please enter details before {pendingStatus?.toLowerCase()} the transfer.</Text>
              
              <InputField
                label="Quantity transferred"
                value={transferQuantity}
                onChangeText={setTransferQuantity}
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

              <View style={styles.modalActions}>
                <Button 
                  title="Cancel" 
                  onPress={() => setShowDataModal(false)} 
                  variant="secondary" 
                  style={{flex: 1, marginRight: 8}}
                />
                <Button 
                  title="Save & Proceed" 
                  onPress={handleSaveAndAction} 
                  loading={loading}
                  style={{flex: 1}}
                />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    );
  };

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
    <>
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
                backgroundColor: item.status === 'COMPLETED' ? '#e6f4ea' : item.status === 'DIVERTED' ? '#fef7e0' : '#f8f9fa',
                color: item.status === 'COMPLETED' ? '#1e7e34' : item.status === 'DIVERTED' ? '#856404' : '#6c757d',
              }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.sessionDetail}>Type: {item.transfer_type}</Text>
            <Text style={styles.sessionDetail}>Order: {item.production_order_number || 'N/A'}</Text>
            <Text style={styles.sessionDetail}>From Bin: {item.source_bin_number || item.source_bin_id}</Text>
            <Text style={styles.sessionDetail}>To Bin: {item.destination_bin_number || item.destination_bin_id}</Text>
            <Text style={styles.sessionDetail}>Qty: {item.quantity_transferred} units</Text>
            <Text style={styles.sessionDetail}>Water: {item.water_added !== null ? `${item.water_added}L` : "—"}</Text>
            <Text style={styles.sessionDetail}>Moisture: {item.moisture_level !== null ? `${item.moisture_level}%` : "—"}</Text>
            <Text style={styles.sessionDetail}>Date: {formatISTDateTime(item.created_at)}</Text>
            
            {/* Action Buttons */}
            <View style={styles.transferActionButtons}>
              {item.status === "COMPLETED" && (item.water_added === null || item.water_added === 0 || item.moisture_level === null || item.moisture_level === 0) && (
                <TouchableOpacity
                  style={styles.transferActionButton}
                  onPress={() => handleOpenParametersModal(item)}
                >
                  <Text style={styles.transferActionButtonText}>➕ Add Water & Moisture</Text>
                </TouchableOpacity>
              )}
              {item.status === "IN_PROGRESS" && (
                <TouchableOpacity
                  style={[styles.transferActionButton, { backgroundColor: '#ea4335' }]}
                  onPress={() => handleOpenStopModal(item)}
                >
                  <Text style={styles.transferActionButtonText}>⏹ Stop Transfer</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
        {sessions.length === 0 && <Text style={styles.emptyText}>No transfer records found</Text>}
      </View>
    </ScrollView>
    </>
  );

  return (
    <Layout navigation={navigation}>
      {renderTabs()}
      {activeTab === "TRANSFER" ? (
        <>
          {stage === STAGES.SELECT_ORDER && renderSelectOrder()}
          {stage === STAGES.CONFIGURE_BINS && renderConfigureBins()}
          {stage === STAGES.TRANSFER_ACTIVE && renderTransferActive()}
        </>
      ) : (
        renderHistory()
      )}

      {/* Start Transfer Modal - Top Level */}
      <Modal visible={showStartParamsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSubtitle}>Enter water and moisture details</Text>
            
            <InputField
              label="Water Added (Litres)"
              value={waterAdded}
              onChangeText={setWaterAdded}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%)"
              value={moistureLevel}
              onChangeText={setMoistureLevel}
              keyboardType="decimal-pad"
              placeholder="0"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowStartParamsModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => {
                  const isManualSpecial = transferType === "SPECIAL";
                  const source = isManualSpecial ? specialSourceBin : selectedSourceBin;
                  const dest = isManualSpecial ? specialDestinationBin : selectedDestinationBin;
                  if (!source || !dest) {
                    showAlert("Validation Error", "Please select both source and destination bins");
                    return;
                  }
                  proceedWithStartTransfer(source, dest);
                }}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Parameters Modal - Top Level */}
      <Modal visible={showParametersModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Transfer Parameters</Text>
            <Text style={styles.modalSubtitle}>Enter water and moisture details</Text>
            
            <InputField
              label="Water Added (Litres)"
              value={paramsWaterAdded}
              onChangeText={setParamsWaterAdded}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <InputField
              label="Moisture Level (%)"
              value={paramsMoistureLevel}
              onChangeText={setParamsMoistureLevel}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowParametersModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveParameters}
                disabled={savingParams}
              >
                <Text style={styles.modalButtonSaveText}>{savingParams ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Stop Transfer Modal - Top Level */}
      <Modal visible={showStopModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stop Transfer?</Text>
            <Text style={styles.modalSubtitle}>This will mark the transfer as completed</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowStopModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleStopTransfer}
                disabled={stoppingTransfer}
              >
                <Text style={styles.modalButtonSaveText}>{stoppingTransfer ? "Stopping..." : "Stop & Complete"}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>
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
  timerCard: { padding: 20, alignItems: 'center', marginBottom: 16, backgroundColor: '#f8f9fa' },
  timerLabel: { fontSize: 14, color: colors.text.secondary, marginBottom: 5 },
  timerText: { fontSize: 36, fontWeight: 'bold', color: colors.primary, marginBottom: 15 },
  detailsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#dee2e6', paddingTop: 15 },
  detailCol: { alignItems: 'center' },
  detailLabel: { fontSize: 12, color: colors.text.secondary },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionButton: { flex: 0.48, paddingVertical: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: colors.text.secondary, marginBottom: 16 },
  modalActions: { flexDirection: 'row', marginTop: 20 },
  // New styles for transfer details
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderInfo: { flex: 1 },
  statsRowCompact: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  statItemCompact: { flex: 1, alignItems: 'center', paddingTop: 8 },
  statLabelCompact: { fontSize: 10, color: colors.text.secondary, fontWeight: '600', marginBottom: 4 },
  statValueCompact: { fontSize: 14, fontWeight: '700', color: colors.primary },
  transferHistorySection: { marginTop: 20, marginBottom: 16 },
  transferHistorySectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  transferHistoryCard: { padding: 14, marginBottom: 12, overflow: 'hidden' },
  transferHistoryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  transferHistoryCardLeft: { flex: 1, marginRight: 10 },
  transferHistoryCardBin: { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginBottom: 3 },
  transferHistoryCardTime: { fontSize: 11, color: colors.text.secondary },
  transferStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, minWidth: 75, alignItems: 'center' },
  transferStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  transferDetailsGridRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  transferDetailCol: { flex: 1, alignItems: 'center', paddingTop: 8 },
  transferDetailLabel: { fontSize: 10, color: colors.text.secondary, fontWeight: '600', marginBottom: 4 },
  transferDetailValue: { fontSize: 12, fontWeight: '700', color: colors.text.primary },
  transferActionButtons: { marginTop: 12, flexDirection: 'column', gap: 8 },
  transferActionButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  transferActionButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  // Modal button styles
  modalButton: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalButtonCancel: { backgroundColor: '#10b981', marginRight: 8 },
  modalButtonCancelText: { color: '#000', fontWeight: '700', fontSize: 16 },
  modalButtonSave: { backgroundColor: '#2563eb' },
  modalButtonSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
