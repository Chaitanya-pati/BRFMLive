import React, { useState, useEffect, useMemo } from "react";
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
  CONFIRM_SESSION: "CONFIRM_SESSION",
  SESSION_ACTIVE: "SESSION_ACTIVE",
  HISTORY: "HISTORY",
};

const TRANSFER_TYPES = [
  { label: "Normal Transfer", value: "NORMAL" },
  { label: "Special Transfer", value: "SPECIAL" },
];

export default function Transfer12HourScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Data states
  const [productionOrders, setProductionOrders] = useState([]);
  const [sourceBins, setSourceBins] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI states
  const [stage, setStage] = useState(STAGES.SELECT_TYPE);
  const [transferType, setTransferType] = useState("NORMAL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  // Form states for NORMAL transfer
  const [binsMappings, setBinsMappings] = useState([
    { source_bin_id: null, destination_bin_id: null, source_sequence: 1, destination_sequence: 1, planned_quantity: 0 },
  ]);

  // Form states for SPECIAL transfer
  const [specialSourceBin, setSpecialSourceBin] = useState(null);
  const [specialDestinationBin, setSpecialDestinationBin] = useState(null);
  const [manualQuantity, setManualQuantity] = useState("");

  // Fetch production orders on mount
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const client = getApiClient();
      const response = await client.get("/12hour-transfer/sessions");
      setSessions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const client = getApiClient();
      const [sourceResponse, destResponse] = await Promise.all([
        client.get(`/12hour-transfer/available-source-bins/${order.id}`),
        client.get(`/12hour-transfer/available-destination-bins/${order.id}`),
      ]);
      setSourceBins(sourceResponse.data || []);
      setDestinationBins(destResponse.data || []);
      setStage(STAGES.CONFIGURE_BINS);
    } catch (error) {
      showAlert("Error", "Failed to fetch bins");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateBinsMapping = (index, field, value) => {
    const updated = [...binsMappings];
    updated[index] = { ...updated[index], [field]: value };
    setBinsMappings(updated);
  };

  const addBinsMapping = () => {
    const newSequence = binsMappings.length + 1;
    setBinsMappings([
      ...binsMappings,
      { source_bin_id: null, destination_bin_id: null, source_sequence: newSequence, destination_sequence: newSequence, planned_quantity: 0 },
    ]);
  };

  const removeBinsMapping = (index) => {
    if (binsMappings.length > 1) {
      setBinsMappings(binsMappings.filter((_, i) => i !== index));
    }
  };

  const validateBinsMappings = () => {
    for (let mapping of binsMappings) {
      if (!mapping.source_bin_id || !mapping.destination_bin_id || !mapping.planned_quantity) {
        showAlert("Validation Error", "All bin mappings must have source bin, destination bin, and planned quantity");
        return false;
      }
    }
    return true;
  };

  const handleCreateSession = async () => {
    if (transferType === "NORMAL") {
      if (!validateBinsMappings()) return;

      setLoading(true);
      try {
        const client = getApiClient();
        const response = await client.post("/12hour-transfer/create-session-normal", {
          production_order_id: selectedOrder.id,
          bins_mapping: binsMappings,
        });
        showToast("Success", "Normal transfer session created");
        setSelectedSession(response.data);
        setStage(STAGES.SESSION_ACTIVE);
        fetchSessions();
      } catch (error) {
        showAlert("Error", error.response?.data?.detail || "Failed to create session");
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      // SPECIAL transfer validation
      if (!specialSourceBin || !specialDestinationBin || !manualQuantity) {
        showAlert("Validation Error", "Please fill all special transfer fields");
        return;
      }
      if (!validateBinsMappings()) return;

      setLoading(true);
      try {
        const client = getApiClient();
        const response = await client.post("/12hour-transfer/create-session-special", {
          production_order_id: selectedOrder.id,
          bins_mapping: binsMappings,
          special_transfer: {
            special_source_bin_id: specialSourceBin,
            special_destination_bin_id: specialDestinationBin,
            manual_quantity: parseFloat(manualQuantity),
          },
        });
        showToast("Success", "Special transfer session created");
        setSelectedSession(response.data);
        setStage(STAGES.SESSION_ACTIVE);
        fetchSessions();
      } catch (error) {
        showAlert("Error", error.response?.data?.detail || "Failed to create session");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoBack = () => {
    setSelectedOrder(null);
    setBinsMappings([{ source_bin_id: null, destination_bin_id: null, source_sequence: 1, destination_sequence: 1, planned_quantity: 0 }]);
    setSpecialSourceBin(null);
    setSpecialDestinationBin(null);
    setManualQuantity("");
    setStage(STAGES.SELECT_TYPE);
  };

  const renderSelectType = () => (
    <View style={styles.container}>
      <Text style={styles.heading}>Select Transfer Type</Text>
      <View style={styles.typeContainer}>
        {TRANSFER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              transferType === type.value && styles.typeCardSelected,
            ]}
            onPress={() => setTransferType(type.value)}
          >
            <Text
              style={[
                styles.typeLabel,
                transferType === type.value && styles.typeLabeLSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button
        label="Next"
        onPress={() => setStage(STAGES.SELECT_ORDER)}
        disabled={!transferType}
      />
    </View>
  );

  const renderSelectOrder = () => (
    <View style={styles.container}>
      <Text style={styles.heading}>Select Production Order</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={productionOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card style={styles.orderCard}>
              <Text style={styles.orderText}>Order ID: {item.id}</Text>
              <Text style={styles.orderText}>Status: {item.status}</Text>
              <Button
                label="Select"
                size="small"
                onPress={() => handleSelectOrder(item)}
              />
            </Card>
          )}
          scrollEnabled={false}
        />
      )}
      <Button label="Back" onPress={handleGoBack} variant="secondary" />
    </View>
  );

  const renderConfigureBins = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Configure Bins</Text>
      <Text style={styles.subHeading}>Order ID: {selectedOrder?.id}</Text>

      {transferType === "SPECIAL" && (
        <View style={styles.specialSection}>
          <Text style={styles.sectionTitle}>Special Transfer Configuration</Text>
          <SelectDropdown
            label="Special Source Bin"
            value={specialSourceBin}
            onChange={setSpecialSourceBin}
            items={sourceBins.map((bin) => ({
              label: `${bin.bin_number} (${bin.current_quantity} tons)`,
              value: bin.id,
            }))}
          />
          <SelectDropdown
            label="Special Destination Bin"
            value={specialDestinationBin}
            onChange={setSpecialDestinationBin}
            items={destinationBins.map((bin) => ({
              label: `${bin.bin_number} (${bin.remaining_capacity} tons capacity left)`,
              value: bin.id,
            }))}
          />
          <InputField
            label="Manual Quantity (tons)"
            value={manualQuantity}
            onChangeText={setManualQuantity}
            placeholder="Enter quantity"
            keyboardType="decimal-pad"
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Normal Bins Mapping</Text>
      {binsMappings.map((mapping, index) => (
        <Card key={index} style={styles.mappingCard}>
          <Text style={styles.mappingIndex}>Mapping {index + 1}</Text>
          <SelectDropdown
            label="Source Bin"
            value={mapping.source_bin_id}
            onChange={(value) => updateBinsMapping(index, "source_bin_id", value)}
            items={sourceBins.map((bin) => ({
              label: `${bin.bin_number} (${bin.current_quantity} tons)`,
              value: bin.id,
            }))}
          />
          <SelectDropdown
            label="Destination Bin"
            value={mapping.destination_bin_id}
            onChange={(value) => updateBinsMapping(index, "destination_bin_id", value)}
            items={destinationBins.map((bin) => ({
              label: `${bin.bin_number} (${bin.remaining_capacity} tons capacity left)`,
              value: bin.id,
            }))}
          />
          <InputField
            label="Planned Quantity (tons)"
            value={mapping.planned_quantity.toString()}
            onChangeText={(value) => updateBinsMapping(index, "planned_quantity", parseFloat(value) || 0)}
            placeholder="Enter quantity"
            keyboardType="decimal-pad"
          />
          <InputField
            label="Source Sequence"
            value={mapping.source_sequence.toString()}
            onChangeText={(value) => updateBinsMapping(index, "source_sequence", parseInt(value) || 1)}
            placeholder="Enter sequence"
            keyboardType="number-pad"
          />
          <InputField
            label="Destination Sequence"
            value={mapping.destination_sequence.toString()}
            onChangeText={(value) => updateBinsMapping(index, "destination_sequence", parseInt(value) || 1)}
            placeholder="Enter sequence"
            keyboardType="number-pad"
          />
          {binsMappings.length > 1 && (
            <Button
              label="Remove"
              onPress={() => removeBinsMapping(index)}
              variant="secondary"
              size="small"
            />
          )}
        </Card>
      ))}

      <Button label="Add Another Mapping" onPress={addBinsMapping} variant="secondary" />

      <Button
        label="Create Session"
        onPress={handleCreateSession}
        disabled={loading}
      />
      <Button label="Back" onPress={handleGoBack} variant="secondary" />
    </ScrollView>
  );

  const renderSessionActive = () => (
    <View style={styles.container}>
      <Text style={styles.heading}>Transfer Session Active</Text>
      <Card style={styles.sessionCard}>
        <Text style={styles.sessionText}>Session ID: {selectedSession?.id}</Text>
        <Text style={styles.sessionText}>Type: {selectedSession?.transfer_type}</Text>
        <Text style={styles.sessionText}>Status: {selectedSession?.status}</Text>
        <Text style={styles.sessionText}>Production Order: {selectedSession?.production_order_id}</Text>
      </Card>
      <Button
        label="View Sessions"
        onPress={() => setStage(STAGES.HISTORY)}
      />
      <Button label="New Transfer" onPress={handleGoBack} variant="secondary" />
    </View>
  );

  const renderHistory = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Transfer Sessions</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : sessions.length === 0 ? (
        <Text style={styles.noData}>No sessions found</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card style={styles.sessionListCard}>
              <Text style={styles.sessionListText}>ID: {item.id}</Text>
              <Text style={styles.sessionListText}>Type: {item.transfer_type}</Text>
              <Text style={styles.sessionListText}>Status: {item.status}</Text>
              <Text style={styles.sessionListText}>Order: {item.production_order_id}</Text>
              {item.start_timestamp && (
                <Text style={styles.sessionListText}>
                  Started: {formatISTDateTime(item.start_timestamp)}
                </Text>
              )}
            </Card>
          )}
          scrollEnabled={false}
        />
      )}
      <Button label="Back" onPress={handleGoBack} variant="secondary" />
    </ScrollView>
  );

  return (
    <Layout navigation={navigation} showBackButton={stage !== STAGES.SELECT_TYPE}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {stage === STAGES.SELECT_TYPE && renderSelectType()}
        {stage === STAGES.SELECT_ORDER && renderSelectOrder()}
        {stage === STAGES.CONFIGURE_BINS && renderConfigureBins()}
        {stage === STAGES.SESSION_ACTIVE && renderSessionActive()}
        {stage === STAGES.HISTORY && renderHistory()}
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 20,
  },
  subHeading: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  typeCard: {
    flex: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  typeLabeLSelected: {
    color: colors.primary,
  },
  orderCard: {
    marginBottom: 12,
    padding: 16,
  },
  orderText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  specialSection: {
    backgroundColor: colors.primary + "05",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  mappingCard: {
    marginBottom: 16,
    padding: 12,
  },
  mappingIndex: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 12,
  },
  sessionCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.success + "10",
  },
  sessionText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  sessionListCard: {
    marginBottom: 12,
    padding: 12,
  },
  sessionListText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  noData: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
});
