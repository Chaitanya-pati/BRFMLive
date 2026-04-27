import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import { wasteApi, godownApi } from '../api/client';
import { showNotification } from '../utils/notifications';
import colors from '../theme/colors';

const WASTE_TYPES = [
  { label: 'Drum Sieve', value: 'Drum Sieve' },
  { label: 'Magnets Machine', value: 'Magnets Machine' },
  { label: 'Separator', value: 'Separator' },
];

const EMPTY_FORM = {
  waste_type: '',
  godown_id: '',
  waste_weight: '',
  notes: '',
};

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function WasteEntryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    fetchEntries();
    fetchGodowns();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await wasteApi.getAll();
      setEntries(res.data || []);
    } catch {
      showNotification('Failed to load waste entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGodowns = async () => {
    try {
      const res = await godownApi.getAll();
      setGodowns(res.data || []);
    } catch {
      showNotification('Failed to load godowns', 'error');
    }
  };

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormData({ ...EMPTY_FORM });
  };

  const handleSubmit = async () => {
    if (!formData.waste_type) {
      showNotification('Please select a machine type', 'error');
      return;
    }
    if (!formData.godown_id) {
      showNotification('Please select a godown', 'error');
      return;
    }
    const weight = parseFloat(formData.waste_weight);
    if (!formData.waste_weight || isNaN(weight) || weight <= 0) {
      showNotification('Please enter a valid waste weight', 'error');
      return;
    }

    const selectedGodown = godowns.find(g => g.id.toString() === formData.godown_id);
    const currentStock = selectedGodown?.current_storage || 0;
    if (weight > currentStock) {
      showNotification(
        `Waste weight (${weight} kg) exceeds godown stock (${currentStock} kg)`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      await wasteApi.create({
        waste_type: formData.waste_type,
        godown_id: parseInt(formData.godown_id),
        waste_weight: weight,
        notes: formData.notes || undefined,
      });
      showNotification('Waste entry saved and godown stock updated', 'success');
      closeModal();
      fetchEntries();
      fetchGodowns();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save waste entry';
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Waste Entry',
      `Delete this ${item.waste_type} waste entry of ${item.waste_weight} kg from ${item.godown_name}?\n\nThis will restore the stock back to the godown.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Restore Stock',
          style: 'destructive',
          onPress: async () => {
            try {
              await wasteApi.delete(item.id);
              showNotification('Entry deleted and stock restored', 'success');
              fetchEntries();
              fetchGodowns();
            } catch {
              showNotification('Failed to delete entry', 'error');
            }
          },
        },
      ]
    );
  };

  const godownOptions = godowns.map(g => ({
    label: `${g.name} (Stock: ${(g.current_storage || 0).toLocaleString('en-IN')} kg)`,
    value: g.id.toString(),
  }));

  const columns = [
    { key: 'id', label: 'ID', flex: 0.4 },
    { key: 'waste_type', label: 'Machine', flex: 1.5 },
    { key: 'godown_name', label: 'Godown', flex: 1.5 },
    {
      key: 'waste_weight',
      label: 'Waste (kg)',
      flex: 1,
      render: (v) => v != null ? v.toLocaleString('en-IN') : '-',
    },
    { key: 'notes', label: 'Notes', flex: 1.2, render: (v) => v || '-' },
    {
      key: 'created_at',
      label: 'Recorded On',
      flex: 1.8,
      render: (v) => formatDate(v),
    },
  ];

  const selectedGodown = godowns.find(g => g.id.toString() === formData.godown_id);

  return (
    <Layout title="Waste Collection" navigation={navigation}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          onAdd={openAdd}
          onDelete={handleDelete}
          searchPlaceholder="Search by machine, godown..."
        />
      )}

      <Modal visible={modalVisible} onClose={closeModal} title="Record Waste Collection">
        <View style={styles.form}>
          <SelectDropdown
            label="Machine Type *"
            value={formData.waste_type}
            options={WASTE_TYPES}
            onValueChange={(v) => setFormData(prev => ({ ...prev, waste_type: v }))}
            placeholder="Select machine"
          />

          <SelectDropdown
            label="Godown *"
            value={formData.godown_id}
            options={godownOptions}
            onValueChange={(v) => setFormData(prev => ({ ...prev, godown_id: v }))}
            placeholder="Select godown"
          />

          {selectedGodown && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>
                Current stock: {(selectedGodown.current_storage || 0).toLocaleString('en-IN')} kg
              </Text>
            </View>
          )}

          <InputField
            label="Waste Weight (kg) *"
            value={formData.waste_weight}
            onChangeText={(t) => setFormData(prev => ({ ...prev, waste_weight: t }))}
            placeholder="Enter weight in kg"
            keyboardType="numeric"
          />

          <InputField
            label="Notes"
            value={formData.notes}
            onChangeText={(t) => setFormData(prev => ({ ...prev, notes: t }))}
            placeholder="Optional remarks"
            multiline
            numberOfLines={2}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This weight will be immediately subtracted from the selected godown's stock.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={closeModal}
              style={styles.cancelBtn}
              textStyle={styles.cancelBtnText}
            />
            <Button
              title={submitting ? 'Saving...' : 'Save & Deduct Stock'}
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 20,
  },
  stockBadge: {
    backgroundColor: '#EBF5FB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  stockBadgeText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F9A825',
  },
  infoText: {
    fontSize: 12,
    color: '#7B5800',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelBtnText: {
    color: '#555',
  },
  saveBtn: {
    flex: 2,
  },
});
