import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

export default function ParametersInputScreen({ route, navigation }) {
  const { transfer, isDisverting } = route.params;
  const [waterAdded, setWaterAdded] = useState("");
  const [moistureLevel, setMoistureLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateInputs = () => {
    const newErrors = {};

    if (!waterAdded || waterAdded.trim() === "") {
      newErrors.waterAdded = "Water added is required";
    } else if (isNaN(parseFloat(waterAdded))) {
      newErrors.waterAdded = "Water added must be a number";
    } else if (parseFloat(waterAdded) < 0) {
      newErrors.waterAdded = "Water added cannot be negative";
    }

    if (!moistureLevel || moistureLevel.trim() === "") {
      newErrors.moistureLevel = "Moisture level is required";
    } else if (isNaN(parseFloat(moistureLevel))) {
      newErrors.moistureLevel = "Moisture level must be a number";
    } else if (parseFloat(moistureLevel) < 0 || parseFloat(moistureLevel) > 100) {
      newErrors.moistureLevel = "Moisture level must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStopTransfer = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const client = getApiClient();
      await client.post(`/api/transfer/${transfer.id}/complete`, {
        water_added: parseFloat(waterAdded),
        moisture_level: parseFloat(moistureLevel),
      });
      showToast("Transfer completed successfully");
      navigation.navigate("TransferHistory", { orderId: transfer.production_order_id });
    } catch (error) {
      showAlert("Error", "Failed to complete transfer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDivertToBin = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const client = getApiClient();
      // Get available destination bins for diverting
      const response = await client.get(
        `/api/transfer/destination-bins/${transfer.production_order_id}`
      );
      
      if (response.data && response.data.length > 0) {
        navigation.navigate("NextBinSelection", {
          transfer,
          waterAdded: parseFloat(waterAdded),
          moistureLevel: parseFloat(moistureLevel),
          destinationBins: response.data,
        });
      } else {
        showAlert("Error", "No destination bins available for diversion");
      }
    } catch (error) {
      showAlert("Error", "Failed to load destination bins");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Enter Parameters</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Recording parameters for transfer completion
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.currentBin}>
              Destination Bin: {transfer.destination_bin.bin_number}
            </Text>

            <InputField
              label="Water Added (kg)"
              placeholder="Enter water added"
              value={waterAdded}
              onChangeText={setWaterAdded}
              keyboardType="decimal-pad"
              error={errors.waterAdded}
            />

            <InputField
              label="Moisture Level (%)"
              placeholder="Enter moisture level (0-100)"
              value={moistureLevel}
              onChangeText={setMoistureLevel}
              keyboardType="decimal-pad"
              error={errors.moistureLevel}
            />

            <View style={styles.actionsContainer}>
              {isDisverting ? (
                <>
                  <Button
                    text="Divert to Next Bin"
                    onPress={handleDivertToBin}
                    loading={loading}
                    style={styles.button}
                  />
                  <Button
                    text="Stop Transfer"
                    onPress={handleStopTransfer}
                    variant="secondary"
                    loading={loading}
                    style={styles.button}
                  />
                </>
              ) : (
                <Button
                  text="Complete Transfer"
                  onPress={handleStopTransfer}
                  loading={loading}
                  style={styles.button}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
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
  infoCard: {
    backgroundColor: colors.infoBackground || colors.lightGray,
    borderLeftWidth: 4,
    borderLeftColor: colors.info || colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  formContainer: {
    marginBottom: 20,
  },
  currentBin: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 20,
  },
  button: {
    marginVertical: 8,
  },
});
