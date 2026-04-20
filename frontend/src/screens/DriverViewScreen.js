import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Image, Platform, FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import SignatureCanvas from "react-signature-canvas";
import Layout from "../components/Layout";
import colors from "../theme/colors";
import { dispatchApi, getApiClient, API_BASE_URL } from "../api/client";
import { storage } from "../utils/storage";
import { showError, showSuccess } from "../utils/customAlerts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}
function buildFD(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
  return fd;
}

// Derive trip stage from trip sheet data
function getTripStage(tripSheet) {
  if (!tripSheet) return "NEW";
  if (!tripSheet.stop?.factory_return_at && tripSheet.stop?.factory_exit_at) return "IN_TRANSIT";
  if (tripSheet.stop?.factory_return_at) return "RETURNED";
  // trip sheet exists but exit not set yet (edge case)
  return "NEW";
}

// ─── Signature modal (web) ───────────────────────────────────────────────────
function SigModal({ label, onClose, onSave }) {
  const ref = useRef(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{label}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ border: "2px dashed #6366f1", borderRadius: 10, overflow: "hidden", background: "#f8fafc", cursor: "crosshair" }}>
          <SignatureCanvas ref={ref} penColor="#111" canvasProps={{ width: 432, height: 200, style: { display: "block", width: "100%", height: 200, touchAction: "none" } }} backgroundColor="rgba(248,250,252,1)" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => ref.current?.clear()} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #ddd", background: "#f1f5f9", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Clear</button>
          <button onClick={() => { if (!ref.current || ref.current.isEmpty()) return showError("Draw signature first"); ref.current.getCanvas().toBlob(b => b && onSave(b), "image/png"); }} style={{ flex: 2, padding: "12px 0", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Save Signature</button>
        </div>
      </div>
    </div>
  );
}

// ─── Big Action Button ───────────────────────────────────────────────────────
function BigBtn({ label, sublabel, color, icon, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[s.bigBtn, { backgroundColor: disabled ? "#b0bec5" : color || "#2196F3" }, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="large" />
        : <>
          {icon ? <Text style={s.bigBtnIcon}>{icon}</Text> : null}
          <Text style={s.bigBtnLabel}>{label}</Text>
          {sublabel ? <Text style={s.bigBtnSub}>{sublabel}</Text> : null}
        </>
      }
    </TouchableOpacity>
  );
}

// ─── Step pill indicator ─────────────────────────────────────────────────────
function StepPill({ num, label, done, active }) {
  return (
    <View style={s.stepPillWrap}>
      <View style={[s.stepCircle, done && s.stepCircleDone, active && s.stepCircleActive]}>
        <Text style={[s.stepNum, (done || active) && { color: "#fff" }]}>{done ? "✓" : num}</Text>
      </View>
      <Text style={[s.stepLabel, active && { color: "#1565C0", fontWeight: "700" }, done && { color: "#2e7d32" }]}>{label}</Text>
    </View>
  );
}

