import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "../components/Layout";
import Button from "../components/Button";
import InputField from "../components/InputField";
import TimePicker from "../components/TimePicker";
import SelectDropdown from "../components/SelectDropdown";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

// ─── Cross-platform Date/Time Picker Modal ────────────────────────────────────
// On web  → renders a native HTML <input type="date|time"> inside a modal
// On iOS/Android → lazily imports @react-native-community/datetimepicker
let NativeDateTimePicker = null;
if (Platform.OS !== "web") {
  try {
    NativeDateTimePicker =
      require("@react-native-community/datetimepicker").default;
  } catch (e) {
    console.warn("DateTimePicker not available:", e.message);
  }
}

function CrossPlatformDatePicker({
  visible,
  mode,
  currentValue,
  onConfirm,
  onDismiss,
}) {
  const [tempValue, setTempValue] = useState(currentValue || "");

  useEffect(() => {
    setTempValue(currentValue || "");
  }, [visible, currentValue]);

  if (!visible) return null;

  // ── WEB ──────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    const inputType = mode === "date" ? "date" : "time";
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.webBox}>
            <Text style={pickerStyles.title}>
              {mode === "date" ? "Select Date" : "Select Time"}
            </Text>
            <input
              type={inputType}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              style={{
                fontSize: 18,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                marginVertical: 16,
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <View style={pickerStyles.webBtnRow}>
              <TouchableOpacity
                style={pickerStyles.cancelBtn}
                onPress={onDismiss}
              >
                <Text style={pickerStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pickerStyles.confirmBtn}
                onPress={() => tempValue && onConfirm(tempValue)}
              >
                <Text style={pickerStyles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── NATIVE (iOS / Android) ────────────────────────────────────────────────
  if (!NativeDateTimePicker) return null;

  // Parse current value to a Date object
  let initialDate = new Date();
  if (currentValue) {
    if (mode === "date") {
      const parts = currentValue.split("-");
      if (parts.length === 3)
        initialDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // currentValue like "02:30 PM" or "14:30"
      const parsed = new Date(`1970-01-01 ${currentValue}`);
      if (!isNaN(parsed)) initialDate = parsed;
    }
  }

  const handleNativeChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      onDismiss();
      return;
    }
    if (selectedDate) {
      if (mode === "date") {
        const dateStr = selectedDate.toISOString().split("T")[0];
        onConfirm(dateStr);
      } else {
        const timeStr = selectedDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        onConfirm(timeStr);
      }
    }
    onDismiss();
  };

  // On iOS, DateTimePicker is inline — wrap in a modal
  if (Platform.OS === "ios") {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.iosBox}>
            <View style={pickerStyles.iosHeader}>
              <TouchableOpacity onPress={onDismiss}>
                <Text style={pickerStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={pickerStyles.title}>
                {mode === "date" ? "Select Date" : "Select Time"}
              </Text>
              <TouchableOpacity onPress={() => onConfirm(tempValue)}>
                <Text style={pickerStyles.confirmText}>Done</Text>
              </TouchableOpacity>
            </View>
            <NativeDateTimePicker
              value={initialDate}
              mode={mode}
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  if (mode === "date") {
                    setTempValue(date.toISOString().split("T")[0]);
                  } else {
                    setTempValue(
                      date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }),
                    );
                  }
                }
              }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Android — DateTimePicker renders as a system dialog; no need for a modal wrapper
  return (
    <NativeDateTimePicker
      value={initialDate}
      mode={mode}
      display="default"
      onChange={handleNativeChange}
    />
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  webBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iosBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30,
  },
  iosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
    textAlign: "center",
  },
  webBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelText: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
// ─────────────────────────────────────────────────────────────────────────────

