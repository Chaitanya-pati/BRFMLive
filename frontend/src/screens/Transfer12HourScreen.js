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

const TRANSFER_TYPES = [
  { label: "Normal Transfer", value: "NORMAL", description: "Standard multi-bin transfer" },
  { label: "Special Transfer", value: "SPECIAL", description: "Custom quantity transfer" },
];

export default function Transfer12HourScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 480;

  const [productionOrders, setProductionOrders] = useState([]);
  const [sourceBins, setSourceBins] = useState([]);
  const [destinationBins, setDestinationBins] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState(STAGES.SELECT_TYPE);
  const [transferType, setTransferType] = useState("NORMAL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [binsMappings, setBinsMappings] = useState([
    { source_bin_id: null, destination_bin_id: null, source_sequence: 1, destination_sequence: 1, planned_quantity: 0 },
  ]);

  const [specialSourceBin, setSpecialSourceBin] = useState(null);
  const [specialDestinationBin, setSpecialDestinationBin] = useState(null);
  const [manualQuantity, setManualQuantity] = useState("");

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
        client.get("/12hour-transfer/available-source-bins"),
        client.get("/12hour-transfer/available-destination-bins"),
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>12-Hour Transfer Process</Text>
        <Text style={styles.subtitle}>Select the type of transfer to proceed</Text>
      </View>

      <View style={[styles.typeGrid, isMobile && styles.typeGridMobile]}>
        {TRANSFER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              transferType === type.value && styles.typeCardSelected,
              isMobile && styles.typeCardMobile,
            ]}
            onPress={() => setTransferType(type.value)}
            activeOpacity={0.8}
          >
            <View style={styles.typeCardContent}>
              <View style={[styles.typeIcon, transferType === type.value && styles.typeIconSelected]}>
                <Text style={styles.typeEmoji}>{type.value === "NORMAL" ? "📋" : "⚙️"}</Text>
              </View>
              <Text style={[styles.typeLabel, transferType === type.value && styles.typeLabelSelected]}>
                {type.label}
              </Text>
              <Text style={[styles.typeDescription, transferType === type.value && styles.typeDescriptionSelected]}>
                {type.description}
              </Text>
            </View>
            {transferType === type.value && <View style={styles.selectedBadge} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="Continue"
          onPress={() => setStage(STAGES.SELECT_ORDER)}
          disabled={!transferType}
          style={styles.primaryButton}
          textStyle={styles.buttonText}
        />
      </View>
    </ScrollView>
  );

  const renderSelectOrder = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Select Production Order</Text>
        <Text style={styles.subtitle}>Choose an order to configure transfer</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : productionOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No production orders available</Text>
        </View>
      ) : (
        <FlatList
          data={productionOrders}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card style={[styles.orderCard, isMobile && styles.orderCardMobile]}>
              <View style={styles.orderInfo}>
                <View>
                  <Text style={styles.orderId}>Order ID: {item.id}</Text>
                  <Text style={styles.orderStatus}>
                    Status: <Text style={styles.statusBadge}>{item.status}</Text>
                  </Text>
                </View>
              </View>
              <Button
                title="Select"
                onPress={() => handleSelectOrder(item)}
                style={styles.selectButton}
                textStyle={styles.buttonText}
              />
            </Card>
          )}
        />
      )}

      <View style={styles.buttonGroup}>
        <Button
          title="Back"
          onPress={handleGoBack}
          variant="secondary"
          style={styles.secondaryButton}
          textStyle={styles.buttonText}
        />
      </View>
    </ScrollView>
  );

  const renderConfigureBins = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Configure Transfer</Text>
        <Text style={styles.subtitle}>Order ID: {selectedOrder?.id}</Text>
      </View>

      {transferType === "SPECIAL" && (
        <View style={styles.specialSection}>
          <Text style={styles.sectionHeader}>Special Transfer Configuration</Text>
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
              label: `${bin.bin_number} (${bin.remaining_capacity} capacity left)`,
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

      <Text style={styles.sectionHeader}>
        {transferType === "SPECIAL" ? "Normal Bins Mapping (Optional)" : "Configure Bin Mappings"}
      </Text>

      {binsMappings.map((mapping, index) => (
        <Card key={index} style={[styles.mappingCard, isMobile && styles.mappingCardMobile]}>
          <View style={styles.mappingHeader}>
            <Text style={styles.mappingIndex}>Transfer Mapping {index + 1}</Text>
            {binsMappings.length > 1 && (
              <TouchableOpacity onPress={() => removeBinsMapping(index)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

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
              label: `${bin.bin_number} (${bin.remaining_capacity} capacity)`,
              value: bin.id,
            }))}
          />

          <View style={[styles.rowContainer, isMobile && styles.rowContainerMobile]}>
            <View style={[styles.halfWidth, isMobile && styles.fullWidth]}>
              <InputField
                label="Planned Qty (tons)"
                value={mapping.planned_quantity.toString()}
                onChangeText={(value) => updateBinsMapping(index, "planned_quantity", parseFloat(value) || 0)}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.halfWidth, isMobile && styles.fullWidth]}>
              <InputField
                label="Sequence"
                value={mapping.source_sequence.toString()}
                onChangeText={(value) => updateBinsMapping(index, "source_sequence", parseInt(value) || 1)}
                placeholder="1"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </Card>
      ))}

      <Button
        title="+ Add Another Mapping"
        onPress={addBinsMapping}
        variant="outline"
        style={styles.addButton}
        textStyle={styles.addButtonText}
      />

      <View style={styles.buttonGroup}>
        <Button
          title="Create Session"
          onPress={handleCreateSession}
          disabled={loading}
          style={styles.primaryButton}
          textStyle={styles.buttonText}
          loading={loading}
        />
        <Button
          title="Back"
          onPress={handleGoBack}
          variant="secondary"
          style={styles.secondaryButton}
          textStyle={styles.buttonText}
        />
      </View>
    </ScrollView>
  );

  const renderSessionActive = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Transfer Session Created</Text>
        <Text style={styles.subtitle}>Session is ready for operations</Text>
      </View>

      <Card style={styles.successCard}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✓</Text>
        </View>
        <Text style={styles.successText}>Session successfully created!</Text>
        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Session ID:</Text>
            <Text style={styles.detailValue}>{selectedSession?.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{selectedSession?.transfer_type}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, styles.statusValue]}>{selectedSession?.status}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order:</Text>
            <Text style={styles.detailValue}>{selectedSession?.production_order_id}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.buttonGroup}>
        <Button
          title="View All Sessions"
          onPress={() => setStage(STAGES.HISTORY)}
          style={styles.primaryButton}
          textStyle={styles.buttonText}
        />
        <Button
          title="New Transfer"
          onPress={handleGoBack}
          variant="secondary"
          style={styles.secondaryButton}
          textStyle={styles.buttonText}
        />
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.mainHeading}>Transfer Sessions</Text>
        <Text style={styles.subtitle}>View all your transfer sessions</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sessions found</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card style={[styles.sessionCard, isMobile && styles.sessionCardMobile]}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionId}>Session #{item.id}</Text>
                <View style={[styles.typeBadge, item.transfer_type === "NORMAL" ? styles.normalBadge : styles.specialBadge]}>
                  <Text style={styles.typeBadgeText}>{item.transfer_type}</Text>
                </View>
              </View>
              <View style={styles.sessionInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={[styles.infoValue, styles.getStatusColor(item.status)]}>{item.status}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order:</Text>
                  <Text style={styles.infoValue}>{item.production_order_id}</Text>
                </View>
                {item.start_timestamp && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Started:</Text>
                    <Text style={styles.infoValue}>{formatISTDateTime(item.start_timestamp)}</Text>
                  </View>
                )}
              </View>
            </Card>
          )}
        />
      )}

      <View style={styles.buttonGroup}>
        <Button
          title="Back"
          onPress={handleGoBack}
          variant="secondary"
          style={styles.secondaryButton}
          textStyle={styles.buttonText}
        />
      </View>
    </ScrollView>
  );

  return (
    <Layout navigation={navigation} showBackButton={stage !== STAGES.SELECT_TYPE}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
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
  headerSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  typeGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  typeGridMobile: {
    flexDirection: "column",
  },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    position: "relative",
    overflow: "hidden",
  },
  typeCardMobile: {
    minHeight: 140,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  typeCardContent: {
    alignItems: "center",
    gap: 8,
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconSelected: {
    backgroundColor: colors.primary + "15",
  },
  typeEmoji: {
    fontSize: 32,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    textAlign: "center",
  },
  typeLabelSelected: {
    color: colors.primary,
  },
  typeDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: "center",
  },
  typeDescriptionSelected: {
    color: colors.primary,
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  orderCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.warning + "20",
    color: colors.warning,
    fontWeight: "600",
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 100,
  },
  loaderContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  specialSection: {
    backgroundColor: colors.primary + "08",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  mappingCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  mappingCardMobile: {
    padding: 12,
  },
  mappingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mappingIndex: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  removeButton: {
    fontSize: 20,
    color: colors.error,
    fontWeight: "bold",
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
  },
  rowContainerMobile: {
    flexDirection: "column",
  },
  halfWidth: {
    flex: 1,
  },
  fullWidth: {
    width: "100%",
  },
  addButton: {
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  addButtonText: {
    color: colors.primary,
  },
  successCard: {
    backgroundColor: colors.success + "08",
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    borderRadius: 12,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 36,
    color: colors.surface,
  },
  successText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.success,
    marginBottom: 20,
  },
  sessionDetails: {
    width: "100%",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.success + "30",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  statusValue: {
    color: colors.primary,
  },
  sessionCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  sessionCardMobile: {
    padding: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionId: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  normalBadge: {
    backgroundColor: colors.primary + "20",
  },
  specialBadge: {
    backgroundColor: colors.warning + "20",
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.primary,
  },
  sessionInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  getStatusColor: (status) => {
    switch (status) {
      case "COMPLETED":
        return { color: colors.success };
      case "IN_PROGRESS":
        return { color: colors.warning };
      case "PAUSED":
        return { color: colors.text.secondary };
      default:
        return { color: colors.primary };
    }
  },
  buttonGroup: {
    gap: 10,
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
