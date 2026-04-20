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

function assetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

// On-screen signature preview (React Native Image is fine here)
function SigCell({ path }) {
  if (!path) return null;
  return (
    <Image
      source={{ uri: assetUrl(path) }}
      style={{ width: 80, height: 36, resizeMode: "contain" }}
    />
  );
}

// ─── HTML Print Generator ─────────────────────────────────────────────────────
function buildPrintHtml(data) {
  const ts       = data.trip_sheet || {};
  const sg       = data.signoff || {};
  const dispatch = data.dispatch || {};
  const driver   = data.driver || {};
  const truck    = data.truck || {};
  const customer = data.customer || {};
  const bill     = data.bill || {};
  const stop     = data.stop || {};
  const allStops = data.all_stops || [];
  const items    = data.items || [];

  const multiCustomer = allStops.length > 1;
  const customerNames = multiCustomer
    ? allStops.map((s, i) => s.customer_name || `Customer ${i+1}`).join(", ")
    : (allStops[0]?.customer_name || customer.customer_name || "");
  const deliveryAddr = allStops.length > 0
    ? [...new Set(allStops.map(s => s.customer_city).filter(Boolean))].join(", ")
    : customer.city || "";
  const totalWeight = items.reduce((s, i) => s + (i.dispatched_qty_ton || 0), 0);
  const driverSig = allStops[0]?.driver_signature || stop.driver_signature;

  // Build journey rows as HTML
  const sigImg = (path, label) => {
    if (!path) return "";
    const url = assetUrl(path);
    return `<div class="sig-label">${label || ""}</div>
            <img src="${url}" class="sig-img" crossorigin="anonymous" />`;
  };

  const row = (num, label, bg, date, time, km, signed, sigPath) => `
    <tr>
      <td class="j-num" style="background:${bg};color:#fff">${num}</td>
      <td class="j-lbl" style="background:${bg};color:#fff">${label}</td>
      <td class="j-dat">${date || ""}</td>
      <td class="j-tim">${time || ""}</td>
      <td class="j-km">${km || ""}</td>
      <td class="j-sig">${sigPath ? sigImg(sigPath, signed) : (signed || "")}</td>
    </tr>`;

  const custHeader = (label) => `
    <tr class="cust-hdr">
      <td colspan="6">${label}</td>
    </tr>`;

  let journeyRows = row("1","Factory Exit","#2c3e50",fmt(stop.factory_exit_at),fmtTime(stop.factory_exit_at),stop.factory_exit_km?`${stop.factory_exit_km} km`:"","","");

  if (multiCustomer) {
    allStops.forEach((s, idx) => {
      journeyRows += custHeader(`Customer ${idx+1}: ${s.customer_name || `Customer ${idx+1}`}`);
      journeyRows += row("2","Customer Arrived","#2980b9",fmt(s.arrived_at),fmtTime(s.arrived_at),"",s.driver_signature?"Driver":"",s.driver_signature);
      journeyRows += row("3","Unloading Start","#8e44ad",fmt(s.unloading_start),fmtTime(s.unloading_start),"","","");
      journeyRows += row("4","Unloading End","#c0392b",fmt(s.unloading_end),fmtTime(s.unloading_end),"",s.customer_signature?"Customer":"",s.customer_signature);
    });
  } else {
    const s = allStops[0] || {};
    journeyRows += row("2","Customer Arrived","#2980b9",fmt(s.arrived_at),fmtTime(s.arrived_at),"",s.driver_signature?"Driver":"",s.driver_signature);
    journeyRows += row("3","Unloading Start","#8e44ad",fmt(s.unloading_start),fmtTime(s.unloading_start),"","","");
    journeyRows += row("4","Unloading End","#c0392b",fmt(s.unloading_end),fmtTime(s.unloading_end),"",s.customer_signature?"Customer":"",s.customer_signature);
  }

  journeyRows += row("₹","Freight Amount","#f39c12",ts.freight_amount?`₹ ${ts.freight_amount}`:"","","","","");
  journeyRows += row("5","Return Journey","#16a085",fmt(stop.return_journey_at),fmtTime(stop.return_journey_at),"","","");
  journeyRows += row("6","Factory Return","#27ae60",fmt(stop.factory_return_at),fmtTime(stop.factory_return_at),stop.factory_return_km?`${stop.factory_return_km} km`:"","","");

  const excelTxt = sg.excel_updated === true ? "&#9679; Yes &nbsp; &#9675; No"
    : sg.excel_updated === false ? "&#9675; Yes &nbsp; &#9679; No"
    : "&#9675; Yes &nbsp; &#9675; No";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Trip Sheet ${ts.trip_number || ""}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Arial,sans-serif; }

    /* ── Screen styles ── */
    body { background:#d0d0d0; padding:24px; }
    .controls { display:flex; gap:12px; margin-bottom:18px; justify-content:center; }
    .controls button {
      padding:11px 24px; border:none; border-radius:8px; cursor:pointer;
      font-size:14px; font-weight:600; letter-spacing:.3px;
    }
    .btn-back   { background:#34495e; color:#fff; }
    .btn-print  { background:#27ae60; color:#fff; }
    .sheet {
      background:#fff; width:210mm; margin:0 auto;
      box-shadow:0 6px 24px rgba(0,0,0,0.22);
      border:1px solid #bbb;
    }

    /* ── Tables ── */
    table { border-collapse:collapse; width:100%; }
    td, th { border:1px solid #c8c8c8; vertical-align:middle; font-size:12.5px; }

    /* ── Title bar ── */
    .t-company { background:#1a3a5c; color:#fff; font-size:24px; font-weight:700;
                 text-align:center; padding:14px 10px; letter-spacing:.5px; width:34%; }
    .t-label   { background:#5d7a8a; color:#fff; font-size:21px; font-weight:700;
                 text-align:center; padding:14px 10px; letter-spacing:3px; width:33%; }
    .t-meta    { width:33%; padding:0; border:none; }
    .t-meta table { height:100%; }
    .t-meta td { text-align:center; padding:10px 8px; border:1px solid #c8c8c8; }
    .t-meta .lbl { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
    .t-meta .val { font-size:14px; font-weight:700; color:#1a3a5c; }

    /* ── Info grid ── */
    .lh { background:#1a5276; color:#fff; font-weight:700; font-size:12px;
          padding:9px 10px; white-space:nowrap; }
    .lv { padding:9px 12px; font-size:13px; color:#1a1a1a; }

    /* ── Journey table header ── */
    thead tr { background:#1a3a5c; }
    thead th  { color:#fff; font-weight:700; font-size:12px; padding:10px 10px; text-align:left; border-color:#2c5282; }
    thead th:first-child { text-align:center; width:42px; }

    /* ── Journey rows ── */
    .j-num  { text-align:center; font-weight:800; font-size:14px; width:42px; padding:10px 4px; border:1px solid #c8c8c8; }
    .j-lbl  { font-weight:700; font-size:13px; padding:10px 12px; border:1px solid #c8c8c8; width:22%; }
    .j-dat  { padding:10px 10px; font-size:12.5px; width:14%; }
    .j-tim  { padding:10px 10px; font-size:12.5px; width:10%; }
    .j-km   { padding:10px 10px; font-size:12.5px; width:16%; }
    .j-sig  { padding:10px 10px; width:18%; }
    .sig-label { font-size:9px; color:#666; margin-bottom:3px; }
    .sig-img   { object-fit:contain; display:block; max-width:110px; max-height:48px; }
    .cust-hdr td { background:#eaf0f6; color:#1a3a5c; font-weight:700; font-size:13px;
                   padding:7px 14px; border:1px solid #c0cfe0; }

    /* ── Bottom section ── */
    .b-hdr { font-weight:700; font-size:12px; padding:7px 12px; }
    .b-body { padding:12px; font-size:12.5px; }
    .b-body p { margin-bottom:7px; line-height:1.4; }
    .sig-block { border:1px solid #e0e0e0; border-radius:4px; padding:4px; margin:6px 0;
                 display:inline-block; }

    /* ── Footer ── */
    .footer { text-align:center; font-size:10.5px; color:#999; font-style:italic; padding:9px; border-top:1px solid #ddd; }

    /* ── Print overrides ── */
    @media print {
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      body { background:#fff !important; padding:0 !important; }
      .controls { display:none !important; }
      .sheet { width:100% !important; box-shadow:none !important; border:none !important; margin:0 !important; }
    }
  </style>
</head>
<body>
  <!-- Controls -->
  <div class="controls">
    <button class="btn-back"  onclick="window.close()">&#8592; Close</button>
    <button class="btn-print" onclick="window.print()">&#128424; Print A4</button>
  </div>

  <div class="sheet">

    <!-- ── Title bar ── -->
    <table style="border:none">
      <tr>
        <td class="t-company">BRFM India</td>
        <td class="t-label">TRIP&nbsp;SHEET</td>
        <td class="t-meta">
          <table>
            <tr>
              <td style="border-right:1px solid #c8c8c8">
                <div class="lbl">TRIP ID</div>
                <div class="val">${ts.trip_number || "—"}</div>
              </td>
              <td>
                <div class="lbl">Date</div>
                <div class="val">${fmt(ts.created_at)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Info grid ── -->
    <table style="border-top:2px solid #1a3a5c">
      <colgroup>
        <col style="width:14%"><col style="width:36%">
        <col style="width:14%"><col style="width:36%">
      </colgroup>
      <tr>
        <td class="lh">Truck No.</td>
        <td class="lv">${truck.truck_number || ""}</td>
        <td class="lh">Driver Name</td>
        <td class="lv">${driver.driver_name || ""}</td>
      </tr>
      <tr>
        <td class="lh">Customer&nbsp;Name</td>
        <td class="lv">${customerNames}</td>
        <td class="lh">Delivery&nbsp;Place</td>
        <td class="lv">${deliveryAddr}</td>
      </tr>
      <tr>
        <td class="lh" colspan="2">Weight</td>
        <td class="lv" colspan="2">${totalWeight ? `${totalWeight} Ton` : "—"}</td>
      </tr>
      <tr>
        <td class="lh">Bill No.</td>
        <td class="lv">${bill.invoice_number || ""}</td>
        <td class="lh">D Note #</td>
        <td class="lv">${ts.d_note_number || "NA"}</td>
      </tr>
    </table>

    <!-- ── Journey table ── -->
    <table style="border-top:2px solid #1a3a5c;margin-top:0">
      <thead>
        <tr>
          <th>#</th>
          <th>Milestone</th>
          <th>Date</th>
          <th>Time</th>
          <th>KM / Amount</th>
          <th>Signed</th>
        </tr>
      </thead>
      <tbody>${journeyRows}</tbody>
    </table>

    <!-- ── Bottom section ── -->
    <table style="border-top:2px solid #1a3a5c;min-height:160px">
      <colgroup>
        <col style="width:38%"><col style="width:31%"><col style="width:31%">
      </colgroup>
      <tr style="vertical-align:top">
        <td style="padding:0;border-right:2px solid #c8c8c8">
          <div class="b-hdr" style="background:#c0392b;color:#fff">Remarks / Incidents</div>
          <div class="b-body">${sg?.remarks || "NA"}</div>
        </td>
        <td style="padding:0;border-right:2px solid #c8c8c8">
          <div class="b-hdr" style="background:#c0392b;color:#fff">Driver</div>
          <div class="b-body">
            <p><strong>Name:</strong> ${driver.driver_name || "___________"}</p>
            ${driverSig
              ? `<div class="sig-block"><img src="${assetUrl(driverSig)}" class="sig-img" crossorigin="anonymous" /></div>`
              : `<p>Sign: ___________________</p>`
            }
            <p>Date: ${sg?.driver_sign_date ? fmt(sg.driver_sign_date) : "__&nbsp;/&nbsp;__&nbsp;/&nbsp;____"}</p>
          </div>
        </td>
        <td style="padding:0">
          <div class="b-hdr" style="background:#d6eaf8;color:#1a3a5c">Supervisor</div>
          <div class="b-body">
            <p>Freight Received: ₹ ${sg?.freight_received || "___________"}</p>
            <p>Excel Updated: ${excelTxt}</p>
            <p>Sign: ___________________</p>
            <p>Date: ${sg?.supervisor_sign_date ? fmt(sg.supervisor_sign_date) : "__&nbsp;/&nbsp;__&nbsp;/&nbsp;____"}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- ── Footer ── -->
    <div class="footer">
      BRFM India &nbsp;|&nbsp; Return this sheet to the Supervisor when the vehicle arrives back at the factory.
    </div>

  </div><!-- /sheet -->
</body>
</html>`;
}

// ─── Screen Component ─────────────────────────────────────────────────────────
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

  const handlePrint = () => {
    if (Platform.OS !== "web" || !data) return;
    const html = buildPrintHtml(data);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Allow images to fully load before triggering the browser print dialog
    win.onload = () => { win.focus(); win.print(); };
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

  const ts       = data.trip_sheet || {};
  const sg       = data.signoff || {};
  const dispatch = data.dispatch || {};
  const driver   = data.driver || {};
  const truck    = data.truck || {};
  const customer = data.customer || {};
  const bill     = data.bill || {};
  const stop     = data.stop || {};
  const allStops = data.all_stops || [];
  const items    = data.items || [];

  const multiCustomer = allStops.length > 1;
  const deliveryAddr  = allStops.length > 0
    ? [...new Set(allStops.map(s => s.customer_city).filter(Boolean))].join(", ")
    : [customer.city].filter(Boolean).join(", ");
  const totalWeight   = items.reduce((s, i) => s + (i.dispatched_qty_ton || 0), 0);
  const customerNames = multiCustomer
    ? allStops.map((s, i) => s.customer_name || `Customer ${i+1}`).join(", ")
    : (allStops[0]?.customer_name || customer.customer_name || "");

  const buildJourneyRows = () => {
    const rows = [];
    rows.push({ type:"row", num:"1", label:"Factory Exit", bg:"#2c3e50", color:"#fff",
      date:fmt(stop.factory_exit_at), time:fmtTime(stop.factory_exit_at),
      km:stop.factory_exit_km?`${stop.factory_exit_km} km`:"", signed:"", sigPath:null });

    if (multiCustomer) {
      allStops.forEach((s, idx) => {
        rows.push({ type:"header", label:`Customer ${idx+1}: ${s.customer_name || `Customer ${idx+1}`}` });
        rows.push({ type:"row", num:"2", label:"Customer Arrived", bg:"#2980b9", color:"#fff", date:fmt(s.arrived_at), time:fmtTime(s.arrived_at), km:"", signed:s.driver_signature?"Driver":"", sigPath:s.driver_signature||null });
        rows.push({ type:"row", num:"3", label:"Unloading Start",  bg:"#8e44ad", color:"#fff", date:fmt(s.unloading_start), time:fmtTime(s.unloading_start), km:"", signed:"", sigPath:null });
        rows.push({ type:"row", num:"4", label:"Unloading End",    bg:"#c0392b", color:"#fff", date:fmt(s.unloading_end), time:fmtTime(s.unloading_end), km:"", signed:s.customer_signature?"Customer":"", sigPath:s.customer_signature||null });
      });
    } else {
      const s = allStops[0] || {};
      rows.push({ type:"row", num:"2", label:"Customer Arrived", bg:"#2980b9", color:"#fff", date:fmt(s.arrived_at), time:fmtTime(s.arrived_at), km:"", signed:s.driver_signature?"Driver":"", sigPath:s.driver_signature||null });
      rows.push({ type:"row", num:"3", label:"Unloading Start",  bg:"#8e44ad", color:"#fff", date:fmt(s.unloading_start), time:fmtTime(s.unloading_start), km:"", signed:"", sigPath:null });
      rows.push({ type:"row", num:"4", label:"Unloading End",    bg:"#c0392b", color:"#fff", date:fmt(s.unloading_end), time:fmtTime(s.unloading_end), km:"", signed:s.customer_signature?"Customer":"", sigPath:s.customer_signature||null });
    }
    rows.push({ type:"row", num:"₹", label:"Freight Amount", bg:"#f39c12", color:"#fff", date:ts.freight_amount?`₹ ${ts.freight_amount}`:"", time:"", km:"", signed:"", sigPath:null });
    rows.push({ type:"row", num:"5", label:"Return Journey", bg:"#16a085", color:"#fff", date:fmt(stop.return_journey_at), time:fmtTime(stop.return_journey_at), km:"", signed:"", sigPath:null });
    rows.push({ type:"row", num:"6", label:"Factory Return", bg:"#27ae60", color:"#fff", date:fmt(stop.factory_return_at), time:fmtTime(stop.factory_return_at), km:stop.factory_return_km?`${stop.factory_return_km} km`:"", signed:"", sigPath:null });
    return rows;
  };

  const journeyRows = buildJourneyRows();
  const driverSig = allStops[0]?.driver_signature || stop.driver_signature;

  return (
    <ScrollView style={st.page} contentContainerStyle={st.pageContent}>
      {/* Controls */}
      <View style={st.controls} nativeID="trip-print-controls">
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.ctrlBtn}>
          <Text style={st.ctrlBtnTxt}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePrint} style={[st.ctrlBtn, { backgroundColor: "#27ae60" }]}>
          <Text style={st.ctrlBtnTxt}>🖨 Print (A4)</Text>
        </TouchableOpacity>
      </View>

      {/* A4 Sheet — on-screen preview */}
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
                  {row.sigPath ? (
                    <View>
                      {row.signed ? (
                        <Text style={[st.jCellTxt, { fontSize: 9, color: "#555", marginBottom: 2 }]}>{row.signed}</Text>
                      ) : null}
                      <SigCell path={row.sigPath} />
                    </View>
                  ) : (
                    <Text style={st.jCellTxt}>{row.signed}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Bottom section */}
        <View style={st.bottom}>
          <View style={st.bottomRemarks}>
            <View style={st.bottomHdr}><Text style={st.bottomHdrTxt}>Remarks / Incidents</Text></View>
            <View style={st.bottomBody}><Text style={st.bottomBodyTxt}>{sg?.remarks || ""}</Text></View>
          </View>
          <View style={st.bottomDriver}>
            <View style={st.bottomHdr}><Text style={st.bottomHdrTxt}>Driver</Text></View>
            <View style={st.bottomBody}>
              <Text style={st.signLine}>Name: {driver.driver_name || "_____________"}</Text>
              {driverSig
                ? <Image source={{ uri: assetUrl(driverSig) }} style={{ width: 120, height: 44, resizeMode: "contain", marginVertical: 4 }} />
                : <Text style={st.signLine}>Sign: _____________</Text>
              }
              <Text style={st.signLine}>Date: {sg?.driver_sign_date ? fmt(sg.driver_sign_date) : "__/__/____"}</Text>
            </View>
          </View>
          <View style={st.bottomSupervisor}>
            <View style={[st.bottomHdr, { backgroundColor: "#e8f4f8" }]}>
              <Text style={[st.bottomHdrTxt, { color: "#2c3e50" }]}>Supervisor</Text>
            </View>
            <View style={st.bottomBody}>
              <Text style={st.signLine}>Freight Received: ₹ {sg?.freight_received || "_________"}</Text>
              <Text style={st.signLine}>
                Excel Updated: {sg?.excel_updated === true ? "● Yes  ○ No" : sg?.excel_updated === false ? "○ Yes  ● No" : "○ Yes  ○ No"}
              </Text>
              <Text style={st.signLine}>Sign: _____________</Text>
              <Text style={st.signLine}>Date: {sg?.supervisor_sign_date ? fmt(sg.supervisor_sign_date) : "__/__/____"}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={st.footer}>
          <Text style={st.footerTxt}>BRFM India | Return this sheet to the Supervisor when the vehicle arrives back at the factory.</Text>
        </View>
      </View>
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
