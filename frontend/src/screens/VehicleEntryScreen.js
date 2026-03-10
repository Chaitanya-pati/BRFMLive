import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions, Alert } from 'react-native';
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
import { getFullImageUrl } from '../utils/imageUtils';
import { useFormSubmission } from '../utils/useFormSubmission';
import colors from '../theme/colors';

export default function VehicleEntryScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [formData, setFormData] = useState({
    vehicle_state_code: "",
    vehicle_second_part: "",
    vehicle_third_part: "",
    supplier_id: "",
    bill_no: "",
    driver_name: "",
    driver_phone: "",
    arrival_time: "12-00-AM",
    empty_weight: "",
    gross_weight: "",
    notes: "",
    supplier_bill_photo: null,
    vehicle_photo_front: null,
    vehicle_photo_back: null,
    vehicle_photo_side: null,
    internal_weighment_slip: null,
    client_weighment_slip: null,
    transportation_copy: null,
  });

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
    } catch (error) {
      showNotification("Failed to load gate entries", "error");
      setVehicles([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierApi.getAll();
      setSuppliers(response.data || []);
    } catch (error) {
      showNotification("Failed to load suppliers", "error");
      setSuppliers([]);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_state_code: "",
      vehicle_second_part: "",
      vehicle_third_part: "",
      supplier_id: "",
      bill_no: "",
      driver_name: "",
      driver_phone: "",
      arrival_time: "12-00-AM",
      empty_weight: "",
      gross_weight: "",
      notes: "",
      supplier_bill_photo: null,
      vehicle_photo_front: null,
      vehicle_photo_back: null,
      vehicle_photo_side: null,
      internal_weighment_slip: null,
      client_weighment_slip: null,
      transportation_copy: null,
    });
    setEditingVehicle(null);
    setIsModalVisible(false);
  };

  const columns = [
    { label: "ID", field: "id", flex: 0.5, key: "id" },
    { label: "Vehicle Number", field: "vehicle_number", flex: 1, key: "vehicle_number" },
    {
      label: "Supplier",
      field: "supplier",
      flex: 1.5,
      key: "supplier",
      render: (supplier) => supplier?.supplier_name || "-",
    },
    { label: "Bill No", field: "bill_no", flex: 1, key: "bill_no" },
    {
      label: "Arrival Time",
      field: "arrival_time",
      flex: 1.8,
      key: "arrival_time",
      render: (value) => {
        if (!value || typeof value !== 'string') return "-";
        const parts = value.split('-');
        return parts.length === 3 ? `${parts[0]}:${parts[1]} ${parts[2]}` : value;
      }
    },
  ];

  return (
    <Layout title="Vehicle Entry">
      <DataTable
        columns={columns}
        data={vehicles}
        onAdd={() => setIsModalVisible(true)}
        onEdit={(v) => { setEditingVehicle(v); setIsModalVisible(true); }}
        onDelete={() => {}}
      />
      <Modal visible={isModalVisible} onClose={resetForm} title="Vehicle Entry">
        <ScrollView style={{padding: 16}}>
          <InputField label="Bill Number" value={formData.bill_no} onChangeText={(t) => setFormData({...formData, bill_no: t})} />
          <Button title="Save" onPress={() => setIsModalVisible(false)} />
        </ScrollView>
      </Modal>
    </Layout>
  );
}
