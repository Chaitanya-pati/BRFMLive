import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getFullImageUrl } from '../utils/imageUtils';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import TimePicker, { getCurrentTimeString } from '../components/TimePicker';
import { vehicleApi, supplierApi, labTestApi, unloadingApi } from '../api/client';
import { showNotification } from '../utils/notifications';
import colors from '../theme/colors';

const buildEmptyForm = () => ({
  vehicle_state_code: '',
  vehicle_second_part: '',
  vehicle_third_part: '',
  supplier_id: '',
  bill_no: '',
  driver_name: '',
  driver_phone: '',
  arrival_time: getCurrentTimeString(),
  supplier_bill_photo: null,
});

const EMPTY_GATEIN_FORM = {
  gross_weight: '',
  vehicle_photo_front: null,
  vehicle_photo_back: null,
  vehicle_photo_side: null,
  internal_weighment_slip: null,
  client_weighment_slip: null,
  transportation_copy: null,
};

const EMPTY_GATEOUT_FORM = {
  empty_weight: '',
  notes: '',
};

const STATUS = {
  PENDING_LAB:      { key: 'pending_lab',      label: 'Pending Lab Test',      bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' },
  PENDING_APPROVAL: { key: 'pending_approval', label: 'Lab Pending Approval',  bg: '#FFEDD5', fg: '#9A3412', dot: '#F97316' },
  PENDING_GATEIN:   { key: 'pending_gatein',   label: 'Pending Gate-In',       bg: '#DBEAFE', fg: '#1E40AF', dot: '#3B82F6' },
  PENDING_UNLOAD:   { key: 'pending_unload',   label: 'Pending Unloading',     bg: '#EDE9FE', fg: '#5B21B6', dot: '#8B5CF6' },
  PENDING_GATEOUT:  { key: 'pending_gateout',  label: 'Pending Gate-Out',      bg: '#FEF3C7', fg: '#78350F', dot: '#A16207' },
  COMPLETED:        { key: 'completed',        label: 'Completed',             bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' },
};

function isoToTimePicker(isoStr) {
  if (!isoStr) return '12-00-AM';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}-${m.toString().padStart(2, '0')}-${period}`;
}

function isoToDisplay(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

function splitVehicleNumber(vehicleNumber = '') {
  const v = vehicleNumber.toUpperCase().replace(/\s/g, '');
  return {
    vehicle_state_code: v.slice(0, 2),
    vehicle_second_part: v.slice(2, 4),
    vehicle_third_part: v.slice(4),
  };
}

function StatusPill({ status }) {
  return (
    <Text
      style={[
        pillStyles.text,
        { backgroundColor: status.bg, color: status.fg },
      ]}
      numberOfLines={1}
    >
      <Text style={{ color: status.dot }}>● </Text>
      {status.label}
    </Text>
  );
}

const pillStyles = StyleSheet.create({
  text: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});

export default function VehicleEntryScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [unloadings, setUnloadings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stage 1 entry modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(buildEmptyForm());

  // Stage 3 Gate-In modal
  const [gateInVisible, setGateInVisible] = useState(false);
  const [gateInTarget, setGateInTarget] = useState(null);
  const [gateInForm, setGateInForm] = useState({ ...EMPTY_GATEIN_FORM });

  // Stage 5 Gate-Out modal
  const [gateOutVisible, setGateOutVisible] = useState(false);
  const [gateOutTarget, setGateOutTarget] = useState(null);
  const [gateOutForm, setGateOutForm] = useState({ ...EMPTY_GATEOUT_FORM });

  // View modal
  const [viewVisible, setViewVisible] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Refresh whenever the screen comes back into focus so two devices stay in sync
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, sRes, lRes, uRes] = await Promise.all([
        vehicleApi.getAll().catch(() => ({ data: [] })),
        supplierApi.getAll().catch(() => ({ data: [] })),
        labTestApi.getAll().catch(() => ({ data: [] })),
        unloadingApi.getAll().catch(() => ({ data: [] })),
      ]);
      setVehicles(vRes.data || []);
      setSuppliers(sRes.data || []);
      setLabTests(lRes.data || []);
      setUnloadings(uRes.data || []);
    } catch {
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build status maps
  const labStatusMap = useMemo(() => {
    const m = {};
    labTests.forEach((t) => {
      const vid = t.vehicle_entry_id;
      if (!m[vid]) m[vid] = { tested: true, approved: false };
      if (t.approved === true || t.approved === 1) m[vid].approved = true;
    });
    return m;
  }, [labTests]);

  const unloadingMap = useMemo(() => {
    const m = {};
    unloadings.forEach((u) => { m[u.vehicle_entry_id] = true; });
    return m;
  }, [unloadings]);

  const getStatus = (v) => {
    const lab = labStatusMap[v.id];
    if (!lab) return STATUS.PENDING_LAB;
    if (!lab.approved) return STATUS.PENDING_APPROVAL;
    const grossDone = v.gross_weight && Number(v.gross_weight) > 0;
    if (!grossDone) return STATUS.PENDING_GATEIN;
    if (!unloadingMap[v.id]) return STATUS.PENDING_UNLOAD;
    const emptyDone = v.empty_weight && Number(v.empty_weight) > 0;
    if (!emptyDone) return STATUS.PENDING_GATEOUT;
    return STATUS.COMPLETED;
  };

  // ----- Stage 1 (Entry) handlers -----
  const resetEntryForm = () => {
    setFormData(buildEmptyForm());
    setEditingId(null);
    setIsModalVisible(false);
  };

  const openAdd = () => {
    setFormData(buildEmptyForm());
    setEditingId(null);
    setIsModalVisible(true);
  };

  const openEdit = (item) => {
    const parts = splitVehicleNumber(item.vehicle_number || '');
    setFormData({
      vehicle_state_code: parts.vehicle_state_code,
      vehicle_second_part: parts.vehicle_second_part,
      vehicle_third_part: parts.vehicle_third_part,
      supplier_id: item.supplier_id ? item.supplier_id.toString() : '',
      bill_no: item.bill_no || '',
      driver_name: item.driver_name || '',
      driver_phone: item.driver_phone || '',
      arrival_time: isoToTimePicker(item.arrival_time),
      supplier_bill_photo: item.supplier_bill_photo
        ? { uri: item.supplier_bill_photo, existing: true }
        : null,
    });
    setEditingId(item.id);
    setIsModalVisible(true);
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Entry', `Delete vehicle entry for ${item.vehicle_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await vehicleApi.delete(item.id);
            showNotification('Entry deleted', 'success');
            fetchAll();
          } catch {
            showNotification('Failed to delete entry', 'error');
          }
        }
      }
    ]);
  };

  // Universal photo picker — gallery
  const pickImageInto = async (setter, fieldName) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setter((prev) => ({ ...prev, [fieldName]: { uri: result.assets[0].uri } }));
      }
    } catch {
      showNotification('Failed to pick image', 'error');
    }
  };

  // Universal photo capture — camera
  const capturePhotoInto = async (setter, fieldName) => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showNotification('Camera permission is required', 'error');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setter((prev) => ({ ...prev, [fieldName]: { uri: result.assets[0].uri } }));
      }
    } catch {
      showNotification('Failed to capture image', 'error');
    }
  };

  const appendFile = async (fd, fieldName, fileObj, fileName) => {
    if (!fileObj || fileObj.existing) return;
    if (Platform.OS === 'web') {
      const blob = await fetch(fileObj.uri).then((r) => r.blob());
      fd.append(fieldName, blob, fileName);
    } else {
      fd.append(fieldName, { uri: fileObj.uri, type: 'image/jpeg', name: fileName });
    }
  };

  // Re-fetch the latest server copy of a vehicle right before we PUT it back.
  // This is what keeps two devices in sync — if user A on Device 1 just saved
  // Gate-In, user B on Device 2 will read the fresh row before sending Gate-Out
  // and therefore won't accidentally wipe A's gross_weight / photos.
  const getFreshVehicle = async (id, fallback) => {
    try {
      const res = await vehicleApi.getById(id);
      return res?.data || fallback;
    } catch {
      return fallback;
    }
  };

  // Stage 1 submit. Preserves gate-in/gate-out values from existing record on edit.
  const handleSubmit = async () => {
    const vehicleNumber = (
      formData.vehicle_state_code + formData.vehicle_second_part + formData.vehicle_third_part
    ).trim().toUpperCase();

    if (!vehicleNumber) {
      showNotification('Please enter a vehicle number', 'error');
      return;
    }
    if (!formData.supplier_id) {
      showNotification('Please select a supplier', 'error');
      return;
    }
    if (!formData.bill_no.trim()) {
      showNotification('Please enter a bill number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pull the freshest copy from the server so concurrent gate-in/out work
      // performed on another device isn't overwritten by stale local state.
      const editingVehicle = editingId
        ? await getFreshVehicle(editingId, vehicles.find((v) => v.id === editingId))
        : null;

      const fd = new FormData();
      fd.append('vehicle_number', vehicleNumber);
      fd.append('supplier_id', formData.supplier_id);
      fd.append('bill_no', formData.bill_no.trim());
      if (formData.driver_name) fd.append('driver_name', formData.driver_name);
      if (formData.driver_phone) fd.append('driver_phone', formData.driver_phone);
      if (formData.arrival_time) fd.append('arrival_time', formData.arrival_time);

      // Preserve existing gate-in/out values when editing so they don't get reset to 0
      if (editingVehicle) {
        if (editingVehicle.gross_weight && Number(editingVehicle.gross_weight) > 0) {
          fd.append('gross_weight', String(editingVehicle.gross_weight));
        }
        if (editingVehicle.empty_weight && Number(editingVehicle.empty_weight) > 0) {
          fd.append('empty_weight', String(editingVehicle.empty_weight));
        }
        if (editingVehicle.notes) fd.append('notes', editingVehicle.notes);
      }

      await appendFile(fd, 'supplier_bill_photo', formData.supplier_bill_photo, 'supplier_bill.jpg');

      if (editingId) {
        await vehicleApi.update(editingId, fd);
        showNotification('Vehicle entry updated', 'success');
      } else {
        await vehicleApi.create(fd);
        showNotification('Vehicle entry created', 'success');
      }
      resetEntryForm();
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save vehicle entry';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- Stage 3 (Gate-In) handlers -----
  const openGateIn = (item) => {
    setGateInTarget(item);
    setGateInForm({
      gross_weight: item.gross_weight && Number(item.gross_weight) > 0
        ? String(item.gross_weight) : '',
      vehicle_photo_front: item.vehicle_photo_front
        ? { uri: item.vehicle_photo_front, existing: true } : null,
      vehicle_photo_back: item.vehicle_photo_back
        ? { uri: item.vehicle_photo_back, existing: true } : null,
      vehicle_photo_side: item.vehicle_photo_side
        ? { uri: item.vehicle_photo_side, existing: true } : null,
      internal_weighment_slip: item.internal_weighment_slip
        ? { uri: item.internal_weighment_slip, existing: true } : null,
      client_weighment_slip: item.client_weighment_slip
        ? { uri: item.client_weighment_slip, existing: true } : null,
      transportation_copy: item.transportation_copy
        ? { uri: item.transportation_copy, existing: true } : null,
    });
    setGateInVisible(true);
  };

  const submitGateIn = async () => {
    if (!gateInTarget) return;
    if (!gateInForm.gross_weight || Number(gateInForm.gross_weight) <= 0) {
      showNotification('Please enter the gross (loaded) weight', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      // Always pull the freshest server copy first so we don't clobber another
      // device's edits to non-Gate-In fields (driver, bill, notes, etc.).
      const v = await getFreshVehicle(gateInTarget.id, gateInTarget);
      const fd = new FormData();
      // Required fields the PUT endpoint demands
      fd.append('vehicle_number', v.vehicle_number);
      fd.append('supplier_id', String(v.supplier_id));
      fd.append('bill_no', v.bill_no || '');
      // Preserve other Stage 1 fields
      if (v.driver_name) fd.append('driver_name', v.driver_name);
      if (v.driver_phone) fd.append('driver_phone', v.driver_phone);
      if (v.arrival_time) fd.append('arrival_time', isoToTimePicker(v.arrival_time));
      if (v.notes) fd.append('notes', v.notes);
      // Preserve empty_weight (may already be set if user re-opens this stage)
      if (v.empty_weight && Number(v.empty_weight) > 0) {
        fd.append('empty_weight', String(v.empty_weight));
      }

      // New gate-in payload
      fd.append('gross_weight', gateInForm.gross_weight);

      await appendFile(fd, 'vehicle_photo_front', gateInForm.vehicle_photo_front, 'front.jpg');
      await appendFile(fd, 'vehicle_photo_back', gateInForm.vehicle_photo_back, 'back.jpg');
      await appendFile(fd, 'vehicle_photo_side', gateInForm.vehicle_photo_side, 'side.jpg');
      await appendFile(fd, 'internal_weighment_slip', gateInForm.internal_weighment_slip, 'internal_slip.jpg');
      await appendFile(fd, 'client_weighment_slip', gateInForm.client_weighment_slip, 'client_slip.jpg');
      await appendFile(fd, 'transportation_copy', gateInForm.transportation_copy, 'transport.jpg');

      await vehicleApi.update(v.id, fd);
      showNotification('Gate-In recorded successfully', 'success');
      setGateInVisible(false);
      setGateInTarget(null);
      setGateInForm({ ...EMPTY_GATEIN_FORM });
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save Gate-In';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- Stage 5 (Gate-Out) handlers -----
  const openGateOut = (item) => {
    setGateOutTarget(item);
    setGateOutForm({
      empty_weight: item.empty_weight && Number(item.empty_weight) > 0
        ? String(item.empty_weight) : '',
      notes: item.notes || '',
    });
    setGateOutVisible(true);
  };

  const submitGateOut = async () => {
    if (!gateOutTarget) return;
    if (!gateOutForm.empty_weight || Number(gateOutForm.empty_weight) <= 0) {
      showNotification('Please enter the empty (after-unloading) weight', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      // Re-fetch first so we always carry the freshest gross_weight + driver
      // info forward, even if a different device just updated this row.
      const v = await getFreshVehicle(gateOutTarget.id, gateOutTarget);
      if (!v.gross_weight || Number(v.gross_weight) <= 0) {
        showNotification('Cannot record Gate-Out before Gate-In is completed', 'error');
        setIsSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append('vehicle_number', v.vehicle_number);
      fd.append('supplier_id', String(v.supplier_id));
      fd.append('bill_no', v.bill_no || '');
      if (v.driver_name) fd.append('driver_name', v.driver_name);
      if (v.driver_phone) fd.append('driver_phone', v.driver_phone);
      if (v.arrival_time) fd.append('arrival_time', isoToTimePicker(v.arrival_time));
      // Preserve gross weight from Stage 3
      if (v.gross_weight && Number(v.gross_weight) > 0) {
        fd.append('gross_weight', String(v.gross_weight));
      }

      // New gate-out payload
      fd.append('empty_weight', gateOutForm.empty_weight);
      fd.append('notes', gateOutForm.notes || '');

      await vehicleApi.update(v.id, fd);
      showNotification('Gate-Out recorded successfully', 'success');
      setGateOutVisible(false);
      setGateOutTarget(null);
      setGateOutForm({ ...EMPTY_GATEOUT_FORM });
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save Gate-Out';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- View handler -----
  const openView = (item) => {
    setViewTarget(item);
    setViewVisible(true);
  };

  const update = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));
  const updateGateIn = (key, val) => setGateInForm((prev) => ({ ...prev, [key]: val }));
  const updateGateOut = (key, val) => setGateOutForm((prev) => ({ ...prev, [key]: val }));

  const supplierOptions = suppliers.map((s) => ({
    label: s.supplier_name,
    value: s.id.toString(),
  }));

  const columns = [
    { label: 'ID', key: 'id', flex: 0.4 },
    { label: 'Vehicle No.', key: 'vehicle_number', flex: 1.2 },
    {
      label: 'Supplier', key: 'supplier', flex: 1.4,
      render: (val) => val?.supplier_name || '-',
    },
    { label: 'Bill No', key: 'bill_no', flex: 0.8 },
    {
      label: 'Arrival', key: 'arrival_time', flex: 1,
      render: (val) => isoToDisplay(val),
    },
    {
      label: 'Status', key: 'id', flex: 1.6,
      render: (_v, row) => <StatusPill status={getStatus(row)} />,
    },
  ];

  // Custom row actions based on stage
  const renderActions = (row) => {
    const status = getStatus(row);
    return (
      <View style={actionStyles.row}>
        <TouchableOpacity style={[actionStyles.btn, actionStyles.viewBtn]} onPress={() => openView(row)}>
          <Text style={actionStyles.viewText}>View</Text>
        </TouchableOpacity>

        {status.key === STATUS.PENDING_GATEIN.key && (
          <TouchableOpacity style={[actionStyles.btn, actionStyles.gateInBtn]} onPress={() => openGateIn(row)}>
            <Text style={actionStyles.primaryText}>Gate-In</Text>
          </TouchableOpacity>
        )}

        {status.key === STATUS.PENDING_GATEOUT.key && (
          <TouchableOpacity style={[actionStyles.btn, actionStyles.gateOutBtn]} onPress={() => openGateOut(row)}>
            <Text style={actionStyles.primaryText}>Gate-Out</Text>
          </TouchableOpacity>
        )}

        {(status.key === STATUS.PENDING_LAB.key || status.key === STATUS.PENDING_APPROVAL.key) && (
          <TouchableOpacity style={[actionStyles.btn, actionStyles.editBtn]} onPress={() => openEdit(row)}>
            <Text style={actionStyles.editText}>Edit</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[actionStyles.btn, actionStyles.delBtn]} onPress={() => handleDelete(row)}>
          <Text style={actionStyles.delText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Reusable PhotoField that operates on any (form, setForm) pair
  const PhotoField = ({ label, fieldName, form, setForm }) => {
    const photo = form[fieldName];
    const displayUri = photo?.uri
      ? (photo.existing ? getFullImageUrl(photo.uri) : photo.uri)
      : null;
    return (
      <View style={styles.photoField}>
        <Text style={styles.photoLabel}>{label}</Text>
        <View style={styles.photoRow}>
          {displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.photoThumb} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>No photo</Text>
            </View>
          )}
          <TouchableOpacity style={styles.photoCameraBtn} onPress={() => capturePhotoInto(setForm, fieldName)}>
            <Text style={styles.photoBtnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImageInto(setForm, fieldName)}>
            <Text style={styles.photoBtnText}>{displayUri ? '🖼 Change' : '🖼 Gallery'}</Text>
          </TouchableOpacity>
          {displayUri && (
            <TouchableOpacity
              style={styles.photoRemoveBtn}
              onPress={() => setForm((prev) => ({ ...prev, [fieldName]: null }))}
            >
              <Text style={styles.photoRemoveBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Layout title="Vehicle Entry" navigation={navigation}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          onAdd={openAdd}
          renderActions={renderActions}
          searchPlaceholder="Search by vehicle number, supplier..."
        />
      )}

      {/* Stage 1 — Vehicle Arrival */}
      <Modal
        visible={isModalVisible}
        onClose={resetEntryForm}
        title={editingId ? 'Edit Vehicle Entry' : 'New Vehicle Entry'}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.stageHint}>
            Step 1 of 5 · Capture truck arrival. Lab Test, Gate-In, Unloading and Gate-Out
            happen in later steps from this list.
          </Text>

          <Text style={styles.sectionHeader}>Vehicle Number</Text>

          <View style={styles.vehicleRow}>
            <View style={styles.vPart1}>
              <InputField
                label="State Code *"
                value={formData.vehicle_state_code}
                onChangeText={(t) => update('vehicle_state_code', t.toUpperCase())}
                placeholder="MH"
                maxLength={2}
              />
            </View>
            <View style={styles.vPart2}>
              <InputField
                label="District *"
                value={formData.vehicle_second_part}
                onChangeText={(t) => update('vehicle_second_part', t.toUpperCase())}
                placeholder="09"
                maxLength={2}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.vPart3}>
              <InputField
                label="Series + Number *"
                value={formData.vehicle_third_part}
                onChangeText={(t) => update('vehicle_third_part', t.toUpperCase())}
                placeholder="EL7297"
                maxLength={8}
              />
            </View>
          </View>

          {(formData.vehicle_state_code || formData.vehicle_second_part || formData.vehicle_third_part) && (
            <Text style={styles.vehiclePreview}>
              Vehicle Number: {(formData.vehicle_state_code + formData.vehicle_second_part + formData.vehicle_third_part).toUpperCase()}
            </Text>
          )}

          <Text style={styles.sectionHeader}>Entry Information</Text>

          <SelectDropdown
            label="Supplier *"
            value={formData.supplier_id}
            options={supplierOptions}
            onValueChange={(v) => update('supplier_id', v)}
            placeholder="Select supplier"
          />

          <InputField
            label="Bill Number *"
            value={formData.bill_no}
            onChangeText={(t) => update('bill_no', t)}
            placeholder="e.g. FY26-545"
          />

          <TimePicker
            label="Arrival Time"
            value={formData.arrival_time}
            onValueChange={(v) => update('arrival_time', v)}
          />

          <Text style={styles.sectionHeader}>Driver Details</Text>

          <InputField
            label="Driver Name"
            value={formData.driver_name}
            onChangeText={(t) => update('driver_name', t)}
            placeholder="Enter driver name"
          />
          <InputField
            label="Driver Phone"
            value={formData.driver_phone}
            onChangeText={(t) => update('driver_phone', t)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <Text style={styles.sectionHeader}>Document</Text>

          <PhotoField
            label="Supplier Bill Photo"
            fieldName="supplier_bill_photo"
            form={formData}
            setForm={setFormData}
          />

          <View style={styles.buttonRow}>
            <Button title="Cancel" onPress={resetEntryForm} style={styles.cancelBtn} textStyle={styles.cancelBtnText} />
            <Button
              title={isSubmitting ? 'Saving...' : (editingId ? 'Update Entry' : 'Save & Send to Lab')}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={styles.saveBtn}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Stage 3 — Gate-In */}
      <Modal
        visible={gateInVisible}
        onClose={() => { setGateInVisible(false); setGateInTarget(null); }}
        title="Gate-In · Loaded Vehicle"
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.stageHint}>
            Step 3 of 5 · Capture loaded weight, vehicle photos and weighment paperwork
            as the vehicle enters the premises.
          </Text>

          {gateInTarget && (
            <View style={styles.contextCard}>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Vehicle: </Text>
                {gateInTarget.vehicle_number}
              </Text>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Supplier: </Text>
                {gateInTarget.supplier?.supplier_name || '-'}
              </Text>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Bill: </Text>
                {gateInTarget.bill_no || '-'}
              </Text>
            </View>
          )}

          <Text style={styles.sectionHeader}>Loaded Weight</Text>
          <InputField
            label="Gross Weight (kg) *"
            value={gateInForm.gross_weight}
            onChangeText={(t) => updateGateIn('gross_weight', t)}
            placeholder="e.g. 24500"
            keyboardType="numeric"
          />

          <Text style={styles.sectionHeader}>Vehicle Photos</Text>
          <PhotoField label="Front View" fieldName="vehicle_photo_front" form={gateInForm} setForm={setGateInForm} />
          <PhotoField label="Back View" fieldName="vehicle_photo_back" form={gateInForm} setForm={setGateInForm} />
          <PhotoField label="Side View" fieldName="vehicle_photo_side" form={gateInForm} setForm={setGateInForm} />

          <Text style={styles.sectionHeader}>Weighment & Transport Documents</Text>
          <PhotoField label="Internal Weighment Slip" fieldName="internal_weighment_slip" form={gateInForm} setForm={setGateInForm} />
          <PhotoField label="Client Weighment Slip" fieldName="client_weighment_slip" form={gateInForm} setForm={setGateInForm} />
          <PhotoField label="Transportation Copy" fieldName="transportation_copy" form={gateInForm} setForm={setGateInForm} />

          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={() => { setGateInVisible(false); setGateInTarget(null); }}
              style={styles.cancelBtn}
              textStyle={styles.cancelBtnText}
            />
            <Button
              title={isSubmitting ? 'Saving...' : 'Confirm Gate-In'}
              onPress={submitGateIn}
              disabled={isSubmitting}
              style={styles.saveBtn}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Stage 5 — Gate-Out */}
      <Modal
        visible={gateOutVisible}
        onClose={() => { setGateOutVisible(false); setGateOutTarget(null); }}
        title="Gate-Out · Empty Vehicle"
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.stageHint}>
            Step 5 of 5 · Capture empty truck weight after unloading and any closing remarks.
          </Text>

          {gateOutTarget && (
            <View style={styles.contextCard}>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Vehicle: </Text>
                {gateOutTarget.vehicle_number}
              </Text>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Supplier: </Text>
                {gateOutTarget.supplier?.supplier_name || '-'}
              </Text>
              <Text style={styles.contextLine}>
                <Text style={styles.contextLabel}>Gross Weight (loaded): </Text>
                {gateOutTarget.gross_weight ? `${gateOutTarget.gross_weight} kg` : '-'}
              </Text>
              {gateOutForm.empty_weight && Number(gateOutForm.empty_weight) > 0 && gateOutTarget.gross_weight && (
                <Text style={[styles.contextLine, styles.netLine]}>
                  <Text style={styles.contextLabel}>Net Weight: </Text>
                  {(Number(gateOutTarget.gross_weight) - Number(gateOutForm.empty_weight)).toFixed(2)} kg
                </Text>
              )}
            </View>
          )}

          <Text style={styles.sectionHeader}>Final Vehicle Data</Text>
          <InputField
            label="Empty Weight (kg) *"
            value={gateOutForm.empty_weight}
            onChangeText={(t) => updateGateOut('empty_weight', t)}
            placeholder="e.g. 8200"
            keyboardType="numeric"
          />
          <InputField
            label="Closing Notes"
            value={gateOutForm.notes}
            onChangeText={(t) => updateGateOut('notes', t)}
            placeholder="Any remarks at exit..."
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={() => { setGateOutVisible(false); setGateOutTarget(null); }}
              style={styles.cancelBtn}
              textStyle={styles.cancelBtnText}
            />
            <Button
              title={isSubmitting ? 'Saving...' : 'Confirm Gate-Out'}
              onPress={submitGateOut}
              disabled={isSubmitting}
              style={styles.saveBtn}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* View / Summary */}
      <Modal
        visible={viewVisible}
        onClose={() => { setViewVisible(false); setViewTarget(null); }}
        title="Vehicle Entry Summary"
      >
        {viewTarget && (
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 12 }}>
              <StatusPill status={getStatus(viewTarget)} />
            </View>

            <Text style={styles.sectionHeader}>Stage 1 · Arrival</Text>
            <SummaryRow label="Vehicle Number" value={viewTarget.vehicle_number} />
            <SummaryRow label="Supplier" value={viewTarget.supplier?.supplier_name || '-'} />
            <SummaryRow label="Bill No" value={viewTarget.bill_no || '-'} />
            <SummaryRow label="Driver" value={viewTarget.driver_name || '-'} />
            <SummaryRow label="Driver Phone" value={viewTarget.driver_phone || '-'} />
            <SummaryRow label="Arrival Time" value={isoToDisplay(viewTarget.arrival_time)} />

            <Text style={styles.sectionHeader}>Stage 2 · Lab Test</Text>
            <SummaryRow
              label="Lab Status"
              value={
                labStatusMap[viewTarget.id]?.approved ? 'Approved'
                  : labStatusMap[viewTarget.id]?.tested ? 'Tested · awaiting approval'
                  : 'Not tested yet'
              }
            />

            <Text style={styles.sectionHeader}>Stage 3 · Gate-In</Text>
            <SummaryRow
              label="Gross Weight"
              value={viewTarget.gross_weight && Number(viewTarget.gross_weight) > 0 ? `${viewTarget.gross_weight} kg` : '-'}
            />

            <Text style={styles.sectionHeader}>Stage 4 · Unloading</Text>
            <SummaryRow
              label="Unloading"
              value={unloadingMap[viewTarget.id] ? 'Recorded' : 'Not yet recorded'}
            />

            <Text style={styles.sectionHeader}>Stage 5 · Gate-Out</Text>
            <SummaryRow
              label="Empty Weight"
              value={viewTarget.empty_weight && Number(viewTarget.empty_weight) > 0 ? `${viewTarget.empty_weight} kg` : '-'}
            />
            {viewTarget.gross_weight && viewTarget.empty_weight &&
              Number(viewTarget.gross_weight) > 0 && Number(viewTarget.empty_weight) > 0 && (
              <SummaryRow
                label="Net Weight"
                value={`${(Number(viewTarget.gross_weight) - Number(viewTarget.empty_weight)).toFixed(2)} kg`}
              />
            )}
            <SummaryRow label="Notes" value={viewTarget.notes || '-'} />

            <View style={styles.buttonRow}>
              <Button
                title="Close"
                onPress={() => { setViewVisible(false); setViewTarget(null); }}
                style={styles.saveBtn}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </Modal>
    </Layout>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  viewBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  viewText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600' },
  editBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  editText: { color: '#047857', fontSize: 12, fontWeight: '600' },
  gateInBtn: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  gateOutBtn: {
    backgroundColor: '#A16207',
    borderColor: '#A16207',
  },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  delBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  delText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
});

const styles = StyleSheet.create({
  form: {
    padding: 20,
    flex: 1,
  },
  stageHint: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 8,
    lineHeight: 17,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E8E8E8',
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  vPart1: { flex: 1 },
  vPart2: { flex: 1 },
  vPart3: { flex: 2 },
  vehiclePreview: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  contextCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  contextLine: { fontSize: 13, color: '#1F2937' },
  contextLabel: { fontWeight: '700', color: '#475569' },
  netLine: { marginTop: 4, color: '#065F46', fontWeight: '600' },
  photoField: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: 72,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  photoPlaceholder: {
    width: 72,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 10,
    color: '#999',
  },
  photoCameraBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  photoRemoveBtn: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoRemoveBtnText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1.4,
    textAlign: 'right',
  },
});
