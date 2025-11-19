import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import notify from '../utils/notifications';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { vehicleApi, labTestApi, claimApi } from "../api/client";
import colors from "../theme/colors";
import { formatISTDate } from "../utils/dateUtils";

export default function LabTestScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [labTests, setLabTests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLabTest, setCurrentLabTest] = useState(null);
  const [vehicleSearchText, setVehicleSearchText] = useState("");
  const [vehicleFilterType, setVehicleFilterType] = useState("vehicle"); // 'vehicle' or 'supplier'

  // Raise Claim Modal states
  const [raiseClaimModalVisible, setRaiseClaimModalVisible] = useState(false);
  const [selectedLabTestForClaim, setSelectedLabTestForClaim] = useState(null);
  const [claimFormData, setClaimFormData] = useState({
    description: "",
    claim_type: "",
    claim_amount: "",
    claim_date: new Date(),
  });

  const [formData, setFormData] = useState({
    vehicle_entry_id: "",
    test_date: new Date(),
    wheat_variety: "",
    bill_number: "",
    // document_no: "", // Removed
    // issue_no: "01", // Removed
    // issue_date: new Date(), // Removed
    department: "QA",
    // Basic Parameters
    moisture: "",
    hectoliter_weight: "",
    protein_percent: "",
    wet_gluten: "",
    dry_gluten: "",
    sedimentation_value: "",
    // Impurities/Refractions
    chaff_husk: "",
    straws_sticks: "",
    other_foreign_matter: "",
    mudballs: "",
    stones: "",
    dust_sand: "",
    total_impurities: "0.00",
    // Grain Dockage
    shriveled_wheat: "",
    insect_damage: "",
    blackened_wheat: "",
    other_grains: "",
    soft_wheat: "",
    heat_damaged: "",
    immature_wheat: "",
    broken_wheat: "",
    total_dockage: "0.00",
    // Final
    category: "",
    comments_action: "",
    approved: false,
    tested_by: "",
    raise_claim: false, // New flag for "Raise Claim"
  });

  const qualityCategories = [
    { label: "Mill Grade (Premium)", value: "Mill" },
    { label: "Low Mill Grade", value: "Low Mill" },
    { label: "Heavy Density (HD)", value: "HD" },
    { label: "Rejected", value: "Rejected" },
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

  // Filter vehicles based on search text and filter type
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!vehicleSearchText) return true;

    const searchLower = vehicleSearchText.toLowerCase();

    if (vehicleFilterType === "vehicle") {
      // Search by vehicle number
      return vehicle.vehicle_number?.toLowerCase().includes(searchLower);
    } else {
      // Search by supplier name
      return vehicle.supplier?.supplier_name?.toLowerCase().includes(searchLower);
    }
  });

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAvailableForTesting();
      setVehicles(response.data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  const loadLabTests = async () => {
    try {
      const response = await labTestApi.getAll();
      setLabTests(response.data);
    } catch (error) {
      console.error("Error loading lab tests:", error);
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
    const vehicle = vehicles.find((v) => v.id === parseInt(vehicleId));
    setSelectedVehicle(vehicle);

    // Removed document number and issue number generation
    setFormData((prev) => ({
      ...prev,
      vehicle_entry_id: vehicleId,
      bill_number: vehicle?.bill_no || "",
    }));
  };

  const openAddModal = async () => {
    // Load only AVAILABLE vehicles for add mode
    await loadVehicles();

    setEditMode(false);
    setCurrentLabTest(null);
    setVehicleSearchText("");
    setVehicleFilterType("vehicle");
    setFormData({
      vehicle_entry_id: "",
      test_date: new Date(),
      wheat_variety: "",
      bill_number: "",
      // document_no: "", // Removed
      // issue_no: "01", // Removed
      // issue_date: new Date(), // Removed
      department: "QA",
      moisture: "",
      hectoliter_weight: "",
      protein_percent: "",
      wet_gluten: "",
      dry_gluten: "",
      sedimentation_value: "",
      chaff_husk: "",
      straws_sticks: "",
      other_foreign_matter: "",
      mudballs: "",
      stones: "",
      dust_sand: "",
      total_impurities: "0.00",
      shriveled_wheat: "",
      insect_damage: "",
      blackened_wheat: "",
      other_grains: "",
      soft_wheat: "",
      heat_damaged: "",
      immature_wheat: "",
      broken_wheat: "",
      total_dockage: "0.00",
      category: "",
      comments_action: "",
      approved: false,
      tested_by: "",
      raise_claim: false, // Reset raise_claim to false
    });
    setSelectedVehicle(null);
    setModalVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setFormData({ ...formData, test_date: selectedDate });
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_entry_id) {
      notify.showWarning("Please select a vehicle");
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
        raise_claim: formData.raise_claim, // Include raise_claim flag
      };

      if (editMode && currentLabTest) {
        await labTestApi.update(currentLabTest.id, submitData);
        notify.showSuccess("Lab test updated successfully");
      } else {
        await labTestApi.create(submitData);
        notify.showSuccess("Lab test created successfully");
      }

      setModalVisible(false);
      loadLabTests();
      loadVehicles();

      // Show download/print options after modal closes
      setTimeout(() => {
        const shouldPrint = window.confirm('Lab Test saved successfully!\n\nWould you like to print the PDF report now?\n\nClick OK to print, or Cancel to skip.');

        if (shouldPrint) {
          generatePDF();
        }
      }, 100);
    } catch (error) {
      notify.showError(editMode ? "Failed to update lab test" : "Failed to create lab test");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndRaiseClaim = async () => {
    if (!formData.vehicle_entry_id) {
      notify.showWarning("Please select a vehicle");
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
        raise_claim: true, // Ensure raise_claim is true when using this button
      };

      let savedLabTest;
      if (editMode && currentLabTest) {
        await labTestApi.update(currentLabTest.id, submitData);
        savedLabTest = currentLabTest;
        notify.showSuccess("Lab test updated successfully");
      } else {
        const response = await labTestApi.create(submitData);
        savedLabTest = response.data;
        notify.showSuccess("Lab test created successfully");
      }

      // Close the lab test modal
      setModalVisible(false);

      // Reload lab tests
      await loadLabTests();
      await loadVehicles();

      // Ask if user wants to print before opening claim modal
      setTimeout(() => {
        const shouldPrint = window.confirm('Lab Test saved successfully!\n\nWould you like to print the PDF report before raising the claim?\n\nClick OK to print, or Cancel to continue to claim form.');

        if (shouldPrint) {
          generatePDF();
        }

        // Open raise claim modal with the saved lab test after print dialog
        setTimeout(() => {
          setSelectedLabTestForClaim(savedLabTest);
          setClaimFormData({
            description: "", // Ensure description is empty for new claim
            claim_type: "",
            claim_amount: "",
            claim_date: new Date(),
          });
          setRaiseClaimModalVisible(true);
        }, shouldPrint ? 500 : 0);
      }, 100);

    } catch (error) {
      notify.showError(editMode ? "Failed to update lab test" : "Failed to create lab test");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!selectedVehicle || !formData.vehicle_entry_id) {
      notify.showWarning("Please select a vehicle first");
      return;
    }

    const pdfContent = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <title>Raw Wheat Quality Report</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }

    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px;
      line-height: 1.3;
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }

    .header { 
      border: 2px solid black; 
      padding: 8px;
      margin-bottom: 6px;
      width: 100%;
    }

    .header-row { 
      width: 100%;
      position: relative;
      min-height: 70px;
    }

    .logo-box { 
      border: 2px solid black; 
      padding: 5px;
      width: 80px;
      height: 80px;
      position: absolute;
      left: 0;
      top: 0;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-box img {
      max-width: 70px;
      max-height: 70px;
      object-fit: contain;
    }

    .title { 
      text-align: center;
      padding: 10px 90px;
    }

    .title h2 {
      font-size: 16px;
      font-weight: bold;
      margin: 0;
    }

    .doc-info { 
      border: 2px solid black; 
      padding: 8px;
      font-size: 10px;
      width: 200px;
      height: 80px;
      position: absolute;
      right: 0;
      top: 0;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .basic-info {
      margin: 6px 0;
      line-height: 1.6;
    }

    .basic-info > div {
      margin-bottom: 3px;
    }

    .vehicle-info {
      margin: 6px 0;
      line-height: 1.6;
    }

    .vehicle-info > div {
      margin-bottom: 3px;
    }

    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 8px 0;
      font-size: 10px;
    }

    th, td { 
      border: 1px solid black; 
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
    }

    th { 
      background-color: #fff;
      font-weight: bold;
      text-align: center;
    }

    .section-header td { 
      font-weight: bold;
      background-color: #f5f5f5;
    }

    .total-row td { 
      font-weight: bold;
    }

    .sub-item { 
      padding-left: 20px;
    }

    .sr-col { 
      width: 50px; 
      text-align: center; 
    }

    .test-col { 
      width: 40%; 
    }

    .uom-col { 
      width: 80px; 
      text-align: center; 
    }

    .standard-col { 
      width: 100px; 
      text-align: center; 
    }

    .actual-col { 
      width: auto;
      text-align: left; 
    }

    .comments-section { 
      border: 1px solid black;
      padding: 8px;
      margin: 8px 0;
      min-height: 60px;
    }

    .comments-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .signature-section {
      width: 100%;
      margin-top: 15px;
      page-break-inside: avoid;
    }

    .signature-container {
      width: 100%;
    }

    .signature-box {
      border: 1px solid black;
      padding: 15px 20px;
      width: 45%;
      height: 80px;
      text-align: center;
      display: inline-block;
      vertical-align: top;
      margin-right: 8%;
      position: relative;
    }

    .signature-box:last-child {
      margin-right: 0;
    }

    .signature-box::before {
      content: '';
      display: block;
      height: 50px;
    }

    @media print {
      body { 
        padding: 0;
        margin: 0;
      }

      .header { 
        page-break-inside: avoid;
        break-inside: avoid;
      }

      table { 
        page-break-inside: auto;
      }

      tr { 
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      .signature-section {
        page-break-inside: avoid;
      }
    }
  </style>
  <body>
  <div class="header">
    <div class="header-row">
      <div class="logo-box">
        <img src="https://ce943af2-133a-49c4-9b89-498b74daab1d-00-33k2v3rppz17r.janeway.replit.dev/assets/new-logo.png" alt="Logo" />
      </div>
      <div class="title">
        <h2>Raw Wheat Quality Report</h2>
      </div>
    </div>
  </div>

  <div class="basic-info">
    <div>WHEAT VARIETY: <strong>${formData.wheat_variety || "N/A"}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; DATE: <strong>${formData.test_date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong></div>
    <div>TRADER/SUPPLIER NAME: <strong>${selectedVehicle?.supplier?.supplier_name || "N/A"}</strong></div>
  </div>

  <div class="vehicle-info">
    <div>VEHICLE NO: <strong>${selectedVehicle?.vehicle_number || "N/A"}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; BILL NO: <strong>${formData.bill_number || "N/A"}</strong></div>
    <div>VEHICLE ARRIVAL DATE & TIME: <strong>${selectedVehicle?.arrival_date ? new Date(selectedVehicle.arrival_date).toLocaleString("en-GB") : "N/A"}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="sr-col">Sr.</th>
        <th class="test-col">TEST</th>
        <th class="uom-col">UOM</th>
        <th class="standard-col">STANDARD</th>
        <th class="actual-col">ACTUAL REPORT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="sr-col">1</td>
        <td class="test-col">Moisture</td>
        <td class="uom-col">%</td>
        <td class="standard-col">8-10.5</td>
        <td class="actual-col">${formData.moisture || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">2</td>
        <td class="test-col">Hectoliter weight</td>
        <td class="uom-col">Kg/hl</td>
        <td class="standard-col">&gt;75</td>
        <td class="actual-col">${formData.hectoliter_weight || ""}</td>
      </tr>
      <tr class="section-header">
        <td class="sr-col">3</td>
        <td class="test-col">Gluten</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col"></td>
      </tr>
      <tr>
        <td class="sr-col">a</td>
        <td class="test-col sub-item">Wet Gluten</td>
        <td class="uom-col">%</td>
        <td class="standard-col">32-33</td>
        <td class="actual-col">${formData.wet_gluten || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">b</td>
        <td class="test-col sub-item">Dry Gluten</td>
        <td class="uom-col"></td>
        <td class="standard-col">10.5-11.5</td>
        <td class="actual-col">${formData.dry_gluten || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">4</td>
        <td class="test-col">Sedimentation Value</td>
        <td class="uom-col">ml</td>
        <td class="standard-col">24-25 ml</td>
        <td class="actual-col">${formData.sedimentation_value || ""}</td>
      </tr>
      <tr class="section-header">
        <td class="sr-col">5</td>
        <td class="test-col">Refractions</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col"></td>
      </tr>
      <tr>
        <td class="sr-col">a</td>
        <td class="test-col sub-item">chaff/Husk</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col">${formData.chaff_husk || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">b</td>
        <td class="test-col sub-item">straws/sticks</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col">${formData.straws_sticks || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">c</td>
        <td class="test-col sub-item">Other Foreign Matter (OFM)</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col">${formData.other_foreign_matter || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">d</td>
        <td class="test-col sub-item">Mudballs</td>
        <td class="uom-col">%</td>
        <td class="standard-col">&lt;3</td>
        <td class="actual-col">${formData.mudballs || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">e</td>
        <td class="test-col sub-item">Stones</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col">${formData.stones || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">f</td>
        <td class="test-col sub-item">Dust/Sand</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col">${formData.dust_sand || ""}</td>
      </tr>
      <tr class="total-row">
        <td class="sr-col"></td>
        <td class="test-col"><strong>Total Impurities (%)</strong></td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col"></td>
      </tr>
      <tr class="section-header">
        <td class="sr-col"></td>
        <td class="test-col">Grain dockage</td>
        <td class="uom-col"></td>
        <td class="standard-col"></td>
        <td class="actual-col"></td>
      </tr>
      <tr>
        <td class="sr-col">1</td>
        <td class="test-col sub-item">Shriveled wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.shriveled_wheat || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">2</td>
        <td class="test-col sub-item">Insect Bored damage</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.insect_damage || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">3</td>
        <td class="test-col sub-item">Blackened wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.blackened_wheat || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">4</td>
        <td class="test-col sub-item">Other Grains</td>
        <td class="uom-col">%</td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.other_grains || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">5</td>
        <td class="test-col sub-item">Soft Wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.soft_wheat || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">6</td>
        <td class="test-col sub-item">Heat Damaged wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.heat_damaged || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">7</td>
        <td class="test-col sub-item">Immature wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.immature_wheat || ""}</td>
      </tr>
      <tr>
        <td class="sr-col">8</td>
        <td class="test-col sub-item">Broken wheat</td>
        <td class="uom-col"></td>
        <td class="standard-col">0.5</td>
        <td class="actual-col">${formData.broken_wheat || ""}</td>
      </tr>
      <tr class="total-row">
        <td class="sr-col"></td>
        <td class="test-col"><strong>Total Dockage</strong></td>
        <td class="uom-col">%</td>
        <td class="standard-col"></td>
        <td class="actual-col"></td>
      </tr>
    </tbody>
  </table>

  <div class="comments-section">
    <div class="comments-title">Comments & Action:</div>
    <div>${formData.comments_action || ""}</div>
  </div>

  <div class="signature-section">
    <div class="signature-container">
      <div class="signature-box">
        Lab Chemist Signature
      </div>
      <div class="signature-box">
        QA Head Signature
      </div>
    </div>
  </div>
  </body>
  </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = function () {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 250);
      };
    } else {
      notify.showWarning("Please allow pop-ups to generate PDF");
    }
  };
  const handleEdit = async (labTest) => {
    // Load ALL vehicles for edit mode (not just available ones)
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data);

      // Find the vehicle for this lab test
      const vehicle = response.data.find(v => v.id === labTest.vehicle_entry_id);
      setSelectedVehicle(vehicle);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }

    setEditMode(true);
    setCurrentLabTest(labTest);
    setVehicleSearchText("");
    setVehicleFilterType("vehicle");
    setFormData({
      vehicle_entry_id: labTest.vehicle_entry_id?.toString() || "",
      test_date: labTest.test_date ? new Date(labTest.test_date) : new Date(),
      wheat_variety: labTest.wheat_variety || "",
      bill_number: labTest.bill_number || "",
      // document_no: labTest.document_no || "", // Removed
      // issue_no: labTest.issue_no || "01", // Removed
      // issue_date: labTest.issue_date ? new Date(labTest.issue_date) : new Date(), // Removed
      department: labTest.department || "QA",
      moisture: labTest.moisture?.toString() || "",
      hectoliter_weight: labTest.test_weight?.toString() || "",
      protein_percent: labTest.protein_percent?.toString() || "",
      wet_gluten: labTest.wet_gluten?.toString() || "",
      dry_gluten: labTest.dry_gluten?.toString() || "",
      sedimentation_value: labTest.falling_number?.toString() || "",
      chaff_husk: labTest.chaff_husk?.toString() || "",
      straws_sticks: labTest.straws_sticks?.toString() || "",
      other_foreign_matter: labTest.other_foreign_matter?.toString() || "",
      mudballs: labTest.mudballs?.toString() || "",
      stones: labTest.stones?.toString() || "",
      dust_sand: labTest.dust_sand?.toString() || "",
      total_impurities: labTest.total_impurities?.toString() || "0.00",
      shriveled_wheat: labTest.shriveled_wheat?.toString() || "",
      insect_damage: labTest.insect_damage?.toString() || "",
      blackened_wheat: labTest.blackened_wheat?.toString() || "",
      other_grains: labTest.sprouted_grains?.toString() || "",
      soft_wheat: labTest.other_grain_damage?.toString() || "",
      heat_damaged: "",
      immature_wheat: "",
      broken_wheat: "",
      total_dockage: labTest.total_dockage?.toString() || "0.00",
      category: labTest.category || "",
      comments_action: labTest.remarks || "",
      approved: false,
      tested_by: labTest.tested_by || "",
      raise_claim: labTest.raise_claim || false, // Load existing raise_claim state
    });

    setModalVisible(true);
  };

  const handleDelete = async (labTest) => {
    notify.showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this lab test?',
      async () => {
        try {
          await labTestApi.delete(labTest.id);
          notify.showSuccess('Lab test deleted successfully');
          loadLabTests();
        } catch (error) {
          notify.showError('Failed to delete lab test');
          console.error(error);
        }
      }
    );
  };

  const openRaiseClaimModal = (labTest) => {
    setSelectedLabTestForClaim(labTest);
    setClaimFormData({
      description: "", // Clear previous description if any
      claim_type: "",
      claim_amount: "",
      claim_date: new Date(),
    });
    setRaiseClaimModalVisible(true);
  };

  const handleRaiseClaim = async () => {
    if (!claimFormData.description.trim()) {
      notify.showError("Please enter the description");
      return;
    }

    try {
      setLoading(true);
      await claimApi.create({
        lab_test_id: selectedLabTestForClaim.id,
        description: claimFormData.description,
        claim_type: claimFormData.claim_type || null,
        claim_amount: claimFormData.claim_amount ? parseFloat(claimFormData.claim_amount) : null,
        claim_date: claimFormData.claim_date.toISOString(),
      });

      notify.showSuccess("Claim raised successfully");
      setRaiseClaimModalVisible(false);
      setClaimFormData({
        description: "",
        claim_type: "",
        claim_amount: "",
        claim_date: new Date(),
      });
      loadLabTests(); // Reload to update claim status
    } catch (error) {
      notify.showError("Failed to raise claim");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { label: "ID", field: "id", width: 80 },
    {
      label: "Bill Number",
      field: "bill_number",
      width: 120,
      render: (value) => value || "-",
    },
    {
      label: "Vehicle",
      field: "vehicle_entry",
      width: 150,
      render: (vehicle) => vehicle?.vehicle_number || "-",
    },
    {
      label: "Supplier",
      field: "vehicle_entry",
      width: 180,
      render: (vehicle) => vehicle?.supplier?.supplier_name || "-",
    },
    {
      label: "Wheat Variety",
      field: "wheat_variety",
      width: 150,
      render: (value) => value || "-",
    },
    { label: "Moisture %", field: "moisture", width: 120 },
    { label: "Total Impurities %", field: "total_impurities", width: 150 },
    {
      label: "Test Date",
      field: "test_date",
      width: 180,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      label: "Actions",
      field: "id",
      width: 150,
      render: (value, labTest) => {
        const hasClaim = labTest.has_claim;
        return (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {!hasClaim ? (
              <TouchableOpacity
                style={styles.raiseClaimButton}
                onPress={() => openRaiseClaimModal(labTest)}
              >
                <Text style={styles.raiseClaimButtonText}>Raise Claim</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.claimedText}>Claimed</Text>
            )}
          </View>
        );
      },
    },
  ];

  return (
    <Layout title="Lab Tests" navigation={navigation} currentRoute="LabTest">
      <DataTable
        columns={columns}
        data={labTests}
        onAdd={openAddModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editMode ? "Edit Raw Wheat Quality Report" : "Raw Wheat Quality Report"}
        width={isMobile ? "100%" : isTablet ? "75%" : "800px"}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.form}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Select Vehicle *</Text>
                <View style={styles.rowField}>
                  {/* Filter Type Selection */}
                  <View style={styles.filterTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterTypeButton,
                        vehicleFilterType === "vehicle" && styles.filterTypeButtonActive,
                      ]}
                      onPress={() => {
                        setVehicleFilterType("vehicle");
                        setVehicleSearchText("");
                      }}
                    >
                      <Text
                        style={[
                          styles.filterTypeText,
                          vehicleFilterType === "vehicle" && styles.filterTypeTextActive,
                        ]}
                      >
                        By Vehicle Number
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterTypeButton,
                        vehicleFilterType === "supplier" && styles.filterTypeButtonActive,
                      ]}
                      onPress={() => {
                        setVehicleFilterType("supplier");
                        setVehicleSearchText("");
                      }}
                    >
                      <Text
                        style={[
                          styles.filterTypeText,
                          vehicleFilterType === "supplier" && styles.filterTypeTextActive,
                        ]}
                      >
                        By Supplier Name
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Search Input */}
                  <TextInput
                    style={styles.input}
                    value={vehicleSearchText}
                    onChangeText={setVehicleSearchText}
                    placeholder={
                      vehicleFilterType === "vehicle"
                        ? "Search by vehicle number..."
                        : "Search by supplier name..."
                    }
                  />

                  {/* Vehicle Picker with Filtered Results */}
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.vehicle_entry_id?.toString() || ""}
                      onValueChange={handleVehicleChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Vehicle" value="" />
                      {filteredVehicles.map((vehicle) => (
                        <Picker.Item
                          key={vehicle.id}
                          label={`${vehicle.vehicle_number} - ${vehicle.supplier?.supplier_name || "N/A"}`}
                          value={vehicle.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>

                  {vehicleSearchText && filteredVehicles.length === 0 && (
                    <Text style={styles.noResultsText}>
                      No vehicles found matching "{vehicleSearchText}"
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Bill Number</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.bill_number}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Quality Category (Wheat Variety) *</Text>
                <View style={styles.rowField}>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.wheat_variety}
                      onValueChange={(value) =>
                        setFormData({ ...formData, wheat_variety: value })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Quality Category" value="" />
                      {qualityCategories.map((cat, index) => (
                        <Picker.Item
                          key={index}
                          label={cat.label}
                          value={cat.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Test Date *</Text>
                <View style={styles.rowField}>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
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

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Tested By</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.tested_by}
                    onChangeText={(text) =>
                      setFormData({ ...formData, tested_by: text })
                    }
                    placeholder="Name of lab chemist"
                  />
                </View>
              </View>
            </View>

            {/* Raise Claim Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Raise Claim</Text>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setFormData({ ...formData, raise_claim: !formData.raise_claim })
                  }
                >
                  {formData.raise_claim && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxText}>Yes/No</Text>
              </View>
            </View>


            {/* Test Parameters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Parameters</Text>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Moisture (%)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.moisture}
                    onChangeText={(text) =>
                      setFormData({ ...formData, moisture: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="8-10.5"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Hectoliter Weight (Kg/hl)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.hectoliter_weight}
                    onChangeText={(text) =>
                      setFormData({ ...formData, hectoliter_weight: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder=">75"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Wet Gluten (%)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.wet_gluten}
                    onChangeText={(text) =>
                      setFormData({ ...formData, wet_gluten: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="32-33"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Dry Gluten</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.dry_gluten}
                    onChangeText={(text) =>
                      setFormData({ ...formData, dry_gluten: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="10.5-11.5"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Sedimentation Value (ml)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.sedimentation_value}
                    onChangeText={(text) =>
                      setFormData({ ...formData, sedimentation_value: text })
                    }
                    keyboardType="decimal-pad"
                    placeholder="24-25"
                  />
                </View>
              </View>
            </View>

            {/* Impurities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Refractions / Impurities</Text>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Chaff/Husk</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.chaff_husk}
                    onChangeText={(text) =>
                      setFormData({ ...formData, chaff_husk: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Straws/Sticks</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.straws_sticks}
                    onChangeText={(text) =>
                      setFormData({ ...formData, straws_sticks: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Other Foreign Matter</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.other_foreign_matter}
                    onChangeText={(text) =>
                      setFormData({ ...formData, other_foreign_matter: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Mudballs (%, &lt;3)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.mudballs}
                    onChangeText={(text) =>
                      setFormData({ ...formData, mudballs: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Stones</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.stones}
                    onChangeText={(text) =>
                      setFormData({ ...formData, stones: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Dust/Sand</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.dust_sand}
                    onChangeText={(text) =>
                      setFormData({ ...formData, dust_sand: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Total Impurities (%)</Text>
                <View style={styles.rowField}>
                  <Text style={styles.totalValue}>
                    {formData.total_impurities}
                  </Text>
                </View>
              </View>
            </View>

            {/* Grain Dockage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grain Dockage</Text>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Shriveled Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.shriveled_wheat}
                    onChangeText={(text) =>
                      setFormData({ ...formData, shriveled_wheat: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Insect Bored Damage</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.insect_damage}
                    onChangeText={(text) =>
                      setFormData({ ...formData, insect_damage: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Blackened Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.blackened_wheat}
                    onChangeText={(text) =>
                      setFormData({ ...formData, blackened_wheat: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Other Grains (%)</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.other_grains}
                    onChangeText={(text) =>
                      setFormData({ ...formData, other_grains: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Soft Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.soft_wheat}
                    onChangeText={(text) =>
                      setFormData({ ...formData, soft_wheat: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Heat Damaged Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.heat_damaged}
                    onChangeText={(text) =>
                      setFormData({ ...formData, heat_damaged: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Immature Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.immature_wheat}
                    onChangeText={(text) =>
                      setFormData({ ...formData, immature_wheat: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Broken Wheat</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={formData.broken_wheat}
                    onChangeText={(text) =>
                      setFormData({ ...formData, broken_wheat: text })
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Total Dockage (%)</Text>
                <View style={styles.rowField}>
                  <Text style={styles.totalValue}>{formData.total_dockage}</Text>
                </View>
              </View>
            </View>

            {/* Comments & Final Approval */}
            <View style={styles.section}>
              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Comments & Action</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.comments_action}
                    onChangeText={(text) =>
                      setFormData({ ...formData, comments_action: text })
                    }
                    placeholder="Enter comments and actions here..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              <View style={styles.approvalBox}>
                <Text style={styles.approvalTitle}>Final Approval</Text>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() =>
                    setFormData({ ...formData, approved: !formData.approved })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      formData.approved && styles.checkboxChecked,
                    ]}
                  >
                    {formData.approved && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.checkboxLabel}>
                    <Text style={styles.checkboxText}>
                      Approve this vehicle for unloading
                    </Text>
                    <Text style={styles.checkboxSubtext}>
                      Check only if quality meets standards
                    </Text>
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
                style={[
                  styles.button,
                  styles.saveButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Saving..." : editMode ? "Update Test" : "Save Test"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.raiseClaimFormButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSaveAndRaiseClaim}
                disabled={loading}
              >
                <Text style={styles.raiseClaimFormButtonText}>
                  {loading ? "Saving..." : "Save & Raise Claim"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Raise Claim Modal */}
      <Modal
        visible={raiseClaimModalVisible}
        onClose={() => setRaiseClaimModalVisible(false)}
        title="Raise Claim"
        width={isMobile ? "100%" : isTablet ? "70%" : "500px"}
      >
        <View style={styles.claimModalContent}>
          <Text style={styles.claimLabel}>
            Lab Test: {selectedLabTestForClaim?.document_no || "N/A"}
          </Text>
          <Text style={styles.claimSubLabel}>
            Vehicle: {selectedLabTestForClaim?.vehicle_entry?.vehicle_number || "N/A"}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={claimFormData.description}
              onChangeText={(text) =>
                setClaimFormData({ ...claimFormData, description: text })
              }
              placeholder="Describe the issue..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Claim Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={claimFormData.claim_type}
                onValueChange={(value) =>
                  setClaimFormData({ ...claimFormData, claim_type: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Select Claim Type" value="" />
                <Picker.Item label="Percentage (%)" value="percentage" />
                <Picker.Item label="Rupees per Kilogram (₹/kg)" value="per_kg" />
              </Picker>
            </View>
          </View>

          {claimFormData.claim_type && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Claim Amount {claimFormData.claim_type === "percentage" ? "(%)" : "(₹/kg)"}
              </Text>
              <TextInput
                style={styles.input}
                value={claimFormData.claim_amount}
                onChangeText={(text) =>
                  setClaimFormData({ ...claimFormData, claim_amount: text })
                }
                placeholder={claimFormData.claim_type === "percentage" ? "Enter percentage" : "Enter amount per kg"}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.claimButtonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setRaiseClaimModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleRaiseClaim}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? "Submitting..." : "Raise Claim"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  form: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  formRow: {
    flexDirection: Platform.select({ 
      web: "row", 
      default: "column" 
    }),
    marginBottom: 10,
    alignItems: Platform.select({ 
      web: "center", 
      default: "stretch" 
    }),
    gap: Platform.select({ web: 12, default: 4 }),
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    width: Platform.select({ 
      web: "38%", 
      default: "100%" 
    }),
    minWidth: Platform.select({ web: 160, default: "auto" }),
  },
  rowField: {
    flex: 1,
    width: Platform.select({ 
      web: "62%", 
      default: "100%" 
    }),
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  field: {
    flex: 1,
    minWidth: Platform.select({ web: 200, default: "100%" }),
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 4,
    padding: 8,
    fontSize: 13,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minHeight: 38,
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    color: colors.textSecondary,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 4,
    backgroundColor: colors.surface,
    minHeight: 38,
  },
  picker: {
    height: Platform.OS === "ios" ? 150 : 50,
  },
  totalField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    padding: 12,
  },
  approvalBox: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginTop: 12,
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#155724",
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#28a745",
    borderRadius: 3,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#28a745",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#155724",
  },
  checkboxSubtext: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    minWidth: Platform.select({ web: 90, default: "48%" }),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  raiseClaimButton: {
    backgroundColor: colors.warning,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  raiseClaimButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  raiseClaimFormButton: {
    backgroundColor: colors.warning,
  },
  raiseClaimFormButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  downloadButton: {
    backgroundColor: "#6c757d",
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  claimedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 6,
  },
  claimModalContent: {
    padding: Platform.select({ web: 20, default: 16 }),
  },
  claimLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  claimSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  claimButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
    flexWrap: "wrap",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  filterTypeContainer: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 6,
  },
  filterTypeButton: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  filterTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  filterTypeTextActive: {
    color: colors.onPrimary,
  },
  noResultsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 3,
  },
});