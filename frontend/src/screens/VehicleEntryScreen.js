import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import SelectDropdown from '../components/SelectDropdown';
import DatePicker from '../components/DatePicker';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { vehicleApi, supplierApi } from '../api/client';
import colors from '../theme/colors';
import notify from '../utils/notifications';
import { formatISTDateTime } from '../utils/dateUtils';

export default function VehicleEntryScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    supplier_id: '',
    bill_no: '',
    driver_name: '',
    driver_phone: '',
    arrival_time: new Date(),
    notes: '',
    supplier_bill_photo: null,
    vehicle_photo: null,
  });
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await vehicleApi.getAll();
      setVehicles(data);
    } catch (error) {
      notify.error('Failed to fetch vehicles');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await supplierApi.getAll();
      setSuppliers(data);
    } catch (error) {
      notify.error('Failed to fetch suppliers');
    }
  };

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('vehicle_number', formData.vehicle_number);
      formDataToSend.append('supplier_id', formData.supplier_id);
      formDataToSend.append('bill_no', formData.bill_no);
      formDataToSend.append('driver_name', formData.driver_name || '');
      formDataToSend.append('driver_phone', formData.driver_phone || '');
      formDataToSend.append('arrival_time', formData.arrival_time.toISOString());
      formDataToSend.append('notes', formData.notes || '');

      if (formData.supplier_bill_photo) {
        const billPhotoUri = formData.supplier_bill_photo.uri || formData.supplier_bill_photo;
        const billPhotoBlob = await fetch(billPhotoUri).then(r => r.blob());
        formDataToSend.append('supplier_bill_photo', billPhotoBlob, 'supplier_bill.jpg');
      }

      if (formData.vehicle_photo) {
        const vehiclePhotoUri = formData.vehicle_photo.uri || formData.vehicle_photo;
        const vehiclePhotoBlob = await fetch(vehiclePhotoUri).then(r => r.blob());
        formDataToSend.append('vehicle_photo', vehiclePhotoBlob, 'vehicle.jpg');
      }

      if (editingVehicle) {
        await vehicleApi.update(editingVehicle.id, formDataToSend);
        notify.success('Vehicle entry updated successfully');
      } else {
        await vehicleApi.create(formDataToSend);
        notify.success('Vehicle entry created successfully');
      }

      fetchVehicles();
      resetForm();
    } catch (error) {
      notify.error(error.message || 'Failed to save vehicle entry');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      supplier_id: vehicle.supplier_id,
      bill_no: vehicle.bill_no,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      arrival_time: vehicle.arrival_time ? new Date(vehicle.arrival_time) : new Date(),
      notes: vehicle.notes || '',
      supplier_bill_photo: null,
      vehicle_photo: null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (vehicle) => {
    if (confirm('Are you sure you want to delete this vehicle entry?')) {
      try {
        await vehicleApi.delete(vehicle.id);
        notify.success('Vehicle entry deleted successfully');
        fetchVehicles();
      } catch (error) {
        notify.error('Failed to delete vehicle entry');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_number: '',
      supplier_id: '',
      bill_no: '',
      driver_name: '',
      driver_phone: '',
      arrival_time: new Date(),
      notes: '',
      supplier_bill_photo: null,
      vehicle_photo: null,
    });
    setEditingVehicle(null);
    setIsModalVisible(false);
  };

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, [field]: result.assets[0] });
    }
  };

  const columns = [
    { label: 'ID', field: 'id', flex: 0.5 },
    { label: 'Vehicle Number', field: 'vehicle_number', flex: 1 },
    { 
      label: 'Supplier', 
      field: 'supplier',
      flex: 1.5,
      render: (supplier) => supplier?.supplier_name || '-'
    },
    { label: 'Bill No', field: 'bill_no', flex: 1 },
    { 
      label: 'Arrival Time', 
      field: 'arrival_time',
      flex: 1.5,
      type: 'datetime'
    },
  ];

  return (
    <Layout title="Vehicle Entry">
      <DataTable
        columns={columns}
        data={vehicles}
        onAdd={() => setIsModalVisible(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        visible={isModalVisible}
        onClose={resetForm}
        title={editingVehicle ? 'Edit Vehicle Entry' : 'New Vehicle Entry'}
      >
        <ScrollView style={styles.form}>
          <InputField
            label="Vehicle Number *"
            value={formData.vehicle_number}
            onChangeText={(text) => setFormData({ ...formData, vehicle_number: text })}
            placeholder="e.g., KA-01-AB-1234"
          />

          <SelectDropdown
            label="Supplier *"
            value={formData.supplier_id}
            onChange={(value) => setFormData({ ...formData, supplier_id: value })}
            options={suppliers.map(s => ({ label: s.supplier_name, value: s.id }))}
            placeholder="Select Supplier"
          />

          <InputField
            label="Bill Number *"
            value={formData.bill_no}
            onChangeText={(text) => setFormData({ ...formData, bill_no: text })}
            placeholder="Enter bill number"
          />

          <InputField
            label="Driver Name"
            value={formData.driver_name}
            onChangeText={(text) => setFormData({ ...formData, driver_name: text })}
            placeholder="Enter driver name"
          />

          <InputField
            label="Driver Phone"
            value={formData.driver_phone}
            onChangeText={(text) => setFormData({ ...formData, driver_phone: text })}
            placeholder="Enter phone number"
          />

          <DatePicker
            label="Arrival Time"
            value={formData.arrival_time}
            onChange={(date) => setFormData({ ...formData, arrival_time: date })}
            mode="datetime"
          />

          <InputField
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Additional notes"
            multiline
          />

          <View style={styles.imageSection}>
            <Text style={styles.label}>Supplier Bill Photo</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('supplier_bill_photo')}>
              {formData.supplier_bill_photo ? (
                <Image source={{ uri: formData.supplier_bill_photo.uri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePickerText}>+ Upload Bill Photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.label}>Vehicle Photo</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('vehicle_photo')}>
              {formData.vehicle_photo ? (
                <Image source={{ uri: formData.vehicle_photo.uri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePickerText}>+ Upload Vehicle Photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.buttonContainer, isMobile && styles.buttonContainerMobile]}>
            <Button
              title="Cancel"
              onPress={resetForm}
              variant="secondary"
              style={[styles.button, isMobile && styles.buttonMobile]}
            />
            <Button
              title={editingVehicle ? 'Update' : 'Save'}
              onPress={handleSubmit}
              style={[styles.button, isMobile && styles.buttonMobile]}
            />
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  imageSection: {
    marginBottom: 16,
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  imagePickerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonContainerMobile: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
  },
  buttonMobile: {
    width: '100%',
  },
});