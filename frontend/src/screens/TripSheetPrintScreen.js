import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { getApiClient } from "../api/client";

function fmt(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch { return isoStr; }
}

function fmtTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

function fmtDate(isoStr) {
  return fmt(isoStr);
}

export default function TripSheetPrintScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const client = getApiClient();
      const res = await client.get(`/trip-sheets/${tripId}/full`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (Platform.OS === "web") {
      window.print();
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading trip sheet...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#e74c3c", fontSize: 16 }}>Failed to load trip sheet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: "#fff" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ts = data.trip_sheet || {};
  const sg = data.signoff || {};
  const dispatch = data.dispatch || {};
  const driver = data.driver || {};
  const truck = data.truck || {};
  const customer = data.customer || {};
  const bill = data.bill || {};
  const stop = data.stop || {};
  const items = data.items || [];

  const deliveryAddress = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
  const totalWeight = items.reduce((s, i) => s + (i.dispatched_qty_ton || 0), 0);

  const journeyRows = [
    {
      num: "1", label: "Factory Exit", bg: "#2c3e50", color: "#fff",
      date: fmtDate(stop.factory_exit_at),
      time: fmtTime(stop.factory_exit_at),
      km: stop.factory_exit_km ? `Start KM: ${stop.factory_exit_km}` : "",
      signed: stop.factory_exit_signed || "",
    },
    {
      num: "2", label: "Customer Arrived", bg: "#2980b9", color: "#fff",
      date: fmtDate(stop.arrived_at),
      time: fmtTime(stop.arrived_at),
      km: "",
      signed: "",
    },
    {
      num: "3", label: "Unloading Start", bg: "#8e44ad", color: "#fff",
      date: fmtDate(stop.unloading_start),
      time: fmtTime(stop.unloading_start),
      km: "",
      signed: "",
    },
    {
      num: "3", label: "Unloading End", bg: "#c0392b", color: "#fff",
      date: fmtDate(stop.unloading_end),
      time: fmtTime(stop.unloading_end),
      km: "",
      signed: stop.customer_signature ? `Customer: ${stop.customer_signature}` : "",
    },
    {
      num: "₹", label: "Freight Amount", bg: "#f39c12", color: "#fff",
      date: ts.freight_amount ? `₹ ${ts.freight_amount}` : "",
      time: "",
      km: "",
      signed: "",
    },
    {
      num: "5", label: "Return Journey", bg: "#16a085", color: "#fff",
      date: fmtDate(stop.return_journey_at),
      time: fmtTime(stop.return_journey_at),
      km: "",
      signed: "",
    },
    {
      num: "6", label: "Factory Return", bg: "#27ae60", color: "#fff",
      date: fmtDate(stop.factory_return_at),
      time: fmtTime(stop.factory_return_at),
      km: stop.factory_return_km ? `End KM: ${stop.factory_return_km}` : "",
      signed: "",
    },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Print & Back Controls (hidden when printing) */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.ctrlBtn}>
          <Text style={styles.ctrlBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePrint} style={[styles.ctrlBtn, { backgroundColor: "#27ae60" }]}>
          <Text style={styles.ctrlBtnText}>🖨 Print (A4)</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════ A4 TRIP SHEET ═══════ */}
      <View style={styles.sheet} nativeID="trip-sheet-print">

        {/* ── Title Row ── */}
        <View style={styles.titleRow}>
          <View style={styles.titleCompany}>
            <Text style={styles.titleCompanyText}>BRFM India</Text>
          </View>
          <View style={styles.titleCenter}>
            <Text style={styles.titleCenterText}>TRIP SHEET</Text>
          </View>
          <View style={styles.titleRight}>
            <View style={styles.titleCell}>
              <Text style={styles.titleCellLabel}>TRIP ID</Text>
              <Text style={styles.titleCellValue}>{ts.trip_number || ""}</Text>
            </View>
            <View style={styles.titleCell}>
              <Text style={styles.titleCellLabel}>Date</Text>
              <Text style={styles.titleCellValue}>{fmtDate(ts.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* ── Info Grid ── */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>Truck No.</Text>
            </View>
            <View style={styles.infoValueBox}>
              <Text style={styles.infoValue}>{truck.truck_number || ""}</Text>
            </View>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>Driver Name</Text>
            </View>
            <View style={styles.infoValueBox}>
              <Text style={styles.infoValue}>{driver.driver_name || ""}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>Customer Name</Text>
            </View>
            <View style={[styles.infoValueBox, { flex: 3 }]}>
              <Text style={styles.infoValue}>{customer.customer_name || ""}</Text>
            </View>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>Delivery Place</Text>
            </View>
            <View style={[styles.infoValueBox, { flex: 3 }]}>
              <Text style={styles.infoValue}>{deliveryAddress}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoLabelBoxFull, { flex: 2 }]}>
              <Text style={styles.infoLabel}>Weight</Text>
            </View>
            <View style={[styles.infoValueBox, { flex: 2 }]}>
              <Text style={styles.infoValue}>{totalWeight ? `${totalWeight} Ton` : ""}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>Bill No.</Text>
            </View>
            <View style={styles.infoValueBox}>
              <Text style={styles.infoValue}>{bill.invoice_number || ""}</Text>
            </View>
            <View style={styles.infoLabelBox}>
              <Text style={styles.infoLabel}>D Note #</Text>
            </View>
            <View style={styles.infoValueBox}>
              <Text style={styles.infoValue}>{ts.d_note_number || ""}</Text>
            </View>
          </View>
        </View>

        {/* ── Journey Table ── */}
        <View style={styles.journeyTable}>
          {/* Table Header */}
          <View style={styles.journeyHeader}>
            <View style={[styles.jhCell, { width: 30 }]}>
              <Text style={styles.jhText}>#</Text>
            </View>
            <View style={[styles.jhCell, { flex: 2 }]}>
              <Text style={styles.jhText}>Milestone</Text>
            </View>
            <View style={[styles.jhCell, { flex: 2 }]}>
              <Text style={styles.jhText}>Date</Text>
            </View>
            <View style={[styles.jhCell, { flex: 1.5 }]}>
              <Text style={styles.jhText}>Time</Text>
            </View>
            <View style={[styles.jhCell, { flex: 2 }]}>
              <Text style={styles.jhText}>KM / Amount</Text>
            </View>
            <View style={[styles.jhCell, { flex: 2 }]}>
              <Text style={styles.jhText}>Signed</Text>
            </View>
          </View>

          {/* Journey Rows */}
          {journeyRows.map((row, idx) => (
            <View key={idx} style={styles.journeyRow}>
              <View style={[styles.jrNumCell, { width: 30, backgroundColor: row.bg }]}>
                <Text style={[styles.jrNumText, { color: row.color }]}>{row.num}</Text>
              </View>
              <View style={[styles.jrLabelCell, { flex: 2, backgroundColor: row.bg }]}>
                <Text style={[styles.jrLabelText, { color: row.color }]}>{row.label}</Text>
              </View>
              <View style={[styles.jrCell, { flex: 2 }]}>
                <Text style={styles.jrCellText}>{row.date}</Text>
              </View>
              <View style={[styles.jrCell, { flex: 1.5 }]}>
                <Text style={styles.jrCellText}>{row.time}</Text>
              </View>
              <View style={[styles.jrCell, { flex: 2 }]}>
                <Text style={styles.jrCellText}>{row.km}</Text>
              </View>
              <View style={[styles.jrCell, { flex: 2 }]}>
                <Text style={styles.jrCellText}>{row.signed}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Bottom Section ── */}
        <View style={styles.bottomSection}>
          {/* Remarks */}
          <View style={styles.bottomRemarks}>
            <View style={styles.bottomSectionHeader}>
              <Text style={styles.bottomSectionHeaderText}>Remarks / Incidents</Text>
            </View>
            <View style={styles.bottomRemarkBody}>
              <Text style={styles.bottomRemarkText}>{sg.remarks || ""}</Text>
            </View>
          </View>

          {/* Driver */}
          <View style={styles.bottomDriver}>
            <View style={styles.bottomSectionHeader}>
              <Text style={styles.bottomSectionHeaderText}>Driver</Text>
            </View>
            <View style={styles.bottomSignBody}>
              <Text style={styles.signLine}>Name: {driver.driver_name || "_____________"}</Text>
              <Text style={styles.signLine}>Sign: _____________</Text>
              <Text style={styles.signLine}>
                Date: {sg.driver_sign_date ? fmt(sg.driver_sign_date) : "__/__/____"}
              </Text>
            </View>
          </View>

          {/* Supervisor */}
          <View style={styles.bottomSupervisor}>
            <View style={[styles.bottomSectionHeader, { backgroundColor: "#e8f4f8" }]}>
              <Text style={[styles.bottomSectionHeaderText, { color: "#2c3e50" }]}>Supervisor</Text>
            </View>
            <View style={styles.bottomSignBody}>
              <Text style={styles.signLine}>
                Freight Received: ₹ {sg.freight_received || "_________"}
              </Text>
              <Text style={styles.signLine}>
                Excel Updated: {sg.excel_updated === true ? "● Yes  ○ No" : sg.excel_updated === false ? "○ Yes  ● No" : "○ Yes  ○ No"}
              </Text>
              <Text style={styles.signLine}>Sign: _____________</Text>
              <Text style={styles.signLine}>
                Date: {sg.supervisor_sign_date ? fmt(sg.supervisor_sign_date) : "__/__/____"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            BRFM India | Return this sheet to the Supervisor when the vehicle arrives back at the factory.
          </Text>
        </View>
      </View>

      {/* Print CSS injected for web */}
      {Platform.OS === "web" && (
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #trip-sheet-print, #trip-sheet-print * { visibility: visible; }
            #trip-sheet-print { position: fixed; top: 0; left: 0; width: 210mm; min-height: 297mm; margin: 0; padding: 10mm; box-sizing: border-box; }
            .controls { display: none !important; }
          }
        `}</style>
      )}
    </ScrollView>
  );
}

const BORDER = "#aaa";
const CELL_H = 42;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#e8e8e8" },
  pageContent: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  controls: { flexDirection: "row", gap: 12, marginBottom: 16 },
  ctrlBtn: { backgroundColor: "#2c3e50", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  ctrlBtnText: { color: "#fff", fontWeight: "bold" },
  backBtn: { marginTop: 12, backgroundColor: "#2c3e50", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  // A4 sheet
  sheet: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 794, // A4 px at 96dpi
    minHeight: 1123,
    borderWidth: 1,
    borderColor: "#bbb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Title row
  titleRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: BORDER },
  titleCompany: { flex: 2, backgroundColor: "#2c3e50", padding: 12, justifyContent: "center", alignItems: "center" },
  titleCompanyText: { color: "#fff", fontSize: 22, fontWeight: "bold", letterSpacing: 1 },
  titleCenter: { flex: 2, backgroundColor: "#7f8c8d", padding: 12, justifyContent: "center", alignItems: "center" },
  titleCenterText: { color: "#fff", fontSize: 20, fontWeight: "bold", letterSpacing: 2 },
  titleRight: { flex: 2, flexDirection: "row" },
  titleCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: BORDER, padding: 8, justifyContent: "center", alignItems: "center" },
  titleCellLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  titleCellValue: { fontSize: 13, fontWeight: "bold", color: "#333" },

  // Info grid
  infoGrid: { borderBottomWidth: 2, borderBottomColor: BORDER },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", minHeight: 36 },
  infoLabelBox: { flex: 1.2, backgroundColor: "#1a5276", padding: 8, justifyContent: "center", borderRightWidth: 1, borderRightColor: BORDER },
  infoLabelBoxFull: { backgroundColor: "#1a5276", padding: 8, justifyContent: "center", borderRightWidth: 1, borderRightColor: BORDER },
  infoLabel: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  infoValueBox: { flex: 2, padding: 8, borderRightWidth: 1, borderRightColor: "#ddd", justifyContent: "center" },
  infoValue: { fontSize: 13, color: "#222" },

  // Journey table
  journeyTable: { borderBottomWidth: 2, borderBottomColor: BORDER },
  journeyHeader: { flexDirection: "row", backgroundColor: "#2c3e50", borderBottomWidth: 1, borderBottomColor: BORDER },
  jhCell: { padding: 8, borderRightWidth: 1, borderRightColor: "#555", justifyContent: "center", alignItems: "center" },
  jhText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  journeyRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", minHeight: CELL_H },
  jrNumCell: { width: 30, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: BORDER },
  jrNumText: { fontWeight: "bold", fontSize: 13 },
  jrLabelCell: { justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: BORDER },
  jrLabelText: { fontWeight: "bold", fontSize: 13 },
  jrCell: { justifyContent: "center", paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: "#ddd" },
  jrCellText: { fontSize: 12, color: "#333" },

  // Bottom section
  bottomSection: { flexDirection: "row", borderTopWidth: 2, borderTopColor: BORDER, minHeight: 140 },
  bottomRemarks: { flex: 2, borderRightWidth: 1, borderRightColor: BORDER },
  bottomDriver: { flex: 1.5, borderRightWidth: 1, borderRightColor: BORDER },
  bottomSupervisor: { flex: 2 },
  bottomSectionHeader: { backgroundColor: "#c0392b", padding: 6 },
  bottomSectionHeaderText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  bottomRemarkBody: { flex: 1, padding: 10 },
  bottomRemarkText: { fontSize: 12, color: "#333" },
  bottomSignBody: { flex: 1, padding: 10, gap: 8 },
  signLine: { fontSize: 12, color: "#333", marginBottom: 6 },

  // Footer
  footer: { padding: 10, borderTopWidth: 1, borderTopColor: "#ddd", alignItems: "center" },
  footerText: { fontSize: 11, color: "#888", textAlign: "center", fontStyle: "italic" },
});
