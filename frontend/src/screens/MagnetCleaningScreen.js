import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Image,
} from "react-native";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import InputField from "../components/InputField";
import SelectDropdown from "../components/SelectDropdown";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import colors from "../theme/colors";
import {
  magnetApi,
  magnetCleaningRecordApi,
  transferSessionApi,
} from "../api/client";
import { formatISTDateTime } from "../utils/dateUtils";
import { showToast, showAlert, showConfirm, formatErrorMessage } from "../utils/customAlerts";
import * as ImagePicker from "expo-image-picker";
import { getFullImageUrl } from "../utils/imageUtils";

export default function MagnetCleaningScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [magnets, setMagnets] = useState([]);
  const [transferSessions, setTransferSessions] = useState([]);
  const [cleaningRecords, setCleaningRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [cleaningModalVisible, setCleaningModalVisible] = useState(false);
  const [editingCleaningRecord, setEditingCleaningRecord] = useState(null);
  const [beforeCleaningPhoto, setBeforeCleaningPhoto] = useState(null);
  const [afterCleaningPhoto, setAfterCleaningPhoto] = useState(null);

  const [cleaningRecordFormData, setCleaningRecordFormData] = useState({
    magnet_id: "",
    transfer_session_id: "",
    cleaning_timestamp: new Date(),
    notes: "",
  });

  const fetchMagnets = async () => {
    try {
      const response = await magnetApi.getAll();
      setMagnets(response.data || []);
    } catch (error) {
      console.error("Error fetching magnets:", error);
      setMagnets([]);
    }
  };

  const fetchTransferSessions = async () => {
    try {
      const response = await transferSessionApi.getAll();
      setTransferSessions(response.data || []);
    } catch (error) {
      console.error("Error fetching transfer sessions:", error);
      setTransferSessions([]);
    }
  };

  const fetchCleaningRecords = async () => {
    try {
      setLoading(true);
      const response = await magnetCleaningRecordApi.getAll();
      setCleaningRecords(response.data || []);
    } catch (error) {
      console.error("Error fetching cleaning records:", error);
      setCleaningRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMagnets();
    fetchTransferSessions();
    fetchCleaningRecords();
  }, []);

  const handleAddCleaningRecord = () => {
    setEditingCleaningRecord(null);
    setCleaningRecordFormData({
      magnet_id: "",
      transfer_session_id: "",
      cleaning_timestamp: new Date(),
      notes: "",
    });
    setBeforeCleaningPhoto(null);
    setAfterCleaningPhoto(null);
    setCleaningModalVisible(true);
  };

  const openEditCleaningModal = (record) => {
    setEditingCleaningRecord(record);
    setCleaningRecordFormData({
      magnet_id: String(record.magnet_id),
      transfer_session_id: record.transfer_session_id
        ? String(record.transfer_session_id)
        : "",
      cleaning_timestamp: record.cleaning_timestamp
        ? new Date(record.cleaning_timestamp)
        : new Date(),
      notes: record.notes || "",
    });

    const beforePhoto = record.before_cleaning_photo
      ? { uri: getFullImageUrl(record.before_cleaning_photo) }
      : null;
    const afterPhoto = record.after_cleaning_photo
      ? { uri: getFullImageUrl(record.after_cleaning_photo) }
      : null;

    setBeforeCleaningPhoto(beforePhoto);
    setAfterCleaningPhoto(afterPhoto);
    setCleaningModalVisible(true);
  };

  const handleDeleteCleaningRecord = async (record) => {
    try {
      const confirmDelete = await showConfirm(
        "Confirm Delete",
        `Are you sure you want to delete this cleaning record?\n\nMagnet: ${record.magnet?.name || "N/A"}\nCleaned: ${formatISTDateTime(record.cleaning_timestamp)}`,
      );

      if (!confirmDelete) return;

      setLoading(true);
      await magnetCleaningRecordApi.delete(record.id);
      await fetchCleaningRecords();
      showToast("Cleaning record deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting cleaning record:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to delete cleaning record";
      showAlert("Delete Failed", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const pickCleaningImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === "before") {
          setBeforeCleaningPhoto(result.assets[0]);
        } else {
          setAfterCleaningPhoto(result.assets[0]);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Error", "Failed to pick image");
    }
  };

  const captureCleaningImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert("Error", "Camera permission is required to take photos");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === "before") {
          setBeforeCleaningPhoto(result.assets[0]);
        } else {
          setAfterCleaningPhoto(result.assets[0]);
        }
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      showAlert("Error", "Failed to capture image");
    }
  };

  const handleSubmitCleaningRecord = async () => {
    if (!cleaningRecordFormData.magnet_id) {
      showAlert("Error", "Please select a magnet");
      return;
    }

    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("magnet_id", cleaningRecordFormData.magnet_id);

      if (cleaningRecordFormData.transfer_session_id) {
        formDataToSend.append(
          "transfer_session_id",
          cleaningRecordFormData.transfer_session_id,
        );
      }

      // Send the user-selected timestamp so the backend stores it as the actual cleaning time
      const tsValue = cleaningRecordFormData.cleaning_timestamp;
      if (tsValue) {
        const tsDate = tsValue instanceof Date ? tsValue : new Date(tsValue);
        if (!isNaN(tsDate.getTime())) {
          formDataToSend.append("cleaning_timestamp", tsDate.toISOString());
        }
      }

      if (cleaningRecordFormData.notes) {
        formDataToSend.append("notes", cleaningRecordFormData.notes);
      }

      if (beforeCleaningPhoto && beforeCleaningPhoto.uri && !beforeCleaningPhoto.uri.startsWith("http")) {
        const photoUri = beforeCleaningPhoto.uri;
        if (Platform.OS === "web") {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append("before_cleaning_photo", blob, "before_cleaning.jpg");
        } else {
          formDataToSend.append("before_cleaning_photo", {
            uri: photoUri,
            type: "image/jpeg",
            name: "before_cleaning.jpg",
          });
        }
      }

      if (afterCleaningPhoto && afterCleaningPhoto.uri && !afterCleaningPhoto.uri.startsWith("http")) {
        const photoUri = afterCleaningPhoto.uri;
        if (Platform.OS === "web") {
          const response = await fetch(photoUri);
          const blob = await response.blob();
          formDataToSend.append("after_cleaning_photo", blob, "after_cleaning.jpg");
        } else {
          formDataToSend.append("after_cleaning_photo", {
            uri: photoUri,
            type: "image/jpeg",
            name: "after_cleaning.jpg",
          });
        }
      }

      if (editingCleaningRecord) {
        await magnetCleaningRecordApi.update(editingCleaningRecord.id, formDataToSend);
        showToast("Cleaning record updated successfully");
      } else {
        await magnetCleaningRecordApi.create(formDataToSend);
        showToast("Cleaning record added successfully");
      }

      setCleaningModalVisible(false);
      setEditingCleaningRecord(null);
      setBeforeCleaningPhoto(null);
      setAfterCleaningPhoto(null);
      await fetchCleaningRecords();
    } catch (error) {
      console.error("Error saving cleaning record:", error);
      const errorMessage = formatErrorMessage(error) || "Failed to save cleaning record";
      showAlert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cleaningRecordColumns = [
    {
      field: "magnet",
      label: "Magnet",
      flex: 1.5,
      render: (val) => val?.name || "-",
    },
    {
      field: "cleaning_timestamp",
      label: "Cleaning Time (IST)",
      flex: 2,
      render: (val) => formatISTDateTime(val),
    },
    {
      field: "before_cleaning_photo",
      label: "Before Photo",
      flex: 1,
      render: (val) => (val ? "✓" : "-"),
    },
    {
      field: "after_cleaning_photo",
      label: "After Photo",
      flex: 1,
      render: (val) => (val ? "✓" : "-"),
    },
    { field: "notes", label: "Notes", flex: 2 },
  ];

  return (
    <Layout title="Magnets Cleaning" navigation={navigation} currentRoute="MagnetCleaning">
      <View style={styles.container}>
        <View style={styles.headerActions}>
          <Button
            title="Add Cleaning Record"
            onPress={handleAddCleaningRecord}
            variant="primary"
          />
        </View>

        <DataTable
          columns={cleaningRecordColumns}
          data={cleaningRecords}
          onEdit={openEditCleaningModal}
          onDelete={handleDeleteCleaningRecord}
          loading={loading}
          emptyMessage="No cleaning records found"
        />

        {/* Cleaning Record Modal */}
        <Modal
          visible={cleaningModalVisible}
          onClose={() => {
            setCleaningModalVisible(false);
            setEditingCleaningRecord(null);
            setCleaningRecordFormData({
              magnet_id: "",
              transfer_session_id: "",
              cleaning_timestamp: new Date(),
              notes: "",
            });
            setBeforeCleaningPhoto(null);
            setAfterCleaningPhoto(null);
          }}
          title={editingCleaningRecord ? "Edit Cleaning Record" : "Add Cleaning Record"}
          width={isMobile ? "95%" : isTablet ? "75%" : "50%"}
        >
          <ScrollView style={styles.modalContent}>
            <SelectDropdown
              label="Magnet *"
              value={cleaningRecordFormData.magnet_id}
              onValueChange={(value) => {
                const activeSession = transferSessions.find(
                  (s) => s.magnet_id === parseInt(value) && !s.stop_timestamp,
                );
                setCleaningRecordFormData({
                  ...cleaningRecordFormData,
                  magnet_id: value,
                  transfer_session_id: activeSession ? String(activeSession.id) : "",
                });
              }}
              options={magnets.map((m) => ({
                label: m.name,
                value: String(m.id),
              }))}
              placeholder="Select magnet"
            />

            {cleaningRecordFormData.magnet_id && (
              <SelectDropdown
                label="Transfer Session (optional)"
                value={cleaningRecordFormData.transfer_session_id}
                onValueChange={(value) =>
                  setCleaningRecordFormData({
                    ...cleaningRecordFormData,
                    transfer_session_id: value,
                  })
                }
                options={transferSessions
                  .filter(
                    (s) => s.magnet_id === parseInt(cleaningRecordFormData.magnet_id),
                  )
                  .map((s) => ({
                    label: `${s.source_godown?.name || "N/A"} → ${s.destination_bin?.bin_number || "N/A"} (${s.status})`,
                    value: String(s.id),
                  }))}
                placeholder="Select transfer session"
              />
            )}

            <DatePicker
              label="Cleaning Timestamp (IST) *"
              mode="datetime"
              value={
                cleaningRecordFormData.cleaning_timestamp instanceof Date
                  ? cleaningRecordFormData.cleaning_timestamp
                  : new Date(cleaningRecordFormData.cleaning_timestamp)
              }
              onChange={(date) =>
                setCleaningRecordFormData({
                  ...cleaningRecordFormData,
                  cleaning_timestamp: date,
                })
              }
              placeholder="Select cleaning date & time"
            />
            <Text style={styles.helperText}>
              {formatISTDateTime(cleaningRecordFormData.cleaning_timestamp)}
            </Text>

            {/* Before Cleaning Photo */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Before Cleaning Photo</Text>
              {beforeCleaningPhoto ? (
                <View>
                  <Image
                    source={{ uri: beforeCleaningPhoto.uri }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageButtonRow}>
                    <TouchableOpacity
                      onPress={() => captureCleaningImage("before")}
                      style={[styles.imageActionButton, styles.cameraButton]}
                    >
                      <Text style={styles.imageActionText}>📷 Capture</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickCleaningImage("before")}
                      style={[styles.imageActionButton, styles.galleryButton]}
                    >
                      <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureCleaningImage("before")}
                    style={[styles.uploadButton, styles.cameraButton]}
                  >
                    <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickCleaningImage("before")}
                    style={[styles.uploadButton, styles.galleryButton]}
                  >
                    <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* After Cleaning Photo */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>After Cleaning Photo</Text>
              {afterCleaningPhoto ? (
                <View>
                  <Image
                    source={{ uri: afterCleaningPhoto.uri }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                  <View style={styles.imageButtonRow}>
                    <TouchableOpacity
                      onPress={() => captureCleaningImage("after")}
                      style={[styles.imageActionButton, styles.cameraButton]}
                    >
                      <Text style={styles.imageActionText}>📷 Capture</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickCleaningImage("after")}
                      style={[styles.imageActionButton, styles.galleryButton]}
                    >
                      <Text style={styles.imageActionText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.imageButtonRow}>
                  <TouchableOpacity
                    onPress={() => captureCleaningImage("after")}
                    style={[styles.uploadButton, styles.cameraButton]}
                  >
                    <Text style={styles.uploadButtonText}>📷 Capture Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickCleaningImage("after")}
                    style={[styles.uploadButton, styles.galleryButton]}
                  >
                    <Text style={styles.uploadButtonText}>🖼️ Upload from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <InputField
              label="Notes"
              placeholder="Enter notes (optional)"
              value={cleaningRecordFormData.notes}
              onChangeText={(text) =>
                setCleaningRecordFormData({
                  ...cleaningRecordFormData,
                  notes: text,
                })
              }
              multiline
              numberOfLines={3}
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => {
                  setCleaningModalVisible(false);
                  setEditingCleaningRecord(null);
                  setCleaningRecordFormData({
                    magnet_id: "",
                    transfer_session_id: "",
                    cleaning_timestamp: new Date(),
                    notes: "",
                  });
                  setBeforeCleaningPhoto(null);
                  setAfterCleaningPhoto(null);
                }}
                variant="outline"
              />
              <Button
                title={editingCleaningRecord ? "Update" : "Add"}
                onPress={handleSubmitCleaningRecord}
                variant="primary"
              />
            </View>
          </ScrollView>
        </Modal>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  modalContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -8,
    marginBottom: 12,
    fontStyle: "italic",
  },
  imageSection: {
    marginVertical: 10,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginBottom: 8,
  },
  imageButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  imageActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cameraButton: {
    backgroundColor: colors.primary || "#2563eb",
  },
  galleryButton: {
    backgroundColor: "#64748b",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});
