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
    return `<div style="font-size:9px;color:#555;margin-bottom:2px">${label || ""}</div>
            <img src="${url}" style="width:80px;height:36px;object-fit:contain;display:block" crossorigin="anonymous" />`;
  };

  const row = (num, label, bg, date, time, km, signed, sigPath) => `
    <tr>
      <td style="background:${bg};color:#fff;font-weight:bold;text-align:center;width:30px;padding:8px 4px">${num}</td>
      <td style="background:${bg};color:#fff;font-weight:bold;padding:8px 10px">${label}</td>
      <td style="padding:8px">${date || ""}</td>
      <td style="padding:8px">${time || ""}</td>
      <td style="padding:8px">${km || ""}</td>
      <td style="padding:8px">${sigPath ? sigImg(sigPath, signed) : (signed || "")}</td>
    </tr>`;

  const custHeader = (label) => `
    <tr>
      <td colspan="6" style="background:#ecf0f1;font-weight:bold;font-size:13px;color:#2c3e50;padding:6px 12px">${label}</td>
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
    * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
    body { background:#e8e8e8; display:flex; justify-content:center; padding:20px; }
    .sheet { background:#fff; width:210mm; min-height:297mm; box-shadow:0 4px 16px rgba(0,0,0,0.15); }
    table { border-collapse:collapse; width:100%; }
    td, th { border:1px solid #bbb; vertical-align:middle; font-size:12px; }
    .title-row td { border:none; }
    img { display:block; }
    @media print {
      body { background:#fff; padding:0; justify-content:flex-start; }
      .no-print { display:none !important; }
      .sheet { box-shadow:none; width:100%; min-height:auto; }
      * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
</head>
<body>
  <div>
    <!-- Controls (hidden on print) -->
    <div class="no-print" style="display:flex;gap:12px;margin-bottom:16px">
      <button onclick="window.close()" style="padding:10px 18px;background:#2c3e50;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">← Back</button>
      <button onclick="window.print()" style="padding:10px 18px;background:#27ae60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨 Print (A4)</button>
    </div>

    <div class="sheet">
      <!-- Title row -->
      <table class="title-row" style="margin-bottom:0">
        <tr>
          <td style="background:#2c3e50;color:#fff;font-size:22px;font-weight:bold;text-align:center;padding:12px;width:33%">BRFM India</td>
          <td style="background:#7f8c8d;color:#fff;font-size:20px;font-weight:bold;text-align:center;padding:12px;letter-spacing:2px;width:34%">TRIP SHEET</td>
          <td style="padding:0;width:33%">
            <table style="width:100%;height:100%">
              <tr>
                <td style="text-align:center;padding:8px;border-right:1px solid #bbb">
                  <div style="font-size:10px;color:#888;margin-bottom:2px">TRIP ID</div>
                  <div style="font-size:13px;font-weight:bold">${ts.trip_number || ""}</div>
                </td>
                <td style="text-align:center;padding:8px">
                  <div style="font-size:10px;color:#888;margin-bottom:2px">Date</div>
                  <div style="font-size:13px;font-weight:bold">${fmt(ts.created_at)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Info grid -->
      <table>
        <tr>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px;width:15%">Truck No.</td>
          <td style="padding:8px;width:35%">${truck.truck_number || ""}</td>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px;width:15%">Driver Name</td>
          <td style="padding:8px;width:35%">${driver.driver_name || ""}</td>
        </tr>
        <tr>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px">Customer Name</td>
          <td style="padding:8px" colspan="1">${customerNames}</td>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px">Delivery Place</td>
          <td style="padding:8px">${deliveryAddr}</td>
        </tr>
        <tr>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px" colspan="2">Weight</td>
          <td style="padding:8px" colspan="2">${totalWeight ? `${totalWeight} Ton` : ""}</td>
        </tr>
        <tr>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px">Bill No.</td>
          <td style="padding:8px">${bill.invoice_number || ""}</td>
          <td style="background:#1a5276;color:#fff;font-weight:bold;padding:8px">D Note #</td>
          <td style="padding:8px">${ts.d_note_number || "NA"}</td>
        </tr>
      </table>

      <!-- Journey table -->
      <table>
        <thead>
          <tr style="background:#2c3e50">
            <th style="color:#fff;padding:8px;width:30px;text-align:center">#</th>
            <th style="color:#fff;padding:8px;text-align:left">Milestone</th>
            <th style="color:#fff;padding:8px;text-align:left">Date</th>
            <th style="color:#fff;padding:8px;text-align:left">Time</th>
            <th style="color:#fff;padding:8px;text-align:left">KM / Amount</th>
            <th style="color:#fff;padding:8px;text-align:left">Signed</th>
          </tr>
        </thead>
        <tbody>${journeyRows}</tbody>
      </table>

      <!-- Bottom section -->
      <table style="border-top:2px solid #bbb;min-height:140px">
        <tr>
          <td style="width:40%;vertical-align:top;padding:0;border-right:1px solid #bbb">
            <div style="background:#c0392b;color:#fff;font-weight:bold;font-size:12px;padding:6px 10px">Remarks / Incidents</div>
            <div style="padding:10px;font-size:12px">${sg?.remarks || ""}</div>
          </td>
          <td style="width:30%;vertical-align:top;padding:0;border-right:1px solid #bbb">
            <div style="background:#c0392b;color:#fff;font-weight:bold;font-size:12px;padding:6px 10px">Driver</div>
            <div style="padding:10px">
              <div style="font-size:12px;margin-bottom:6px">Name: ${driver.driver_name || "_____________"}</div>
              ${driverSig
                ? `<img src="${assetUrl(driverSig)}" style="width:120px;height:48px;object-fit:contain;display:block;margin:4px 0" crossorigin="anonymous" />`
                : `<div style="font-size:12px;margin-bottom:6px">Sign: _____________</div>`
              }
              <div style="font-size:12px">Date: ${sg?.driver_sign_date ? fmt(sg.driver_sign_date) : "__/__/____"}</div>
            </div>
          </td>
          <td style="width:30%;vertical-align:top;padding:0">
            <div style="background:#e8f4f8;color:#2c3e50;font-weight:bold;font-size:12px;padding:6px 10px">Supervisor</div>
            <div style="padding:10px">
              <div style="font-size:12px;margin-bottom:6px">Freight Received: ₹ ${sg?.freight_received || "_________"}</div>
              <div style="font-size:12px;margin-bottom:6px">Excel Updated: ${excelTxt}</div>
              <div style="font-size:12px;margin-bottom:6px">Sign: _____________</div>
              <div style="font-size:12px">Date: ${sg?.supervisor_sign_date ? fmt(sg.supervisor_sign_date) : "__/__/____"}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <div style="padding:10px;border-top:1px solid #ddd;text-align:center;font-size:11px;color:#888;font-style:italic">
        BRFM India | Return this sheet to the Supervisor when the vehicle arrives back at the factory.
      </div>
    </div>
  </div>
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
