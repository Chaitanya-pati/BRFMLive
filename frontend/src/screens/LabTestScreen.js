import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { vehicleApi, labTestApi } from '../api/client';

export default function LabTestScreen({ navigation }) {
  const [labTests, setLabTests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_entry_id: '',
    test_date: new Date(),
    moisture: '',
    test_weight: '',
    protein_percent: '',
    wet_gluten: '',
    dry_gluten: '',
    falling_number: '',
    chaff_husk: '',
    straws_sticks: '',
    other_foreign_matter: '',
    mudballs: '',
    stones: '',
    dust_sand: '',
    total_impurities: '0.00',
    shriveled_wheat: '',
    insect_damage: '',
    blackened_wheat: '',
    sprouted_grains: '',
    other_grain_damage: '',
    total_dockage: '0.00',
    remarks: '',
    tested_by: '',
  });

  useEffect(() => {
    loadLabTests();
    loadVehicles();
  }, []);

  useEffect(() => {
    calculateTotalImpurities();
  }, [
    formData.chaff_husk,
    formData.straws_sticks,
    formData.other_foreign_matter,
    formData.mudballs,
    formData.stones,
    formData.dust_sand,
  ]);

  useEffect(() => {
    calculateTotalDockage();
  }, [
    formData.shriveled_wheat,
    formData.insect_damage,
    formData.blackened_wheat,
    formData.sprouted_grains,
    formData.other_grain_damage,
  ]);

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadLabTests = async () => {
    try {
      const response = await labTestApi.getAll();
      setLabTests(response.data);
    } catch (error) {
      console.error('Error loading lab tests:', error);
    }
  };

  const calculateTotalImpurities = () => {
    const impurities = [
      formData.chaff_husk,
      formData.straws_sticks,
      formData.other_foreign_matter,
      formData.mudballs,
      formData.stones,
      formData.dust_sand,
    ];

    const total = impurities.reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);

    setFormData((prev) => ({ ...prev, total_impurities: total.toFixed(2) }));
  };

  const calculateTotalDockage = () => {
    const dockage = [
      formData.shriveled_wheat,
      formData.insect_damage,
      formData.blackened_wheat,
      formData.sprouted_grains,
      formData.other_grain_damage,
    ];

    const total = dockage.reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);

    setFormData((prev) => ({ ...prev, total_dockage: total.toFixed(2) }));
  };

  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setSelectedVehicle(vehicle);
    setFormData({ ...formData, vehicle_entry_id: vehicleId });
  };

  const openAddModal = () => {
    setFormData({
      vehicle_entry_id: '',
      test_date: new Date(),
      moisture: '',
      test_weight: '',
      protein_percent: '',
      wet_gluten: '',
      dry_gluten: '',
      falling_number: '',
      chaff_husk: '',
      straws_sticks: '',
      other_foreign_matter: '',
      mudballs: '',
      stones: '',
      dust_sand: '',
      total_impurities: '0.00',
      shriveled_wheat: '',
      insect_damage: '',
      blackened_wheat: '',
      sprouted_grains: '',
      other_grain_damage: '',
      total_dockage: '0.00',
      remarks: '',
      tested_by: '',
    });
    setSelectedVehicle(null);
    setModalVisible(true);
  };

  const openEditModal = (labTest) => {
    setFormData({
      vehicle_entry_id: labTest.vehicle_entry_id || '',
      test_date: labTest.test_date ? new Date(labTest.test_date) : new Date(),
      moisture: labTest.moisture?.toString() || '',
      test_weight: labTest.test_weight?.toString() || '',
      protein_percent: labTest.protein_percent?.toString() || '',
      wet_gluten: labTest.wet_gluten?.toString() || '',
      dry_gluten: labTest.dry_gluten?.toString() || '',
      falling_number: labTest.falling_number?.toString() || '',
      chaff_husk: labTest.chaff_husk?.toString() || '',
      straws_sticks: labTest.straws_sticks?.toString() || '',
      other_foreign_matter: labTest.other_foreign_matter?.toString() || '',
      mudballs: labTest.mudballs?.toString() || '',
      stones: labTest.stones?.toString() || '',
      dust_sand: labTest.dust_sand?.toString() || '',
      total_impurities: labTest.total_impurities?.toString() || '0.00',
      shriveled_wheat: labTest.shriveled_wheat?.toString() || '',
      insect_damage: labTest.insect_damage?.toString() || '',
      blackened_wheat: labTest.blackened_wheat?.toString() || '',
      sprouted_grains: labTest.sprouted_grains?.toString() || '',
      other_grain_damage: labTest.other_grain_damage?.toString() || '',
      total_dockage: labTest.total_dockage?.toString() || '0.00',
      remarks: labTest.remarks || '',
      tested_by: labTest.tested_by || '',
    });
    const vehicle = vehicles.find((v) => v.id === labTest.vehicle_entry_id);
    setSelectedVehicle(vehicle);
    setModalVisible(true);
  };

  const handleDelete = async (labTest) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete lab test #${labTest.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await labTestApi.delete(labTest.id);
              Alert.alert('Success', 'Lab test deleted successfully');
              loadLabTests();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete lab test');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, test_date: selectedDate });
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_entry_id) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        moisture: parseFloat(formData.moisture) || null,
        test_weight: parseFloat(formData.test_weight) || null,
        protein_percent: parseFloat(formData.protein_percent) || null,
        wet_gluten: parseFloat(formData.wet_gluten) || null,
        dry_gluten: parseFloat(formData.dry_gluten) || null,
        falling_number: parseInt(formData.falling_number) || null,
        chaff_husk: parseFloat(formData.chaff_husk) || null,
        straws_sticks: parseFloat(formData.straws_sticks) || null,
        other_foreign_matter: parseFloat(formData.other_foreign_matter) || null,
        mudballs: parseFloat(formData.mudballs) || null,
        stones: parseFloat(formData.stones) || null,
        dust_sand: parseFloat(formData.dust_sand) || null,
        total_impurities: parseFloat(formData.total_impurities) || null,
        shriveled_wheat: parseFloat(formData.shriveled_wheat) || null,
        insect_damage: parseFloat(formData.insect_damage) || null,
        blackened_wheat: parseFloat(formData.blackened_wheat) || null,
        sprouted_grains: parseFloat(formData.sprouted_grains) || null,
        other_grain_damage: parseFloat(formData.other_grain_damage) || null,
        total_dockage: parseFloat(formData.total_dockage) || null,
        test_date: formData.test_date.toISOString(),
      };

      await labTestApi.create(submitData);
      Alert.alert('Success', 'Lab test created successfully');
      
      setModalVisible(false);
      loadLabTests();
    } catch (error) {
      Alert.alert('Error', 'Failed to create lab test');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const NumberInput = ({ label, value, field, unit = '%' }) => (
    <View style={styles.numberInputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWithUnit}>
        <TextInput
          style={[styles.input, styles.numberInput]}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );

  const columns = [
    { label: 'ID', field: 'id', width: 80 },
    { 
      label: 'Vehicle', 
      field: 'vehicle_entry', 
      width: 150,
      render: (vehicle) => vehicle?.vehicle_number || '-'
    },
    { 
      label: 'Supplier', 
      field: 'vehicle_entry', 
      width: 180,
      render: (vehicle) => vehicle?.supplier?.supplier_name || '-'
    },
    { 
      label: 'Bill No', 
      field: 'vehicle_entry', 
      width: 120,
      render: (vehicle) => vehicle?.bill_no || '-'
    },
    { label: 'Moisture %', field: 'moisture', width: 120 },
    { label: 'Protein %', field: 'protein_percent', width: 120 },
    { label: 'Total Impurities %', field: 'total_impurities', width: 150 },
    { label: 'Total Dockage %', field: 'total_dockage', width: 150 },
    { label: 'Tested By', field: 'tested_by', width: 150 },
    { 
      label: 'Test Date', 
      field: 'test_date', 
      width: 180,
      render: (value) => new Date(value).toLocaleDateString()
    },
  ];

  return (
    <Layout title="Lab Tests" navigation={navigation} currentRoute="LabTest">
      <DataTable
        columns={columns}
        data={labTests}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="New Lab Test"
        width="80%"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Select Vehicle *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicle_entry_id}
              onValueChange={handleVehicleChange}
              style={styles.picker}
            >
              <Picker.Item label="Select Vehicle" value="" />
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle.id}
                  label={`${vehicle.vehicle_number} - ${vehicle.supplier?.supplier_name || 'N/A'}`}
                  value={vehicle.id}
                />
              ))}
            </Picker>
          </View>

          {selectedVehicle && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Bill No: {selectedVehicle.bill_no}</Text>
              <Text style={styles.infoText}>Supplier: {selectedVehicle.supplier?.supplier_name || 'N/A'}</Text>
            </View>
          )}

          <Text style={styles.label}>Test Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>{formData.test_date.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.test_date}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <Text style={styles.sectionTitle}>Basic Parameters</Text>
          <View style={styles.grid}>
            <NumberInput label="Moisture" value={formData.moisture} field="moisture" />
            <NumberInput label="Test Weight" value={formData.test_weight} field="test_weight" unit="kg/hl" />
            <NumberInput label="Protein" value={formData.protein_percent} field="protein_percent" />
            <NumberInput label="Wet Gluten" value={formData.wet_gluten} field="wet_gluten" />
            <NumberInput label="Dry Gluten" value={formData.dry_gluten} field="dry_gluten" />
          </View>

          <Text style={styles.label}>Falling Number</Text>
          <TextInput
            style={styles.input}
            value={formData.falling_number}
            onChangeText={(text) => setFormData({ ...formData, falling_number: text })}
            placeholder="Enter falling number"
            keyboardType="number-pad"
          />

          <Text style={styles.sectionTitle}>Impurities</Text>
          <View style={styles.grid}>
            <NumberInput label="Chaff & Husk" value={formData.chaff_husk} field="chaff_husk" />
            <NumberInput label="Straws & Sticks" value={formData.straws_sticks} field="straws_sticks" />
            <NumberInput label="Other Foreign Matter" value={formData.other_foreign_matter} field="other_foreign_matter" />
            <NumberInput label="Mudballs" value={formData.mudballs} field="mudballs" />
            <NumberInput label="Stones" value={formData.stones} field="stones" />
            <NumberInput label="Dust & Sand" value={formData.dust_sand} field="dust_sand" />
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Impurities:</Text>
            <Text style={styles.totalValue}>{formData.total_impurities}%</Text>
          </View>

          <Text style={styles.sectionTitle}>Dockage</Text>
          <View style={styles.grid}>
            <NumberInput label="Shriveled Wheat" value={formData.shriveled_wheat} field="shriveled_wheat" />
            <NumberInput label="Insect Damage" value={formData.insect_damage} field="insect_damage" />
            <NumberInput label="Blackened Wheat" value={formData.blackened_wheat} field="blackened_wheat" />
            <NumberInput label="Sprouted Grains" value={formData.sprouted_grains} field="sprouted_grains" />
            <NumberInput label="Other Grain Damage" value={formData.other_grain_damage} field="other_grain_damage" />
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Dockage:</Text>
            <Text style={styles.totalValue}>{formData.total_dockage}%</Text>
          </View>

          <Text style={styles.label}>Tested By</Text>
          <TextInput
            style={styles.input}
            value={formData.tested_by}
            onChangeText={(text) => setFormData({ ...formData, tested_by: text })}
            placeholder="Enter tester name"
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            placeholder="Enter any remarks"
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Test'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    color: '#374151',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numberInputContainer: {
    flex: 1,
    minWidth: 150,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
    marginRight: 8,
  },
  unit: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803d',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
