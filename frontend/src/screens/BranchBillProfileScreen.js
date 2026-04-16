import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { branchBillProfileApi, branchesApi } from '../api/client';
import { showConfirm, showSuccess, showError } from '../utils/customAlerts';
import colors from '../theme/colors';

const EMPTY_FORM = {
  branch_id: '',
  company_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  state_code: '',
  pin_code: '',
  gstin: '',
  pan: '',
  cin: '',
  jurisdiction: '',
  phone: '',
  email: '',
  bank_name: '',
  bank_account_no: '',
  bank_ifsc: '',
  bank_branch_name: '',
};

const COLUMNS = [
  { label: 'Company Name', key: 'company_name', flex: 2.5 },
  { label: 'GSTIN',        key: 'gstin',        flex: 1.8 },
  { label: 'Phone',        key: 'phone',        flex: 1.2 },
  { label: 'City / State', key: 'city',         flex: 1.5,
    render: (_, row) => [row.city, row.state].filter(Boolean).join(', ') || '—',
  },
];

const FIELD_GROUPS = [
  {
    title: 'Company Information',
    fields: [
      { key: 'company_name',  label: 'Company Name *',        required: true },
      { key: 'address_line1', label: 'Address Line 1' },
      { key: 'address_line2', label: 'Address Line 2' },
      { key: 'city',          label: 'City' },
      { key: 'state',         label: 'State' },
      { key: 'state_code',    label: 'State Code (GST 2-digit)' },
      { key: 'pin_code',      label: 'PIN Code' },
      { key: 'jurisdiction',  label: 'Jurisdiction (City)' },
    ],
  },
  {
    title: 'Tax & Legal',
    fields: [
      { key: 'gstin', label: 'GSTIN / UIN' },
      { key: 'pan',   label: 'PAN' },
      { key: 'cin',   label: 'CIN' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email', keyboardType: 'email-address' },
    ],
  },
  {
    title: 'Bank Details',
    fields: [
      { key: 'bank_name',        label: 'Bank Name' },
      { key: 'bank_account_no',  label: 'Account Number' },
      { key: 'bank_ifsc',        label: 'IFSC Code' },
      { key: 'bank_branch_name', label: 'Bank Branch' },
    ],
  },
];

export default function BranchBillProfileScreen({ navigation }) {
  const [profiles, setProfiles]         = useState([]);
  const [branches, setBranches]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [formData, setFormData]         = useState(EMPTY_FORM);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await branchBillProfileApi.getAll();
      setProfiles(res.data || []);
    } catch (e) {
      showError('Failed to load branch bill profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchesApi.getAll();
      setBranches(res.data || []);
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    loadBranches();
  }, [loadProfiles, loadBranches]);

  const openAddModal = () => {
    setEditMode(false);
    setFormData(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (profile) => {
    setEditMode(true);
    setFormData({
      branch_id:       profile.branch_id,
      company_name:    profile.company_name    || '',
      address_line1:   profile.address_line1   || '',
      address_line2:   profile.address_line2   || '',
      city:            profile.city            || '',
      state:           profile.state           || '',
      state_code:      profile.state_code      || '',
      pin_code:        profile.pin_code        || '',
      gstin:           profile.gstin           || '',
      pan:             profile.pan             || '',
      cin:             profile.cin             || '',
      jurisdiction:    profile.jurisdiction    || '',
      phone:           profile.phone           || '',
      email:           profile.email           || '',
      bank_name:       profile.bank_name       || '',
      bank_account_no: profile.bank_account_no || '',
      bank_ifsc:       profile.bank_ifsc       || '',
      bank_branch_name:profile.bank_branch_name|| '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.branch_id) {
      showError('Please select a branch');
      return;
    }
    if (!formData.company_name?.trim()) {
      showError('Company Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        branch_id:        Number(formData.branch_id),
        company_name:     formData.company_name.trim(),
        address_line1:    formData.address_line1?.trim()    || null,
        address_line2:    formData.address_line2?.trim()    || null,
        city:             formData.city?.trim()             || null,
        state:            formData.state?.trim()            || null,
        state_code:       formData.state_code?.trim()       || null,
        pin_code:         formData.pin_code?.trim()         || null,
        gstin:            formData.gstin?.trim()            || null,
        pan:              formData.pan?.trim()              || null,
        cin:              formData.cin?.trim()              || null,
        jurisdiction:     formData.jurisdiction?.trim()     || null,
        phone:            formData.phone?.trim()            || null,
        email:            formData.email?.trim()            || null,
        bank_name:        formData.bank_name?.trim()        || null,
        bank_account_no:  formData.bank_account_no?.trim()  || null,
        bank_ifsc:        formData.bank_ifsc?.trim()        || null,
        bank_branch_name: formData.bank_branch_name?.trim() || null,
      };

      if (editMode) {
        await branchBillProfileApi.update(payload.branch_id, payload);
        showSuccess('Branch bill profile updated successfully');
      } else {
        await branchBillProfileApi.upsert(payload);
        showSuccess('Branch bill profile created successfully');
      }

      setModalVisible(false);
      await loadProfiles();
    } catch (e) {
      showError(e?.response?.data?.detail || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete the bill profile for "${profile.company_name}"?`
    );
    if (!confirmed) return;
    try {
      await branchBillProfileApi.delete(profile.branch_id);
      showSuccess('Profile deleted successfully');
      await loadProfiles();
    } catch (e) {
      showError('Failed to delete profile');
    }
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <Layout navigation={navigation} title="Branch Bill Profiles">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <DataTable
          columns={COLUMNS}
          data={profiles}
          onAdd={openAddModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? 'Edit Branch Bill Profile' : 'Add Branch Bill Profile'}
        width="75%"
      >
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
          {/* Branch Picker */}
          <Text style={styles.label}>Branch *</Text>
          {editMode ? (
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>
                {branches.find(b => b.id === Number(formData.branch_id))?.name || `Branch #${formData.branch_id}`}
              </Text>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.branch_id ? String(formData.branch_id) : ''}
                onValueChange={(v) => set('branch_id', v)}
                style={styles.picker}
              >
                <Picker.Item label="— Select Branch —" value="" />
                {branches.map(b => (
                  <Picker.Item key={b.id} label={`${b.name} (#${b.id})`} value={String(b.id)} />
                ))}
              </Picker>
            </View>
          )}

          {FIELD_GROUPS.map(group => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.grid}>
                {group.fields.map(f => (
                  <View key={f.key} style={styles.fieldWrap}>
                    <Text style={styles.label}>{f.label}</Text>
                    <TextInput
                      style={[styles.input, f.required && styles.inputRequired]}
                      value={formData[f.key]}
                      onChangeText={v => set(f.key, v)}
                      placeholder={f.label.replace(' *', '')}
                      placeholderTextColor="#aaa"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType={f.keyboardType || 'default'}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>{editMode ? 'Update Profile' : 'Save Profile'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  formScroll: { maxHeight: 520 },

  group: { marginTop: 18 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary || '#2563eb',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  fieldWrap: {
    minWidth: 200,
    flex: 1,
    marginBottom: 4,
  },

  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 7 : 9,
    fontSize: 13,
    color: '#111',
    backgroundColor: '#fafafa',
    outlineStyle: 'none',
  },
  inputRequired: { borderColor: '#93c5fd' },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#fafafa',
    marginBottom: 4,
    overflow: 'hidden',
  },
  picker: { height: 44, color: '#111' },

  readonlyBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 4,
  },
  readonlyText: { fontSize: 13, color: '#6b7280' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.primary || '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 7,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
