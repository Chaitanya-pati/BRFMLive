import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Platform, TextInput,
} from 'react-native';
import Layout from '../components/Layout';
import { branchBillProfileApi } from '../api/client';
import { useBranch } from '../context/BranchContext';
import { showSuccess, showError } from '../utils/customAlerts';
import colors from '../theme/colors';

const FIELDS = [
  { key: 'company_name',    label: 'Company Name *', required: true },
  { key: 'address_line1',   label: 'Address Line 1' },
  { key: 'address_line2',   label: 'Address Line 2' },
  { key: 'city',            label: 'City' },
  { key: 'state',           label: 'State' },
  { key: 'state_code',      label: 'State Code (GST 2-digit)' },
  { key: 'pin_code',        label: 'PIN Code' },
  { key: 'gstin',           label: 'GSTIN / UIN' },
  { key: 'pan',             label: 'PAN' },
  { key: 'cin',             label: 'CIN' },
  { key: 'jurisdiction',    label: 'Jurisdiction (City)' },
  { key: 'phone',           label: 'Phone' },
  { key: 'email',           label: 'Email' },
  { key: 'bank_name',       label: 'Bank Name' },
  { key: 'bank_account_no', label: 'Bank Account No.' },
  { key: 'bank_ifsc',       label: 'Bank IFSC Code' },
  { key: 'bank_branch_name',label: 'Bank Branch' },
];

const EMPTY = FIELDS.reduce((a, f) => ({ ...a, [f.key]: '' }), {});

export default function BranchBillProfileScreen({ navigation }) {
  const { currentBranch } = useBranch();
  const [form, setForm]         = useState(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [exists, setExists]     = useState(false);

  const branchId = currentBranch?.id;

  const load = useCallback(async () => {
    if (!branchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await branchBillProfileApi.getByBranch(branchId);
      const p = res.data || {};
      setForm(FIELDS.reduce((a, f) => ({ ...a, [f.key]: p[f.key] ?? '' }), {}));
      setExists(true);
    } catch (e) {
      if (e?.response?.status === 404) {
        setForm(EMPTY);
        setExists(false);
      } else {
        showError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!branchId) { showError('No branch selected'); return; }
    if (!form.company_name?.trim()) { showError('Company Name is required'); return; }
    setSaving(true);
    try {
      const payload = { branch_id: branchId, ...FIELDS.reduce((a, f) => ({ ...a, [f.key]: form[f.key] || null }), {}) };
      if (exists) {
        await branchBillProfileApi.update(branchId, payload);
      } else {
        await branchBillProfileApi.upsert(payload);
        setExists(true);
      }
      showSuccess('Branch billing profile saved successfully');
    } catch (e) {
      showError(e?.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!branchId) {
    return (
      <Layout navigation={navigation} title="Branch Bill Profile">
        <View style={styles.center}>
          <Text style={styles.noData}>Please select a branch first.</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} title="Branch Bill Profile">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Billing Details — {currentBranch?.name || `Branch #${branchId}`}
          </Text>
          <Text style={styles.cardSub}>
            These details appear on Tax Invoices generated for this branch.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <>
              {FIELDS.map(f => (
                <View key={f.key} style={styles.row}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key] ?? ''}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.label}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{exists ? 'Update Profile' : 'Save Profile'}</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f7fa' },
  content:     { padding: 16, paddingBottom: 40 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noData:      { color: '#888', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.09)' },
      default: { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3 },
    }),
  },
  cardTitle:   { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  cardSub:     { fontSize: 13, color: '#666', marginBottom: 24 },
  row:         { marginBottom: 14 },
  label:       { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 10,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fafafa',
    outlineStyle: 'none',
  },
  saveBtn: {
    backgroundColor: colors.primary || '#2563eb',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
