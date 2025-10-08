
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
import { vehicleApi, labTestApi } from '../api/client';
import colors from '../theme/colors';

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
    wheat_variety: '',
    bill_number: '',
    document_no: '',
    issue_no: '01',
    issue_date: new Date(),
    department: 'QA',
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

  const qualityCategories = [
    { label: 'Mill Grade (Premium)', value: 'Mill' },
    { label: 'Low Mill Grade', value: 'Low Mill' },
    { label: 'Heavy Density (HD)', value: 'HD' },
    { label: 'Rejected', value: 'Rejected' },
  ];

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

  const handleVehicleChange = async (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    setSelectedVehicle(vehicle);
    
    // Generate document number based on today's date and count
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    try {
      // Get today's lab tests to determine the next document number
      const response = await labTestApi.getAll();
      const todayTests = response.data.filter(test => {
        const createdDate = new Date(test.created_at).toISOString().split('T')[0];
        return createdDate === todayStr;
      });
      
      // Generate 3-digit document number
      const docNumber = String(todayTests.length + 1).padStart(3, '0');
      
      setFormData({ 
        ...formData, 
        vehicle_entry_id: vehicleId,
        bill_number: vehicle?.bill_no || '',
        document_no: docNumber,
        issue_no: '01'  // 2-digit issue number
      });
    } catch (error) {
      console.error('Error generating document number:', error);
      setFormData({ 
        ...formData, 
        vehicle_entry_id: vehicleId,
        bill_number: vehicle?.bill_no || '',
        document_no: '001',
        issue_no: '01'
      });
    }
  };

  const openAddModal = () => {
    setFormData({
      vehicle_entry_id: '',
      test_date: new Date(),
      wheat_variety: '',
      bill_number: '',
      document_no: '',
      issue_no: '01',
      issue_date: new Date(),
      department: 'QA',
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
        wheat_variety: formData.wheat_variety,
        bill_number: formData.bill_number,
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

      await labTestApi.create(submitData);
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { border: 2px solid black; padding: 10px; margin-bottom: 20px; }
    .header-row { display: flex; align-items: center; justify-content: space-between; }
    .logo-box { border: 2px solid black; padding: 15px; text-align: center; font-weight: bold; min-width: 80px; }
    .title { flex: 1; text-align: center; padding: 0 10px; }
    .doc-info { border: 2px solid black; padding: 8px; font-size: 11px; min-width: 140px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .info-item { padding: 8px; background: #f5f5f5; border: 1px solid #ddd; }
    .info-label { font-weight: bold; margin-right: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid black; padding: 8px; text-align: left; }
    th { background-color: #e0e0e0; font-weight: bold; }
    .section-header { background-color: #d0d0d0; font-weight: bold; }
    .total-row { background-color: #d0d0d0; font-weight: bold; }
    .sub-item { padding-left: 20px; }
    .comments-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
    .approval-section { margin: 20px 0; padding: 15px; border: 2px solid #28a745; background: #d4edda; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-row">
      <div class="logo-box">B R<br>F M</div>
      <div class="title"><h2>Raw Wheat Quality Report</h2></div>
      <div class="doc-info">
        Document No - ${formData.document_no || '---'}<br>
        Issue No: ${formData.issue_no}<br>
        Issue Date: ${formData.issue_date.toLocaleDateString('en-GB')}<br>
        Dept - ${formData.department}
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><span class="info-label">Wheat Variety:</span>${formData.wheat_variety || 'N/A'}</div>
    <div class="info-item"><span class="info-label">Test Date:</span>${formData.test_date.toLocaleDateString('en-GB')}</div>
    <div class="info-item"><span class="info-label">Vehicle Number:</span>${selectedVehicle?.vehicle_number || 'N/A'}</div>
    <div class="info-item"><span class="info-label">Supplier:</span>${selectedVehicle?.supplier?.supplier_name || 'N/A'}</div>
    <div class="info-item"><span class="info-label">Bill Number:</span>${formData.bill_number || 'N/A'}</div>
    <div class="info-item"><span class="info-label">Tested By:</span>${formData.tested_by || 'N/A'}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">SR.</th>
        <th style="width: 250px;">TEST</th>
        <th style="width: 80px;">UOM</th>
        <th style="width: 120px;">STANDARD</th>
        <th>ACTUAL REPORT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td><td>Moisture</td><td>%</td><td>8-10.5</td><td>${formData.moisture || '-'}</td>
      </tr>
      <tr>
        <td>2</td><td>Hectoliter weight</td><td>Kg/hl</td><td>&gt;75</td><td>${formData.hectoliter_weight || '-'}</td>
      </tr>
      <tr class="section-header">
        <td>3</td><td>Gluten</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>a</td><td class="sub-item">Wet Gluten</td><td>%</td><td>32-33</td><td>${formData.wet_gluten || '-'}</td>
      </tr>
      <tr>
        <td>b</td><td class="sub-item">Dry Gluten</td><td></td><td>10.5-11.5</td><td>${formData.dry_gluten || '-'}</td>
      </tr>
      <tr>
        <td>4</td><td>Sedimentation Value</td><td>ml</td><td>24-25 ml</td><td>${formData.sedimentation_value || '-'}</td>
      </tr>
      <tr class="section-header">
        <td>5</td><td>Refractions</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>a</td><td class="sub-item">Chaff/Husk</td><td></td><td></td><td>${formData.chaff_husk || '-'}</td>
      </tr>
      <tr>
        <td>b</td><td class="sub-item">Straws/Sticks</td><td></td><td></td><td>${formData.straws_sticks || '-'}</td>
      </tr>
      <tr>
        <td>c</td><td class="sub-item">Other Foreign Matter (OFM)</td><td></td><td></td><td>${formData.other_foreign_matter || '-'}</td>
      </tr>
      <tr>
        <td>d</td><td class="sub-item">Mudballs</td><td>%</td><td>&lt;3</td><td>${formData.mudballs || '-'}</td>
      </tr>
      <tr>
        <td>e</td><td class="sub-item">Stones</td><td></td><td></td><td>${formData.stones || '-'}</td>
      </tr>
      <tr>
        <td>f</td><td class="sub-item">Dust/Sand</td><td></td><td></td><td>${formData.dust_sand || '-'}</td>
      </tr>
      <tr class="total-row">
        <td></td><td>Total Impurities (%)</td><td></td><td></td><td>${formData.total_impurities}</td>
      </tr>
      <tr class="section-header">
        <td></td><td>Grain Dockage</td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td>1</td><td class="sub-item">Shriveled wheat</td><td></td><td>0.5</td><td>${formData.shriveled_wheat || '-'}</td>
      </tr>
      <tr>
        <td>2</td><td class="sub-item">Insect Bored damage</td><td></td><td>0.5</td><td>${formData.insect_damage || '-'}</td>
      </tr>
      <tr>
        <td>3</td><td class="sub-item">Blackened wheat</td><td></td><td>0.5</td><td>${formData.blackened_wheat || '-'}</td>
      </tr>
      <tr>
        <td>4</td><td class="sub-item">Other Grains</td><td>%</td><td>0.5</td><td>${formData.other_grains || '-'}</td>
      </tr>
      <tr>
        <td>5</td><td class="sub-item">Soft Wheat</td><td></td><td>0.5</td><td>${formData.soft_wheat || '-'}</td>
      </tr>
      <tr>
        <td>6</td><td class="sub-item">Heat Damaged wheat</td><td></td><td>0.5</td><td>${formData.heat_damaged || '-'}</td>
      </tr>
      <tr>
        <td>7</td><td class="sub-item">Immature wheat</td><td></td><td>0.5</td><td>${formData.immature_wheat || '-'}</td>
      </tr>
      <tr>
        <td>8</td><td class="sub-item">Broken wheat</td><td></td><td>0.5</td><td>${formData.broken_wheat || '-'}</td>
      </tr>
      <tr class="total-row">
        <td></td><td>Total Dockage (%)</td><td></td><td></td><td>${formData.total_dockage}</td>
      </tr>
    </tbody>
  </table>

  <div class="comments-section">
    <strong>Comments & Action:</strong><br>
    ${formData.comments_action || 'N/A'}
  </div>

  <div class="approval-section">
    <div><strong>Quality Category:</strong> ${formData.category || 'N/A'}</div>
    <div><strong>Approved for Unloading:</strong> ${formData.approved ? 'Yes' : 'No'}</div>
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
      label: 'Document No', 
      field: 'document_no', 
      width: 120,
      render: (value) => value || '-'
    },
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
      label: 'Wheat Variety', 
      field: 'wheat_variety', 
      width: 150,
      render: (value) => value || '-'
    },
    { label: 'Moisture %', field: 'moisture', width: 120 },
    { label: 'Total Impurities %', field: 'total_impurities', width: 150 },
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
            {/* Document Header Info */}
            <View style={styles.docHeaderInfo}>
              <View style={styles.docHeaderRow}>
                <View style={styles.docHeaderItem}>
                  <Text style={styles.docHeaderLabel}>Document No:</Text>
                  <Text style={styles.docHeaderValue}>{formData.document_no || '---'}</Text>
                </View>
                <View style={styles.docHeaderItem}>
                  <Text style={styles.docHeaderLabel}>Issue No:</Text>
                  <Text style={styles.docHeaderValue}>{formData.issue_no}</Text>
                </View>
              </View>
              <View style={styles.docHeaderRow}>
                <View style={styles.docHeaderItem}>
                  <Text style={styles.docHeaderLabel}>Issue Date:</Text>
                  <Text style={styles.docHeaderValue}>{formData.issue_date.toLocaleDateString()}</Text>
                </View>
                <View style={styles.docHeaderItem}>
                  <Text style={styles.docHeaderLabel}>Department:</Text>
                  <Text style={styles.docHeaderValue}>{formData.department}</Text>
                </View>
              </View>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.row}>
                <View style={styles.field}>
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

                <View style={styles.field}>
                  <Text style={styles.label}>Bill Number</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.bill_number}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Quality Category (Wheat Variety) *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.wheat_variety}
                      onValueChange={(value) => setFormData({ ...formData, wheat_variety: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Quality Category" value="" />
                      {qualityCategories.map((cat, index) => (
                        <Picker.Item key={index} label={cat.label} value={cat.value} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.field}>
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

              <View style={styles.field}>
                <Text style={styles.label}>Tested By</Text>
                <TextInput
                  style={styles.input}
                  value={formData.tested_by}
                  onChangeText={(text) => setFormData({ ...formData, tested_by: text })}
                  placeholder="Name of lab chemist"
                />
              </View>
            </View>

            {/* Test Parameters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Parameters</Text>
              
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Moisture (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.moisture}
                    onChangeText={(text) => setFormData({ ...formData, moisture: text })}
                    keyboardType="decimal-pad"
                    placeholder="8-10.5"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Hectoliter Weight (Kg/hl)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.hectoliter_weight}
                    onChangeText={(text) => setFormData({ ...formData, hectoliter_weight: text })}
                    keyboardType="decimal-pad"
                    placeholder=">75"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Wet Gluten (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.wet_gluten}
                    onChangeText={(text) => setFormData({ ...formData, wet_gluten: text })}
                    keyboardType="decimal-pad"
                    placeholder="32-33"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Dry Gluten</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dry_gluten}
                    onChangeText={(text) => setFormData({ ...formData, dry_gluten: text })}
                    keyboardType="decimal-pad"
                    placeholder="10.5-11.5"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Sedimentation Value (ml)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.sedimentation_value}
                  onChangeText={(text) => setFormData({ ...formData, sedimentation_value: text })}
                  keyboardType="decimal-pad"
                  placeholder="24-25"
                />
              </View>
            </View>

            {/* Impurities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Refractions / Impurities</Text>
              
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Chaff/Husk</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.chaff_husk}
                    onChangeText={(text) => setFormData({ ...formData, chaff_husk: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Straws/Sticks</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.straws_sticks}
                    onChangeText={(text) => setFormData({ ...formData, straws_sticks: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Other Foreign Matter</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.other_foreign_matter}
                    onChangeText={(text) => setFormData({ ...formData, other_foreign_matter: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Mudballs (%, &lt;3)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.mudballs}
                    onChangeText={(text) => setFormData({ ...formData, mudballs: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Stones</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stones}
                    onChangeText={(text) => setFormData({ ...formData, stones: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Dust/Sand</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.dust_sand}
                    onChangeText={(text) => setFormData({ ...formData, dust_sand: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.totalField}>
                <Text style={styles.totalLabel}>Total Impurities (%)</Text>
                <Text style={styles.totalValue}>{formData.total_impurities}</Text>
              </View>
            </View>

            {/* Grain Dockage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grain Dockage</Text>
              
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Shriveled Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.shriveled_wheat}
                    onChangeText={(text) => setFormData({ ...formData, shriveled_wheat: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Insect Bored Damage</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.insect_damage}
                    onChangeText={(text) => setFormData({ ...formData, insect_damage: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Blackened Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.blackened_wheat}
                    onChangeText={(text) => setFormData({ ...formData, blackened_wheat: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Other Grains (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.other_grains}
                    onChangeText={(text) => setFormData({ ...formData, other_grains: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Soft Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.soft_wheat}
                    onChangeText={(text) => setFormData({ ...formData, soft_wheat: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Heat Damaged Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.heat_damaged}
                    onChangeText={(text) => setFormData({ ...formData, heat_damaged: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Immature Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.immature_wheat}
                    onChangeText={(text) => setFormData({ ...formData, immature_wheat: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Broken Wheat</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.broken_wheat}
                    onChangeText={(text) => setFormData({ ...formData, broken_wheat: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.totalField}>
                <Text style={styles.totalLabel}>Total Dockage (%)</Text>
                <Text style={styles.totalValue}>{formData.total_dockage}</Text>
              </View>
            </View>

            {/* Comments & Final Approval */}
            <View style={styles.section}>
              <Text style={styles.label}>Comments & Action</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.comments_action}
                onChangeText={(text) => setFormData({ ...formData, comments_action: text })}
                placeholder="Enter comments and actions here..."
                multiline
                numberOfLines={4}
              />

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
    paddingBottom: 20,
  },
  docHeaderInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  docHeaderItem: {
    flex: 1,
  },
  docHeaderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  docHeaderValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  field: {
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
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: colors.textSecondary,
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
  totalField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
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
