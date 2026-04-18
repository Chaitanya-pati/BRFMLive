import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Platform
} from "react-native";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert } from "../utils/customAlerts";

const ROW_H = 44;

function FieldRow({ label, value, onChangeText, placeholder, keyboardType, editable = true }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.fieldInput}
          value={value || ""}
          onChangeText={onChangeText}
          placeholder={placeholder || ""}
          keyboardType={keyboardType || "default"}
        />
      ) : (
        <Text style={styles.fieldReadonly}>{value || "—"}</Text>
      )}
    </View>
  );
}

function SectionHeader({ num, label, color }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: color || "#2c3e50" }]}>
      <View style={styles.sectionNumBox}>
        <Text style={styles.sectionNumText}>{num}</Text>
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function DateTimeInput({ label, value, onChange }) {
  return (
    <View style={styles.dtRow}>
      <Text style={styles.dtLabel}>{label}</Text>
      <TextInput
        style={styles.dtInput}
        value={value || ""}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD HH:MM"
      />
    </View>
  );
}

export default function TripSheetScreen({ route, navigation }) {
  const { dispatchId: paramDispatchId } = route.params || {};
  const [dispatches, setDispatches] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [tripSheet, setTripSheet] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("header"); // header | journey | signoff

  const [header, setHeader] = useState({ d_note_number: "", freight_amount: "" });
  const [stop, setStop] = useState({
    factory_exit_at: "", factory_exit_km: "", factory_exit_signed: "",
    arrived_at: "", unloading_start: "", unloading_end: "",
    return_journey_at: "", factory_return_at: "", factory_return_km: "",
    customer_signature: "", driver_signature: "",
  });
  const [signoff, setSignoff] = useState({
    freight_received: "", excel_updated: null,
    supervisor_sign_date: "", driver_sign_date: "", remarks: "",
  });

  const client = getApiClient();

  useEffect(() => {
    loadDispatches();
  }, []);

  useEffect(() => {
    if (paramDispatchId) {
      handleSelectDispatch({ dispatch_id: paramDispatchId });
    }
  }, [paramDispatchId]);

  const loadDispatches = async () => {
    try {
      setLoadingList(true);
      const res = await client.get("/dispatches");
      setDispatches(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectDispatch = async (dispatch) => {
    setSelectedDispatch(dispatch);
    setLoadingDetail(true);
    try {
      const res = await client.get(`/trip-sheets/by-dispatch/${dispatch.dispatch_id}`);
      if (res.data) {
        setTripSheet(res.data);
        setHeader({
          d_note_number: res.data.d_note_number || "",
          freight_amount: res.data.freight_amount ? String(res.data.freight_amount) : "",
        });
        // load stop data
        const full = await client.get(`/trip-sheets/${res.data.id}/full`);
        if (full.data.stop) {
          const s = full.data.stop;
          setStop({
            factory_exit_at: fmtForInput(s.factory_exit_at),
            factory_exit_km: s.factory_exit_km ? String(s.factory_exit_km) : "",
            factory_exit_signed: s.factory_exit_signed || "",
            arrived_at: fmtForInput(s.arrived_at),
            unloading_start: fmtForInput(s.unloading_start),
            unloading_end: fmtForInput(s.unloading_end),
            return_journey_at: fmtForInput(s.return_journey_at),
            factory_return_at: fmtForInput(s.factory_return_at),
            factory_return_km: s.factory_return_km ? String(s.factory_return_km) : "",
            customer_signature: s.customer_signature || "",
            driver_signature: s.driver_signature || "",
          });
        }
        if (full.data.signoff) {
          const sg = full.data.signoff;
          setSignoff({
            freight_received: sg.freight_received ? String(sg.freight_received) : "",
            excel_updated: sg.excel_updated,
            supervisor_sign_date: fmtForInput(sg.supervisor_sign_date),
            driver_sign_date: fmtForInput(sg.driver_sign_date),
            remarks: sg.remarks || "",
          });
        }
      } else {
        setTripSheet(null);
        setHeader({ d_note_number: "", freight_amount: "" });
        setStop({
          factory_exit_at: "", factory_exit_km: "", factory_exit_signed: "",
          arrived_at: "", unloading_start: "", unloading_end: "",
          return_journey_at: "", factory_return_at: "", factory_return_km: "",
          customer_signature: "", driver_signature: "",
        });
        setSignoff({ freight_received: "", excel_updated: null, supervisor_sign_date: "", driver_sign_date: "", remarks: "" });
      }
    } catch (e) {
      console.error(e);
      setTripSheet(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fmtForInput = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return iso; }
  };

  const parseInput = (s) => {
    if (!s) return null;
    const d = new Date(s.replace(" ", "T"));
    return isNaN(d) ? null : d.toISOString();
  };

  const handleSave = async () => {
    if (!selectedDispatch) return;
    setSaving(true);
    try {
      let tsId;
      if (tripSheet) {
        await client.put(`/trip-sheets/${tripSheet.id}`, {
          d_note_number: header.d_note_number || null,
          freight_amount: header.freight_amount ? parseFloat(header.freight_amount) : null,
        });
        tsId = tripSheet.id;
      } else {
        const res = await client.post("/trip-sheets", {
          dispatch_id: selectedDispatch.dispatch_id,
          d_note_number: header.d_note_number || null,
          freight_amount: header.freight_amount ? parseFloat(header.freight_amount) : null,
        });
        setTripSheet(res.data);
        tsId = res.data.id;
      }
      // Save stop
      await client.put(`/trip-sheets/${tsId}/stop`, {
        factory_exit_at: parseInput(stop.factory_exit_at),
        factory_exit_km: stop.factory_exit_km ? parseFloat(stop.factory_exit_km) : null,
        factory_exit_signed: stop.factory_exit_signed || null,
        arrived_at: parseInput(stop.arrived_at),
        unloading_start: parseInput(stop.unloading_start),
        unloading_end: parseInput(stop.unloading_end),
        return_journey_at: parseInput(stop.return_journey_at),
        factory_return_at: parseInput(stop.factory_return_at),
        factory_return_km: stop.factory_return_km ? parseFloat(stop.factory_return_km) : null,
        customer_signature: stop.customer_signature || null,
        driver_signature: stop.driver_signature || null,
      });
      // Save signoff
      if (signoff.freight_received || signoff.remarks || signoff.excel_updated !== null) {
        await client.put(`/trip-sheets/${tsId}/signoff`, {
          freight_received: signoff.freight_received ? parseFloat(signoff.freight_received) : null,
          excel_updated: signoff.excel_updated,
          supervisor_sign_date: parseInput(signoff.supervisor_sign_date),
          driver_sign_date: parseInput(signoff.driver_sign_date),
          remarks: signoff.remarks || null,
        });
      }
      showToast("Success", "Trip sheet saved successfully");
    } catch (e) {
      console.error(e);
      showAlert("Error", "Failed to save trip sheet");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!tripSheet) {
      showAlert("Not Saved", "Please save the trip sheet first before printing.");
      return;
    }
    navigation.navigate("TripSheetPrint", { tripId: tripSheet.id });
  };

  // Dispatch selection screen
  if (!selectedDispatch) {
    return (
      <Layout title="Trip Sheet" navigation={navigation}>
        <View style={styles.container}>
          <Text style={styles.pageTitle}>Select Dispatch</Text>
          {loadingList ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={dispatches}
              keyExtractor={(i) => String(i.dispatch_id)}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No dispatches found.</Text>}
              renderItem={({ item }) => (
                <Card style={styles.dispatchCard}>
                  <View style={styles.dispatchCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dispatchId}>Dispatch #{item.dispatch_id}</Text>
                      <Text style={styles.dispatchSub}>
                        Truck: {item.truck?.truck_number || "N/A"} | Driver: {item.driver?.driver_name || "N/A"}
                      </Text>
                      <Text style={styles.dispatchSub}>
                        {item.dispatched_quantity_ton} ton · {item.dispatched_bags || 0} bags
                      </Text>
                    </View>
                    <View>
                      <View style={[styles.badge, { backgroundColor: item.status === "DELIVERED" ? "#27ae60" : "#e67e22" }]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.openBtn} onPress={() => handleSelectDispatch(item)}>
                    <Text style={styles.openBtnText}>Open Trip Sheet</Text>
                  </TouchableOpacity>
                </Card>
              )}
            />
          )}
        </View>
      </Layout>
    );
  }

  if (loadingDetail) {
    return (
      <Layout title="Trip Sheet" navigation={navigation}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title={`Trip Sheet — Dispatch #${selectedDispatch.dispatch_id}`} navigation={navigation}>
      <ScrollView style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setSelectedDispatch(null)}>
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>← Back</Text>
          </TouchableOpacity>
          {tripSheet && (
            <View style={styles.tripNumBadge}>
              <Text style={styles.tripNumText}>{tripSheet.trip_number}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Text style={styles.printBtnText}>🖨 Print</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {["header", "journey", "signoff"].map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === "header" ? "Header" : t === "journey" ? "Journey Log" : "Sign-Off"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Header Tab */}
        {tab === "header" && (
          <Card style={styles.tabCard}>
            <Text style={styles.cardTitle}>Trip Details</Text>
            <FieldRow label="Dispatch #" value={String(selectedDispatch.dispatch_id)} editable={false} />
            <FieldRow label="Truck No." value={selectedDispatch.truck?.truck_number} editable={false} />
            <FieldRow label="Driver" value={selectedDispatch.driver?.driver_name} editable={false} />
            <FieldRow label="Customer" value={selectedDispatch.order?.customer?.customer_name} editable={false} />
            <FieldRow
              label="Delivery Place"
              value={[
                selectedDispatch.order?.customer?.address,
                selectedDispatch.order?.customer?.city,
                selectedDispatch.order?.customer?.state,
              ].filter(Boolean).join(", ")}
              editable={false}
            />
            <FieldRow label="Weight (ton)" value={String(selectedDispatch.dispatched_quantity_ton || "")} editable={false} />
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Editable Fields</Text>
            <FieldRow
              label="D Note #"
              value={header.d_note_number}
              onChangeText={(v) => setHeader({ ...header, d_note_number: v })}
              placeholder="Enter delivery note number"
            />
            <FieldRow
              label="Freight Amount (₹)"
              value={header.freight_amount}
              onChangeText={(v) => setHeader({ ...header, freight_amount: v })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </Card>
        )}

        {/* Journey Tab */}
        {tab === "journey" && (
          <Card style={styles.tabCard}>
            <Text style={styles.cardTitle}>Journey Log</Text>
            <Text style={styles.hint}>Format: YYYY-MM-DD HH:MM (24-hour)</Text>

            <SectionHeader num="1" label="Factory Exit" color="#2c3e50" />
            <DateTimeInput label="Date & Time" value={stop.factory_exit_at} onChange={(v) => setStop({ ...stop, factory_exit_at: v })} />
            <FieldRow label="Start KM" value={stop.factory_exit_km} onChangeText={(v) => setStop({ ...stop, factory_exit_km: v })} keyboardType="numeric" placeholder="KM reading" />
            <FieldRow label="Signed By" value={stop.factory_exit_signed} onChangeText={(v) => setStop({ ...stop, factory_exit_signed: v })} placeholder="Name" />

            <SectionHeader num="2" label="Customer Arrived" color="#2980b9" />
            <DateTimeInput label="Date & Time" value={stop.arrived_at} onChange={(v) => setStop({ ...stop, arrived_at: v })} />

            <SectionHeader num="3" label="Unloading Start" color="#8e44ad" />
            <DateTimeInput label="Date & Time" value={stop.unloading_start} onChange={(v) => setStop({ ...stop, unloading_start: v })} />

            <SectionHeader num="3" label="Unloading End" color="#c0392b" />
            <DateTimeInput label="Date & Time" value={stop.unloading_end} onChange={(v) => setStop({ ...stop, unloading_end: v })} />
            <FieldRow label="Customer Sign" value={stop.customer_signature} onChangeText={(v) => setStop({ ...stop, customer_signature: v })} placeholder="Customer name/sign" />

            <SectionHeader num="5" label="Return Journey" color="#16a085" />
            <DateTimeInput label="Date & Time" value={stop.return_journey_at} onChange={(v) => setStop({ ...stop, return_journey_at: v })} />

            <SectionHeader num="6" label="Factory Return" color="#27ae60" />
            <DateTimeInput label="Date & Time" value={stop.factory_return_at} onChange={(v) => setStop({ ...stop, factory_return_at: v })} />
            <FieldRow label="End KM" value={stop.factory_return_km} onChangeText={(v) => setStop({ ...stop, factory_return_km: v })} keyboardType="numeric" placeholder="KM reading" />
          </Card>
        )}

        {/* Sign-Off Tab */}
        {tab === "signoff" && (
          <Card style={styles.tabCard}>
            <Text style={styles.cardTitle}>Supervisor Sign-Off</Text>
            <FieldRow
              label="Freight Received (₹)"
              value={signoff.freight_received}
              onChangeText={(v) => setSignoff({ ...signoff, freight_received: v })}
              keyboardType="numeric"
              placeholder="Amount received"
            />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Excel Updated</Text>
              <View style={styles.radioRow}>
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.radioBtn, signoff.excel_updated === v && styles.radioBtnActive]}
                    onPress={() => setSignoff({ ...signoff, excel_updated: v })}
                  >
                    <Text style={[styles.radioBtnText, signoff.excel_updated === v && styles.radioBtnTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <DateTimeInput label="Supervisor Sign Date" value={signoff.supervisor_sign_date} onChange={(v) => setSignoff({ ...signoff, supervisor_sign_date: v })} />
            <DateTimeInput label="Driver Sign Date" value={signoff.driver_sign_date} onChange={(v) => setSignoff({ ...signoff, driver_sign_date: v })} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Remarks / Incidents</Text>
            </View>
            <TextInput
              style={styles.textArea}
              value={signoff.remarks}
              onChangeText={(v) => setSignoff({ ...signoff, remarks: v })}
              multiline
              numberOfLines={4}
              placeholder="Enter remarks or incident details..."
            />
          </Card>
        )}

        <View style={styles.footerRow}>
          <Button title={saving ? "Saving..." : "Save Trip Sheet"} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          <View style={{ width: 10 }} />
          <Button title="🖨 Print" variant="outline" onPress={handlePrint} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  pageTitle: { fontSize: 22, fontWeight: "bold", color: "#2c3e50", marginBottom: 16 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 60, fontSize: 16 },
  dispatchCard: { marginBottom: 14, padding: 16, borderRadius: 10 },
  dispatchCardRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  dispatchId: { fontSize: 17, fontWeight: "bold", color: "#2c3e50" },
  dispatchSub: { fontSize: 13, color: "#666", marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  openBtn: { backgroundColor: "#2980b9", padding: 10, borderRadius: 8, alignItems: "center" },
  openBtnText: { color: "#fff", fontWeight: "bold" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 8 },
  tripNumBadge: { backgroundColor: "#2c3e50", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tripNumText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  printBtn: { backgroundColor: "#27ae60", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  printBtnText: { color: "#fff", fontWeight: "bold" },
  tabBar: { flexDirection: "row", marginBottom: 16, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#ddd" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#f4f6f8" },
  tabBtnActive: { backgroundColor: "#2c3e50" },
  tabBtnText: { fontWeight: "600", color: "#666", fontSize: 13 },
  tabBtnTextActive: { color: "#fff" },
  tabCard: { marginBottom: 20, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#2c3e50", marginBottom: 14 },
  hint: { fontSize: 12, color: "#999", marginBottom: 12, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: "#e5e5e5", marginVertical: 14 },
  fieldRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, minHeight: ROW_H },
  fieldLabel: { width: 130, fontSize: 13, color: "#555", fontWeight: "500" },
  fieldInput: { flex: 1, height: 40, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, paddingHorizontal: 10, backgroundColor: "#fff", fontSize: 13 },
  fieldReadonly: { flex: 1, fontSize: 13, color: "#333", paddingVertical: 8 },
  dtRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingLeft: 16 },
  dtLabel: { width: 130, fontSize: 13, color: "#444" },
  dtInput: { flex: 1, height: 40, borderWidth: 1, borderColor: "#ddd", borderRadius: 6, paddingHorizontal: 10, backgroundColor: "#fff", fontSize: 13 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8, borderRadius: 6, padding: 8 },
  sectionNumBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionNumText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionLabel: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  radioRow: { flexDirection: "row", gap: 8 },
  radioBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "#ccc", backgroundColor: "#f4f4f4" },
  radioBtnActive: { backgroundColor: "#2c3e50", borderColor: "#2c3e50" },
  radioBtnText: { color: "#444", fontWeight: "600" },
  radioBtnTextActive: { color: "#fff" },
  textArea: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top", fontSize: 13, backgroundColor: "#fff" },
  footerRow: { flexDirection: "row", marginVertical: 24, paddingBottom: 40 },
});
