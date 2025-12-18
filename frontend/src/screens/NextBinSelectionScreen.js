import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

export default function NextBinSelectionScreen({ route, navigation }) {
  const { transfer, waterAdded, moistureLevel, destinationBins } = route.params;
  const [selectedBin, setSelectedBin] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDivert = async () => {
    if (!selectedBin) {
      showAlert("Validation", "Please select a destination bin");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      const response = await client.post(
        `/api/transfer/${transfer.id}/divert/${selectedBin.bin_id}`,
        {
          water_added: waterAdded,
          moisture_level: moistureLevel,
        }
      );
      showToast("Transfer diverted successfully");
      navigation.navigate("MonitorTransfer", { transfer: response.data });
    } catch (error) {
      showAlert("Error", "Failed to divert transfer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBins = destinationBins.filter(
    (bin) => bin.bin_id !== transfer.destination_bin_id
  );

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Select Next Destination Bin</Text>

        <View style={styles.parametersCard}>
          <Text style={styles.parametersTitle}>Recorded Parameters:</Text>
          <View style={styles.parameterRow}>
            <Text style={styles.paramLabel}>Water Added:</Text>
            <Text style={styles.paramValue}>{waterAdded} kg</Text>
          </View>
          <View style={styles.parameterRow}>
            <Text style={styles.paramLabel}>Moisture Level:</Text>
            <Text style={styles.paramValue}>{moistureLevel}%</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Available Bins</Text>

        {filteredBins.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No other destination bins available</Text>
            <Button
              text="Back"
              onPress={() => navigation.goBack()}
              variant="secondary"
              style={styles.backButton}
            />
          </View>
        ) : (
          <>
            <FlatList
              data={filteredBins}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.binCard,
                    selectedBin?.id === item.id && styles.binCardSelected,
                  ]}
                  onPress={() => setSelectedBin(item)}
                >
                  <View style={styles.binCardContent}>
                    <Text
                      style={[
                        styles.binNumber,
                        selectedBin?.id === item.id && styles.binNumberSelected,
                      ]}
                    >
                      {item.bin.bin_number}
                    </Text>
                    <Text
                      style={[
                        styles.binDetail,
                        selectedBin?.id === item.id && styles.binDetailSelected,
                      ]}
                    >
                      Capacity: {item.bin.capacity} kg
                    </Text>
                    <Text
                      style={[
                        styles.binDetail,
                        selectedBin?.id === item.id && styles.binDetailSelected,
                      ]}
                    >
                      To Transfer: {item.quantity} kg
                    </Text>
                  </View>
                  {selectedBin?.id === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />

            <View style={styles.actionsContainer}>
              <Button
                text="Confirm Divert"
                onPress={handleDivert}
                loading={loading}
                disabled={!selectedBin || loading}
                style={styles.button}
              />
              <Button
                text="Back"
                onPress={() => navigation.goBack()}
                variant="secondary"
                style={styles.button}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: colors.textPrimary,
  },
  parametersCard: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.success || colors.primary,
  },
  parametersTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  parameterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  paramLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paramValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success || colors.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 20,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    marginTop: 16,
  },
  binCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.lightGray,
  },
  binCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.lightGray,
  },
  binCardContent: {
    flex: 1,
  },
  binNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  binNumberSelected: {
    color: colors.primary,
  },
  binDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  binDetailSelected: {
    color: colors.textPrimary,
  },
  checkmark: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: "bold",
    marginLeft: 12,
  },
  actionsContainer: {
    gap: 12,
    marginVertical: 20,
  },
  button: {
    marginVertical: 8,
  },
});
