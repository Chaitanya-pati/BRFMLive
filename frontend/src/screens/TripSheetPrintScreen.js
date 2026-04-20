import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image } from "react-native";
import { getApiClient, API_BASE_URL } from "../api/client";

function fmt(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  } catch { return isoStr; }
}
function fmtTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  } catch { return ""; }
}

// Render either an image or a text value in a cell
function SigCell({ path }) {
  if (!path) return null;
  const url = `${API_BASE_URL}/${path}`;
  return (
    <Image
      source={{ uri: url }}
      style={{ width: 80, height: 36, resizeMode: "contain" }}
    />
  );
}

export default function TripSheetPrintScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tripId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getApiClient().get(`/trip-sheets/${tripId}/full`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <View style={st.centered}>
      <ActivityIndicator size="large" color="#2c3e50" />
      <Text style={{ marginTop: 10, color: "#666" }}>Loading trip sheet...</Text>
    </View>
  );

  if (!data) return (
    <View style={st.centered}>
      <Text style={{ color: "#e74c3c", fontSize: 16 }}>Failed to load trip sheet.</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
        <Text style={{ color: "#fff" }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const ts      = data.trip_sheet || {};
  const sg      = data.signoff || {};
  const dispatch = data.dispatch || {};
  const driver  = data.driver || {};
  const truck   = data.truck || {};
  const customer = data.customer || {};
  const bill    = data.bill || {};
  const stop    = data.stop || {};           // trip-level (factory exit/return)
  const allStops = data.all_stops || [];     // per-customer stops
  const items   = data.items || [];

  const multiCustomer = allStops.length > 1;
  const deliveryAddr  = allStops.length > 0
    ? [...new Set(allStops.map(s => s.customer_city).filter(Boolean))].join(", ")
    : [customer.city].filter(Boolean).join(", ");
  const totalWeight   = items.reduce((s, i) => s + (i.dispatched_qty_ton || 0), 0);

  // Customer names for info row
  const customerNames = multiCustomer
    ? allStops.map((s, i) => s.customer_name || `Customer ${i+1}`).join(", ")
    : (allStops[0]?.customer_name || customer.customer_name || "");

  // Build journey rows
  // For single-customer: flat table as before
  // For multi-customer: group per stop with a separator header row
  const buildJourneyRows = () => {
    const rows = [];

    // Row 1: Factory Exit (trip-level)
    rows.push({
      type: "row",
      num: "1", label: "Factory Exit", bg: "#2c3e50", color: "#fff",
      date: fmt(stop.factory_exit_at), time: fmtTime(stop.factory_exit_at),
      km: stop.factory_exit_km ? `${stop.factory_exit_km} km` : "",
      signed: stop.factory_exit_signed || "", sigPath: null,
    });

    if (multiCustomer) {
      allStops.forEach((s, idx) => {
        // Customer header row
        rows.push({
          type: "header",
          label: `Customer ${idx + 1}: ${s.customer_name || `Customer ${idx+1}`}`,
        });
        rows.push({
          type: "row",
          num: "2", label: "Customer Arrived", bg: "#2980b9", color: "#fff",
          date: fmt(s.arrived_at), time: fmtTime(s.arrived_at),
          km: "", signed: "", sigPath: null,
        });
        rows.push({
          type: "row",
          num: "3", label: "Unloading Start", bg: "#8e44ad", color: "#fff",
          date: fmt(s.unloading_start), time: fmtTime(s.unloading_start),
          km: "", signed: "", sigPath: null,
        });
        rows.push({
          type: "row",
          num: "4", label: "Unloading End", bg: "#c0392b", color: "#fff",
          date: fmt(s.unloading_end), time: fmtTime(s.unloading_end),
          km: "", signed: "Customer:", sigPath: s.customer_signature || null,
        });
      });
    } else {
      const s = allStops[0] || {};
      rows.push({
        type: "row",
        num: "2", label: "Customer Arrived", bg: "#2980b9", color: "#fff",
        date: fmt(s.arrived_at), time: fmtTime(s.arrived_at),
        km: "", signed: "", sigPath: null,
      });
      rows.push({
        type: "row",
        num: "3", label: "Unloading Start", bg: "#8e44ad", color: "#fff",
        date: fmt(s.unloading_start), time: fmtTime(s.unloading_start),
        km: "", signed: "", sigPath: null,
      });
      rows.push({
        type: "row",
        num: "4", label: "Unloading End", bg: "#c0392b", color: "#fff",
        date: fmt(s.unloading_end), time: fmtTime(s.unloading_end),
        km: "", signed: s.customer_signature ? "Customer:" : "",
        sigPath: s.customer_signature || null,
      });
    }

    // Freight, Return Journey, Factory Return
    rows.push({
      type: "row",
      num: "₹", label: "Freight Amount", bg: "#f39c12", color: "#fff",
      date: ts.freight_amount ? `₹ ${ts.freight_amount}` : "",
      time: "", km: "", signed: "", sigPath: null,
    });
    rows.push({
      type: "row",
      num: "5", label: "Return Journey", bg: "#16a085", color: "#fff",
      date: fmt(stop.return_journey_at), time: fmtTime(stop.return_journey_at),
      km: "", signed: "", sigPath: null,
    });
    rows.push({
      type: "row",
      num: "6", label: "Factory Return", bg: "#27ae60", color: "#fff",
      date: fmt(stop.factory_return_at), time: fmtTime(stop.factory_return_at),
      km: stop.factory_return_km ? `${stop.factory_return_km} km` : "",
      signed: "", sigPath: null,
    });

    return rows;
  };

  const journeyRows = buildJourneyRows();

  return (
    <ScrollView style={st.page} contentContainerStyle={st.pageContent}>
      {/* Controls */}
      <View style={st.controls}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.ctrlBtn}>
          <Text style={st.ctrlBtnTxt}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Platform.OS === "web" && window.print()} style={[st.ctrlBtn, { backgroundColor: "#27ae60" }]}>
          <Text style={st.ctrlBtnTxt}>🖨 Print (A4)</Text>
        </TouchableOpacity>
      </View>

      {/* A4 Sheet */}
      <View style={st.sheet} nativeID="trip-sheet-print">

        {/* Title row */}
        <View style={st.titleRow}>
          <View style={st.titleCompany}><Text style={st.titleCompanyTxt}>BRFM India</Text></View>
          <View style={st.titleCenter}><Text style={st.titleCenterTxt}>TRIP SHEET</Text></View>
          <View style={st.titleRight}>
            <View style={st.titleCell}>
              <Text style={st.titleCellLabel}>TRIP ID</Text>
              <Text style={st.titleCellVal}>{ts.trip_number || ""}</Text>
            </View>
            <View style={st.titleCell}>
              <Text style={st.titleCellLabel}>Date</Text>
              <Text style={st.titleCellVal}>{fmt(ts.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View style={st.infoGrid}>
          <View style={st.infoRow}>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>Truck No.</Text></View>
            <View style={st.infoVal}><Text style={st.infoValTxt}>{truck.truck_number || ""}</Text></View>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>Driver Name</Text></View>
            <View style={st.infoVal}><Text style={st.infoValTxt}>{driver.driver_name || ""}</Text></View>
          </View>
          <View style={st.infoRow}>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>Customer Name</Text></View>
            <View style={[st.infoVal, { flex: 3 }]}><Text style={st.infoValTxt}>{customerNames}</Text></View>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>Delivery Place</Text></View>
            <View style={[st.infoVal, { flex: 3 }]}><Text style={st.infoValTxt}>{deliveryAddr}</Text></View>
          </View>
          <View style={st.infoRow}>
            <View style={[st.infoLbl, { flex: 2 }]}><Text style={st.infoLblTxt}>Weight</Text></View>
            <View style={[st.infoVal, { flex: 2 }]}><Text style={st.infoValTxt}>{totalWeight ? `${totalWeight} Ton` : ""}</Text></View>
          </View>
          <View style={st.infoRow}>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>Bill No.</Text></View>
            <View style={st.infoVal}><Text style={st.infoValTxt}>{bill.invoice_number || ""}</Text></View>
            <View style={st.infoLbl}><Text style={st.infoLblTxt}>D Note #</Text></View>
            <View style={st.infoVal}><Text style={st.infoValTxt}>{ts.d_note_number || ""}</Text></View>
          </View>
        </View>

        {/* Journey table */}
        <View style={st.jTable}>
          {/* Table header */}
          <View style={st.jHead}>
            <View style={[st.jHCell, { width: 30 }]}><Text style={st.jHCellTxt}>#</Text></View>
            <View style={[st.jHCell, { flex: 2 }]}><Text style={st.jHCellTxt}>Milestone</Text></View>
            <View style={[st.jHCell, { flex: 2 }]}><Text style={st.jHCellTxt}>Date</Text></View>
            <View style={[st.jHCell, { flex: 1.5 }]}><Text style={st.jHCellTxt}>Time</Text></View>
            <View style={[st.jHCell, { flex: 2 }]}><Text style={st.jHCellTxt}>KM / Amount</Text></View>
            <View style={[st.jHCell, { flex: 2 }]}><Text style={st.jHCellTxt}>Signed</Text></View>
          </View>

          {journeyRows.map((row, idx) => {
            if (row.type === "header") {
              return (
                <View key={idx} style={st.jCustHeader}>
                  <Text style={st.jCustHeaderTxt}>{row.label}</Text>
                </View>
              );
            }
            return (
              <View key={idx} style={st.jRow}>
                <View style={[st.jNumCell, { width: 30, backgroundColor: row.bg }]}>
                  <Text style={[st.jNumTxt, { color: row.color }]}>{row.num}</Text>
                </View>
                <View style={[st.jLblCell, { flex: 2, backgroundColor: row.bg }]}>
                  <Text style={[st.jLblTxt, { color: row.color }]}>{row.label}</Text>
                </View>
                <View style={[st.jCell, { flex: 2 }]}><Text style={st.jCellTxt}>{row.date}</Text></View>
                <View style={[st.jCell, { flex: 1.5 }]}><Text style={st.jCellTxt}>{row.time}</Text></View>
                <View style={[st.jCell, { flex: 2 }]}><Text style={st.jCellTxt}>{row.km}</Text></View>
                <View style={[st.jCell, { flex: 2, alignItems: "flex-start" }]}>
                  {row.sigPath
                    ? <SigCell path={row.sigPath} />
                    : <Text style={st.jCellTxt}>{row.signed}</Text>
                  }
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom: Remarks / Driver / Supervisor */}
        <View style={st.bottom}>
          <View style={st.bottomRemarks}>
            <View style={st.bottomHdr}><Text style={st.bottomHdrTxt}>Remarks / Incidents</Text></View>
            <View style={st.bottomBody}><Text style={st.bottomBodyTxt}>{sg.remarks || ""}</Text></View>
          </View>
          <View style={st.bottomDriver}>
            <View style={st.bottomHdr}><Text style={st.bottomHdrTxt}>Driver</Text></View>
            <View style={st.bottomBody}>
              <Text style={st.signLine}>Name: {driver.driver_name || "_____________"}</Text>
              {stop.driver_signature
                ? <Image source={{ uri: `${API_BASE_URL}/${stop.driver_signature}` }} style={{ width: 120, height: 44, resizeMode: "contain", marginVertical: 4 }} />
                : <Text style={st.signLine}>Sign: _____________</Text>
              }
              <Text style={st.signLine}>Date: {sg.driver_sign_date ? fmt(sg.driver_sign_date) : "__/__/____"}</Text>
            </View>
          </View>
          <View style={st.bottomSupervisor}>
            <View style={[st.bottomHdr, { backgroundColor: "#e8f4f8" }]}>
              <Text style={[st.bottomHdrTxt, { color: "#2c3e50" }]}>Supervisor</Text>
            </View>
            <View style={st.bottomBody}>
              <Text style={st.signLine}>Freight Received: ₹ {sg.freight_received || "_________"}</Text>
              <Text style={st.signLine}>
                Excel Updated: {sg.excel_updated === true ? "● Yes  ○ No" : sg.excel_updated === false ? "○ Yes  ● No" : "○ Yes  ○ No"}
              </Text>
              <Text style={st.signLine}>Sign: _____________</Text>
              <Text style={st.signLine}>Date: {sg.supervisor_sign_date ? fmt(sg.supervisor_sign_date) : "__/__/____"}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={st.footer}>
          <Text style={st.footerTxt}>BRFM India | Return this sheet to the Supervisor when the vehicle arrives back at the factory.</Text>
        </View>
      </View>

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

const B = "#aaa";
const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#e8e8e8" },
  pageContent: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginTop: 12, backgroundColor: "#2c3e50", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  controls: { flexDirection: "row", gap: 12, marginBottom: 16 },
  ctrlBtn: { backgroundColor: "#2c3e50", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  ctrlBtnTxt: { color: "#fff", fontWeight: "bold" },

  sheet: { backgroundColor: "#fff", width: "100%", maxWidth: 794, minHeight: 1123, borderWidth: 1, borderColor: "#bbb", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },

  titleRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: B },
  titleCompany: { flex: 2, backgroundColor: "#2c3e50", padding: 12, justifyContent: "center", alignItems: "center" },
  titleCompanyTxt: { color: "#fff", fontSize: 22, fontWeight: "bold", letterSpacing: 1 },
  titleCenter: { flex: 2, backgroundColor: "#7f8c8d", padding: 12, justifyContent: "center", alignItems: "center" },
  titleCenterTxt: { color: "#fff", fontSize: 20, fontWeight: "bold", letterSpacing: 2 },
  titleRight: { flex: 2, flexDirection: "row" },
  titleCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: B, padding: 8, justifyContent: "center", alignItems: "center" },
  titleCellLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  titleCellVal: { fontSize: 13, fontWeight: "bold", color: "#333" },

  infoGrid: { borderBottomWidth: 2, borderBottomColor: B },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", minHeight: 36 },
  infoLbl: { flex: 1.2, backgroundColor: "#1a5276", padding: 8, justifyContent: "center", borderRightWidth: 1, borderRightColor: B },
  infoLblTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  infoVal: { flex: 2, padding: 8, borderRightWidth: 1, borderRightColor: "#ddd", justifyContent: "center" },
  infoValTxt: { fontSize: 13, color: "#222" },

  jTable: { borderBottomWidth: 2, borderBottomColor: B },
  jHead: { flexDirection: "row", backgroundColor: "#2c3e50", borderBottomWidth: 1, borderBottomColor: B },
  jHCell: { padding: 8, borderRightWidth: 1, borderRightColor: "#555", justifyContent: "center", alignItems: "center" },
  jHCellTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // Customer section header row
  jCustHeader: { backgroundColor: "#ecf0f1", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  jCustHeaderTxt: { fontWeight: "bold", fontSize: 13, color: "#2c3e50" },

  jRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", minHeight: 42 },
  jNumCell: { width: 30, justifyContent: "center", alignItems: "center", borderRightWidth: 1, borderRightColor: B },
  jNumTxt: { fontWeight: "bold", fontSize: 13 },
  jLblCell: { justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: B },
  jLblTxt: { fontWeight: "bold", fontSize: 13 },
  jCell: { justifyContent: "center", paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: "#ddd" },
  jCellTxt: { fontSize: 12, color: "#333" },

  bottom: { flexDirection: "row", borderTopWidth: 2, borderTopColor: B, minHeight: 140 },
  bottomRemarks: { flex: 2, borderRightWidth: 1, borderRightColor: B },
  bottomDriver: { flex: 1.5, borderRightWidth: 1, borderRightColor: B },
  bottomSupervisor: { flex: 2 },
  bottomHdr: { backgroundColor: "#c0392b", padding: 6 },
  bottomHdrTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  bottomBody: { flex: 1, padding: 10, gap: 6 },
  bottomBodyTxt: { fontSize: 12, color: "#333" },
  signLine: { fontSize: 12, color: "#333", marginBottom: 4 },

  footer: { padding: 10, borderTopWidth: 1, borderTopColor: "#ddd", alignItems: "center" },
  footerTxt: { fontSize: 11, color: "#888", textAlign: "center", fontStyle: "italic" },
});
