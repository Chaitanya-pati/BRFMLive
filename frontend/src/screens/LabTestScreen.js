
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
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
        test_weight: parseFloat(formData.hectoliter_weight) || null,
        protein_percent: parseFloat(formData.protein_percent) || null,
        wet_gluten: parseFloat(formData.wet_gluten) || null,
        dry_gluten: parseFloat(formData.dry_gluten) || null,
        falling_number: parseInt(formData.sedimentation_value) || null,
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
        sprouted_grains: parseFloat(formData.other_grains) || null,
        other_grain_damage: parseFloat(formData.soft_wheat) || null,
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

  const generatePDF = () => {
    if (!selectedVehicle || !formData.vehicle_entry_id) {
      Alert.alert('Error', 'Please select a vehicle first');
      return;
    }

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Raw Wheat Quality Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { border: 2px solid black; padding: 15px; margin-bottom: 20px; }
    .header-row { display: flex; justify-content: space-between; align-items: center; }
    .logo-box { border: 2px solid black; padding: 20px; text-align: center; font-weight: bold; width: 80px; }
    .title { text-align: center; flex: 1; }
    .doc-info { border: 2px solid black; padding: 10px; font-size: 12px; width: 150px; }
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

    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.print();
  };

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
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Raw Wheat Quality Report"
        width="90%"
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.form}>
            {/* Document Header */}
            <View style={styles.documentHeader}>
              <View style={styles.headerRow}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoText}>B R{'\n'}F M</Text>
                </View>
                <View style={styles.titleBox}>
                  <Text style={styles.documentTitle}>Raw Wheat Quality Report</Text>
                </View>
                <View style={styles.docInfoBox}>
                  <Text style={styles.docInfoText}>Document No - 001</Text>
                  <Text style={styles.docInfoText}>Issue No: 01</Text>
                  <Text style={styles.docInfoText}>Issue Date: 4/8/2022</Text>
                  <Text style={styles.docInfoText}>Dept - QA</Text>
                </View>
              </View>
            </View>

            {/* Basic Information Grid */}
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Wheat Variety *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.wheat_variety}
                  onChangeText={(text) => setFormData({ ...formData, wheat_variety: text })}
                  placeholder="e.g., HD"
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Test Date *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                  <Text>{formData.test_date.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.test_date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
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
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Bill Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bill_number}
                  onChangeText={(text) => setFormData({ ...formData, bill_number: text })}
                  placeholder="e.g., 168"
                />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Arrival Date/Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.arrival_datetime}
                  onChangeText={(text) => setFormData({ ...formData, arrival_datetime: text })}
                  placeholder="Enter arrival date/time"
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Lab Chemist *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lab_chemist}
                  onChangeText={(text) => setFormData({ ...formData, lab_chemist: text })}
                  placeholder="Name of lab chemist"
                />
              </View>
            </View>

            {/* Test Results Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Sr.</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>TEST</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>UOM</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>STANDARD</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>ACTUAL REPORT</Text>
              </View>

              {/* Row 1: Moisture */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>1</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Moisture</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>%</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>8-10.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.moisture}
                  onChangeText={(text) => setFormData({ ...formData, moisture: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Row 2: Hectoliter weight */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>2</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Hectoliter weight</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>Kg/hl</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>&gt;75</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.hectoliter_weight}
                  onChangeText={(text) => setFormData({ ...formData, hectoliter_weight: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Row 3: Gluten Section Header */}
              <View style={[styles.tableRow, styles.sectionRow]}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>3</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Gluten</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
              </View>

              {/* Row 3a: Wet Gluten */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>a</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Wet Gluten</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>%</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>32-33</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.wet_gluten}
                  onChangeText={(text) => setFormData({ ...formData, wet_gluten: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Row 3b: Dry Gluten */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>b</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Dry Gluten</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>10.5-11.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.dry_gluten}
                  onChangeText={(text) => setFormData({ ...formData, dry_gluten: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Row 4: Sedimentation Value */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>4</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Sedimentation Value</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>ml</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>24-25 ml</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.sedimentation_value}
                  onChangeText={(text) => setFormData({ ...formData, sedimentation_value: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Row 5: Refractions Section Header */}
              <View style={[styles.tableRow, styles.sectionRow]}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>5</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Refractions</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
              </View>

              {/* Refractions items */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>a</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Chaff/Husk</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.chaff_husk}
                  onChangeText={(text) => setFormData({ ...formData, chaff_husk: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>b</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Straws/Sticks</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.straws_sticks}
                  onChangeText={(text) => setFormData({ ...formData, straws_sticks: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>c</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Other Foreign Matter</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.other_foreign_matter}
                  onChangeText={(text) => setFormData({ ...formData, other_foreign_matter: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>d</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Mudballs</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>%</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>&lt;3</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.mudballs}
                  onChangeText={(text) => setFormData({ ...formData, mudballs: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>e</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Stones</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.stones}
                  onChangeText={(text) => setFormData({ ...formData, stones: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>f</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Dust/Sand</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.dust_sand}
                  onChangeText={(text) => setFormData({ ...formData, dust_sand: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Total Impurities */}
              <View style={[styles.tableRow, styles.totalRow]}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}></Text>
                <Text style={[styles.tableCell, styles.totalText, { flex: 2 }]}>Total Impurities (%)</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <Text style={[styles.tableCell, styles.totalText, { flex: 1.5 }]}>{formData.total_impurities}</Text>
              </View>

              {/* Grain Dockage Section */}
              <View style={[styles.tableRow, styles.sectionRow]}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}></Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Grain Dockage</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>1</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Shriveled wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.shriveled_wheat}
                  onChangeText={(text) => setFormData({ ...formData, shriveled_wheat: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>2</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Insect Bored damage</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.insect_damage}
                  onChangeText={(text) => setFormData({ ...formData, insect_damage: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>3</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Blackened wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.blackened_wheat}
                  onChangeText={(text) => setFormData({ ...formData, blackened_wheat: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>4</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Other Grains</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>%</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.other_grains}
                  onChangeText={(text) => setFormData({ ...formData, other_grains: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>5</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Soft Wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.soft_wheat}
                  onChangeText={(text) => setFormData({ ...formData, soft_wheat: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>6</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Heat Damaged wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.heat_damaged}
                  onChangeText={(text) => setFormData({ ...formData, heat_damaged: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>7</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Immature wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.immature_wheat}
                  onChangeText={(text) => setFormData({ ...formData, immature_wheat: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>8</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>  Broken wheat</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>0.5</Text>
                <TextInput
                  style={[styles.tableCell, styles.tableInput, { flex: 1.5 }]}
                  value={formData.broken_wheat}
                  onChangeText={(text) => setFormData({ ...formData, broken_wheat: text })}
                  keyboardType="decimal-pad"
                  placeholder="-"
                />
              </View>

              {/* Total Dockage */}
              <View style={[styles.tableRow, styles.totalRow]}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}></Text>
                <Text style={[styles.tableCell, styles.totalText, { flex: 2 }]}>Total Dockage (%)</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}></Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}></Text>
                <Text style={[styles.tableCell, styles.totalText, { flex: 1.5 }]}>{formData.total_dockage}</Text>
              </View>
            </View>

            {/* Comments & Action */}
            <Text style={styles.label}>Comments & Action</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.comments_action}
              onChangeText={(text) => setFormData({ ...formData, comments_action: text })}
              placeholder="Enter comments and actions here..."
              multiline
              numberOfLines={4}
            />

            {/* Quality Category */}
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

            {/* Approval Checkbox */}
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

            {/* Action Buttons */}
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
            </View>
          </View>
        </ScrollView>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  form: {
    gap: 16,
    paddingBottom: 20,
  },
  documentHeader: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  logoText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  titleBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  docInfoBox: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 8,
    width: 150,
  },
  docInfoText: {
    fontSize: 11,
    marginBottom: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
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
  tableContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    fontSize: 13,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#000',
    padding: 8,
    alignItems: 'center',
  },
  sectionRow: {
    backgroundColor: '#e0e0e0',
  },
  totalRow: {
    backgroundColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 13,
    borderRightWidth: 1,
    borderRightColor: '#000',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tableInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 4,
    minHeight: 30,
  },
  totalText: {
    fontWeight: 'bold',
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
  pdfButton: {
    backgroundColor: '#6c757d',
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
  pdfButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
