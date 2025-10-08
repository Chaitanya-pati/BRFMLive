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
import { vehicleApi, labTestApi, claimApi } from '../api/client';
import colors from '../theme/colors';

export default function LabTestScreen({ navigation }) {
  const [labTests, setLabTests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState(null);
  const [claimFormData, setClaimFormData] = useState({
    issue_found: '',
    category_detected: '',
    remarks: '',
  });

  const [formData, setFormData] = useState({
    vehicle_entry_id: '',
    test_date: new Date(),
    wheat_variety: '',
    bill_number: '',
    arrival_datetime: '',
    lab_chemist: '',
    // Basic Parameters
    moisture: '',
    hectoliter_weight: '',
    protein_percent: '',
    wet_gluten: '',
    dry_gluten: '',
    sedimentation_value: '',
    // Impurities/Refractions
    chaff_husk: '',
    straws_sticks: '',
    other_foreign_matter: '',
    mudballs: '',
    stones: '',
    dust_sand: '',
    total_impurities: '0.00',
    // Grain Dockage
    shriveled_wheat: '',
    insect_damage: '',
    blackened_wheat: '',
    other_grains: '',
    soft_wheat: '',
    heat_damaged: '',
    immature_wheat: '',
    broken_wheat: '',
    total_dockage: '0.00',
    // Final
    category: '',
    comments_action: '',
    approved: false,
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
    formData.other_grains,
    formData.soft_wheat,
    formData.heat_damaged,
    formData.immature_wheat,
    formData.broken_wheat,
  ]);

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAvailableForTesting();
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
      formData.other_grains,
      formData.soft_wheat,
      formData.heat_damaged,
      formData.immature_wheat,
      formData.broken_wheat,
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
      wheat_variety: '',
      bill_number: '',
      arrival_datetime: '',
      lab_chemist: '',
      moisture: '',
      hectoliter_weight: '',
      protein_percent: '',
      wet_gluten: '',
      dry_gluten: '',
      sedimentation_value: '',
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
      other_grains: '',
      soft_wheat: '',
      heat_damaged: '',
      immature_wheat: '',
      broken_wheat: '',
      total_dockage: '0.00',
      category: '',
      comments_action: '',
      approved: false,
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
      category: labTest.category || '',
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

      const response = await labTestApi.create(submitData);
      Alert.alert('Success', 'Lab test created successfully');
      
      setModalVisible(false);
      loadLabTests();
      loadVehicles();
    } catch (error) {
      Alert.alert('Error', 'Failed to create lab test');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndRaiseClaim = async () => {
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

      // Save the lab test first
      const response = await labTestApi.create(submitData);
      const createdLabTest = response.data;
      
      // Close the lab test modal
      setModalVisible(false);
      
      // Prepare the claim with the newly created lab test
      const categoryDetected = submitData.moisture && submitData.protein_percent 
        ? `Moisture: ${submitData.moisture}%, Protein: ${submitData.protein_percent}%`
        : 'Not Available';
      
      setSelectedLabTest({
        id: createdLabTest.id,
        vehicle_entry: selectedVehicle,
        ...createdLabTest
      });
      
      setClaimFormData({
        issue_found: '',
        category_detected: categoryDetected,
        remarks: '',
      });
      
      // Open the claim modal
      setClaimModalVisible(true);
      
      // Reload data
      loadLabTests();
      loadVehicles();
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save lab test');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openRaiseClaimModal = (labTest) => {
    setSelectedLabTest(labTest);
    const categoryDetected = labTest.moisture && labTest.protein_percent 
      ? `Moisture: ${labTest.moisture}%, Protein: ${labTest.protein_percent}%`
      : 'Not Available';
    
    setClaimFormData({
      issue_found: '',
      category_detected: categoryDetected,
      remarks: '',
    });
    setClaimModalVisible(true);
  };

  const handleClaimSubmit = async () => {
    if (!claimFormData.issue_found.trim()) {
      Alert.alert('Error', 'Please describe the issue found');
      return;
    }

    setLoading(true);
    try {
      const claimData = {
        lab_test_id: selectedLabTest.id,
        issue_found: claimFormData.issue_found,
        category_detected: claimFormData.category_detected,
        claim_date: new Date().toISOString(),
        remarks: claimFormData.remarks || null,
      };

      await claimApi.create(claimData);
      Alert.alert('Success', 'Claim raised successfully');
      setClaimModalVisible(false);
      setClaimFormData({
        issue_found: '',
        category_detected: '',
        remarks: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to raise claim');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!selectedVehicle || !formData.vehicle_entry_id) {
      Alert.alert('Error', 'Please select a vehicle first');
      return;
    }

    // Create PDF content
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Raw Wheat Quality Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { border: 2px solid black; padding: 15px; margin-bottom: 20px; }
    .header-row { display: flex; justify-content: space-between; align-items: center; }
    .logo-box { border: 2px solid black; padding: 20px; text-align: center; font-weight: bold; }
    .title { text-align: center; flex: 1; }
    .doc-info { border: 2px solid black; padding: 10px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid black; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .section-header { background-color: #e0e0e0; font-weight: bold; }
    .total-row { background-color: #e0e0e0; font-weight: bold; }
    .info-section { margin: 15px 0; }
    .info-row { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-row">
      <div class="logo-box">B R<br>F M</div>
      <div class="title"><h2>Raw Wheat Quality Report</h2></div>
      <div class="doc-info">
        Document No - 001<br>
        Issue No: 01<br>
        Issue Date: 4/8/2022<br>
        Dept - QA
      </div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-row"><strong>Wheat Variety:</strong> ${formData.wheat_variety || 'N/A'}</div>
    <div class="info-row"><strong>Test Date:</strong> ${formData.test_date.toLocaleDateString()}</div>
    <div class="info-row"><strong>Vehicle Number:</strong> ${selectedVehicle?.vehicle_number || 'N/A'}</div>
    <div class="info-row"><strong>Supplier:</strong> ${selectedVehicle?.supplier?.supplier_name || 'N/A'}</div>
    <div class="info-row"><strong>Bill Number:</strong> ${formData.bill_number || 'N/A'}</div>
    <div class="info-row"><strong>Lab Chemist:</strong> ${formData.lab_chemist || 'N/A'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sr.</th>
        <th>TEST</th>
        <th>UOM</th>
        <th>STANDARD</th>
        <th>ACTUAL REPORT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td><td>Moisture</td><td>%</td><td>8-10.5</td><td>${formData.moisture || '-'}</td>
      </tr>
      <tr>
        <td>2</td><td>Hectoliter weight</td><td>Kg/hl</td><td>>75</td><td>${formData.hectoliter_weight || '-'}</td>
      </tr>
      <tr class="section-header">
        <td>3</td><td>Gluten</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>a</td><td>&nbsp;&nbsp;Wet Gluten</td><td>%</td><td>32-33</td><td>${formData.wet_gluten || '-'}</td>
      </tr>
      <tr>
        <td>b</td><td>&nbsp;&nbsp;Dry Gluten</td><td></td><td>10.5-11.5</td><td>${formData.dry_gluten || '-'}</td>
      </tr>
      <tr>
        <td>4</td><td>Sedimentation Value</td><td>ml</td><td>24-25 ml</td><td>${formData.sedimentation_value || '-'}</td>
      </tr>
      <tr class="section-header">
        <td>5</td><td>Refractions</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>a</td><td>&nbsp;&nbsp;Chaff/Husk</td><td></td><td></td><td>${formData.chaff_husk || '-'}</td>
      </tr>
      <tr>
        <td>b</td><td>&nbsp;&nbsp;Straws/Sticks</td><td></td><td></td><td>${formData.straws_sticks || '-'}</td>
      </tr>
      <tr>
        <td>c</td><td>&nbsp;&nbsp;Other Foreign Matter</td><td></td><td></td><td>${formData.other_foreign_matter || '-'}</td>
      </tr>
      <tr>
        <td>d</td><td>&nbsp;&nbsp;Mudballs</td><td>%</td><td><3</td><td>${formData.mudballs || '-'}</td>
      </tr>
      <tr>
        <td>e</td><td>&nbsp;&nbsp;Stones</td><td></td><td></td><td>${formData.stones || '-'}</td>
      </tr>
      <tr>
        <td>f</td><td>&nbsp;&nbsp;Dust/Sand</td><td></td><td></td><td>${formData.dust_sand || '-'}</td>
      </tr>
      <tr class="total-row">
        <td></td><td>Total Impurities (%)</td><td></td><td></td><td>${formData.total_impurities}</td>
      </tr>
      <tr class="section-header">
        <td></td><td>Grain Dockage</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>1</td><td>&nbsp;&nbsp;Shriveled wheat</td><td></td><td>0.5</td><td>${formData.shriveled_wheat || '-'}</td>
      </tr>
      <tr>
        <td>2</td><td>&nbsp;&nbsp;Insect Bored damage</td><td></td><td>0.5</td><td>${formData.insect_damage || '-'}</td>
      </tr>
      <tr>
        <td>3</td><td>&nbsp;&nbsp;Blackened wheat</td><td></td><td>0.5</td><td>${formData.blackened_wheat || '-'}</td>
      </tr>
      <tr>
        <td>4</td><td>&nbsp;&nbsp;Other Grains</td><td>%</td><td>0.5</td><td>${formData.other_grains || '-'}</td>
      </tr>
      <tr>
        <td>5</td><td>&nbsp;&nbsp;Soft Wheat</td><td></td><td>0.5</td><td>${formData.soft_wheat || '-'}</td>
      </tr>
      <tr>
        <td>6</td><td>&nbsp;&nbsp;Heat Damaged wheat</td><td></td><td>0.5</td><td>${formData.heat_damaged || '-'}</td>
      </tr>
      <tr>
        <td>7</td><td>&nbsp;&nbsp;Immature wheat</td><td></td><td>0.5</td><td>${formData.immature_wheat || '-'}</td>
      </tr>
      <tr>
        <td>8</td><td>&nbsp;&nbsp;Broken wheat</td><td></td><td>0.5</td><td>${formData.broken_wheat || '-'}</td>
      </tr>
      <tr class="total-row">
        <td></td><td>Total Dockage (%)</td><td></td><td></td><td>${formData.total_dockage}</td>
      </tr>
    </tbody>
  </table>

  <div class="info-section">
    <div class="info-row"><strong>Comments & Action:</strong></div>
    <div>${formData.comments_action || 'N/A'}</div>
  </div>

  <div class="info-section">
    <div class="info-row"><strong>Quality Category:</strong> ${formData.category || 'N/A'}</div>
    <div class="info-row"><strong>Approved for Unloading:</strong> ${formData.approved ? 'Yes' : 'No'}</div>
  </div>
</body>
</html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.print();
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

          <Text style={styles.label}>Wheat Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Category" value="" />
              <Picker.Item label="Mill" value="Mill" />
              <Picker.Item label="Low Mill" value="Low Mill" />
              <Picker.Item label="HD Type" value="HD Type" />
            </Picker>
          </View>

          <Text style={styles.label}>Wheat Variety *</Text>
          <TextInput
            style={styles.input}
            value={formData.wheat_variety}
            onChangeText={(text) => setFormData({ ...formData, wheat_variety: text })}
            placeholder="e.g., HD"
          />

          <Text style={styles.label}>Bill Number</Text>
          <TextInput
            style={styles.input}
            value={formData.bill_number}
            onChangeText={(text) => setFormData({ ...formData, bill_number: text })}
            placeholder="e.g., 168"
          />

          <Text style={styles.label}>Lab Chemist *</Text>
          <TextInput
            style={styles.input}
            value={formData.lab_chemist}
            onChangeText={(text) => setFormData({ ...formData, lab_chemist: text })}
            placeholder="Name of lab chemist"
          />

          <Text style={styles.sectionTitle}>Gluten Parameters</Text>
          <View style={styles.grid}>
            <NumberInput label="Sedimentation Value" value={formData.sedimentation_value} field="sedimentation_value" unit="ml" />
          </View>

          <Text style={styles.sectionTitle}>Additional Dockage</Text>
          <View style={styles.grid}>
            <NumberInput label="Other Grains" value={formData.other_grains} field="other_grains" />
            <NumberInput label="Soft Wheat" value={formData.soft_wheat} field="soft_wheat" />
            <NumberInput label="Heat Damaged" value={formData.heat_damaged} field="heat_damaged" />
            <NumberInput label="Immature Wheat" value={formData.immature_wheat} field="immature_wheat" />
            <NumberInput label="Broken Wheat" value={formData.broken_wheat} field="broken_wheat" />
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Dockage:</Text>
            <Text style={styles.totalValue}>{formData.total_dockage}%</Text>
          </View>

          <Text style={styles.label}>Comments & Action</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.comments_action}
            onChangeText={(text) => setFormData({ ...formData, comments_action: text })}
            placeholder="Enter comments and actions here..."
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Quality Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              style={styles.picker}
            >
              <Picker.Item label="Assign quality category" value="" />
              <Picker.Item label="Mill Grade (Premium)" value="Mill" />
              <Picker.Item label="Low Mill Grade" value="Low Mill" />
              <Picker.Item label="Heavy Density (HD)" value="HD" />
              <Picker.Item label="Rejected" value="Rejected" />
            </Picker>
          </View>

          <View style={styles.approvalBox}>
            <Text style={styles.approvalTitle}>Final Approval</Text>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setFormData({ ...formData, approved: !formData.approved })}
            >
              <View style={[styles.checkbox, formData.approved && styles.checkboxChecked]}>
                {formData.approved && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabel}>
                <Text style={styles.checkboxText}>Approve this vehicle for unloading</Text>
                <Text style={styles.checkboxSubtext}>Check only if quality meets standards</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.pdfButton]}
              onPress={generatePDF}
            >
              <Text style={styles.pdfButtonText}>Generate PDF</Text>
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
            <TouchableOpacity
              style={[styles.button, styles.raiseClaimButton, loading && styles.buttonDisabled]}
              onPress={handleSaveAndRaiseClaim}
              disabled={loading}
            >
              <Text style={styles.raiseClaimButtonText}>
                {loading ? 'Processing...' : 'Save & Raise Claim'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={claimModalVisible}
        onClose={() => setClaimModalVisible(false)}
        title="Raise Claim"
        width="70%"
      >
        <View style={styles.form}>
          {selectedLabTest && (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Vehicle ID: {selectedLabTest.vehicle_entry?.vehicle_number || 'N/A'}</Text>
                <Text style={styles.infoText}>Supplier: {selectedLabTest.vehicle_entry?.supplier?.supplier_name || 'N/A'}</Text>
                <Text style={styles.infoText}>Category Detected: {claimFormData.category_detected}</Text>
                <Text style={styles.infoText}>Claim Date: {new Date().toLocaleDateString()}</Text>
              </View>

              <Text style={styles.label}>Issue Found *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={claimFormData.issue_found}
                onChangeText={(text) => setClaimFormData({ ...claimFormData, issue_found: text })}
                placeholder="Describe the issue found"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Remarks (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={claimFormData.remarks}
                onChangeText={(text) => setClaimFormData({ ...claimFormData, remarks: text })}
                placeholder="Additional remarks"
                multiline
                numberOfLines={3}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setClaimModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                  onPress={handleClaimSubmit}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Submitting...' : 'Submit Claim'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  infoBox: {
    backgroundColor: colors.infoContainer,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  infoText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numberInputContainer: {
    flex: 1,
    minWidth: Platform.select({ web: 150, default: '100%' }),
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.successContainer,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  raiseClaimButton: {
    backgroundColor: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  raiseClaimButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  approvalBox: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#28a745',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#28a745',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
  checkboxSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  pdfButton: {
    backgroundColor: '#6c757d',
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
