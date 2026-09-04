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
  Alert,
} from "react-native";
import notify from "../utils/notifications";
import { Picker } from "@react-native-picker/picker";
import Layout from "../components/Layout";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { vehicleApi, labTestApi, claimApi, API_BASE_URL } from "../api/client";
import colors from "../theme/colors";
import { formatISTDate, formatISTDateTime } from "../utils/dateUtils";

async function getLogoBase64() {
  try {
    const logoUrl = `${API_BASE_URL}/uploads/new-logo.png`;
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildLabTestHTML(labTest, logoBase64) {
  const v = labTest.vehicle_entry || {};
  const supplier = v.supplier || {};
  const D = (d) => d ? formatISTDate(d) : '';
  const DT = (d) => d ? formatISTDateTime(d) : '';
  const N = (n) => (n != null && n !== '') ? Number(n).toFixed(2) : '';
  const S = (s) => (s != null && s !== '') ? String(s) : '';

  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" alt="BRFM" style="width:64px;height:64px;object-fit:contain;display:block;" />`
    : `<div style="width:64px;height:64px;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14pt;text-align:center;line-height:1.2;">BR<br/>FM</div>`;

  const td = (content, style = '') =>
    `<td style="border:1px solid #000;padding:3px 5px;${style}">${content}</td>`;

  const sectionHeader = (label) =>
    `<tr><td colspan="5" style="border:1px solid #000;padding:3px 5px;font-weight:bold;text-align:center;background:#f0f0f0;">${label}</td></tr>`;

  const dataRow = (sr, test, uom, standard, actual) =>
    `<tr>
      ${td(sr, 'text-align:center;width:32px;')}
      ${td(test)}
      ${td(uom, 'text-align:center;width:50px;')}
      ${td(standard, 'text-align:center;width:80px;')}
      ${td(actual, 'text-align:center;width:110px;')}
    </tr>`;

  return `
<div style="font-family:Arial,sans-serif;font-size:9.5pt;color:#000;width:100%;max-width:720px;margin:0 auto;border:1.5px solid #000;">

  <!-- Header -->
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-bottom:1.5px solid #000;">
    <tr>
      <td style="width:80px;padding:8px;border-right:1px solid #000;vertical-align:middle;text-align:center;">
        ${logoHTML}
      </td>
      <td style="padding:8px;vertical-align:middle;text-align:center;">
        <div style="font-size:15pt;font-weight:900;letter-spacing:0.5px;">Raw Wheat Quality Report</div>
      </td>
      <td style="width:160px;padding:8px;border-left:1px solid #000;vertical-align:top;font-size:8.5pt;line-height:1.7;">
        <div>Dept.-QA</div>
      </td>
    </tr>
  </table>

  <!-- Info fields -->
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-bottom:1px solid #000;">
    <tr>
      <td style="padding:4px 8px;border-right:1px solid #000;font-size:9pt;width:50%;">
        <strong>WHEAT VARIETY:</strong> ${S(labTest.wheat_variety)}
      </td>
      <td style="padding:4px 8px;font-size:9pt;">
        <strong>DATE:</strong> ${D(labTest.test_date)}
      </td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-right:1px solid #000;border-top:1px solid #000;font-size:9pt;" colspan="1">
        <strong>TRADER/SUPPLIER NAME:</strong> ${S(supplier.supplier_name)}
      </td>
      <td style="padding:4px 8px;border-top:1px solid #000;font-size:9pt;">
        <strong>BILL NO:</strong> ${S(labTest.bill_number)}
      </td>
    </tr>
    <tr>
      <td style="padding:4px 8px;border-right:1px solid #000;border-top:1px solid #000;font-size:9pt;">
        <strong>VEHICLE NO:</strong> ${S(v.vehicle_number)}&nbsp;&nbsp;&nbsp;<strong>ENTRY ID:</strong> ${S(labTest.vehicle_entry_id)}
      </td>
      <td style="padding:4px 8px;border-top:1px solid #000;font-size:9pt;">
        <strong>CATEGORY:</strong> ${S(labTest.category)}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:4px 8px;border-top:1px solid #000;font-size:9pt;">
        <strong>VEHICLE ARRIVAL DATE &amp; TIME:</strong> ${v.arrival_time ? DT(v.arrival_time) : ''}
      </td>
    </tr>
  </table>

  <!-- Main test table -->
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <thead>
      <tr>
        ${td('<strong>Sr.</strong>', 'text-align:center;width:32px;background:#f0f0f0;')}
        ${td('<strong>TEST</strong>', 'background:#f0f0f0;')}
        ${td('<strong>UOM</strong>', 'text-align:center;width:50px;background:#f0f0f0;')}
        ${td('<strong>STANDARD</strong>', 'text-align:center;width:80px;background:#f0f0f0;')}
        ${td('<strong>ACTUAL REPORT</strong>', 'text-align:center;width:110px;background:#f0f0f0;')}
      </tr>
    </thead>
    <tbody>
      ${dataRow('1', 'Moisture', '%', '8-10.5', N(labTest.moisture))}
      ${dataRow('2', 'Hectoliter weight', 'Kg/hl', '&gt;75', N(labTest.test_weight))}
      ${sectionHeader('Gluten')}
      ${dataRow('a', 'Wet Gluten', '%', '', N(labTest.wet_gluten))}
      ${dataRow('b', 'Dry Gluten', '%', '32-33', N(labTest.dry_gluten))}
      ${dataRow('3', 'Protein %', '%', '', N(labTest.protein_percent))}
      ${dataRow('4', 'Sedimentation Value', 'ml', '24-25 ml', N(labTest.falling_number))}
      ${sectionHeader('Refractions')}
      ${dataRow('a', 'Chaff / Husk', '%', '', N(labTest.chaff_husk))}
      ${dataRow('b', 'Straws / Sticks', '%', '', N(labTest.straws_sticks))}
      ${dataRow('c', 'Other Foreign Matter (OFM)', '%', '', N(labTest.other_foreign_matter))}
      ${dataRow('d', 'Mudballs', '%', '&lt;3', N(labTest.mudballs))}
      ${dataRow('e', 'Stones', '%', '', N(labTest.stones))}
      ${dataRow('f', 'Dust / Sand', '%', '', N(labTest.dust_sand))}
      <tr>
        <td colspan="3" style="border:1px solid #000;padding:3px 5px;font-weight:bold;">Total Impurities (%)</td>
        <td style="border:1px solid #000;padding:3px 5px;text-align:center;font-weight:bold;"></td>
        <td style="border:1px solid #000;padding:3px 5px;text-align:center;font-weight:bold;">${N(labTest.total_impurities)}</td>
      </tr>
      ${sectionHeader('Grain Dockage')}
      ${dataRow('1', 'Shriveled wheat', '%', '0.5', N(labTest.shriveled_wheat))}
      ${dataRow('2', 'Insect Bored damage', '%', '0.5', N(labTest.insect_damage))}
      ${dataRow('3', 'Blackened wheat', '%', '0.5', N(labTest.blackened_wheat))}
      ${dataRow('4', 'Other Grains', '%', '0.5', N(labTest.sprouted_grains))}
      ${dataRow('5', 'Soft Wheat', '%', '0.5', N(labTest.other_grain_damage))}
      ${dataRow('6', 'Heat Damaged wheat', '%', '0.5', '')}
      ${dataRow('7', 'Immature wheat', '%', '0.5', '')}
      ${dataRow('8', 'Broken wheat', '%', '0.5', '')}
      <tr>
        <td colspan="3" style="border:1px solid #000;padding:3px 5px;font-weight:bold;">Total Dockage</td>
        <td style="border:1px solid #000;padding:3px 5px;text-align:center;">%</td>
        <td style="border:1px solid #000;padding:3px 5px;text-align:center;font-weight:bold;">${N(labTest.total_dockage)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Comments -->
  <div style="border-top:1px solid #000;padding:6px 8px;">
    <div style="font-weight:bold;font-size:9pt;margin-bottom:4px;">Comments &amp; Action:</div>
    <div style="min-height:40px;font-size:9pt;">${S(labTest.remarks)}</div>
  </div>

  <!-- Signatures -->
  <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #000;">
    <tr>
      <td style="padding:10px 20px;width:50%;border-right:1px solid #000;font-size:9pt;">
        <div style="font-weight:bold;margin-bottom:30px;">Lab Chemist Signature</div>
        <div style="border-top:1px solid #000;width:120px;">&nbsp;</div>
        <div style="font-size:8pt;margin-top:2px;">Tested by: ${S(labTest.tested_by)}</div>
      </td>
      <td style="padding:10px 20px;width:50%;font-size:9pt;">
        <div style="font-weight:bold;margin-bottom:30px;">QA Head Signature</div>
        <div style="border-top:1px solid #000;width:120px;">&nbsp;</div>
        <div style="font-size:8pt;margin-top:2px;">&nbsp;</div>
      </td>
    </tr>
  </table>
</div>`;
}

async function printLabTestReport(labTest) {
  if (Platform.OS !== 'web') return;
  const logoBase64 = await getLogoBase64();
  const html = buildLabTestHTML(labTest, logoBase64);
  const win = window.open('', '_blank', 'width=860,height=900');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Raw Wheat Quality Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #000; padding: 14mm 12mm; }
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
    }
    .no-print {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 8px 12px; background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1; margin-bottom: 14px;
    }
    .no-print button {
      padding: 7px 18px; border-radius: 5px; border: none;
      cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .btn-print { background: #1e3a5f; color: #fff; }
    .btn-close { background: #e2e8f0; color: #374151; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #000; }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  ${html}
</body>
</html>`);
  win.document.close();
  win.focus();
}

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
  const [currentStep, setCurrentStep] = useState(0); // step-wise progressive form
  const PHYSICAL_KEYS = ["moisture", "hectoliter_weight", "protein_percent", "wet_gluten", "dry_gluten", "sedimentation_value"];
  const FOREIGN_KEYS = ["chaff_husk", "straws_sticks", "other_foreign_matter", "mudballs", "stones", "dust_sand"];
  const DAMAGE_KEYS = ["shriveled_wheat", "insect_damage", "blackened_wheat", "other_grains", "soft_wheat", "heat_damaged", "immature_wheat", "broken_wheat"];
  const STEP_LABELS = ["Vehicle", "Basic & Physical", "Impurities", "Dockage", "Sign-off"];

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
    raise_claim: false,
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

  // Auto-advance step-wise form: each section unlocks after the previous gets activity.
  useEffect(() => {
    const hasAnyValue = (keys) =>
      keys.some((k) => {
        const v = formData[k];
        return v !== "" && v !== null && v !== undefined;
      });
    let step = 0;
    if (formData.vehicle_entry_id) step = Math.max(step, 1);
    if (hasAnyValue(PHYSICAL_KEYS)) step = Math.max(step, 2);
    if (hasAnyValue(FOREIGN_KEYS)) step = Math.max(step, 3);
    if (hasAnyValue(DAMAGE_KEYS)) step = Math.max(step, 4);
    setCurrentStep((prev) => Math.max(prev, step));
  }, [formData]);

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!vehicleSearchText) return true;
    const searchLower = vehicleSearchText.toLowerCase();
    if (vehicleFilterType === "vehicle") {
      return (vehicle.vehicle_number || "").toLowerCase().includes(searchLower);
    } else {
      return (vehicle.supplier?.supplier_name || "").toLowerCase().includes(searchLower);
    }
  });

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getAvailableForTesting();
      setVehicles(response.data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      notify.showError("Failed to load vehicles");
    }
  };

  const loadLabTests = async () => {
    try {
      const response = await labTestApi.getAll();
      setLabTests(response.data || []);
    } catch (error) {
      console.error("Error loading lab tests:", error);
      notify.showError("Failed to load Lab Tests");
      setLabTests([]);
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
    const total = impurities.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
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
    const total = dockage.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    setFormData((prev) => ({ ...prev, total_dockage: total.toFixed(2) }));
  };

  const handleVehicleChange = async (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === parseInt(vehicleId));
    if (!vehicle) return;
    setSelectedVehicle(vehicle);
    setFormData((prev) => ({
      ...prev,
      vehicle_entry_id: vehicleId,
      bill_number: vehicle.bill_no || "",
    }));
  };

  const openAddModal = async () => {
    await loadVehicles();
    setEditMode(false);
    setCurrentLabTest(null);
    setVehicleSearchText("");
    setVehicleFilterType("vehicle");
    setCurrentStep(0);
    setFormData({
      vehicle_entry_id: "",
      test_date: new Date(),
      wheat_variety: "",
      bill_number: "",
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
      raise_claim: false,
    });
    setSelectedVehicle(null);
    setModalVisible(true);
  };

  const handleEdit = (labTest) => {
    setEditMode(true);
    setCurrentLabTest(labTest);
    setCurrentStep(4); // existing record → reveal all sections
    setFormData({
      vehicle_entry_id: labTest.vehicle_entry_id.toString(),
      test_date: new Date(labTest.test_date),
      wheat_variety: labTest.wheat_variety || "",
      bill_number: labTest.bill_number || "",
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
      total_dockage: labTest.total_dockage?.toString() || "0.00",
      category: labTest.category || "",
      comments_action: labTest.remarks || "",
      approved: labTest.approved || false,
      tested_by: labTest.tested_by || "",
      raise_claim: labTest.raise_claim === 1 || labTest.raise_claim === true,
    });
    setSelectedVehicle(labTest.vehicle_entry);
    setModalVisible(true);
  };

  const handleDelete = async (labTest) => {
    if (!window.confirm("Are you sure you want to delete this lab test?")) return;
    try {
      await labTestApi.delete(labTest.id);
      notify.showSuccess("Lab Test deleted successfully!");
      loadLabTests();
    } catch (error) {
      console.error("Error deleting lab test:", error);
      notify.showError("Failed to delete lab test");
    }
  };

  const renderDatePicker = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Test Date *</Text>
          <input
            type="date"
            value={formData.test_date.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value + 'T00:00:00');
              setFormData({ ...formData, test_date: date });
            }}
            style={{
              display: 'block',
              boxSizing: 'border-box',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 14,
              width: '100%',
              backgroundColor: '#fff',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </View>
      );
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_entry_id) {
      notify.showWarning("Please select a vehicle");
      return;
    }
    setLoading(true);
    try {
      const submitData = {
        vehicle_entry_id: parseInt(formData.vehicle_entry_id),
        wheat_variety: formData.wheat_variety || null,
        bill_number: formData.bill_number || null,
        test_date: formData.test_date.toISOString(),
        department: formData.department || "QA",
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
        category: formData.category || null,
        remarks: formData.comments_action || null,
        tested_by: formData.tested_by || null,
        raise_claim: formData.raise_claim ? 1 : 0,
        approved: formData.approved ? true : false,
      };
      if (editMode && currentLabTest) {
        await labTestApi.update(currentLabTest.id, submitData);
        notify.showSuccess("Lab Test updated successfully!");
      } else {
        await labTestApi.create(submitData);
        notify.showSuccess("Lab Test created successfully!");
      }
      setModalVisible(false);
      loadLabTests();
      loadVehicles();
    } catch (error) {
      console.error(error);
      notify.showError("Failed to save lab test");
    } finally {
      setLoading(false);
    }
  };

  const openRaiseClaimModal = (labTest) => {
    setSelectedLabTestForClaim(labTest);
    setClaimFormData({
      description: "",
      claim_type: "",
      claim_amount: "",
      claim_date: new Date(),
    });
    setRaiseClaimModalVisible(true);
  };

  const handleRaiseClaim = async () => {
    if (!claimFormData.claim_type || !claimFormData.claim_amount) {
      notify.showWarning("Please fill required fields");
      return;
    }
    try {
      await claimApi.create({
        lab_test_id: selectedLabTestForClaim.id,
        ...claimFormData,
        claim_date: claimFormData.claim_date.toISOString(),
      });
      notify.showSuccess("Claim raised successfully!");
      setRaiseClaimModalVisible(false);
      loadLabTests();
    } catch (error) {
      console.error(error);
      notify.showError("Failed to raise claim");
    }
  };

  const columns = [
    { label: "ID", field: "id", width: 60, key: "id" },
    {
      label: "Bill Number",
      field: "bill_number",
      width: 120,
      key: "bill_number",
      render: (val) => (typeof val === 'string' || typeof val === 'number') ? val : "-",
    },
    {
      label: "Vehicle",
      field: "vehicle_entry",
      width: 150,
      key: "vehicle_number",
      render: (vehicleEntry) => vehicleEntry?.vehicle_number || "-",
    },
    {
      label: "Supplier",
      field: "vehicle_entry",
      width: 180,
      key: "supplier_name",
      render: (vehicleEntry) => vehicleEntry?.supplier?.supplier_name || "-",
    },
    {
      label: "Wheat Variety",
      field: "wheat_variety",
      width: 150,
      key: "wheat_variety",
      render: (val) => (typeof val === 'string' || typeof val === 'number') ? val : "-",
    },
    { 
      label: "Moisture %", 
      field: "moisture", 
      width: 120, 
      key: "moisture",
      render: (val) => (typeof val === 'string' || typeof val === 'number') ? val : "-",
    },
    { 
      label: "Total Impurities %", 
      field: "total_impurities", 
      width: 150, 
      key: "total_impurities",
      render: (val) => (typeof val === 'string' || typeof val === 'number') ? val : "-",
    },
    {
      label: "Actions",
      field: "id",
      width: 220,
      key: "actions",
      render: (_, row) => {
        const hasClaim = row && (row.has_claim === 1 || row.has_claim === true);
        return (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {!hasClaim ? (
              <TouchableOpacity
                style={styles.raiseClaimButton}
                onPress={() => openRaiseClaimModal(row)}
              >
                <Text style={styles.raiseClaimButtonText}>Raise Claim</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.claimedText}>Claimed</Text>
            )}
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => printLabTestReport(row)}
            >
              <Text style={styles.printButtonText}>🖨 Print</Text>
            </TouchableOpacity>
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
            {/* ── Step indicator ── */}
            <View style={styles.stepperRow}>
              {STEP_LABELS.map((label, idx) => {
                const reached = currentStep >= idx;
                const active = currentStep === idx;
                return (
                  <View key={label} style={styles.stepperItem}>
                    <View
                      style={[
                        styles.stepperDot,
                        reached && styles.stepperDotReached,
                        active && styles.stepperDotActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepperDotText,
                          reached && styles.stepperDotTextReached,
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepperLabel,
                        reached && styles.stepperLabelReached,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    {idx < STEP_LABELS.length - 1 && (
                      <View
                        style={[
                          styles.stepperBar,
                          currentStep > idx && styles.stepperBarReached,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Step 1: Vehicle (always visible) ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step 1 · Select Vehicle</Text>
              <View style={styles.formRow}>
                <Text style={styles.rowLabel}>Vehicle *</Text>
                <View style={styles.rowField}>
                  <TextInput
                    style={styles.input}
                    value={vehicleSearchText}
                    onChangeText={setVehicleSearchText}
                    placeholder="Search vehicle or supplier..."
                  />
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.vehicle_entry_id}
                      onValueChange={handleVehicleChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Vehicle" value="" />
                      {filteredVehicles.map((v) => (
                        <Picker.Item
                          key={v.id}
                          label={`${v.vehicle_number} - ${v.bill_no} - ${v.supplier?.supplier_name}`}
                          value={v.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
              {currentStep < 1 && (
                <Text style={styles.hintText}>Pick a vehicle to continue.</Text>
              )}
            </View>

            {/* ── Step 2: Basic Info + Physical Parameters ── */}
            {currentStep >= 1 && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Step 2 · Basic Information</Text>
                  {renderDatePicker()}
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <Text style={styles.label}>Bill Number</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.bill_number}
                        onChangeText={(v) => setFormData({ ...formData, bill_number: v })}
                        placeholder="Bill No."
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.label}>Wheat Variety</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.wheat_variety}
                        onChangeText={(v) => setFormData({ ...formData, wheat_variety: v })}
                        placeholder="e.g. Sharbati"
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.label}>Department</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.department}
                        onChangeText={(v) => setFormData({ ...formData, department: v })}
                        placeholder="QA"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Step 2 · Physical Parameters</Text>
                  <View style={styles.paramTable}>
                    <View style={[styles.paramRow, styles.paramHeaderRow]}>
                      <Text style={[styles.paramSr, styles.paramHeaderText]}>Sr</Text>
                      <Text style={[styles.paramName, styles.paramHeaderText]}>Parameter</Text>
                      <Text style={[styles.paramStd, styles.paramHeaderText]}>Standard</Text>
                      <Text style={[styles.paramVal, styles.paramHeaderText]}>Value</Text>
                    </View>
                    {[
                      { key: "moisture", label: "Moisture %", std: "12-14%" },
                      { key: "hectoliter_weight", label: "Hectoliter Wt (Kg/Hl)", std: ">75 Kg/Hl" },
                      { key: "protein_percent", label: "Protein %", std: "12-13%" },
                      { key: "wet_gluten", label: "Wet Gluten %", std: ">30%" },
                      { key: "dry_gluten", label: "Dry Gluten %", std: "32-33%" },
                      { key: "sedimentation_value", label: "Falling No. / Sedimentation", std: "24-25 ml" },
                    ].map((f, idx) => (
                      <View key={f.key} style={[styles.paramRow, idx % 2 === 1 && styles.paramRowAlt]}>
                        <Text style={styles.paramSr}>{idx + 1}</Text>
                        <Text style={styles.paramName}>{f.label}</Text>
                        <Text style={styles.paramStd}>{f.std}</Text>
                        <TextInput
                          style={styles.paramValInput}
                          value={formData[f.key]}
                          onChangeText={(v) => setFormData({ ...formData, [f.key]: v })}
                          keyboardType="decimal-pad"
                          placeholder="—"
                        />
                      </View>
                    ))}
                  </View>
                  {currentStep < 2 && (
                    <Text style={styles.hintText}>
                      Enter at least one physical value to reveal Foreign Matter →
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* ── Step 3: Foreign Matter ── */}
            {currentStep >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Step 3 · Foreign Matter / Impurities (%)</Text>
                <View style={styles.paramTable}>
                  <View style={[styles.paramRow, styles.paramHeaderRow]}>
                    <Text style={[styles.paramSr, styles.paramHeaderText]}>Sr</Text>
                    <Text style={[styles.paramName, styles.paramHeaderText]}>Parameter</Text>
                    <Text style={[styles.paramStd, styles.paramHeaderText]}>Std %</Text>
                    <Text style={[styles.paramVal, styles.paramHeaderText]}>Value</Text>
                  </View>
                  {[
                    { key: "chaff_husk", label: "Chaff / Husk", std: "<3%" },
                    { key: "straws_sticks", label: "Straws / Sticks", std: "<1%" },
                    { key: "other_foreign_matter", label: "Other Foreign Matter (OFM)", std: "<3%" },
                    { key: "mudballs", label: "Mud Balls", std: "<0.5%" },
                    { key: "stones", label: "Stones", std: "<0.1%" },
                    { key: "dust_sand", label: "Dust / Sand", std: "<0.5%" },
                  ].map((f, idx) => (
                    <View key={f.key} style={[styles.paramRow, idx % 2 === 1 && styles.paramRowAlt]}>
                      <Text style={styles.paramSr}>{String.fromCharCode(97 + idx)}</Text>
                      <Text style={styles.paramName}>{f.label}</Text>
                      <Text style={styles.paramStd}>{f.std}</Text>
                      <TextInput
                        style={styles.paramValInput}
                        value={formData[f.key]}
                        onChangeText={(v) => setFormData({ ...formData, [f.key]: v })}
                        keyboardType="decimal-pad"
                        placeholder="—"
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Impurities %</Text>
                  <Text style={styles.totalValue}>{formData.total_impurities}</Text>
                </View>
                {currentStep < 3 && (
                  <Text style={styles.hintText}>
                    Enter at least one impurity value to reveal Damaged Grains →
                  </Text>
                )}
              </View>
            )}

            {/* ── Step 4: Damaged Grains ── */}
            {currentStep >= 3 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Step 4 · Damaged Grains / Dockage (%)</Text>
                <View style={styles.paramTable}>
                  <View style={[styles.paramRow, styles.paramHeaderRow]}>
                    <Text style={[styles.paramSr, styles.paramHeaderText]}>Sr</Text>
                    <Text style={[styles.paramName, styles.paramHeaderText]}>Parameter</Text>
                    <Text style={[styles.paramStd, styles.paramHeaderText]}>Std %</Text>
                    <Text style={[styles.paramVal, styles.paramHeaderText]}>Value</Text>
                  </View>
                  {[
                    { key: "shriveled_wheat", label: "Shriveled Wheat", std: "0.5%" },
                    { key: "insect_damage", label: "Insect Bored Damage", std: "0.5%" },
                    { key: "blackened_wheat", label: "Blackened Wheat", std: "0.5%" },
                    { key: "other_grains", label: "Other Grains / Sprouted", std: "0.5%" },
                    { key: "soft_wheat", label: "Soft Wheat", std: "0.5%" },
                    { key: "heat_damaged", label: "Heat Damaged Wheat", std: "0.5%" },
                    { key: "immature_wheat", label: "Immature Wheat", std: "0.5%" },
                    { key: "broken_wheat", label: "Broken Wheat", std: "0.5%" },
                  ].map((f, idx) => (
                    <View key={f.key} style={[styles.paramRow, idx % 2 === 1 && styles.paramRowAlt]}>
                      <Text style={styles.paramSr}>{idx + 1}</Text>
                      <Text style={styles.paramName}>{f.label}</Text>
                      <Text style={styles.paramStd}>{f.std}</Text>
                      <TextInput
                        style={styles.paramValInput}
                        value={formData[f.key]}
                        onChangeText={(v) => setFormData({ ...formData, [f.key]: v })}
                        keyboardType="decimal-pad"
                        placeholder="—"
                      />
                    </View>
                  ))}
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Dockage %</Text>
                  <Text style={styles.totalValue}>{formData.total_dockage}</Text>
                </View>
                {currentStep < 4 && (
                  <Text style={styles.hintText}>
                    Enter at least one dockage value to reveal Sign-off →
                  </Text>
                )}
              </View>
            )}

            {/* ── Step 5: Categorization & Sign-off ── */}
            {currentStep >= 4 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Step 5 · Categorization & Sign-off</Text>
                <View style={styles.formRow}>
                  <Text style={styles.label}>Quality Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Category" value="" />
                      {qualityCategories.map((c) => (
                        <Picker.Item key={c.value} label={c.label} value={c.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.gridRow}>
                  <View style={styles.gridCell}>
                    <Text style={styles.label}>Tested By</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.tested_by}
                      onChangeText={(v) => setFormData({ ...formData, tested_by: v })}
                      placeholder="Lab analyst name"
                    />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.label}>Comments / Action</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                    value={formData.comments_action}
                    onChangeText={(v) => setFormData({ ...formData, comments_action: v })}
                    placeholder="Remarks, recommended action, etc."
                    multiline
                  />
                </View>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() =>
                    setFormData({ ...formData, approved: !formData.approved })
                  }
                >
                  <View
                    style={[
                      styles.checkBox,
                      formData.approved && styles.checkBoxOn,
                    ]}
                  >
                    {formData.approved && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>
                    Mark as Approved (release vehicle for Gate-In)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() =>
                    setFormData({ ...formData, raise_claim: !formData.raise_claim })
                  }
                >
                  <View
                    style={[
                      styles.checkBox,
                      formData.raise_claim && styles.checkBoxOn,
                    ]}
                  >
                    {formData.raise_claim && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>Mark for Raise Claim</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 1 && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "Saving..." : "Save Report"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={raiseClaimModalVisible}
        onClose={() => setRaiseClaimModalVisible(false)}
        title="Raise Quality Claim"
      >
        <View style={styles.modalPadding}>
          <Text style={styles.label}>Claim Type *</Text>
          <TextInput
            style={styles.input}
            value={claimFormData.claim_type}
            onChangeText={(text) => setClaimFormData({...claimFormData, claim_type: text})}
            placeholder="e.g. Moisture Excess"
          />
          <Text style={styles.label}>Claim Amount *</Text>
          <TextInput
            style={styles.input}
            value={claimFormData.claim_amount}
            onChangeText={(text) => setClaimFormData({...claimFormData, claim_amount: text})}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleRaiseClaim}>
            <Text style={styles.submitButtonText}>Submit Claim</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16 },
  section: {
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: colors.primary },
  formRow: { marginBottom: 12 },
  rowLabel: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  rowField: { width: "100%" },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridCell: {
    width: "33.33%",
    paddingHorizontal: 4,
    marginBottom: 6,
    minWidth: 140,
  },
  paramTable: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    overflow: "hidden",
  },
  paramHeaderRow: {
    backgroundColor: "#1e3a5f",
  },
  paramHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 36,
  },
  paramRowAlt: {
    backgroundColor: "#f0f4ff",
  },
  paramSr: {
    width: 28,
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    paddingVertical: 6,
    fontWeight: "600",
  },
  paramName: {
    flex: 2,
    fontSize: 11,
    color: "#374151",
    paddingVertical: 6,
    paddingLeft: 4,
  },
  paramStd: {
    width: 55,
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 6,
  },
  paramVal: {
    width: 60,
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
  },
  paramValInput: {
    width: 60,
    fontSize: 12,
    color: "#111827",
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
    height: 36,
  },
  inputContainer: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 10, fontSize: 14, backgroundColor: "#fff", marginBottom: 4 },
  pickerContainer: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, overflow: "hidden", backgroundColor: "#fff" },
  picker: { height: 44 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#eef2ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  totalLabel: { fontSize: 14, fontWeight: "600", color: colors.primary },
  totalValue: { fontSize: 16, fontWeight: "bold", color: colors.primary },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#9ca3af",
    backgroundColor: "#fff",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  checkLabel: { fontSize: 14, fontWeight: "500" },
  submitButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 6, alignItems: "center", marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  raiseClaimButton: { backgroundColor: "#fee2e2", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  raiseClaimButtonText: { color: "#ef4444", fontWeight: "600" },
  claimedText: { color: "#10b981", fontWeight: "600" },
  printButton: { backgroundColor: "#1e3a5f", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  printButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 4, color: "#374151" },
  modalPadding: { padding: 20 },
  scrollContainer: { flex: 1 },
  hintText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#6b7280",
    marginTop: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stepperItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepperDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    zIndex: 2,
  },
  stepperDotReached: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepperDotActive: {
    borderColor: "#fbbf24",
    borderWidth: 3,
  },
  stepperDotText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
  },
  stepperDotTextReached: {
    color: "#fff",
  },
  stepperLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  stepperLabelReached: {
    color: colors.primary,
    fontWeight: "600",
  },
  stepperBar: {
    position: "absolute",
    top: 14,
    left: "60%",
    right: "-40%",
    height: 2,
    backgroundColor: "#e5e7eb",
    zIndex: 1,
  },
  stepperBarReached: {
    backgroundColor: colors.primary,
  },
});
