import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { bagSizeApi } from '../api/client';
import colors from '../theme/colors';
import { showError, showSuccess, showConfirm } from '../utils/customAlerts';
import { formatISTDate } from '../utils/dateUtils';

export default function BagSizeMasterScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ weight_kg: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await bagSizeApi.getAll();
      setItems(res.data || []);
    } catch (e) {
      showError('Failed to load bag sizes');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setFormData({ weight_kg: '', is_active: true });
    setModalVisible(true);
  };

  const openEdit = (row) => {
    setEditMode(true);
    setCurrentId(row.id);
    setFormData({
      weight_kg: row.weight_kg != null ? String(row.weight_kg) : '',
      is_active: row.is_active !== false,
    });
    setModalVisible(true);
  };

  const submit = async () => {
    const weight = parseInt(formData.weight_kg, 10);
    if (!weight || weight <= 0) {
      showError('Please enter a valid weight in kg');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { weight_kg: weight, is_active: !!formData.is_active };
      if (editMode && currentId) {
        await bagSizeApi.update(currentId, payload);
        showSuccess('Bag size updated');
      } else {
        await bagSizeApi.create(payload);
        showSuccess('Bag size added');
      }
      setModalVisible(false);
      load();
    } catch (e) {
      showError('Failed to save bag size');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await showConfirm('Delete bag size', `Delete ${row.weight_kg} kg bag size?`);
    if (!ok) return;
    try {
      await bagSizeApi.delete(row.id);
      showSuccess('Bag size deleted');
      load();
    } catch (e) {
      showError('Failed to delete bag size');
    }
  };

  const columns = [
    { label: 'Weight (kg)', field: 'weight_kg', key: 'weight_kg', flex: 1, render: (v) => (v != null ? `${v} kg` : '-') },
    { label: 'Status', field: 'is_active', key: 'is_active', flex: 1, render: (v) => (v ? 'Active' : 'Inactive') },
    { label: 'Created', field: 'created_at', key: 'created_at', flex: 1, render: (v) => (v ? formatISTDate(v) : '-') },
  ];

  return (
    <Layout title="Bag Sizes" navigation={navigation}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary || '#3b82f6'} /></View>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search bag sizes..."
        />
      )}

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title={editMode ? 'Edit Bag Size' : 'Add Bag Size'}>
        <View>
          <Text style={styles.label}>Weight (kg) *</Text>
          <TextInput
            style={styles.input}
            value={formData.weight_kg}
            onChangeText={(t) => setFormData({ ...formData, weight_kg: t.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="e.g. 25"
          />
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status</Text>
            <TouchableOpacity
              style={[styles.toggle, formData.is_active ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
            >
              <Text style={styles.toggleText}>{formData.is_active ? 'Active' : 'Inactive'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setModalVisible(false)} disabled={submitting}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={submit} disabled={submitting}>
              <Text style={styles.btnPrimaryText}>{submitting ? 'Saving...' : editMode ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  toggle: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
  toggleOn: { backgroundColor: '#10b981' },
  toggleOff: { backgroundColor: '#9ca3af' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#374151', fontWeight: '600' },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