// ─── Single stop section ─────────────────────────────────────────────────────
function StopSection({ stop, dispatch, stopIndex, totalStops, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [sigFor, setSigFor] = useState(null);

  const recordTime = async (field) => {
    setBusy(field);
    try {
      const fd = buildFD({ [field]: new Date().toISOString() });
      await dispatchApi.updateStopTimes(dispatch.dispatch_id, stop.id, fd);
      await onRefresh();
      showSuccess("✅ Time saved!");
    } catch { showError("Could not save. Try again."); }
    finally { setBusy(null); }
  };

  const uploadSigBlob = async (type, blob) => {
    setSigFor(null);
    setBusy(`sig_${type}`);
    try {
      const fd = new FormData();
      fd.append("signature", blob, "sig.png");
      if (type === "driver") await dispatchApi.uploadDriverSignature(dispatch.dispatch_id, stop.id, fd);
      else await dispatchApi.uploadCustomerSignature(dispatch.dispatch_id, stop.id, fd);
      await onRefresh();
      showSuccess("Signature saved!");
    } catch { showError("Upload failed. Try again."); }
    finally { setBusy(null); }
  };

  const capturePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy("photo");
      const asset = res.assets[0];
      const fd = new FormData();
      if (asset.uri.startsWith("data:") || asset.uri.startsWith("blob:")) {
        const blob = await fetch(asset.uri).then(r => r.blob());
        fd.append("photo", blob, "photo.jpg");
      } else {
        fd.append("photo", { uri: asset.uri, type: asset.mimeType || "image/jpeg", name: "photo.jpg" });
      }
      await dispatchApi.addStopPhoto(dispatch.dispatch_id, stop.id, fd);
      await onRefresh();
      showSuccess("Photo added!");
    } catch { showError("Photo upload failed."); }
    finally { setBusy(null); }
  };

  const triggerSig = (type) => {
    if (Platform.OS === "web") setSigFor(type);
    else capturePhoto(); // mobile fallback
  };

  const isL = (k) => busy === k;
  const { arrived_at, unloading_start, unloading_end, customer_signature, driver_signature, photos } = stop;

  return (
    <View style={s.stopBox}>
      {/* Stop header */}
      <View style={s.stopHeaderRow}>
        <View style={s.stopNumCircle}>
          <Text style={s.stopNumText}>{stopIndex + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.stopCustomer}>{stop.customer_name || "Customer"}</Text>
          {stop.order_id ? <Text style={s.stopOrderId}>Order #{stop.order_id}</Text> : null}
          {totalStops > 1 && <Text style={s.stopOf}>Stop {stopIndex + 1} of {totalStops}</Text>}
        </View>
        {unloading_end && <View style={s.donePill}><Text style={s.donePillText}>DONE ✓</Text></View>}
      </View>

      {/* Sequential steps */}
      <View style={s.stopSteps}>

        {/* ARRIVED */}
        <View style={s.stopStep}>
          <View style={[s.stepDot, arrived_at && s.stepDotDone]} />
          <View style={{ flex: 1 }}>
            {arrived_at
              ? <Text style={s.stepDoneText}>✅ Arrived — {fmtTime(arrived_at)}</Text>
              : <BigBtn icon="📍" label="WE ARRIVED" sublabel="Tap when you reach customer" color="#1565C0" onPress={() => recordTime("arrived_at")} loading={isL("arrived_at")} disabled={!!arrived_at} />
            }
          </View>
        </View>

        {/* UNLOADING START */}
        {arrived_at && (
          <View style={s.stopStep}>
            <View style={[s.stepDot, unloading_start && s.stepDotDone]} />
            <View style={{ flex: 1 }}>
              {unloading_start
                ? <Text style={s.stepDoneText}>✅ Unloading started — {fmtTime(unloading_start)}</Text>
                : <BigBtn icon="🔓" label="UNLOADING STARTED" sublabel="Tap when unloading begins" color="#7B1FA2" onPress={() => recordTime("unloading_start")} loading={isL("unloading_start")} disabled={!!unloading_start} />
              }
            </View>
          </View>
        )}

        {/* UNLOADING END */}
        {unloading_start && (
          <View style={s.stopStep}>
            <View style={[s.stepDot, unloading_end && s.stepDotDone]} />
            <View style={{ flex: 1 }}>
              {unloading_end
                ? <Text style={s.stepDoneText}>✅ Unloading done — {fmtTime(unloading_end)}</Text>
                : <BigBtn icon="✅" label="UNLOADING DONE" sublabel="Tap when all goods are unloaded" color="#C62828" onPress={() => recordTime("unloading_end")} loading={isL("unloading_end")} disabled={!!unloading_end} />
              }
            </View>
          </View>
        )}

        {/* PHOTO + SIGNATURE — only after unloading done */}
        {unloading_end && (
          <View style={s.postUnload}>
            {/* Delivery photo */}
            <TouchableOpacity style={s.photoCapBtn} onPress={capturePhoto} disabled={isL("photo")}>
              {isL("photo")
                ? <ActivityIndicator color="#fff" />
                : <><Text style={{ fontSize: 28 }}>📸</Text><Text style={s.photoCapLabel}>Add Delivery Photo</Text></>
              }
            </TouchableOpacity>
            {photos?.length > 0 && (
              <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
                {photos.map(p => (
                  <Image key={p.id} source={{ uri: `${API_BASE_URL}/${p.photo_path}` }} style={s.photoThumb} resizeMode="cover" />
                ))}
              </ScrollView>
            )}

            {/* Customer Signature */}
            <View style={s.sigRow}>
              <View style={s.sigBlock}>
                <Text style={s.sigTitle}>Customer Sign</Text>
                {customer_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${customer_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigPlaceholder}><Text style={s.sigPlaceholderText}>Not captured</Text></View>
                }
                <TouchableOpacity style={[s.sigBtn, { backgroundColor: customer_signature ? "#546e7a" : "#00796B" }]} onPress={() => triggerSig("customer")} disabled={isL("sig_customer")}>
                  {isL("sig_customer") ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sigBtnText}>{customer_signature ? "Re-sign" : "GET SIGNATURE"}</Text>}
                </TouchableOpacity>
              </View>
              <View style={s.sigBlock}>
                <Text style={s.sigTitle}>Driver Sign</Text>
                {driver_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${driver_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigPlaceholder}><Text style={s.sigPlaceholderText}>Not captured</Text></View>
                }
                <TouchableOpacity style={[s.sigBtn, { backgroundColor: driver_signature ? "#546e7a" : "#1565C0" }]} onPress={() => triggerSig("driver")} disabled={isL("sig_driver")}>
                  {isL("sig_driver") ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sigBtnText}>{driver_signature ? "Re-sign" : "MY SIGNATURE"}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {Platform.OS === "web" && sigFor && (
        <SigModal label={sigFor === "driver" ? "Driver Signature" : "Customer Signature"} onClose={() => setSigFor(null)} onSave={b => uploadSigBlob(sigFor, b)} />
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DriverViewScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected dispatch
  const [tripData, setTripData] = useState(null);  // { tripSheet, stop, stops[] }
  const [detailLoading, setDetailLoading] = useState(false);
  const [startKm, setStartKm] = useState("");
  const [returnKm, setReturnKm] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const client = getApiClient();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const userData = await storage.getUserData();
    setUser(userData);
    await loadDispatches(userData);
  };

  const loadDispatches = async (userData) => {
    setLoading(true);
    try {
      const res = await dispatchApi.getAll();
      let all = (res.data || []).filter(d => ["DISPATCHED", "PARTIALLY DELIVERED", "PARTIAL"].includes(d.status));
      const isAdmin = userData?.role === "admin" || userData?.role === "manager";
      if (!isAdmin) {
        const uid = userData?.driver_id?.toString();
        const uname = (userData?.full_name || userData?.username || "").toLowerCase().trim();
        all = all.filter(d => {
          if (uid && d.driver_id?.toString() === uid) return true;
          return uname && (d.driver?.driver_name || "").toLowerCase().trim() === uname;
        });
      }
      setDispatches(all);
    } catch { showError("Could not load dispatches"); }
    finally { setLoading(false); }
  };

  const openDispatch = async (dispatch) => {
    setSelected(dispatch);
    setDetailLoading(true);
    setStartKm("");
    setReturnKm("");
    try {
      const [tsRes, stopsRes] = await Promise.all([
        client.get(`/trip-sheets/by-dispatch/${dispatch.dispatch_id}`),
        dispatchApi.getDeliveryStops(dispatch.dispatch_id),
      ]);
      const ts = tsRes.data;
      let stop = null;
      let fullTs = ts;

      if (ts) {
        const fullRes = await client.get(`/trip-sheets/${ts.id}/full`);
        stop = fullRes.data?.stop || null;
        fullTs = { ...ts, stop };
      }

      // Build stops list
      const existingStops = stopsRes.data || [];
      const orderIds = getOrderIds(dispatch);
      let stops;
      if (orderIds.length > 0) {
        stops = orderIds.map((oid, idx) => {
          const ex = existingStops.find(s => s.order_id === oid);
          return ex || { _pending: true, order_id: oid, customer_name: dispatch.order?.customer?.customer_name || `Customer ${idx + 1}`, photos: [] };
        });
      } else if (existingStops.length > 0) {
        stops = existingStops;
      } else {
        stops = [{ _pending: true, order_id: null, customer_name: dispatch.order?.customer?.customer_name || "Customer", photos: [] }];
      }

      setTripData({ tripSheet: fullTs, stop, stops });
    } catch (e) {
      console.error(e);
      setTripData({ tripSheet: null, stop: null, stops: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const getOrderIds = (dispatch) => {
    if (!dispatch?.items?.length) return dispatch?.order_id ? [dispatch.order_id] : [];
    const ids = [];
    dispatch.items.forEach(item => {
      const oid = item.order_item?.order_id || item.order_item?.customer_order_id || dispatch.order_id;
      if (oid && !ids.includes(oid)) ids.push(oid);
    });
    return ids.length > 0 ? ids : (dispatch.order_id ? [dispatch.order_id] : []);
  };

  const refreshDetail = useCallback(async () => {
    if (!selected) return;
    await openDispatch(selected);
  }, [selected]);

  // Ensure a stop exists in DB before updating it
  const ensureStop = async (pendingStop) => {
    const fd = buildFD({ order_id: pendingStop.order_id, customer_name: pendingStop.customer_name });
    const res = await dispatchApi.createOrUpdateStop(selected.dispatch_id, fd);
    return res.data;
  };

  const refreshStops = useCallback(async () => {
    if (!selected || !tripData) return;
    const stopsRes = await dispatchApi.getDeliveryStops(selected.dispatch_id);
    const existingStops = stopsRes.data || [];
    const orderIds = getOrderIds(selected);
    let stops;
    if (orderIds.length > 0) {
      stops = orderIds.map((oid, idx) => {
        const ex = existingStops.find(s => s.order_id === oid);
        return ex || { _pending: true, order_id: oid, customer_name: selected.order?.customer?.customer_name || `Customer ${idx + 1}`, photos: [] };
      });
    } else {
      stops = existingStops.length > 0 ? existingStops : [{ _pending: true, order_id: null, customer_name: "Customer", photos: [] }];
    }
    setTripData(prev => ({ ...prev, stops }));
  }, [selected, tripData]);

  // Wrap StopSection so pending stops get created first
  const makeRefreshForStop = (stop) => async () => {
    if (stop._pending) {
      const created = await ensureStop(stop);
      setTripData(prev => ({
        ...prev,
        stops: prev.stops.map(s => s._pending && s.order_id === stop.order_id ? created : s),
      }));
    }
    await refreshStops();
  };

  // ── START TRIP ─────────────────────────────────────────────────────────────
  const handleStartTrip = async () => {
    if (!startKm) { showError("Please enter the current KM reading"); return; }
    setActionBusy(true);
    try {
      const tsRes = await client.post("/trip-sheets", {
        dispatch_id: selected.dispatch_id,
        freight_amount: null,
        d_note_number: null,
      });
      const tsId = tsRes.data.id;
      await client.put(`/trip-sheets/${tsId}/stop`, {
        factory_exit_at: new Date().toISOString(),
        factory_exit_km: parseFloat(startKm),
        factory_exit_signed: user?.full_name || user?.username || null,
      });
      showSuccess("🚛 Trip started! Safe journey.");
      await openDispatch(selected);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to start trip";
      showError(msg === "Trip sheet already exists for this dispatch" ? "Trip already started for this dispatch." : msg);
    } finally { setActionBusy(false); }
  };

  // ── RETURN TO FACTORY ──────────────────────────────────────────────────────
  const handleReturnToFactory = async () => {
    if (!returnKm) { showError("Please enter the KM reading at factory"); return; }
    setActionBusy(true);
    try {
      const tsId = tripData.tripSheet.id;
      await client.put(`/trip-sheets/${tsId}/stop`, {
        factory_return_at: new Date().toISOString(),
        factory_return_km: parseFloat(returnKm),
      });
      // Mark dispatch delivered
      try {
        const form = new FormData();
        form.append("delivery_date", new Date().toISOString());
        form.append("driver_photo", new Blob([""], { type: "image/jpeg" }), "placeholder.jpg");
        await dispatchApi.uploadDeliveryProof(selected.dispatch_id, form);
      } catch {}
      showSuccess("🏭 Returned to factory! Well done.");
      await loadDispatches(user);
      setSelected(null);
      setTripData(null);
    } catch { showError("Could not save return. Try again."); }
    finally { setActionBusy(false); }
  };

  const allStopsDone = (stops) => stops.filter(s => !s._pending).every(s => !!s.unloading_end) && stops.some(s => !s._pending && s.unloading_end);

  // ─── RENDER LIST ──────────────────────────────────────────────────────────
  if (!selected) {
    const driverName = user?.full_name || user?.username || "Driver";
    return (
      <Layout title="My Deliveries" navigation={navigation}>
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.helloRow}>
            <Text style={s.helloEmoji}>🚛</Text>
            <View>
              <Text style={s.helloName}>Hello, {driverName}</Text>
              <Text style={s.helloSub}>Your pending deliveries are below</Text>
            </View>
          </View>

          {loading
            ? <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 60 }} />
            : dispatches.length === 0
              ? <View style={s.emptyBox}>
                <Text style={{ fontSize: 60 }}>🎉</Text>
                <Text style={s.emptyTitle}>All Done!</Text>
                <Text style={s.emptyText}>No pending deliveries right now.</Text>
              </View>
              : dispatches.map(d => <DispatchCard key={d.dispatch_id} dispatch={d} onPress={() => openDispatch(d)} />)
          }
        </ScrollView>
      </Layout>
    );
  }

  // ─── RENDER DETAIL ────────────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <Layout title="Loading..." navigation={navigation}>
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={s.loadingText}>Loading trip details...</Text>
        </View>
      </Layout>
    );
  }

  const { tripSheet, stops } = tripData || { tripSheet: null, stops: [] };
  const stage = getTripStage(tripSheet);
  const stopObj = tripSheet?.stop || null;
  const allDone = allStopsDone(stops);

  // Labels for step pills
  const stageNum = stage === "NEW" ? 1 : stage === "IN_TRANSIT" ? 2 : 3;

  return (
    <Layout title="My Deliveries" navigation={navigation}>
      <ScrollView style={s.page} contentContainerStyle={s.pageContent}>

        {/* Back + trip number */}
        <View style={s.detailTopRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => { setSelected(null); setTripData(null); }}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
          {tripSheet?.trip_number && (
            <View style={s.tripNumBadge}>
              <Text style={s.tripNumText}>{tripSheet.trip_number}</Text>
            </View>
          )}
        </View>

        {/* Dispatch summary card */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}><Text style={s.summaryIcon}>🚛</Text><Text style={s.summaryVal}>{selected.truck?.truck_number || "Truck N/A"}</Text></View>
          <View style={s.summaryRow}><Text style={s.summaryIcon}>📦</Text><Text style={s.summaryVal}>{selected.dispatched_quantity_ton} Ton — {selected.dispatched_bags || 0} Bags</Text></View>
          {selected.order?.customer?.customer_name &&
            <View style={s.summaryRow}><Text style={s.summaryIcon}>🏢</Text><Text style={s.summaryVal}>{selected.order.customer.customer_name}</Text></View>
          }
          {[selected.order?.customer?.address, selected.order?.customer?.city].filter(Boolean).length > 0 &&
            <View style={s.summaryRow}><Text style={s.summaryIcon}>📍</Text><Text style={s.summaryVal}>{[selected.order?.customer?.address, selected.order?.customer?.city].filter(Boolean).join(", ")}</Text></View>
          }
        </View>

        {/* Step Progress */}
        <View style={s.stepRow}>
          <StepPill num="1" label="Start Trip" done={stageNum > 1} active={stageNum === 1} />
          <View style={s.stepLine} />
          <StepPill num="2" label="Delivering" done={stageNum > 2} active={stageNum === 2} />
          <View style={s.stepLine} />
          <StepPill num="3" label="Returned" done={stageNum === 3} active={stageNum === 3} />
        </View>

        {/* ═══ STAGE 1: START TRIP ════════════════════════════════════════ */}
        {stage === "NEW" && (
          <View style={s.stageBox}>
            <Text style={s.stageTitle}>📋 Ready to Start?</Text>
            <Text style={s.stageSub}>Enter the KM reading on the odometer before leaving the factory.</Text>
            <View style={s.kmRow}>
              <Text style={s.kmLabel}>KM Reading</Text>
              <TextInput
                style={s.kmInput}
                value={startKm}
                onChangeText={setStartKm}
                keyboardType="numeric"
                placeholder="e.g. 45230"
                placeholderTextColor="#aaa"
              />
              <Text style={s.kmUnit}>km</Text>
            </View>
            <BigBtn icon="🚛" label="START TRIP" sublabel="Tap to begin journey" color="#2e7d32" onPress={handleStartTrip} loading={actionBusy} disabled={!startKm} />
          </View>
        )}

        {/* ═══ STAGE 2: IN TRANSIT ════════════════════════════════════════ */}
        {stage === "IN_TRANSIT" && (
          <View style={s.stageBox}>
            {/* Factory exit summary */}
            <View style={s.exitSummaryBox}>
              <Text style={s.exitSummaryText}>
                🏭 Left factory at {fmtTime(stopObj?.factory_exit_at) || "—"}  ·  {stopObj?.factory_exit_km || "—"} km
              </Text>
            </View>

            <Text style={s.stageTitle}>🏪 Customer Deliveries</Text>
            <Text style={s.stageSub}>
              {stops.length === 1
                ? "Complete the delivery steps for the customer below."
                : `You have ${stops.length} customers to deliver to. Complete each one.`}
            </Text>

            {stops.map((stop, idx) => (
              <StopSection
                key={stop.id || `pending-${idx}`}
                stop={stop}
                dispatch={selected}
                stopIndex={idx}
                totalStops={stops.length}
                onRefresh={makeRefreshForStop(stop)}
              />
            ))}

            {/* Return section — appears only when all stops are done */}
            {allDone && (
              <View style={s.returnBox}>
                <Text style={s.returnTitle}>🏁 All deliveries done!</Text>
                <Text style={s.returnSub}>Enter the current KM reading and tap Return to Factory.</Text>
                <View style={s.kmRow}>
                  <Text style={s.kmLabel}>KM Reading</Text>
                  <TextInput
                    style={s.kmInput}
                    value={returnKm}
                    onChangeText={setReturnKm}
                    keyboardType="numeric"
                    placeholder="e.g. 45650"
                    placeholderTextColor="#aaa"
                  />
                  <Text style={s.kmUnit}>km</Text>
                </View>
                <BigBtn icon="🏭" label="RETURN TO FACTORY" sublabel="Tap when you reach back" color="#e65100" onPress={handleReturnToFactory} loading={actionBusy} disabled={!returnKm} />
              </View>
            )}

            {!allDone && (
              <View style={s.pendingHint}>
                <Text style={s.pendingHintText}>⏳ Complete all customer stops above to enable the Return button.</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══ STAGE 3: RETURNED ══════════════════════════════════════════ */}
        {stage === "RETURNED" && (
          <View style={s.returnedBox}>
            <Text style={{ fontSize: 64, textAlign: "center" }}>🎉</Text>
            <Text style={s.returnedTitle}>Trip Complete!</Text>
            <Text style={s.returnedSub}>You have successfully completed this delivery.</Text>
            <View style={s.returnedDetails}>
              <View style={s.returnedRow}>
                <Text style={s.returnedLabel}>Left Factory</Text>
                <Text style={s.returnedVal}>{fmtDateTime(stopObj?.factory_exit_at) || "—"}</Text>
              </View>
              <View style={s.returnedRow}>
                <Text style={s.returnedLabel}>Start KM</Text>
                <Text style={s.returnedVal}>{stopObj?.factory_exit_km ? `${stopObj.factory_exit_km} km` : "—"}</Text>
              </View>
              <View style={s.returnedRow}>
                <Text style={s.returnedLabel}>Returned</Text>
                <Text style={s.returnedVal}>{fmtDateTime(stopObj?.factory_return_at) || "—"}</Text>
              </View>
              <View style={s.returnedRow}>
                <Text style={s.returnedLabel}>End KM</Text>
                <Text style={s.returnedVal}>{stopObj?.factory_return_km ? `${stopObj.factory_return_km} km` : "—"}</Text>
              </View>
              {stopObj?.factory_exit_km && stopObj?.factory_return_km && (
                <View style={[s.returnedRow, { backgroundColor: "#e8f5e9" }]}>
                  <Text style={[s.returnedLabel, { color: "#2e7d32", fontWeight: "800" }]}>Total KM Driven</Text>
                  <Text style={[s.returnedVal, { color: "#2e7d32", fontWeight: "800" }]}>
                    {(stopObj.factory_return_km - stopObj.factory_exit_km).toFixed(0)} km
                  </Text>
                </View>
              )}
            </View>
            <Text style={s.returnedNote}>The supervisor will complete the freight details and close this trip sheet.</Text>
          </View>
        )}

      </ScrollView>
    </Layout>
  );
}

// ─── Dispatch card on the list ───────────────────────────────────────────────
function DispatchCard({ dispatch, onPress }) {
  const customerName = dispatch.order?.customer?.customer_name || "Customer";
  const city = dispatch.order?.customer?.city || "";
  const items = dispatch.items || [];

  return (
    <TouchableOpacity style={s.dispCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.dispCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.dispCustomer}>{customerName}</Text>
          {city ? <Text style={s.dispCity}>📍 {city}</Text> : null}
        </View>
        <View style={s.dispQtyBadge}>
          <Text style={s.dispQtyText}>{dispatch.dispatched_quantity_ton} T</Text>
        </View>
      </View>
      <View style={s.dispCardMid}>
        <Text style={s.dispMeta}>🚛 {dispatch.truck?.truck_number || "—"}</Text>
        <Text style={s.dispMeta}>📦 {dispatch.dispatched_bags || 0} bags</Text>
        <Text style={s.dispMeta}>#{dispatch.dispatch_id}</Text>
      </View>
      {items.length > 0 && (
        <View style={s.dispItems}>
          {items.slice(0, 3).map((item, i) => (
            <View key={i} style={s.dispItemPill}>
              <Text style={s.dispItemText}>{item.finished_good?.product_name || "Product"} — {item.dispatched_qty_ton}T</Text>
            </View>
          ))}
        </View>
      )}
      <View style={s.dispCardBtn}>
        <Text style={s.dispCardBtnText}>OPEN TRIP  →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f0f4f8" },
  pageContent: { padding: 16, paddingBottom: 50 },
  centerFill: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15, color: "#555" },

  helloRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1565C0", borderRadius: 16, padding: 20, marginBottom: 20, gap: 14 },
  helloEmoji: { fontSize: 40 },
  helloName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  helloSub: { fontSize: 13, color: "#bbdefb", marginTop: 2 },

  emptyBox: { alignItems: "center", marginTop: 80, padding: 30 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#2c3e50", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#888", marginTop: 6, textAlign: "center" },

  // Dispatch cards list
  dispCard: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  dispCardTop: { flexDirection: "row", alignItems: "flex-start", padding: 16, paddingBottom: 8 },
  dispCustomer: { fontSize: 18, fontWeight: "800", color: "#1a2a3a" },
  dispCity: { fontSize: 13, color: "#666", marginTop: 3 },
  dispQtyBadge: { backgroundColor: "#1565C0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  dispQtyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  dispCardMid: { flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingVertical: 6 },
  dispMeta: { fontSize: 13, color: "#444" },
  dispItems: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  dispItemPill: { backgroundColor: "#e3f2fd", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dispItemText: { fontSize: 12, color: "#1565C0", fontWeight: "600" },
  dispCardBtn: { backgroundColor: "#1565C0", padding: 14, alignItems: "center" },
  dispCardBtnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 1 },

  // Detail view
  detailTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  backBtnText: { color: "#1565C0", fontWeight: "700", fontSize: 14 },
  tripNumBadge: { backgroundColor: "#1565C0", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tripNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, gap: 8 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryIcon: { fontSize: 20, width: 28 },
  summaryVal: { fontSize: 15, color: "#1a2a3a", fontWeight: "600", flex: 1 },

  // Step pills
  stepRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 16 },
  stepPillWrap: { alignItems: "center", flex: 1 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center", marginBottom: 5 },
  stepCircleDone: { backgroundColor: "#2e7d32" },
  stepCircleActive: { backgroundColor: "#1565C0" },
  stepNum: { fontWeight: "700", color: "#888", fontSize: 15 },
  stepLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", textAlign: "center" },
  stepLine: { height: 3, flex: 0.5, backgroundColor: "#e0e0e0", marginBottom: 18 },

  // Stage boxes
  stageBox: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16 },
  stageTitle: { fontSize: 20, fontWeight: "800", color: "#1a2a3a", marginBottom: 6 },
  stageSub: { fontSize: 14, color: "#666", marginBottom: 18, lineHeight: 20 },
  exitSummaryBox: { backgroundColor: "#e8f5e9", borderRadius: 10, padding: 12, marginBottom: 16 },
  exitSummaryText: { fontSize: 14, color: "#2e7d32", fontWeight: "600" },

  // KM input
  kmRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f4f6f8", borderRadius: 12, padding: 12, marginBottom: 16, gap: 10 },
  kmLabel: { fontSize: 15, fontWeight: "700", color: "#333", width: 110 },
  kmInput: { flex: 1, fontSize: 22, fontWeight: "800", color: "#1a2a3a", height: 48, textAlign: "center" },
  kmUnit: { fontSize: 15, color: "#888", width: 28 },

  // Big action button
  bigBtn: { borderRadius: 16, padding: 20, alignItems: "center", justifyContent: "center", marginBottom: 8, gap: 4, minHeight: 80 },
  bigBtnIcon: { fontSize: 32 },
  bigBtnLabel: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  bigBtnSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Stop sections
  stopBox: { backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16, overflow: "hidden" },
  stopHeaderRow: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#1e3a5f", gap: 12 },
  stopNumCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  stopNumText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  stopCustomer: { fontSize: 16, fontWeight: "800", color: "#fff" },
  stopOrderId: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stopOf: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  donePill: { backgroundColor: "#2e7d32", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  donePillText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  stopSteps: { padding: 14, gap: 10 },
  stopStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#ccc", marginTop: 18 },
  stepDotDone: { backgroundColor: "#2e7d32" },
  stepDoneText: { fontSize: 14, color: "#2e7d32", fontWeight: "700", paddingVertical: 14, paddingHorizontal: 8, backgroundColor: "#e8f5e9", borderRadius: 10 },

  postUnload: { marginTop: 8, gap: 10 },
  photoCapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#455a64", borderRadius: 12, padding: 14, gap: 10 },
  photoCapLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8 },

  sigRow: { flexDirection: "row", gap: 10 },
  sigBlock: { flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  sigTitle: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 8 },
  sigImg: { width: "100%", height: 80, borderRadius: 8, marginBottom: 8 },
  sigPlaceholder: { width: "100%", height: 60, borderRadius: 8, backgroundColor: "#f4f6f8", justifyContent: "center", alignItems: "center", marginBottom: 8, borderWidth: 1, borderStyle: "dashed", borderColor: "#bbb" },
  sigPlaceholderText: { fontSize: 12, color: "#aaa" },
  sigBtn: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, width: "100%", alignItems: "center" },
  sigBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Return section
  returnBox: { backgroundColor: "#fff3e0", borderRadius: 16, padding: 18, marginTop: 8, borderWidth: 2, borderColor: "#e65100" },
  returnTitle: { fontSize: 20, fontWeight: "800", color: "#e65100", marginBottom: 4 },
  returnSub: { fontSize: 14, color: "#555", marginBottom: 16 },

  pendingHint: { backgroundColor: "#fff8e1", borderRadius: 10, padding: 14, marginTop: 8 },
  pendingHintText: { fontSize: 13, color: "#f57f17", textAlign: "center", fontWeight: "600" },

  // Stage 3 returned
  returnedBox: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  returnedTitle: { fontSize: 26, fontWeight: "900", color: "#1a2a3a", marginTop: 8 },
  returnedSub: { fontSize: 15, color: "#555", marginTop: 4, marginBottom: 20, textAlign: "center" },
  returnedDetails: { width: "100%", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 20 },
  returnedRow: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  returnedLabel: { fontSize: 14, color: "#555", fontWeight: "600" },
  returnedVal: { fontSize: 14, color: "#1a2a3a", fontWeight: "700" },
  returnedNote: { fontSize: 13, color: "#888", textAlign: "center", fontStyle: "italic" },
});
