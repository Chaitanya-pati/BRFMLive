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
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";
import { formatISTDateTime } from "../utils/dateUtils";

export default function MonitorTransferScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const { transfer: initialTransfer } = route.params;

  const [transfer, setTransfer] = useState(initialTransfer);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const handleDivertOrStop = () => {
    navigation.navigate("ParametersInput", { transfer, isDisverting: true });
  };

  const handleStopOnly = () => {
    navigation.navigate("ParametersInput", { transfer, isDisverting: false });
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Transfer Monitoring</Text>

        <View style={styles.monitoringCard}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Duration</Text>
            <Text style={styles.timerDisplay}>{formatTime(timer)}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.statusText}>{transfer.status}</Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Source Bin:</Text>
              <Text style={styles.value}>{transfer.source_bin.bin_number}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Destination Bin:</Text>
              <Text style={styles.value}>{transfer.destination_bin.bin_number}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Planned Quantity:</Text>
              <Text style={styles.value}>{transfer.quantity_planned} kg</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Start Time:</Text>
              <Text style={styles.value}>
                {formatISTDateTime(transfer.transfer_start_time)}
              </Text>
            </View>
          </View>

          <View style={styles.sourceBlendContainer}>
            <Text style={styles.sourceBlendTitle}>Source Blend Percentages:</Text>
            {transfer.production_order.source_bins.map((bin, index) => (
              <View key={index} style={styles.blendRow}>
                <Text style={styles.blendLabel}>{bin.bin.bin_number}:</Text>
                <Text style={styles.blendValue}>{bin.blend_percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            text="Divert to Next Bin"
            onPress={handleDivertOrStop}
            style={styles.actionButton}
          />
          <Button
            text="Stop Transfer"
            onPress={handleStopOnly}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
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
    marginBottom: 20,
    color: colors.textPrimary,
  },
  monitoringCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: "monospace",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    width: 120,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  detailsContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  value: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  sourceBlendContainer: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  sourceBlendTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  blendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  blendLabel: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  blendValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    marginVertical: 8,
  },
});
