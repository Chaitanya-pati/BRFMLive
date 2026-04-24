import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal as RNModal,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getApiClient, magnetCleaningRecordApi } from "../api/client";
import {
  showToast,
  showAlert,
  formatErrorMessage,
} from "../utils/customAlerts";
import CleaningReminder from "./CleaningReminder";
import InputField from "./InputField";
import Button from "./Button";

/**
 * Reusable panel for logging a magnet-cleaning record from inside a transfer
 * (24-hour or 12-hour). It:
 *   1. Calls GET /api/route-configurations/match to find the magnets sitting
 *      between the transfer's source and destination.
 *   2. Shows the existing CleaningReminder modal pre-populated with those magnets.
 *   3. When the operator picks a magnet, opens a small form (notes + optional
 *      before/after photos) and POSTs to /api/magnet-cleaning-records with
 *      production_order_id, source_bin_id and destination_bin_id attached.
 *
 * This component is fully self-contained and does NOT touch any existing
 * transfer-session functionality.
 */
export default function MagnetCleaningPanel({
  productionOrderId,
  sourceBinId = null,
  sourceGodownId = null,
  destinationBinId,
  sourceName = "Source",
  destName = "Destination",
  runningTime = "",
  buttonStyle,
  buttonLabel = "🔔 Log Magnet Cleaning",
  onRecorded,
  disabled = false,
}) {
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [matchData, setMatchData] = useState(null);

  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [selectedMagnet, setSelectedMagnet] = useState(null);
  const [notes, setNotes] = useState("");
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleOpen = async () => {
    if (!destinationBinId) {
      showAlert(
        "Cannot Log Cleaning",
        "Destination bin is not set for this transfer yet."
      );
      return;
    }
    if (!sourceBinId && !sourceGodownId) {
      showAlert(
        "Cannot Log Cleaning",
        "Source bin / source godown is not set for this transfer yet."
      );
      return;
    }
    setLoadingMatch(true);
    try {
      const client = getApiClient();
      const params = { destination_bin_id: destinationBinId };
      if (sourceBinId) params.source_bin_id = sourceBinId;
      if (sourceGodownId) params.source_godown_id = sourceGodownId;

      const res = await client.get("/route-configurations/match", { params });
      const data = res.data || {};
      setMatchData(data);

      if (!data.magnets || data.magnets.length === 0) {
        showAlert(
          "No Matching Route",
          "No route configuration was found between this source and destination, or the route has no magnets configured."
        );
        return;
      }
      setReminderVisible(true);
    } catch (err) {
      console.error("Failed to fetch matching route:", err);
      showAlert(
        "Error",
        formatErrorMessage(err) || "Failed to find matching route."
      );
    } finally {
      setLoadingMatch(false);
    }
  };

  const pickImage = async (setter) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        showAlert(
          "Permission Required",
          "Photo library access is required to attach a photo."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setter(result.assets[0]);
      }
    } catch (err) {
      console.error("Image pick error:", err);
    }
  };

  const handleSelectMagnet = (magnet) => {
    setSelectedMagnet(magnet);
    setNotes("");
    setBeforePhoto(null);
    setAfterPhoto(null);
    setRecordModalVisible(true);
  };

  const handleSubmitRecord = async () => {
    if (!selectedMagnet) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("magnet_id", String(selectedMagnet.id));
      if (productionOrderId)
        formData.append("production_order_id", String(productionOrderId));
      if (sourceBinId)
        formData.append("source_bin_id", String(sourceBinId));
      if (destinationBinId)
        formData.append("destination_bin_id", String(destinationBinId));
      if (notes) formData.append("notes", notes);

      const appendPhoto = async (key, photo) => {
        if (!photo || !photo.uri) return;
        if (Platform.OS === "web") {
          const r = await fetch(photo.uri);
          const blob = await r.blob();
          formData.append(key, blob, `${key}.jpg`);
        } else {
          formData.append(key, {
            uri: photo.uri,
            type: "image/jpeg",
            name: `${key}.jpg`,
          });
        }
      };
      await appendPhoto("before_cleaning_photo", beforePhoto);
      await appendPhoto("after_cleaning_photo", afterPhoto);

      await magnetCleaningRecordApi.create(formData);
      showToast("Cleaning record saved", "success");
      setRecordModalVisible(false);
      setSelectedMagnet(null);
      setNotes("");
      setBeforePhoto(null);
      setAfterPhoto(null);
      if (onRecorded) onRecorded();
    } catch (err) {
      console.error("Save cleaning record error:", err);
      showAlert(
        "Error",
        formatErrorMessage(err) || "Failed to save cleaning record"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.openBtn,
          (disabled || loadingMatch) && styles.openBtnDisabled,
          buttonStyle,
        ]}
        onPress={handleOpen}
        disabled={disabled || loadingMatch}
      >
        {loadingMatch ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.openBtnText}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>

      <CleaningReminder
        visible={reminderVisible}
        onClose={() => setReminderVisible(false)}
        magnets={matchData?.magnets || []}
        sourceName={sourceName}
        destName={destName}
        runningTime={runningTime || "—"}
        cleaningInterval="—"
        totalMagnets={(matchData?.magnets || []).length}
        onAddCleaningRecord={(magnet) => handleSelectMagnet(magnet)}
      />

      <RNModal visible={recordModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Cleaning Record</Text>
            <Text style={styles.modalSub}>
              Magnet: {selectedMagnet?.name || "—"}
            </Text>

            <InputField
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any observations…"
              multiline
              numberOfLines={3}
            />

            <View style={styles.photoRow}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage(setBeforePhoto)}
              >
                <Text style={styles.photoBtnText}>
                  {beforePhoto ? "✓ Before Photo" : "📷 Before Photo"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage(setAfterPhoto)}
              >
                <Text style={styles.photoBtnText}>
                  {afterPhoto ? "✓ After Photo" : "📷 After Photo"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setRecordModalVisible(false);
                  setSelectedMagnet(null);
                }}
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Record"
                onPress={handleSubmitRecord}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </RNModal>
    </>
  );
}

const styles = StyleSheet.create({
  openBtn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  openBtnDisabled: { backgroundColor: "#9ca3af", opacity: 0.7 },
  openBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 440,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSub: { fontSize: 12, color: "#6b7280", marginBottom: 14 },
  modalActions: { flexDirection: "row", marginTop: 16 },
  photoRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 4 },
  photoBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  photoBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
