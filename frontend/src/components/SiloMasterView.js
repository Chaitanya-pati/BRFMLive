import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import DataTable from "./DataTable";
import Modal from "./Modal";
import InputField from "./InputField";
import SelectDropdown from "./SelectDropdown";
import Button from "./Button";
import colors from "../theme/colors";
import { siloApi } from "../api/client";
import { FaPlus } from "react-icons/fa";
import { showSuccess, showError } from "../utils/toastUtils";

export default function SiloMasterView() {
  const [silos, setSilos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    bin_no: "",
    silo_name: "",
    capacity_kg: "",
    current_stock_kg: "0",
    current_moisture_percent: "",
    status: "Active",
    remarks: ""
  });
  const [currentSiloId, setCurrentSiloId] = useState(null);

  useEffect(() => {
    loadSilos();
  }, []);

  const loadSilos = async () => {
    setLoading(true);
    try {
      const response = await siloApi.getAll();
      setSilos(response.data || []);
    } catch (error) {
      console.error("Error loading silos:", error);
      Alert.alert("Error", "Failed to load silos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.bin_no || !formData.silo_name || !formData.capacity_kg) {
      Alert.alert("Error", "Please fill required fields");
      return;
    }

    try {
      const payload = {
        ...formData,
        capacity_kg: parseFloat(formData.capacity_kg),
        current_stock_kg: parseFloat(formData.current_stock_kg) || 0,
        current_moisture_percent: formData.current_moisture_percent ? parseFloat(formData.current_moisture_percent) : null,
      };

      if (editMode && currentSiloId) {
        await siloApi.update(currentSiloId, payload);
        showSuccess("Silo updated successfully");
      } else {
        await siloApi.create(payload);
        showSuccess("Silo added successfully");
      }
      setModalVisible(false);
      loadSilos();
    } catch (error) {
      console.error("Error saving silo:", error);
      showError("Failed to save silo");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await siloApi.delete(id);
            showSuccess("Silo deleted successfully");
            loadSilos();
          } catch (error) {
            console.error("Error deleting silo:", error);
            showError("Failed to delete silo");
          }
        },
      },
    ]);
  };

  const columns = [
    { key: "bin_no", label: "Bin No", flex: 1 },
    { key: "silo_name", label: "Silo Name", flex: 1.5 },
    { key: "capacity_kg", label: "Capacity (kg)", flex: 1 },
    { key: "current_stock_kg", label: "Current Stock (kg)", flex: 1.2 },
    { key: "status", label: "Status", flex: 0.8 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Silo Master</Text>
        <Button
          title="Add Silo"
          onPress={() => {
            setEditMode(false);
            setFormData({
              bin_no: "",
              silo_name: "",
              capacity_kg: "",
              current_stock_kg: "0",
              current_moisture_percent: "",
              status: "Active",
              remarks: ""
            });
            setModalVisible(true);
          }}
          icon={<FaPlus color="#fff" />}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <DataTable 
          data={silos} 
          columns={columns}
          onEdit={(item) => {
            setEditMode(true);
            setCurrentSiloId(item.silo_id);
            setFormData({
              bin_no: item.bin_no,
              silo_name: item.silo_name,
              capacity_kg: item.capacity_kg.toString(),
              current_stock_kg: item.current_stock_kg.toString(),
              current_moisture_percent: item.current_moisture_percent ? item.current_moisture_percent.toString() : "",
              status: item.status,
              remarks: item.remarks || ""
            });
            setModalVisible(true);
          }}
          onDelete={(item) => handleDelete(item.silo_id)}
        />
      )}

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? "Edit Silo" : "Add New Silo"}
      >
        <View>
          <InputField
            label="Bin Number *"
            value={formData.bin_no}
            onChangeText={(text) => setFormData({ ...formData, bin_no: text })}
          />
          <InputField
            label="Silo Name *"
            value={formData.silo_name}
            onChangeText={(text) => setFormData({ ...formData, silo_name: text })}
          />
          <InputField
            label="Capacity (kg) *"
            value={formData.capacity_kg}
            onChangeText={(text) => setFormData({ ...formData, capacity_kg: text })}
            keyboardType="numeric"
          />
          <InputField
            label="Current Stock (kg)"
            value={formData.current_stock_kg}
            onChangeText={(text) => setFormData({ ...formData, current_stock_kg: text })}
            keyboardType="numeric"
          />
          <InputField
            label="Current Moisture (%)"
            value={formData.current_moisture_percent}
            onChangeText={(text) => setFormData({ ...formData, current_moisture_percent: text })}
            keyboardType="numeric"
          />
          <SelectDropdown
            label="Status"
            options={[
              { label: "Active", value: "Active" },
              { label: "Maintenance", value: "Maintenance" },
              { label: "Blocked", value: "Blocked" },
            ]}
            value={formData.status}
            onValueChange={(val) => setFormData({ ...formData, status: val })}
          />
          <InputField
            label="Remarks"
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            multiline
          />
          <Button title={editMode ? "Update Silo" : "Save Silo"} onPress={handleSubmit} style={{ marginTop: 20 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 15,
  }
});