export default function GrindingScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // ── Picker state ────────────────────────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState("date"); // 'date' | 'time'
  const [activeRowId, setActiveRowId] = useState(null);
  const [activePickerCurrentValue, setActivePickerCurrentValue] = useState("");

  const openPicker = (rowId, mode) => {
    const row = productionRowsRef.current.find((r) => r.id === rowId);
    const currentVal =
      mode === "date" ? row?.productionDate : row?.productionTime;
    setActiveRowId(rowId);
    setPickerMode(mode);
    setActivePickerCurrentValue(currentVal || "");
    setPickerVisible(true);
  };

  const handlePickerConfirm = (value) => {
    setPickerVisible(false);
    if (activeRowId) {
      const field = pickerMode === "date" ? "productionDate" : "productionTime";
      handleRowUpdate(activeRowId, field, value);
    }
    setActiveRowId(null);
  };

  const handlePickerDismiss = () => {
    setPickerVisible(false);
    setActiveRowId(null);
  };
  // ───────────────────────────────────────────────────────────────────────────

  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [godownAllocation, setGodownAllocation] = useState({});
  const [availableBins, setAvailableBins] = useState([]);

  const handleCompleteProcess = async () => {
    const totals = {};
    productionRows.forEach((row) => {
      (row.productionDetails || []).forEach((detail) => {
        const fg = finishedGoods.find((f) => f.id === detail.finished_good_id);
        const bs = bagSizes.find((b) => b.id === detail.bag_size_id);
        if (!fg || !bs) return;
        const key = `${fg.product_name} - ${bs.weight_kg}kg`;
        if (!totals[key])
          totals[key] = {
            bags: 0,
            fgId: detail.finished_good_id,
            bsId: detail.bag_size_id,
          };
        totals[key].bags += parseInt(detail.quantity_bags) || 0;
      });
    });

    const formattedSummary = Object.keys(totals).map((key) => ({
      label: key,
      value: totals[key].bags,
      fgId: totals[key].fgId,
      bsId: totals[key].bsId,
    }));

    setSummaryData(formattedSummary);

    const initialAllocation = {};
    formattedSummary.forEach((item) => {
      initialAllocation[item.label] = [
        {
          id: Date.now(),
          godownId: null,
          bags: item.value.toString(),
          fgId: item.fgId,
          bsId: item.bsId,
        },
      ];
    });
    setGodownAllocation(initialAllocation);

    try {
      const client = getApiClient();
      const res = await client.get("/finished-goods-godown");
      setGodowns(res.data || []);
    } catch (e) {
      console.error("Failed to fetch godowns", e);
    }

    setShowSummary(true);
  };

  const addAllocationRow = (label) => {
    const original = summaryData.find((s) => s.label === label);
    setGodownAllocation((prev) => ({
      ...prev,
      [label]: [
        ...prev[label],
        {
          id: Date.now(),
          godownId: null,
          bags: "0",
          fgId: original?.fgId,
          bsId: original?.bsId,
        },
      ],
    }));
  };

  const removeAllocationRow = (label, id) => {
    setGodownAllocation((prev) => ({
      ...prev,
      [label]: prev[label].filter((row) => row.id !== id),
    }));
  };

  const updateAllocation = (label, id, field, value) => {
    setGodownAllocation((prev) => ({
      ...prev,
      [label]: prev[label].map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const handleSaveToGodown = async () => {
    for (const label in godownAllocation) {
      const rows = godownAllocation[label];
      const totalAllocated = rows.reduce(
        (sum, r) => sum + (parseInt(r.bags) || 0),
        0,
      );
      const originalTotal =
        summaryData.find((s) => s.label === label)?.value || 0;
      if (totalAllocated !== originalTotal) {
        showAlert(
          "Error",
          `Total bags allocated for ${label} (${totalAllocated}) doesn't match total produced (${originalTotal})`,
        );
        return;
      }
      if (rows.some((r) => !r.godownId)) {
        showAlert(
          "Error",
          `Please select a godown for all allocations of ${label}`,
        );
        return;
      }
    }

    setLoading(true);
    try {
      const client = getApiClient();
      const movements = [];
      for (const label in godownAllocation) {
        godownAllocation[label].forEach((row) => {
          movements.push({
            movement_type: "IN",
            to_godown_id: parseInt(row.godownId),
            finished_good_id: parseInt(row.fgId),
            bag_size_id: parseInt(row.bsId),
            quantity_bags: parseInt(row.bags),
            remarks: `Grinding completion: ${label}`,
          });
        });
      }
      for (const m of movements) {
        await client.post("/finished-goods-godown-movement", m);
      }
      showToast("Success", "Process completed and stock updated in godowns");
      setShowSummary(false);
      setIsGrindingStarted(false);
      fetchInitialData();
    } catch (error) {
      console.error("Save to godown failed", error);
      showAlert(
        "Error",
        "Failed to update godown stock: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const [bagSizes, setBagSizes] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [silos, setSilos] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const [isGrindingStarted, setIsGrindingStarted] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productBagSizeMap, setProductBagSizeMap] = useState({});
  const [selectedSiloIds, setSelectedSiloIds] = useState([]);
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [productionRows, setProductionRows] = useState([
    {
      id: Date.now(),
      productionDate: new Date().toISOString().split("T")[0],
      productionTime: "",
      b1Reading: "",
      loadPerHour: "",
      productionDetails: [],
    },
  ]);

  // Keep a ref in sync so the picker opener can read current row values
  const productionRowsRef = useRef(productionRows);
  useEffect(() => {
    productionRowsRef.current = productionRows;
  }, [productionRows]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (selectedBin && selectedBin.production_order_id) {
        fetchExistingProductionData(selectedBin.production_order_id);
      }
    }, [selectedBin])
  );

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const client = getApiClient();
      const [binsRes, bagsRes, fgRes, silosRes] = await Promise.all([
        client.get("/grinding/available-bins").catch(() => ({ data: [] })),
        client.get("/bag-sizes").catch(() => ({ data: [] })),
        client.get("/finished-goods").catch(() => ({ data: [] })),
        client.get("/silos").catch(() => ({ data: [] })),
      ]);
      const bins = binsRes.data || [];
      const bags = bagsRes.data || [];
      const fgs = fgRes.data || [];
      const sls = silosRes.data || [];
      setAvailableBins(bins);
      setBagSizes(bags);
      setFinishedGoods(fgs);
      setSilos(sls);
      setSelectedProductIds(fgs.map((f) => f.id));
      const initialMap = {};
      fgs.forEach((fg) => {
        initialMap[fg.id] = bags.map((b) => b.id);
      });
      setProductBagSizeMap(initialMap);
    } catch (error) {
      showAlert("Error", "Failed to fetch grinding data");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingProductionData = async (orderId) => {
    try {
      const client = getApiClient();
      const res = await client
        .get("/grinding/hourly-production")
        .catch(() => ({ data: [] }));
      const existingData = (res.data || []).filter(
        (row) => row.production_order_id === orderId,
      );
      const sortedData = existingData.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );

      if (sortedData.length > 0) {
        const formattedRows = sortedData.map((row) => ({
          id: row.id,
          productionDate: row.production_date ? row.production_date.split('T')[0] : "",
          productionTime: row.production_time || "",
          b1Reading: row.b1_scale_reading?.toString() || "",
          loadPerHour: row.load_per_hour_tons?.toString() || "",
          productionDetails: row.details || [],
          siloDetails: row.silo_details || [],
          isSubmitted: true,
        }));
        formattedRows.push({
          id: Date.now(),
          productionDate: new Date().toISOString().split("T")[0],
          productionTime: "",
          b1Reading: "",
          loadPerHour: "",
          productionDetails: [],
          isSubmitted: false,
        });
        setProductionRows(formattedRows);
      } else {
        setProductionRows([
          {
            id: Date.now(),
            productionDate: new Date().toISOString().split("T")[0],
            productionTime: "",
            b1Reading: "",
            loadPerHour: "",
            productionDetails: [],
            isSubmitted: false,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch existing production data", error);
    }
  };

  const [showSourceParamsModal, setShowSourceParamsModal] = useState(false);
  const [sourceMoisture, setSourceMoisture] = useState("");
  const [sourceWater, setSourceWater] = useState("");

  const handleBinSelect = async (bin) => {
    if (!bin.production_order_id) {
      showAlert(
        "Error",
        "No Production Order found for this bin in transfer records",
      );
      return;
    }
    setSelectedBin(bin);
    setLoading(true);
    try {
      const client = getApiClient();
      const transferRecords = await client.get("/12hour-transfer/records");
      const matchingRecord = (transferRecords.data || []).find(
        (r) =>
          Number(r.destination_bin_id) === Number(bin.id) &&
          Number(r.production_order_id) === Number(bin.production_order_id) &&
          r.status === "IN_PROGRESS",
      );
      if (
        matchingRecord &&
        matchingRecord.moisture_level !== null &&
        matchingRecord.water_added !== null
      ) {
        setSourceMoisture(matchingRecord.moisture_level?.toString() || "");
        setSourceWater(matchingRecord.water_added?.toString() || "");
        setIsGrindingStarted(true);
        try {
          const templateKey = `grinding_template_${bin.production_order_id}`;
          const savedTemplate = await AsyncStorage.getItem(templateKey);
          if (savedTemplate) {
            const { productIds, bagSizeMap, siloIds } =
              JSON.parse(savedTemplate);
            setSelectedProductIds(productIds || []);
            setProductBagSizeMap(bagSizeMap || {});
            setSelectedSiloIds(siloIds || []);
          }
        } catch (e) {
          console.log("Template load skipped:", e.message);
        }
        showToast("Success", "Parameters already saved, starting grinding");
      } else {
        setSourceMoisture(matchingRecord?.moisture_level?.toString() || "");
        setSourceWater(matchingRecord?.water_added?.toString() || "");
        setShowSourceParamsModal(true);
      }
    } catch (e) {
      console.error("Error fetching record:", e);
      setSourceMoisture("");
      setSourceWater("");
      setShowSourceParamsModal(true);
    } finally {
      setLoading(false);
    }
  };

  const proceedWithGrinding = async () => {
    const bin = selectedBin;
    setIsGrindingStarted(true);
    setShowSourceParamsModal(false);
    try {
      const client = getApiClient();
      const transferRecords = await client.get("/12hour-transfer/records");
      const matchingRecord = (transferRecords.data || []).find(
        (r) =>
          Number(r.destination_bin_id) === Number(bin.id) &&
          Number(r.production_order_id) === Number(bin.production_order_id) &&
          r.status === "IN_PROGRESS",
      );
      if (matchingRecord) {
        await client.patch(`/12hour-transfer/records/${matchingRecord.id}`, {
          moisture_level: sourceMoisture ? parseFloat(sourceMoisture) : null,
          water_added: sourceWater ? parseFloat(sourceWater) : null,
        });
      } else {
        showAlert("Warning", "Could not find transfer record for this bin");
      }
    } catch (e) {
      console.error("Failed to save grinding parameters", e);
      showAlert(
        "Warning",
        "Parameters not saved, but grinding process started",
      );
    }
    try {
      const templateKey = `grinding_template_${bin.production_order_id}`;
      const savedTemplate = await AsyncStorage.getItem(templateKey);
      if (savedTemplate) {
        const { productIds, bagSizeMap, siloIds } = JSON.parse(savedTemplate);
        setSelectedProductIds(productIds || []);
        setProductBagSizeMap(bagSizeMap || {});
        setSelectedSiloIds(siloIds || []);
      }
    } catch (e) {
      console.error("Failed to load template", e);
    }
    fetchExistingProductionData(bin.production_order_id);
    showToast("Success", `Grinding started for Bin ${bin.bin_number}`);
  };

  const handleAddRow = () => {
    setProductionRows([
      ...productionRows,
      {
        id: Date.now(),
        productionDate: new Date().toISOString().split("T")[0],
        productionTime: "",
        b1Reading: "",
        loadPerHour: "",
        productionDetails: [],
        isSubmitted: false,
      },
    ]);
  };

  const handleRemoveRow = (rowId) => {
    if (productionRows.length > 1) {
      setProductionRows(productionRows.filter((r) => r.id !== rowId));
    }
  };

  const handleRowUpdate = (rowId, field, value) => {
    setProductionRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  const handleGridUpdate = (
    rowId,
    fgId,
    bsId,
    value,
    isSilo = false,
    siloId = null,
    field = "quantity_kg",
  ) => {
    setProductionRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (isSilo) {
          const newSiloDetails = [...(row.siloDetails || [])];
          const index = newSiloDetails.findIndex(
            (d) => d.finished_good_id === fgId && d.silo_id === siloId,
          );
          if (index > -1) {
            newSiloDetails[index][field] = value;
          } else {
            newSiloDetails.push({
              finished_good_id: fgId,
              silo_id: siloId,
              quantity_kg: field === "quantity_kg" ? value : "",
              moisture_percent: field === "moisture_percent" ? value : "",
            });
          }
          return { ...row, siloDetails: newSiloDetails };
        } else {
          const newDetails = [...row.productionDetails];
          const index = newDetails.findIndex(
            (d) => d.finished_good_id === fgId && d.bag_size_id === bsId,
          );
          if (index > -1) {
            newDetails[index].quantity_bags = value;
          } else {
            newDetails.push({
              finished_good_id: fgId,
              bag_size_id: bsId,
              quantity_bags: value,
            });
          }
          return { ...row, productionDetails: newDetails };
        }
      }),
    );
  };

  const toggleSilo = (id) =>
    setSelectedSiloIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  const toggleProduct = (id) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  const toggleBagSizeForProduct = (fgId, bsId) => {
    setProductBagSizeMap((prev) => {
      const current = prev[fgId] || [];
      return {
        ...prev,
        [fgId]: current.includes(bsId)
          ? current.filter((id) => id !== bsId)
          : [...current, bsId],
      };
    });
  };

  const getBgColor = (idx) => {
    const cols = [
      "#E1BEE7",
      "#FFE0B2",
      "#E0E0E0",
      "#FFCCBC",
      "#C5CAE9",
      "#F0F4C3",
    ];
    return cols[idx % cols.length];
  };

  const renderDynamicGrid = () => {
    const activeFgs = finishedGoods.filter((fg) =>
      selectedProductIds.includes(fg.id),
    );

    return (
      <View>
        <View style={styles.columnSelector}>
          <Text style={styles.selectorLabel}>Select Products & Bag Sizes:</Text>
          <View style={styles.productBagConfigContainer}>
            {finishedGoods.length > 0 ? (
              finishedGoods.map((fg) => (
                <View key={fg.id} style={styles.productConfigCard}>
                  <TouchableOpacity
                    onPress={() => toggleProduct(fg.id)}
                    style={[
                      styles.productChip,
                      selectedProductIds.includes(fg.id) && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedProductIds.includes(fg.id) &&
                          styles.chipTextActive,
                      ]}
                    >
                      {fg.product_name}
                    </Text>
                  </TouchableOpacity>
                  {selectedProductIds.includes(fg.id) && (
                    <View style={styles.bagSizeChipContainer}>
                      {bagSizes.map((bs) => (
                        <TouchableOpacity
                          key={bs.id}
                          onPress={() => toggleBagSizeForProduct(fg.id, bs.id)}
                          style={[
                            styles.miniChip,
                            productBagSizeMap[fg.id]?.includes(bs.id) &&
                              styles.chipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.miniChipText,
                              productBagSizeMap[fg.id]?.includes(bs.id) &&
                                styles.chipTextActive,
                            ]}
                          >
                            {bs.weight_kg}k
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {selectedProductIds.includes(fg.id) &&
                    fg.product_name.toLowerCase().includes("maida") && (
                      <View
                        style={{
                          marginTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: "#EEE",
                          paddingTop: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: "#666",
                            marginBottom: 5,
                          }}
                        >
                          Select Silos:
                        </Text>
                        <View style={styles.bagSizeChipContainer}>
                          {silos.map((s) => (
                            <TouchableOpacity
                              key={s.silo_id}
                              onPress={() => toggleSilo(s.silo_id)}
                              style={[
                                styles.miniChip,
                                { backgroundColor: "#E1F5FE" },
                                selectedSiloIds.includes(s.silo_id) && {
                                  backgroundColor: "#0288D1",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.miniChipText,
                                  selectedSiloIds.includes(s.silo_id) && {
                                    color: "#FFF",
                                  },
                                ]}
                              >
                                {s.silo_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: "#999" }}>
                No finished goods found
              </Text>
            )}
          </View>
        </View>

        {/* Dynamic Header */}
        <View style={styles.excelMainHeaderRow}>
          <View style={[styles.mainHeaderCell, { width: 40 }]}>
            <Text style={styles.mainHeaderText}>#</Text>
          </View>
          <View style={[styles.mainHeaderCell, { width: 110 }]}>
            <Text style={styles.mainHeaderText}>Date</Text>
          </View>
          <View style={[styles.mainHeaderCell, { width: 120 }]}>
            <Text style={styles.mainHeaderText}>Time</Text>
          </View>
          <View style={[styles.mainHeaderCell, { width: 120 }]}>
            <Text style={styles.mainHeaderText}>B1 Scale Reading</Text>
          </View>
          <View style={[styles.mainHeaderCell, { width: 120 }]}>
            <Text style={styles.mainHeaderText}>Load / Hr (In Tons)</Text>
          </View>

          {activeFgs.map((fg, fgIdx) => {
            const activeBagIds = productBagSizeMap[fg.id] || [];
            const relevantBags = bagSizes.filter((bs) =>
              activeBagIds.includes(bs.id),
            );
            const isMaida = fg.product_name.toLowerCase().includes("maida");
            const relevantSilos = isMaida
              ? silos.filter((s) => selectedSiloIds.includes(s.silo_id))
              : [];
            if (relevantBags.length === 0 && relevantSilos.length === 0)
              return null;
            return (
              <View
                key={fg.id}
                style={{ borderRightWidth: 1, borderColor: "#CCC" }}
              >
                <View style={styles.subHeaderTitle}>
                  <Text style={styles.subHeaderText}>{fg.product_name}</Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  {relevantBags.map((bs) => (
                    <View key={bs.id} style={styles.subHeaderCell}>
                      <Text style={styles.subHeaderText}>
                        {bs.weight_kg} Kg
                      </Text>
                    </View>
                  ))}
                  {relevantSilos.map((s) => (
                    <View
                      key={s.silo_id}
                      style={[
                        styles.subHeaderCell,
                        { backgroundColor: "#E1F5FE", minWidth: 160 },
                      ]}
                    >
                      <Text style={styles.subHeaderText}>
                        {s.silo_name} (Tons / Moist%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <View
            style={[
              styles.mainHeaderCell,
              { width: 100, backgroundColor: "#FFFAD2" },
            ]}
          >
            <Text style={styles.mainHeaderText}>Reprocess Kgs/Hr</Text>
          </View>
          <View style={[styles.mainHeaderCell, { width: 50 }]}>
            <Text style={styles.mainHeaderText}>Act</Text>
          </View>
        </View>

        {/* Dynamic Data Rows */}
        {productionRows.map((row, rowIdx) => (
          <View
            key={row.id}
            style={[
              styles.excelDataRow,
              row.isSubmitted && { backgroundColor: "#F0F0F0" },
            ]}
          >
            {/* # */}
            <View
              style={{
                width: 40,
                justifyContent: "center",
                alignItems: "center",
                borderRightWidth: 1,
                borderColor: "#CCC",
              }}
            >
              <Text style={{ fontSize: 10 }}>{rowIdx + 1}</Text>
            </View>

            {/* Date picker button */}
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                { width: 110 },
                row.isSubmitted && styles.pickerBtnDisabled,
              ]}
              onPress={() => {
                if (!row.isSubmitted) openPicker(row.id, "date");
              }}
              activeOpacity={row.isSubmitted ? 1 : 0.6}
            >
              <Text
                style={[
                  styles.pickerBtnText,
                  !row.productionDate && styles.pickerBtnPlaceholder,
                ]}
              >
                {row.productionDate || "Select Date"}
              </Text>
            </TouchableOpacity>

            {/* Time picker button */}
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                { width: 120 },
                row.isSubmitted && styles.pickerBtnDisabled,
              ]}
              onPress={() => {
                if (!row.isSubmitted) openPicker(row.id, "time");
              }}
              activeOpacity={row.isSubmitted ? 1 : 0.6}
            >
              <Text
                style={[
                  styles.pickerBtnText,
                  !row.productionTime && styles.pickerBtnPlaceholder,
                ]}
              >
                {row.productionTime || "Select Time"}
              </Text>
            </TouchableOpacity>

            <View style={{ width: 120, padding: 2 }}>
              <InputField
                value={row.b1Reading}
                onChangeText={(v) => handleRowUpdate(row.id, "b1Reading", v)}
                keyboardType="decimal-pad"
                disabled={row.isSubmitted}
                dense
              />
            </View>
            <View style={{ width: 120, padding: 2 }}>
              <InputField
                value={row.loadPerHour}
                onChangeText={(v) => handleRowUpdate(row.id, "loadPerHour", v)}
                keyboardType="decimal-pad"
                disabled={row.isSubmitted}
                dense
              />
            </View>

            {activeFgs.map((fg, fgIdx) => {
              const activeBagIds = productBagSizeMap[fg.id] || [];
              const relevantBags = bagSizes.filter((bs) =>
                activeBagIds.includes(bs.id),
              );
              const isMaida = fg.product_name.toLowerCase().includes("maida");
              const relevantSilos = isMaida
                ? silos.filter((s) => selectedSiloIds.includes(s.silo_id))
                : [];
              if (relevantBags.length === 0 && relevantSilos.length === 0)
                return null;
              return (
                <View key={fg.id} style={{ flexDirection: "row" }}>
                  {relevantBags.map((bs) => {
                    const detail = row.productionDetails?.find(
                      (d) =>
                        d.finished_good_id === fg.id && d.bag_size_id === bs.id,
                    );
                    return (
                      <View
                        key={bs.id}
                        style={{
                          width: 80,
                          padding: 2,
                          backgroundColor: getBgColor(fgIdx),
                        }}
                      >
                        <InputField
                          value={detail?.quantity_bags?.toString() || ""}
                          onChangeText={(v) =>
                            handleGridUpdate(row.id, fg.id, bs.id, v)
                          }
                          keyboardType="numeric"
                          disabled={row.isSubmitted}
                          dense
                        />
                      </View>
                    );
                  })}
                  {relevantSilos.map((s) => {
                    const siloDetail = row.siloDetails?.find(
                      (d) =>
                        d.finished_good_id === fg.id && d.silo_id === s.silo_id,
                    );
                    return (
                      <View
                        key={s.silo_id}
                        style={{
                          width: 160,
                          padding: 2,
                          backgroundColor: "#E1F5FE",
                          flexDirection: "row",
                          gap: 2,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <InputField
                            placeholder="Qty (T)"
                            value={siloDetail?.quantity_kg?.toString() || ""}
                            onChangeText={(v) =>
                              handleGridUpdate(
                                row.id,
                                fg.id,
                                null,
                                v,
                                true,
                                s.silo_id,
                                "quantity_kg",
                              )
                            }
                            keyboardType="numeric"
                            disabled={row.isSubmitted}
                            dense
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <InputField
                            placeholder="Moist %"
                            value={
                              siloDetail?.moisture_percent?.toString() || ""
                            }
                            onChangeText={(v) =>
                              handleGridUpdate(
                                row.id,
                                fg.id,
                                null,
                                v,
                                true,
                                s.silo_id,
                                "moisture_percent",
                              )
                            }
                            keyboardType="numeric"
                            disabled={row.isSubmitted}
                            dense
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Reprocess */}
            <View
              style={{ width: 100, padding: 2, backgroundColor: "#FFFAD2" }}
            >
              <InputField
                value={
                  row.productionDetails
                    .find((d) => d.finished_good_id === "REPROCESS")
                    ?.quantity_bags?.toString() || ""
                }
                onChangeText={(v) =>
                  handleGridUpdate(row.id, "REPROCESS", null, v)
                }
                keyboardType="numeric"
                disabled={row.isSubmitted}
                dense
              />
            </View>

            {/* Remove */}
            <View
              style={{
                width: 50,
                padding: 2,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {!row.isSubmitted && (
                <TouchableOpacity onPress={() => handleRemoveRow(row.id)}>
                  <Text style={{ color: "#F44336", fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addRowBtn} onPress={handleAddRow}>
          <Text style={styles.addRowBtnText}>+ Add New Entry Row</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSubmitHourly = async () => {
    const newRows = productionRows.filter((r) => !r.isSubmitted);
    if (newRows.length === 0) {
      showAlert("Info", "All rows are already submitted");
      return;
    }
    setLoading(true);
    try {
      const client = getApiClient();
      const templateKey = `grinding_template_${selectedBin.production_order_id}`;
      await AsyncStorage.setItem(
        templateKey,
        JSON.stringify({
          productIds: selectedProductIds,
          bagSizeMap: productBagSizeMap,
          siloIds: selectedSiloIds,
        }),
      );

      for (const row of newRows) {
        if (!row.productionTime || !row.b1Reading) continue;
        const validDetails = row.productionDetails
          .filter(
            (d) => d.finished_good_id && d.finished_good_id !== "REPROCESS",
          )
          .map((d) => ({
            ...d,
            quantity_bags: parseInt(d.quantity_bags) || 0,
          }));
        const reprocessQty =
          parseInt(
            row.productionDetails.find(
              (d) => d.finished_good_id === "REPROCESS",
            )?.quantity_bags,
          ) || 0;
        const validSiloDetails = (row.siloDetails || [])
          .filter((d) => d.finished_good_id && d.silo_id)
          .map((d) => ({
            ...d,
            quantity_kg: parseFloat(d.quantity_kg) || 0,
            moisture_percent: parseFloat(d.moisture_percent) || null,
          }));

        if (
          validDetails.length === 0 &&
          validSiloDetails.length === 0 &&
          reprocessQty === 0
        )
          continue;

        await client.post("/grinding/hourly-production", {
          production_order_id: selectedBin.production_order_id,
          production_date: row.productionDate,
          production_time: row.productionTime,
          b1_scale_reading: parseFloat(row.b1Reading),
          load_per_hour_tons: parseFloat(row.loadPerHour) || 0,
          reprocess: reprocessQty,
          details: validDetails,
          silo_details: validSiloDetails,
        });
      }
      showToast("Success", "Hourly production recorded");
      fetchExistingProductionData(selectedBin.production_order_id);
    } catch (error) {
      showAlert("Error", "Failed to save hourly production");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigation={navigation}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Grinding Process</Text>
          <TouchableOpacity
            style={styles.excelButton}
            onPress={() => navigation.navigate("GrindingExcelView")}
          >
            <Text style={styles.excelButtonText}>View Data</Text>
          </TouchableOpacity>
        </View>

        {!isGrindingStarted ? (
          <View style={styles.binListSection}>
            <Text style={styles.sectionTitle}>
              Select a Filled 12-Hour Bin to Start
            </Text>
            {loading && availableBins.length === 0 ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : availableBins.length > 0 ? (
              availableBins.map((bin) => (
                <TouchableOpacity
                  key={bin.id}
                  style={styles.binCard}
                  onPress={() => handleBinSelect(bin)}
                >
                  <View style={styles.binIconContainer}>
                    <Text style={styles.binIcon}>📦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.binName}>Bin {bin.bin_number}</Text>
                    <Text style={styles.binOrder}>
                      Order: {bin.order_number || "None Found"}
                    </Text>
                    <Text style={styles.binStatus}>
                      Status: {bin.status || "Ready"}
                    </Text>
                  </View>
                  <View style={styles.startBadge}>
                    <Text style={styles.startBadgeText}>START</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noBinsText}>
                No filled 12-hour bins available
              </Text>
            )}
          </View>
        ) : (
          <View>
            <Card style={styles.activeInfoCard}>
              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.activeLabel}>Order</Text>
                  <Text style={styles.activeValue}>
                    {selectedBin?.order_number}
                  </Text>
                </View>
                <View>
                  <Text style={styles.activeLabel}>Bin</Text>
                  <Text style={styles.activeValue}>
                    Bin {selectedBin?.bin_number}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsGrindingStarted(false)}>
                  <Text style={styles.changeText}>Change Bin</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Hourly Production Entry</Text>
              <View style={styles.excelTopHeader}>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Date</Text>
                  <Text style={styles.topHeaderValue}>
                    {selectedBin?.created_at
                      ? new Date(selectedBin.created_at)
                          .toISOString()
                          .split("T")[0]
                      : productionDate}
                  </Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Batch No</Text>
                  <Text style={styles.topHeaderValue}>
                    {selectedBin?.order_number || "N/A"}
                  </Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Product</Text>
                  <Text style={styles.topHeaderValue}>
                    {selectedBin?.raw_product_name || "Wheat"}
                  </Text>
                </View>
                <View style={styles.topHeaderBox}>
                  <Text style={styles.topHeaderLabel}>Start Date</Text>
                  <Text style={styles.topHeaderValue}>
                    {selectedBin?.created_at
                      ? new Date(selectedBin.created_at)
                          .toISOString()
                          .split("T")[0]
                      : productionDate}
                  </Text>
                </View>
              </View>

              <ScrollView horizontal>{renderDynamicGrid()}</ScrollView>

              <View
                style={{
                  marginTop: 20,
                  flexDirection: "row",
                  gap: 10,
                  paddingBottom: 20,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Button
                    title="Submit Hourly Data"
                    onPress={handleSubmitHourly}
                    loading={loading}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Complete Process"
                    onPress={handleCompleteProcess}
                    variant="secondary"
                  />
                </View>
              </View>

              {/* Summary / Allocation Modal */}
              <Modal visible={showSummary} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <Card
                    style={[
                      styles.summaryModal,
                      { width: "95%", maxWidth: 600, maxHeight: "90%" },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                      }}
                    >
                      <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                        Process Summary & Allocation
                      </Text>
                      <TouchableOpacity onPress={() => setShowSummary(false)}>
                        <Text style={{ fontSize: 28, color: "#666" }}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      style={{ flex: 1, paddingRight: 5 }}
                      showsVerticalScrollIndicator
                    >
                      {summaryData.map((item, idx) => (
                        <View key={idx} style={styles.summarySection}>
                          <View style={styles.summaryHeader}>
                            <View>
                              <Text style={styles.summaryProductTitle}>
                                {item.label}
                              </Text>
                              <Text style={styles.summaryBagsSub}>
                                Production Summary
                              </Text>
                            </View>
                            <View style={styles.summaryBadge}>
                              <Text style={styles.summaryBadgeText}>
                                {item.value} Bags Produced
                              </Text>
                            </View>
                          </View>
                          <View style={styles.allocationContainer}>
                            {godownAllocation[item.label]?.map((alloc) => (
                              <View key={alloc.id} style={styles.allocationRow}>
                                <View style={{ flex: 1.5 }}>
                                  <Text style={styles.allocationLabel}>
                                    Target Godown
                                  </Text>
                                  <SelectDropdown
                                    options={godowns.map((g) => ({
                                      label: g.godown_name,
                                      value: g.id.toString(),
                                    }))}
                                    value={alloc.godownId?.toString()}
                                    onValueChange={(val) =>
                                      updateAllocation(
                                        item.label,
                                        alloc.id,
                                        "godownId",
                                        val,
                                      )
                                    }
                                    placeholder="Select Godown"
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.allocationLabel}>
                                    Allocated Bags
                                  </Text>
                                  <InputField
                                    value={alloc.bags}
                                    onChangeText={(val) =>
                                      updateAllocation(
                                        item.label,
                                        alloc.id,
                                        "bags",
                                        val,
                                      )
                                    }
                                    keyboardType="numeric"
                                    placeholder="Bags"
                                    dense
                                  />
                                </View>
                                {godownAllocation[item.label].length > 1 && (
                                  <TouchableOpacity
                                    onPress={() =>
                                      removeAllocationRow(item.label, alloc.id)
                                    }
                                    style={styles.removeAllocationBtn}
                                  >
                                    <Text style={styles.removeAllocationText}>
                                      ✕
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))}
                          </View>
                          <TouchableOpacity
                            style={styles.splitButton}
                            onPress={() => addAllocationRow(item.label)}
                          >
                            <Text style={styles.splitButtonText}>
                              + Split to another Godown
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.cancelBtn]}
                        onPress={() => setShowSummary(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.saveBtn]}
                        onPress={handleSaveToGodown}
                      >
                        <Text style={styles.saveBtnText}>
                          Confirm & Save Stock
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </View>
              </Modal>
            </Card>
          </View>
        )}

        {/* Source Params Modal */}
        <Modal visible={showSourceParamsModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Card style={styles.modalContent}>
              <Text style={styles.modalTitle}>Source Bin Parameters</Text>
              <Text style={styles.modalSubtitle}>
                Please enter moisture and water details for the 12-hour bin.
              </Text>
              <InputField
                label="Moisture Level (%)"
                value={sourceMoisture}
                onChangeText={setSourceMoisture}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <InputField
                label="Water Added (Litres)"
                value={sourceWater}
                onChangeText={setSourceWater}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowSourceParamsModal(false);
                    setSelectedBin(null);
                  }}
                  variant="secondary"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Confirm & Start"
                  onPress={proceedWithGrinding}
                  loading={loading}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>
      </ScrollView>

      {/* ── Single cross-platform date/time picker ── */}
      <CrossPlatformDatePicker
        visible={pickerVisible}
        mode={pickerMode}
        currentValue={activePickerCurrentValue}
        onConfirm={handlePickerConfirm}
        onDismiss={handlePickerDismiss}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: colors.primary },
  excelButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  excelButtonText: { color: "#fff", fontWeight: "bold" },
  card: { padding: 16, marginBottom: 16, borderRadius: 12 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 15,
    color: colors.text.primary,
    textAlign: "center",
  },
  binListSection: { marginBottom: 20 },
  binCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  binIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  binIcon: { fontSize: 26 },
  binName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  binOrder: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  binStatus: { fontSize: 13, color: "#666", marginTop: 2 },
  startBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  startBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  noBinsText: {
    textAlign: "center",
    padding: 20,
    color: "#999",
    fontStyle: "italic",
  },
  activeInfoCard: {
    padding: 15,
    marginBottom: 16,
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 5,
    borderLeftColor: "#4CAF50",
    borderRadius: 10,
  },
  activeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  activeValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
  changeText: { color: colors.primary, fontWeight: "bold", fontSize: 14 },
  excelTopHeader: {
    flexDirection: "row",
    backgroundColor: "#FFFAD2",
    borderWidth: 1,
    borderColor: "#CCC",
    marginBottom: 15,
  },
  topHeaderBox: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
  },
  topHeaderLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  topHeaderValue: { fontSize: 14, fontWeight: "bold", color: "#000" },
  excelMainHeaderRow: { flexDirection: "row", backgroundColor: "#FFFAD2" },
  mainHeaderCell: {
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  mainHeaderText: { fontSize: 12, fontWeight: "bold", textAlign: "center" },
  subHeaderTitle: {
    padding: 5,
    borderBottomWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
    backgroundColor: "#FFFAD2",
  },
  subHeaderCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCC",
    alignItems: "center",
    backgroundColor: "#FFFAD2",
    minWidth: 80,
  },
  subHeaderText: { fontSize: 10, fontWeight: "bold", textAlign: "center" },
  excelDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#CCC",
  },
  // Picker button (replaces old TouchableOpacity date/time buttons)
  pickerBtn: {
    margin: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 34,
  },
  pickerBtnDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#DDD",
    opacity: 0.6,
  },
  pickerBtnText: { fontSize: 11, color: "#000" },
  pickerBtnPlaceholder: { color: "#999" },
  columnSelector: {
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  productBagConfigContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productConfigCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 8,
    minWidth: 150,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EEE",
    marginBottom: 8,
  },
  bagSizeChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingLeft: 5,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    borderWidth: 0.5,
    borderColor: "#CCC",
  },
  miniChipText: { fontSize: 9, color: "#666" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: "#666" },
  chipTextActive: { color: "#FFF", fontWeight: "bold" },
  addRowBtn: {
    marginVertical: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  addRowBtnText: { color: colors.primary, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
  },
  modalSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  modalActions: { flexDirection: "row", marginTop: 20, gap: 10 },
  summaryModal: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: { elevation: 8 },
    }),
  },
  summarySection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7FF",
  },
  summaryProductTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.3,
  },
  summaryBagsSub: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  summaryBadgeText: { color: "#059669", fontSize: 12, fontWeight: "700" },
  allocationContainer: { padding: 16 },
  allocationRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-end",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  allocationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  removeAllocationBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  removeAllocationText: { color: "#EF4444", fontSize: 14, fontWeight: "bold" },
  splitButton: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
  },
  splitButtonText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalBtn: {},
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelBtnText: { fontWeight: "700", color: "#475569", fontSize: 15 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontWeight: "700", color: "#FFF", fontSize: 15 },
});
