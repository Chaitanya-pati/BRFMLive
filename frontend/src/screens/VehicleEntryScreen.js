import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import TimePicker from '../components/TimePicker';
import { vehicleApi, supplierApi } from '../api/client';
import { showNotification } from '../utils/notifications';
import colors from '../theme/colors';

const EMPTY_FORM = {
  vehicle_state_code: '',
  vehicle_second_part: '',
  vehicle_third_part: '',
  supplier_id: '',
  bill_no: '',
  driver_name: '',
  driver_phone: '',
  arrival_time: '12-00-AM',
  empty_weight: '',
  gross_weight: '',
  notes: '',
  supplier_bill_photo: null,
  vehicle_photo_front: null,
  vehicle_photo_back: null,
  vehicle_photo_side: null,
  internal_weighment_slip: null,
  client_weighment_slip: null,
  transportation_copy: null,
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

export default function VehicleEntryScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehicleApi.getAll();
      setVehicles(res.data || []);
    } catch {
      showNotification('Failed to load gate entries', 'error');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await supplierApi.getAll();
      setSuppliers(res.data || []);
    } catch {
      showNotification('Failed to load suppliers', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingId(null);
    setIsModalVisible(false);
  };

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM });
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
      empty_weight: item.empty_weight != null ? item.empty_weight.toString() : '',
      gross_weight: item.gross_weight != null ? item.gross_weight.toString() : '',
      notes: item.notes || '',
      supplier_bill_photo: item.supplier_bill_photo ? { uri: item.supplier_bill_photo, existing: true } : null,
      vehicle_photo_front: item.vehicle_photo_front ? { uri: item.vehicle_photo_front, existing: true } : null,
      vehicle_photo_back: item.vehicle_photo_back ? { uri: item.vehicle_photo_back, existing: true } : null,
      vehicle_photo_side: item.vehicle_photo_side ? { uri: item.vehicle_photo_side, existing: true } : null,
      internal_weighment_slip: item.internal_weighment_slip ? { uri: item.internal_weighment_slip, existing: true } : null,
      client_weighment_slip: item.client_weighment_slip ? { uri: item.client_weighment_slip, existing: true } : null,
      transportation_copy: item.transportation_copy ? { uri: item.transportation_copy, existing: true } : null,
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
            fetchVehicles();
          } catch {
            showNotification('Failed to delete entry', 'error');
          }
        }
      }
    ]);
  };

  const pickImage = async (fieldName) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setFormData((prev) => ({ ...prev, [fieldName]: { uri: result.assets[0].uri } }));
      }
    } catch {
      showNotification('Failed to pick image', 'error');
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
      const fd = new FormData();
      fd.append('vehicle_number', vehicleNumber);
      fd.append('supplier_id', formData.supplier_id);
      fd.append('bill_no', formData.bill_no.trim());
      if (formData.driver_name) fd.append('driver_name', formData.driver_name);
      if (formData.driver_phone) fd.append('driver_phone', formData.driver_phone);
      if (formData.arrival_time) fd.append('arrival_time', formData.arrival_time);
      if (formData.empty_weight) fd.append('empty_weight', formData.empty_weight);
      if (formData.gross_weight) fd.append('gross_weight', formData.gross_weight);
      if (formData.notes) fd.append('notes', formData.notes);

      await appendFile(fd, 'supplier_bill_photo', formData.supplier_bill_photo, 'supplier_bill.jpg');
      await appendFile(fd, 'vehicle_photo_front', formData.vehicle_photo_front, 'front.jpg');
      await appendFile(fd, 'vehicle_photo_back', formData.vehicle_photo_back, 'back.jpg');
      await appendFile(fd, 'vehicle_photo_side', formData.vehicle_photo_side, 'side.jpg');
      await appendFile(fd, 'internal_weighment_slip', formData.internal_weighment_slip, 'internal_slip.jpg');
      await appendFile(fd, 'client_weighment_slip', formData.client_weighment_slip, 'client_slip.jpg');
      await appendFile(fd, 'transportation_copy', formData.transportation_copy, 'transport.jpg');

      if (editingId) {
        await vehicleApi.update(editingId, fd);
        showNotification('Gate entry updated successfully', 'success');
      } else {
        await vehicleApi.create(fd);
        showNotification('Gate entry created successfully', 'success');
      }
      resetForm();
      fetchVehicles();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save gate entry';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const supplierOptions = suppliers.map((s) => ({
    label: s.supplier_name,
    value: s.id.toString(),
  }));

  const columns = [
    { label: 'ID', key: 'id', flex: 0.4 },
    { label: 'Vehicle No.', key: 'vehicle_number', flex: 1.2 },
    {
      label: 'Supplier', key: 'supplier', flex: 1.5,
      render: (val) => val?.supplier_name || '-',
    },
    { label: 'Bill No', key: 'bill_no', flex: 0.8 },
    {
      label: 'Arrival Time', key: 'arrival_time', flex: 1.2,
      render: (val) => isoToDisplay(val),
    },
    {
      label: 'Empty Wt (kg)', key: 'empty_weight', flex: 1,
      render: (v) => (v != null && v !== '' ? v : '-'),
    },
    {
      label: 'Gross Wt (kg)', key: 'gross_weight', flex: 1,
      render: (v) => (v != null && v !== '' ? v : '-'),
    },
  ];

  const PhotoField = ({ label, fieldName }) => {
    const photo = formData[fieldName];
    return (
      <View style={styles.photoField}>
        <Text style={styles.photoLabel}>{label}</Text>
        <View style={styles.photoRow}>
          {photo?.uri ? (
            <Image source={{ uri: photo.uri }} style={styles.photoThumb} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>No photo</Text>
            </View>
          )}
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(fieldName)}>
            <Text style={styles.photoBtnText}>{photo?.uri ? 'Change' : 'Upload'}</Text>
          </TouchableOpacity>
          {photo?.uri && (
            <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => update(fieldName, null)}>
              <Text style={styles.photoRemoveBtnText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Layout title="Gate Entry" navigation={navigation}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search by vehicle number, supplier..."
        />
      )}

      <Modal visible={isModalVisible} onClose={resetForm} title={editingId ? 'Edit Gate Entry' : 'New Gate Entry'}>
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionHeader}>Vehicle Details</Text>

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

          <Text style={styles.sectionHeader}>Weight Information</Text>

          <View style={styles.weightRow}>
            <View style={styles.weightHalf}>
              <InputField
                label="Empty Weight (kg)"
                value={formData.empty_weight}
                onChangeText={(t) => update('empty_weight', t)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.weightHalf}>
              <InputField
                label="Gross Weight (kg)"
                value={formData.gross_weight}
                onChangeText={(t) => update('gross_weight', t)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <InputField
            label="Notes"
            value={formData.notes}
            onChangeText={(t) => update('notes', t)}
            placeholder="Any remarks..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.sectionHeader}>Document Photos</Text>

          <PhotoField label="Supplier Bill Photo" fieldName="supplier_bill_photo" />
          <PhotoField label="Internal Weighment Slip" fieldName="internal_weighment_slip" />
          <PhotoField label="Client Weighment Slip" fieldName="client_weighment_slip" />
          <PhotoField label="Transportation Copy" fieldName="transportation_copy" />

          <Text style={styles.sectionHeader}>Vehicle Photos</Text>

          <PhotoField label="Front View" fieldName="vehicle_photo_front" />
          <PhotoField label="Back View" fieldName="vehicle_photo_back" />
          <PhotoField label="Side View" fieldName="vehicle_photo_side" />

          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              onPress={resetForm}
              style={styles.cancelBtn}
              textStyle={styles.cancelBtnText}
            />
            <Button
              title={isSubmitting ? 'Saving...' : (editingId ? 'Update Entry' : 'Save Entry')}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={styles.saveBtn}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 20,
    flex: 1,
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
    alignItems: 'flex-start',
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
  weightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightHalf: { flex: 1 },
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
    gap: 10,
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
  photoBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 13,
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
});
