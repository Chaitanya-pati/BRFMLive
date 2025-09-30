import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { vehicleApi, labTestApi } from '../api/client';

export default function LabTestScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
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
    total_impurities: '0',
    shriveled_wheat: '',
    insect_damage: '',
    blackened_wheat: '',
    sprouted_grains: '',
    other_grain_damage: '',
    total_dockage: '0',
    remarks: '',
    tested_by: '',
  });

  useEffect(() => {
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
        total_impurities: '0',
        shriveled_wheat: '',
        insect_damage: '',
        blackened_wheat: '',
        sprouted_grains: '',
        other_grain_damage: '',
        total_dockage: '0',
        remarks: '',
        tested_by: '',
      });
      setSelectedVehicle(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to create lab test');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const NumberInput = ({ label, value, field, unit = '%' }) => (
    <>
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
    </>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Raw Wheat Quality Report</Text>

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
            <Text style={styles.infoText}>
              Bill No: {selectedVehicle.bill_no}
            </Text>
            <Text style={styles.infoText}>
              Supplier: {selectedVehicle.supplier?.supplier_name || 'N/A'}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Test Date</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
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
        
        <NumberInput label="Moisture" value={formData.moisture} field="moisture" />
        <NumberInput label="Test Weight" value={formData.test_weight} field="test_weight" unit="kg/hl" />
        <NumberInput label="Protein" value={formData.protein_percent} field="protein_percent" />
        <NumberInput label="Wet Gluten" value={formData.wet_gluten} field="wet_gluten" />
        <NumberInput label="Dry Gluten" value={formData.dry_gluten} field="dry_gluten" />
        
        <Text style={styles.label}>Falling Number</Text>
        <TextInput
          style={styles.input}
          value={formData.falling_number}
          onChangeText={(text) => setFormData({ ...formData, falling_number: text })}
          placeholder="Enter falling number"
          keyboardType="number-pad"
        />

        <Text style={styles.sectionTitle}>Impurities</Text>
        
        <NumberInput label="Chaff & Husk" value={formData.chaff_husk} field="chaff_husk" />
        <NumberInput label="Straws & Sticks" value={formData.straws_sticks} field="straws_sticks" />
        <NumberInput label="Other Foreign Matter" value={formData.other_foreign_matter} field="other_foreign_matter" />
        <NumberInput label="Mudballs" value={formData.mudballs} field="mudballs" />
        <NumberInput label="Stones" value={formData.stones} field="stones" />
        <NumberInput label="Dust & Sand" value={formData.dust_sand} field="dust_sand" />
        
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Impurities:</Text>
          <Text style={styles.totalValue}>{formData.total_impurities}%</Text>
        </View>

        <Text style={styles.sectionTitle}>Dockage</Text>
        
        <NumberInput label="Shriveled Wheat" value={formData.shriveled_wheat} field="shriveled_wheat" />
        <NumberInput label="Insect Damage" value={formData.insect_damage} field="insect_damage" />
        <NumberInput label="Blackened Wheat" value={formData.blackened_wheat} field="blackened_wheat" />
        <NumberInput label="Sprouted Grains" value={formData.sprouted_grains} field="sprouted_grains" />
        <NumberInput label="Other Grain Damage" value={formData.other_grain_damage} field="other_grain_damage" />
        
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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Submitting...' : 'Submit Lab Test'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#007AFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  numberInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  unit: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
