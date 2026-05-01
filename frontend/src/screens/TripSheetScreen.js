import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Platform,
} from "react-native";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { getApiClient } from "../api/client";
import { showToast, showAlert, showError, showSuccess } from "../utils/customAlerts";

function fmtDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function parseInput(s) {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d) ? null : d.toISOString();
}

// derive status from stop data
function getTripStatus(fullData) {
  if (!fullData) return "PENDING";
  const stop = fullData.stop || {};
  if (stop.factory_return_at) return stop.supervisor_sign_date ? "CLOSED" : "RETURNED";
  if (stop.factory_exit_at) return "IN_TRANSIT";
  return "PENDING";
}

const STATUS_STYLE = {
  PENDING:    { bg: "#fffde7", color: "#f57f17", label: "Pending" },
  IN_TRANSIT: { bg: "#e3f2fd", color: "#1565C0", label: "In Transit" },
  RETURNED:   { bg: "#fff3e0", color: "#e65100", label: "Returned" },
  CLOSED:     { bg: "#e8f5e9", color: "#2e7d32", label: "Closed" },
};

function StatusPill({ status }) {
  const st = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return (
    <View style={[s.statusPill, { backgroundColor: st.bg }]}>
      <Text style={[s.statusPillText, { color: st.color }]}>{st.label}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function JourneyMilestone({ icon, label, time, km, signed, done }) {
  return (
    <View style={[s.milestone, done && s.milestoneDone]}>
      <View style={[s.milestoneDot, done && s.milestoneDotDone]}>
        <Text style={s.milestoneIcon}>{done ? "✓" : icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.milestoneLabel, done && { color: "#2e7d32" }]}>{label}</Text>
        {time ? <Text style={s.milestoneSub}>{time}{km ? `  ·  ${km} km` : ""}{signed ? `  ·  ${signed}` : ""}</Text> : null}
      </View>
    </View>
  );
}

// ─── Sign-off form ───────────────────────────────────────────────────────────
function isoToDateInputValue(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function dateInputValueToISO(val) {
  if (!val) return null;
  const d = new Date(val + "T00:00:00");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function DateFieldSignoff({ label, value, onChange }) {
  if (Platform.OS === "web") {
    return (
      <View style={s.fRow}>
        <Text style={s.fLabel}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            height: 42,
            border: "1px solid #ddd",
            borderRadius: 8,
            paddingLeft: 12,
            paddingRight: 12,
            fontSize: 14,
            backgroundColor: "#f8f9fa",
            boxSizing: "border-box",
            outline: "none",
            cursor: "pointer",
          }}
        />
      </View>
    );
  }
  return (
    <View style={s.fRow}>
      <Text style={s.fLabel}>{label}</Text>
      <TextInput
        style={s.fInput}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
      />
    </View>
  );
}

function SignoffForm({ tripId, signoff, onSaved }) {
  const [form, setForm] = useState({
    freight_received: signoff?.freight_received ? String(signoff.freight_received) : "",
    excel_updated: signoff?.excel_updated ?? null,
    supervisor_sign_date: isoToDateInputValue(signoff?.supervisor_sign_date),
    driver_sign_date: isoToDateInputValue(signoff?.driver_sign_date),
    remarks: signoff?.remarks || "",
  });
  const [saving, setSaving] = useState(false);
  const client = getApiClient();

  const save = async () => {
    setSaving(true);
    try {
      await client.put(`/trip-sheets/${tripId}/signoff`, {
        freight_received: form.freight_received ? parseFloat(form.freight_received) : null,
        excel_updated: form.excel_updated,
        supervisor_sign_date: dateInputValueToISO(form.supervisor_sign_date),
        driver_sign_date: dateInputValueToISO(form.driver_sign_date),
        remarks: form.remarks || null,
      });
      showSuccess("Sign-off saved");
      onSaved();
    } catch { showError("Failed to save sign-off"); }
    finally { setSaving(false); }
  };

  const F = (key) => (v) => setForm(f => ({ ...f, [key]: v }));

  return (
    <View style={s.signoffBox}>
      <Text style={s.signoffTitle}>Supervisor Sign-Off</Text>

      <View style={s.fRow}>
        <Text style={s.fLabel}>Freight Received (₹)</Text>
        <TextInput style={s.fInput} value={form.freight_received} onChangeText={F("freight_received")} keyboardType="numeric" placeholder="Amount" />
      </View>

      <View style={s.fRow}>
        <Text style={s.fLabel}>Excel Updated</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[{ v: true, l: "✅ Yes" }, { v: false, l: "❌ No" }].map(({ v, l }) => (
            <TouchableOpacity key={String(v)} style={[s.radioBtn, form.excel_updated === v && s.radioBtnOn]} onPress={() => setForm(f => ({ ...f, excel_updated: v }))}>
              <Text style={[s.radioBtnText, form.excel_updated === v && { color: "#fff" }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <DateFieldSignoff
        label="Supervisor Sign Date"
        value={form.supervisor_sign_date}
        onChange={F("supervisor_sign_date")}
      />

      <DateFieldSignoff
        label="Driver Sign Date"
        value={form.driver_sign_date}
        onChange={F("driver_sign_date")}
      />

      <View style={[s.fRow, { alignItems: "flex-start" }]}>
        <Text style={s.fLabel}>Remarks</Text>
        <TextInput style={[s.fInput, { height: 80, textAlignVertical: "top" }]} value={form.remarks} onChangeText={F("remarks")} multiline placeholder="Incidents or notes..." />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Sign-Off</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Header (D Note + Freight) edit form ────────────────────────────────────
function HeaderForm({ tripId, ts, onSaved }) {
  const [form, setForm] = useState({ d_note_number: ts.d_note_number || "", freight_amount: ts.freight_amount ? String(ts.freight_amount) : "" });
  const [saving, setSaving] = useState(false);
  const client = getApiClient();

  const save = async () => {
    setSaving(true);
    try {
      await client.put(`/trip-sheets/${tripId}`, { d_note_number: form.d_note_number || null, freight_amount: form.freight_amount ? parseFloat(form.freight_amount) : null });
      showSuccess("Saved");
      onSaved();
    } catch { showError("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <View style={s.headerFormBox}>
      <View style={s.fRow}>
        <Text style={s.fLabel}>D Note #</Text>
        <TextInput style={s.fInput} value={form.d_note_number} onChangeText={v => setForm(f => ({ ...f, d_note_number: v }))} placeholder="Delivery note number" />
      </View>
      <View style={s.fRow}>
        <Text style={s.fLabel}>Freight Amount (₹)</Text>
        <TextInput style={s.fInput} value={form.freight_amount} onChangeText={v => setForm(f => ({ ...f, freight_amount: v }))} keyboardType="numeric" placeholder="0.00" />
      </View>
      <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Trip detail view ────────────────────────────────────────────────────────
function TripDetail({ tripId, onBack, navigation }) {
  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const client = getApiClient();

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/trip-sheets/${tripId}/full`);
      setFullData(res.data);
    } catch { showError("Failed to load trip sheet"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tripId]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!fullData) return null;

  const ts = fullData.trip_sheet || {};
  const sg = fullData.signoff;
  const dispatch = fullData.dispatch || {};
  const driver = fullData.driver || {};
  const truck = fullData.truck || {};
  const customer = fullData.customer || {};
  const stop = fullData.stop || {};
  const bill = fullData.bill || {};
  const items = fullData.items || [];
  const allStops = fullData.all_stops || [];
  const status = getTripStatus(fullData);

  const milestones = [
    { icon: "🚛", label: "Left Factory", time: fmtDT(stop.factory_exit_at), km: stop.factory_exit_km, signed: stop.factory_exit_signed, done: !!stop.factory_exit_at },
    { icon: "📍", label: "Arrived at Customer", time: fmtDT(stop.arrived_at), done: !!stop.arrived_at },
    { icon: "🔓", label: "Unloading Start", time: fmtDT(stop.unloading_start), done: !!stop.unloading_start },
    { icon: "✅", label: "Unloading Done", time: fmtDT(stop.unloading_end), done: !!stop.unloading_end },
    { icon: "↩️", label: "Return Journey", time: fmtDT(stop.return_journey_at), done: !!stop.return_journey_at },
    { icon: "🏭", label: "Factory Return", time: fmtDT(stop.factory_return_at), km: stop.factory_return_km, done: !!stop.factory_return_at },
  ];

  const kmDriven = stop.factory_exit_km && stop.factory_return_km
    ? (stop.factory_return_km - stop.factory_exit_km).toFixed(0)
    : null;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backBtnText}>← All Trips</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.tripNumText}>{ts.trip_number}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatusPill status={status} />
          <TouchableOpacity style={s.printBtn} onPress={() => navigation.navigate("TripSheetPrint", { tripId })}>
            <Text style={s.printBtnText}>🖨 Print</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {[["summary", "Summary"], ["journey", "Journey"], ["signoff", "Sign-Off"]].map(([k, l]) => (
          <TouchableOpacity key={k} style={[s.tabBtn, tab === k && s.tabBtnOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabBtnText, tab === k && s.tabBtnTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Summary Tab ── */}
      {tab === "summary" && (
        <View>
          <View style={s.sectionCard}>
            <Text style={s.sectionCardTitle}>Dispatch Info</Text>
            <InfoRow label="Dispatch #" value={String(dispatch.dispatch_id || "")} />
            <InfoRow label="Truck" value={truck.truck_number} />
            <InfoRow label="Driver" value={driver.driver_name} />
            <InfoRow label="Customer" value={
              allStops.length > 0
                ? [...new Set(allStops.map(s => s.customer_name).filter(Boolean))].join(", ")
                : customer.customer_name || ""
            } />
            <InfoRow label="Delivery Place" value={
              allStops.length > 0
                ? [...new Set(allStops.map(s => s.customer_city).filter(Boolean))].join(", ")
                : customer.city || ""
            } />
            <InfoRow label="Dispatch Date" value={fmtDate(dispatch.actual_dispatch_date)} />
            <InfoRow label="Bill #" value={bill.invoice_number} />
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionCardTitle}>Products Dispatched</Text>
            {items.map((item, i) => (
              <View key={i} style={s.itemRow}>
                <Text style={s.itemName}>{item.product_name}</Text>
                <Text style={s.itemQty}>{item.dispatched_qty_ton} T · {item.dispatched_bags || 0} bags</Text>
              </View>
            ))}
          </View>

          {kmDriven && (
            <View style={[s.sectionCard, { backgroundColor: "#e8f5e9" }]}>
              <Text style={s.sectionCardTitle}>KM Summary</Text>
              <InfoRow label="Start KM" value={stop.factory_exit_km ? `${stop.factory_exit_km} km` : null} />
              <InfoRow label="End KM" value={stop.factory_return_km ? `${stop.factory_return_km} km` : null} />
              <InfoRow label="Total Driven" value={`${kmDriven} km`} />
            </View>
          )}

          <HeaderForm tripId={tripId} ts={ts} onSaved={load} />
        </View>
      )}

      {/* ── Journey Tab (read-only) ── */}
      {tab === "journey" && (
        <View style={s.sectionCard}>
          <Text style={s.sectionCardTitle}>Journey Milestones</Text>
          <Text style={s.journeyNote}>These times are recorded by the driver. View only.</Text>
          <View style={s.milestoneList}>
            {milestones.map((m, i) => <JourneyMilestone key={i} {...m} />)}
          </View>
          {sg?.freight_received && (
            <View style={s.freightRow}>
              <Text style={s.freightLabel}>Freight Amount</Text>
              <Text style={s.freightVal}>₹ {ts.freight_amount || "—"}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Sign-Off Tab ── */}
      {tab === "signoff" && (
        <SignoffForm tripId={tripId} signoff={sg} onSaved={load} />
      )}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function TripSheetScreen({ route, navigation }) {
  const { dispatchId: paramDispatchId } = route.params || {};
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const client = getApiClient();

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const res = await client.get("/trip-sheets");
      setTrips(res.data || []);
    } catch { showError("Failed to load trip sheets"); }
    finally { setLoading(false); }
  };

  const filtered = trips.filter(t =>
    !searchText ||
    t.trip_number?.toLowerCase().includes(searchText.toLowerCase()) ||
    String(t.dispatch_id).includes(searchText)
  );

  if (selectedId) {
    return (
      <Layout title="Trip Sheet" navigation={navigation}>
        <TripDetail tripId={selectedId} onBack={() => setSelectedId(null)} navigation={navigation} />
      </Layout>
    );
  }

  return (
    <Layout title="Trip Sheet (Admin)" navigation={navigation}>
      <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>All Trip Sheets</Text>
          <Text style={s.listSub}>Supervisor sign-off and print view</Text>
        </View>

        <TextInput
          style={s.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by trip number or dispatch ID..."
        />

        {loading
          ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          : filtered.length === 0
            ? <View style={s.emptyBox}><Text style={{ fontSize: 40 }}>📋</Text><Text style={s.emptyText}>{searchText ? "No results." : "No trip sheets yet.\nStart a trip from Driver View."}</Text></View>
            : filtered.map(t => <TripCard key={t.id} trip={t} onPress={() => setSelectedId(t.id)} />)
        }
      </ScrollView>
    </Layout>
  );
}

function TripCard({ trip, onPress }) {
  return (
    <TouchableOpacity style={s.tripCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.tripCardTop}>
        <Text style={s.tripCardNum}>{trip.trip_number}</Text>
        <View style={s.tripCardDispatch}>
          <Text style={s.tripCardDispatchText}>Dispatch #{trip.dispatch_id}</Text>
        </View>
      </View>
      <View style={s.tripCardBottom}>
        {trip.d_note_number && <Text style={s.tripCardMeta}>D Note: {trip.d_note_number}</Text>}
        {trip.freight_amount && <Text style={s.tripCardMeta}>Freight: ₹{trip.freight_amount}</Text>}
        <Text style={s.tripCardMeta}>{new Date(trip.created_at).toLocaleDateString("en-IN")}</Text>
      </View>
      <Text style={s.tripCardArrow}>→ Open</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f6f8" },
  pageContent: { padding: 16, paddingBottom: 50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },

  listHeader: { marginBottom: 14 },
  listTitle: { fontSize: 22, fontWeight: "800", color: "#1a2a3a" },
  listSub: { fontSize: 13, color: "#888", marginTop: 2 },
  searchInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: "#fff", marginBottom: 16 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { textAlign: "center", color: "#999", fontSize: 15, lineHeight: 22 },

  tripCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  tripCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  tripCardNum: { fontSize: 17, fontWeight: "800", color: "#1a2a3a" },
  tripCardDispatch: { backgroundColor: "#e3f2fd", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tripCardDispatchText: { fontSize: 12, color: "#1565C0", fontWeight: "700" },
  tripCardBottom: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  tripCardMeta: { fontSize: 13, color: "#666" },
  tripCardArrow: { fontSize: 13, color: "#1565C0", fontWeight: "700", textAlign: "right" },

  // Detail
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 8 },
  backBtnText: { color: "#1565C0", fontWeight: "700", fontSize: 13 },
  tripNumText: { fontWeight: "800", fontSize: 15, color: "#1a2a3a" },
  printBtn: { backgroundColor: "#2e7d32", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  printBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontWeight: "700", fontSize: 12 },

  tabBar: { flexDirection: "row", borderRadius: 10, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#f4f6f8" },
  tabBtnOn: { backgroundColor: "#1565C0" },
  tabBtnText: { fontWeight: "600", color: "#666", fontSize: 13 },
  tabBtnTextOn: { color: "#fff" },

  sectionCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionCardTitle: { fontSize: 15, fontWeight: "800", color: "#1a2a3a", marginBottom: 12 },

  infoRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoLabel: { width: 120, fontSize: 13, color: "#888", fontWeight: "600" },
  infoValue: { flex: 1, fontSize: 13, color: "#1a2a3a", fontWeight: "500" },

  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  itemName: { fontSize: 13, color: "#333", flex: 1 },
  itemQty: { fontSize: 13, color: "#555", fontWeight: "700" },

  journeyNote: { fontSize: 12, color: "#999", marginBottom: 12, fontStyle: "italic" },
  milestoneList: { gap: 6 },
  milestone: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 8, backgroundColor: "#f8f9fa" },
  milestoneDone: { backgroundColor: "#e8f5e9" },
  milestoneDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" },
  milestoneDotDone: { backgroundColor: "#2e7d32" },
  milestoneIcon: { fontSize: 14 },
  milestoneLabel: { fontSize: 14, fontWeight: "700", color: "#555" },
  milestoneSub: { fontSize: 12, color: "#888", marginTop: 2 },

  freightRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, padding: 12, backgroundColor: "#fffde7", borderRadius: 8 },
  freightLabel: { fontSize: 14, fontWeight: "700", color: "#555" },
  freightVal: { fontSize: 16, fontWeight: "800", color: "#e65100" },

  headerFormBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 14 },
  signoffBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 14 },
  signoffTitle: { fontSize: 16, fontWeight: "800", color: "#1a2a3a", marginBottom: 14 },

  fRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  fLabel: { width: 150, fontSize: 13, color: "#555", fontWeight: "600" },
  fInput: { flex: 1, height: 42, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, backgroundColor: "#f8f9fa" },
  radioBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#f4f6f8" },
  radioBtnOn: { backgroundColor: "#1565C0", borderColor: "#1565C0" },
  radioBtnText: { fontWeight: "700", color: "#444", fontSize: 13 },
  saveBtn: { backgroundColor: "#1565C0", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
