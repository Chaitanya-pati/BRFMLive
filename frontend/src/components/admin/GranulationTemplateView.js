import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import Button from "../Button";
import InputField from "../InputField";
import SelectDropdown from "../SelectDropdown";
import Card from "../Card";
import colors from "../../theme/colors";
import { getApiClient } from "../../api/client";
import { showToast, showAlert } from "../../utils/customAlerts";

export default function GranulationTemplateView({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [selectedFg, setSelectedFg] = useState(null);
  const [columns, setColumns] = useState([{ id: Date.now(), label: "" }]);

  useEffect(() => {
    fetchFinishedGoods();
  }, []);

  const fetchFinishedGoods = async () => {
    try {
      const client = getApiClient();
      const res = await client.get("/finished-goods");
      setFinishedGoods(res.data || []);
    } catch (error) {
      console.error("Failed to fetch finished goods", error);
    }
  };

  const handleAddColumn = () => {
    setColumns([...columns, { id: Date.now(), label: "" }]);
  };

  const handleRemoveColumn = (id) => {
    if (columns.length > 1) {
      setColumns(columns.filter(c => c.id !== id));
    }
  };

  const updateColumn = (id, field, value) => {
    setColumns(columns.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSaveTemplate = async () => {
    if (!selectedFg) {
      showAlert("Error", "Please select a Finished Good");
      return;
    }

    const validColumns = columns.filter(c => c.label.trim() !== "");
    if (validColumns.length === 0) {
      showAlert("Error", "Please add at least one column label");
      return;
    }

    setLoading(true);
    try {
      const client = getApiClient();
      await client.post("/granulation-templates", {
        finished_good_id: selectedFg,
        columns_definition: { columns: validColumns.map(({ label }) => label.trim()) },
        is_active: true
      });
      showToast("Success", "Granulation template saved successfully");
      if (onSuccess) onSuccess();
      setColumns([{ id: Date.now(), label: "" }]);
      setSelectedFg(null);
    } catch (error) {
      showAlert("Error", "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <SelectDropdown
          label="Select Finished Good"
          options={finishedGoods.map(fg => ({ label: fg.product_name, value: fg.id }))}
          onValueChange={setSelectedFg}
          selectedValue={selectedFg}
        />

        <Text style={styles.subtitle}>Sieve Columns Definition</Text>
        {columns.map((col, index) => (
          <View key={col.id} style={styles.columnRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <InputField
                label={index === 0 ? "Column Label (e.g. 1000 \u03bc)" : ""}
                value={col.label}
                onChangeText={(v) => updateColumn(col.id, 'label', v)}
                placeholder="e.g. 1000 \u03bc or Throughs"
              />
            </View>
            <TouchableOpacity 
              onPress={() => handleRemoveColumn(col.id)} 
              style={[styles.removeBtn, index === 0 && { marginTop: 25 }]}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddColumn}>
          <Text style={styles.addBtnText}>+ Add Column</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 20 }}>
          <Button title="Save Template" onPress={handleSaveTemplate} loading={loading} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { padding: 16, borderRadius: 12 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 15, color: '#444' },
  columnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  removeBtn: { padding: 10 },
  removeText: { color: colors.danger, fontSize: 18, fontWeight: 'bold' },
  addBtn: { padding: 10, alignSelf: 'flex-start' },
  addBtnText: { color: colors.primary, fontWeight: 'bold' }
});
