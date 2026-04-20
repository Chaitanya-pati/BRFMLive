import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Image, Platform,
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
function buildFD(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
  return fd;
}
function getTripStage(tripSheet) {
  if (!tripSheet) return "NEW";
  if (tripSheet.stop?.factory_return_at) return "RETURNED";
  if (tripSheet.stop?.factory_exit_at) return "IN_TRANSIT";
  return "NEW";
}
function allStopsDone(stops) {
  const real = stops.filter(s => !s._pending);
  return real.length > 0 && real.every(s => !!s.unloading_end);
}

// ─── Signature modal (web only) ─────────────────────────────────────────────
function SigModal({ label, onClose, onSave }) {
  const ref = useRef(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{label}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ border: "2px dashed #1565C0", borderRadius: 10, overflow: "hidden", background: "#f0f4ff" }}>
          <SignatureCanvas ref={ref} penColor="#111" canvasProps={{ width: 412, height: 180, style: { display: "block", width: "100%", touchAction: "none" } }} backgroundColor="rgba(240,244,255,1)" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => ref.current?.clear()} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ddd", background: "#f1f5f9", fontWeight: 600, cursor: "pointer" }}>Clear</button>
          <button onClick={() => { if (!ref.current || ref.current.isEmpty()) return showError("Draw signature first"); ref.current.getCanvas().toBlob(b => b && onSave(b), "image/png"); }} style={{ flex: 2, padding: "11px 0", borderRadius: 8, border: "none", background: "#1565C0", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Signature</button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Button ───────────────────────────────────────────────────────────
function ActionBtn({ icon, label, sublabel, color, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, { borderLeftColor: disabled ? "#ccc" : color, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={color} />
        : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[s.actionBtnCircle, { backgroundColor: disabled ? "#ccc" : color }]}>
              <Text style={s.actionBtnIcon}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionBtnLabel, { color: disabled ? "#999" : "#1a2a3a" }]}>{label}</Text>
              {sublabel ? <Text style={s.actionBtnSub}>{sublabel}</Text> : null}
            </View>
            {!disabled && <Text style={{ fontSize: 18, color: color }}>›</Text>}
          </View>
        )
      }
    </TouchableOpacity>
  );
}

// ─── Done badge ──────────────────────────────────────────────────────────────
function DoneTag({ time }) {
  return (
    <View style={s.doneTag}>
      <Text style={s.doneTagIcon}>✓</Text>
      <Text style={s.doneTagText}>{time}</Text>
    </View>
  );
}

// ─── Single stop section ─────────────────────────────────────────────────────
function StopSection({ stop, dispatch, stopIndex, totalStops, onRecordTime, onUploadSig, onUploadPhoto }) {
  const [busy, setBusy] = useState(null);
  const [sigFor, setSigFor] = useState(null);
  const isL = (k) => busy === k;
  const { arrived_at, unloading_start, unloading_end, customer_signature, driver_signature, photos } = stop;

  const doRecord = async (field) => {
    setBusy(field);
    try {
      await onRecordTime(stop, field);
      showSuccess("Saved!");
    } catch { showError("Could not save. Try again."); }
    finally { setBusy(null); }
  };

  const doSig = async (type, blob) => {
    setSigFor(null);
    setBusy(`sig_${type}`);
    try {
      await onUploadSig(stop, type, blob);
      showSuccess("Signature saved!");
    } catch { showError("Upload failed. Try again."); }
    finally { setBusy(null); }
  };

  const doPhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy("photo");
      const asset = res.assets[0];
      const fd = new FormData();
      if (asset.uri.startsWith("data:") || asset.uri.startsWith("blob:")) {
        fd.append("photo", await fetch(asset.uri).then(r => r.blob()), "photo.jpg");
      } else {
        fd.append("photo", { uri: asset.uri, type: asset.mimeType || "image/jpeg", name: "photo.jpg" });
      }
      await onUploadPhoto(stop, fd);
      showSuccess("Photo added!");
    } catch { showError("Photo upload failed."); }
    finally { setBusy(null); }
  };

  const allDoneForStop = !!arrived_at && !!unloading_start && !!unloading_end;

  return (
    <View style={s.stopCard}>
      {/* Stop header */}
      <View style={s.stopHeader}>
        <View style={[s.stopNum, allDoneForStop && { backgroundColor: "#2e7d32" }]}>
          <Text style={s.stopNumText}>{allDoneForStop ? "✓" : stopIndex + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.stopCustomer}>{stop.customer_name || "Customer"}</Text>
          {stop.order_id ? <Text style={s.stopMeta}>Order #{stop.order_id}</Text> : null}
          {totalStops > 1 ? <Text style={s.stopMeta}>Stop {stopIndex + 1} of {totalStops}</Text> : null}
        </View>
        {allDoneForStop && (
          <View style={s.donePill}>
            <Text style={s.donePillText}>Delivered</Text>
          </View>
        )}
      </View>

      <View style={s.stopBody}>
        {/* ARRIVED */}
        {arrived_at
          ? <DoneTag time={`📍 Arrived at ${fmtTime(arrived_at)}`} />
          : <ActionBtn icon="📍" label="WE ARRIVED" sublabel="Tap when you reach the customer" color="#1565C0" onPress={() => doRecord("arrived_at")} loading={isL("arrived_at")} />
        }

        {/* UNLOADING START */}
        {arrived_at && (
          unloading_start
            ? <DoneTag time={`🔓 Unloading started at ${fmtTime(unloading_start)}`} />
            : <ActionBtn icon="🔓" label="UNLOADING STARTED" sublabel="Tap when unloading begins" color="#7B1FA2" onPress={() => doRecord("unloading_start")} loading={isL("unloading_start")} />
        )}

        {/* UNLOADING DONE */}
        {unloading_start && (
          unloading_end
            ? <DoneTag time={`✅ Unloading done at ${fmtTime(unloading_end)}`} />
            : <ActionBtn icon="✅" label="UNLOADING DONE" sublabel="Tap when all goods are offloaded" color="#2e7d32" onPress={() => doRecord("unloading_end")} loading={isL("unloading_end")} />
        )}

        {/* POST-UNLOADING: photo + signatures */}
        {unloading_end && (
          <View style={s.postUnload}>
            {/* Photo */}
            <View style={s.postRow}>
              <TouchableOpacity style={s.photoBtn} onPress={doPhoto} disabled={isL("photo")}>
                {isL("photo") ? <ActivityIndicator color="#1565C0" /> : <><Text style={{ fontSize: 20 }}>📸</Text><Text style={s.photoBtnLabel}>{(photos?.length || 0) > 0 ? `Photos (${photos.length})` : "Add Photo"}</Text></>}
              </TouchableOpacity>
              {(photos?.length || 0) > 0 && photos.map(p => (
                <Image key={p.id} source={{ uri: `${API_BASE_URL}/${p.photo_path}` }} style={s.photoThumb} resizeMode="cover" />
              ))}
            </View>

            {/* Signatures */}
            <View style={s.sigRow}>
              <View style={s.sigBlock}>
                <Text style={s.sigTitle}>Customer Sign</Text>
                {customer_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${customer_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigPlaceholder}><Text style={s.sigPlaceholderText}>Not captured</Text></View>
                }
                <TouchableOpacity style={[s.sigBtn, { backgroundColor: customer_signature ? "#546e7a" : "#00796B" }]} onPress={() => Platform.OS === "web" ? setSigFor("customer") : doPhoto()} disabled={isL("sig_customer")}>
                  {isL("sig_customer") ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sigBtnText}>{customer_signature ? "Re-sign" : "Get Signature"}</Text>}
                </TouchableOpacity>
              </View>
              <View style={s.sigBlock}>
                <Text style={s.sigTitle}>Driver Sign</Text>
                {driver_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${driver_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigPlaceholder}><Text style={s.sigPlaceholderText}>Not captured</Text></View>
                }
                <TouchableOpacity style={[s.sigBtn, { backgroundColor: driver_signature ? "#546e7a" : "#1565C0" }]} onPress={() => Platform.OS === "web" ? setSigFor("driver") : doPhoto()} disabled={isL("sig_driver")}>
                  {isL("sig_driver") ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sigBtnText}>{driver_signature ? "Re-sign" : "My Signature"}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {Platform.OS === "web" && sigFor && (
        <SigModal label={sigFor === "driver" ? "Driver Signature" : "Customer Signature"} onClose={() => setSigFor(null)} onSave={b => doSig(sigFor, b)} />
      )}
    </View>
  );
}

// ─── Dispatch list card ───────────────────────────────────────────────────────
function DispatchCard({ dispatch, onPress }) {
  const items = dispatch.items || [];
  const totalBags = items.reduce((a, i) => a + (i.dispatched_bags || 0), 0);
  const totalTon = items.reduce((a, i) => a + (parseFloat(i.dispatched_qty_ton) || 0), 0).toFixed(2);
  const customerName = dispatch.order?.customer?.customer_name || dispatch.customer_name || "Customer";
  const city = dispatch.order?.customer?.city || "";

  return (
    <TouchableOpacity style={s.dispCard} onPress={onPress} activeOpacity={0.86}>
      <View style={s.dispCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.dispCardCustomer}>{customerName}</Text>
          {city ? <Text style={s.dispCardCity}>{city}</Text> : null}
        </View>
        <View style={s.dispCardBadge}>
          <Text style={s.dispCardBadgeText}>#{dispatch.dispatch_id}</Text>
        </View>
      </View>
      <View style={s.dispCardMeta}>
        <Text style={s.dispCardMetaItem}>🚛 {dispatch.truck?.truck_number || "N/A"}</Text>
        <Text style={s.dispCardMetaItem}>📦 {totalBags} bags</Text>
        <Text style={s.dispCardMetaItem}>⚖️ {totalTon} T</Text>
      </View>
      <View style={s.dispCardFooter}>
        <Text style={s.dispCardItems}>{items.map(i => i.product_name || i.finished_good_name || "Product").join(", ")}</Text>
        <Text style={s.dispCardOpen}>Open →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Stage pill ──────────────────────────────────────────────────────────────
function StagePill({ stage }) {
  const map = { NEW: { label: "Start Trip", color: "#1565C0", bg: "#e3f2fd" }, IN_TRANSIT: { label: "In Transit", color: "#e65100", bg: "#fff3e0" }, RETURNED: { label: "Returned", color: "#2e7d32", bg: "#e8f5e9" } };
  const m = map[stage] || map.NEW;
  return <View style={[s.stagePill, { backgroundColor: m.bg }]}><Text style={[s.stagePillText, { color: m.color }]}>{m.label}</Text></View>;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DriverViewScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tripData, setTripData] = useState(null);
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
      let all = (res.data || []).filter(d => ["DISPATCHED", "PARTIALLY DELIVERED", "PARTIAL", "IN_TRANSIT"].includes(d.status));
      const isAdmin = !userData || userData?.role === "admin" || userData?.role === "manager";
      if (!isAdmin) {
        const uid = userData?.driver_id?.toString();
        const uname = (userData?.full_name || userData?.username || "").toLowerCase().trim();
        all = all.filter(d => {
          if (uid && d.driver_id?.toString() === uid) return true;
          return uname && (d.driver?.driver_name || "").toLowerCase().trim() === uname;
        });
      }
      setDispatches(all);
    } catch { showError("Could not load deliveries"); }
    finally { setLoading(false); }
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

  const buildStops = (existingStops, dispatch) => {
    const orderIds = getOrderIds(dispatch);
    if (orderIds.length > 0) {
      return orderIds.map((oid, idx) => {
        const ex = existingStops.find(s => s.order_id === oid);
        return ex || { _pending: true, order_id: oid, customer_name: dispatch.order?.customer?.customer_name || `Customer ${idx + 1}`, photos: [] };
      });
    }
    if (existingStops.length > 0) return existingStops;
    return [{ _pending: true, order_id: null, customer_name: dispatch.order?.customer?.customer_name || "Customer", photos: [] }];
  };

  const openDispatch = async (dispatch) => {
    setSelected(dispatch);
    setDetailLoading(true);
    setStartKm(""); setReturnKm("");
    try {
      const [tsRes, stopsRes] = await Promise.all([
        client.get(`/trip-sheets/by-dispatch/${dispatch.dispatch_id}`),
        dispatchApi.getDeliveryStops(dispatch.dispatch_id),
      ]);
      const ts = tsRes.data;
      let fullTs = ts;
      let tsStop = null;
      if (ts?.id) {
        const fullRes = await client.get(`/trip-sheets/${ts.id}/full`);
        tsStop = fullRes.data?.stop || null;
        fullTs = { ...ts, stop: tsStop };
      }
      const stops = buildStops(stopsRes.data || [], dispatch);
      setTripData({ tripSheet: fullTs, stops });
    } catch (e) {
      console.error(e);
      setTripData({ tripSheet: null, stops: [] });
    } finally { setDetailLoading(false); }
  };

  const refreshStops = useCallback(async () => {
    if (!selected) return;
    const stopsRes = await dispatchApi.getDeliveryStops(selected.dispatch_id);
    const stops = buildStops(stopsRes.data || [], selected);
    setTripData(prev => ({ ...prev, stops }));
  }, [selected]);

  // ── Ensure a pending stop is created before any action ──────────────────
  const ensureStopCreated = async (stop) => {
    if (!stop._pending) return stop;
    const fd = buildFD({ order_id: stop.order_id, customer_name: stop.customer_name });
    const res = await dispatchApi.createOrUpdateStop(selected.dispatch_id, fd);
    const created = res.data;
    setTripData(prev => ({
      ...prev,
      stops: prev.stops.map(s => (s._pending && s.order_id === stop.order_id) ? created : s),
    }));
    return created;
  };

  // ── Record time action: ensure stop exists first, then PATCH ────────────
  const handleRecordTime = async (stop, field) => {
    const actualStop = await ensureStopCreated(stop);
    if (!actualStop?.id) throw new Error("Could not create delivery stop");
    const fd = buildFD({ [field]: new Date().toISOString() });
    await dispatchApi.updateStopTimes(selected.dispatch_id, actualStop.id, fd);
    await refreshStops();
  };

  const handleUploadSig = async (stop, type, blob) => {
    const actualStop = await ensureStopCreated(stop);
    const fd = new FormData();
    fd.append("signature", blob, "sig.png");
    if (type === "driver") await dispatchApi.uploadDriverSignature(selected.dispatch_id, actualStop.id, fd);
    else await dispatchApi.uploadCustomerSignature(selected.dispatch_id, actualStop.id, fd);
    await refreshStops();
  };

  const handleUploadPhoto = async (stop, fd) => {
    const actualStop = await ensureStopCreated(stop);
    await dispatchApi.addStopPhoto(selected.dispatch_id, actualStop.id, fd);
    await refreshStops();
  };

  // ── START TRIP ──────────────────────────────────────────────────────────
  const handleStartTrip = async () => {
    if (!startKm.trim()) { showError("Enter the odometer reading before leaving"); return; }
    setActionBusy(true);
    try {
      const tsRes = await client.post("/trip-sheets", { dispatch_id: selected.dispatch_id, freight_amount: null, d_note_number: null });
      const tsId = tsRes.data.id;
      await client.put(`/trip-sheets/${tsId}/stop`, {
        factory_exit_at: new Date().toISOString(),
        factory_exit_km: parseFloat(startKm),
        factory_exit_signed: user?.full_name || user?.username || null,
      });
      showSuccess("Trip started! Safe drive.");
      await openDispatch(selected);
    } catch (e) {
      const msg = e?.response?.data?.detail || "";
      showError(msg.includes("already exists") ? "Trip already started for this dispatch." : "Failed to start trip.");
    } finally { setActionBusy(false); }
  };

  // ── RETURN TO FACTORY ───────────────────────────────────────────────────
  const handleReturnToFactory = async () => {
    if (!returnKm.trim()) { showError("Enter the odometer reading at factory gate"); return; }
    setActionBusy(true);
    try {
      const tsId = tripData.tripSheet.id;
      await client.put(`/trip-sheets/${tsId}/stop`, {
        factory_return_at: new Date().toISOString(),
        factory_return_km: parseFloat(returnKm),
      });
      try {
        const form = new FormData();
        form.append("delivery_date", new Date().toISOString());
        form.append("driver_photo", new Blob([""], { type: "image/jpeg" }), "placeholder.jpg");
        await dispatchApi.uploadDeliveryProof(selected.dispatch_id, form);
      } catch {}
      showSuccess("Returned to factory! Well done.");
      await loadDispatches(user);
      setSelected(null); setTripData(null);
    } catch { showError("Could not save return. Try again."); }
    finally { setActionBusy(false); }
  };

  // ─── LIST VIEW ───────────────────────────────────────────────────────────
  if (!selected) {
    const name = user?.full_name || user?.username || "Driver";
    return (
      <Layout title="Driver View" navigation={navigation}>
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.greetRow}>
            <Text style={s.greetName}>Hello, {name} 👋</Text>
            <Text style={s.greetSub}>Your deliveries for today</Text>
          </View>
          {loading
            ? <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 60 }} />
            : dispatches.length === 0
              ? <View style={s.emptyBox}>
                <Text style={{ fontSize: 52 }}>🎉</Text>
                <Text style={s.emptyTitle}>All Done!</Text>
                <Text style={s.emptyText}>No pending deliveries right now.</Text>
              </View>
              : dispatches.map(d => <DispatchCard key={d.dispatch_id} dispatch={d} onPress={() => openDispatch(d)} />)
          }
        </ScrollView>
      </Layout>
    );
  }

  // ─── LOADING DETAIL ──────────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <Layout title="Driver View" navigation={navigation}>
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={{ marginTop: 14, color: "#888" }}>Loading trip details...</Text>
        </View>
      </Layout>
    );
  }

  const { tripSheet, stops } = tripData || {};
  const stage = getTripStage(tripSheet);
  const tsStop = tripSheet?.stop || {};
  const isDone = allStopsDone(stops || []);
  const customerName = selected.order?.customer?.customer_name || selected.customer_name || "Customer";
  const kmDriven = tsStop.factory_exit_km && tsStop.factory_return_km
    ? (tsStop.factory_return_km - tsStop.factory_exit_km).toFixed(0) : null;

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────
  return (
    <Layout title="Driver View" navigation={navigation}>
      <ScrollView style={s.page} contentContainerStyle={s.pageContent}>

        {/* Header */}
        <View style={s.detailHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => { setSelected(null); setTripData(null); }}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.detailCustomer}>{customerName}</Text>
            <Text style={s.detailMeta}>Dispatch #{selected.dispatch_id} · {selected.truck?.truck_number || "Truck N/A"}</Text>
          </View>
          <StagePill stage={stage} />
        </View>

        {/* ── STAGE 1: Start Trip ── */}
        {stage === "NEW" && (
          <View style={s.stageCard}>
            <View style={s.stageCardTitle}>
              <Text style={s.stageNum}>①</Text>
              <Text style={s.stageLabel}>Start Your Trip</Text>
            </View>
            <Text style={s.stageHint}>Enter the odometer reading now, before leaving the factory.</Text>
            <View style={s.kmRow}>
              <Text style={s.kmLabel}>Current KM</Text>
              <TextInput
                style={s.kmInput}
                value={startKm}
                onChangeText={setStartKm}
                keyboardType="numeric"
                placeholder="e.g. 45230"
              />
            </View>
            <TouchableOpacity style={[s.startBtn, actionBusy && { opacity: 0.6 }]} onPress={handleStartTrip} disabled={actionBusy}>
              {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.startBtnText}>🚛  START TRIP</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STAGE 2: Delivering ── */}
        {stage === "IN_TRANSIT" && (
          <View>
            <View style={s.stageCard}>
              <View style={s.stageCardTitle}>
                <Text style={s.stageNum}>②</Text>
                <Text style={s.stageLabel}>Delivering to Customer{(stops?.length || 0) > 1 ? "s" : ""}</Text>
              </View>
              <Text style={s.stageHint}>Complete each stop in order. Tap the buttons as you go.</Text>
            </View>

            {(stops || []).map((stop, idx) => (
              <StopSection
                key={stop.id || stop.order_id || idx}
                stop={stop}
                dispatch={selected}
                stopIndex={idx}
                totalStops={stops.length}
                onRecordTime={handleRecordTime}
                onUploadSig={handleUploadSig}
                onUploadPhoto={handleUploadPhoto}
              />
            ))}

            {/* Return to Factory */}
            {isDone && (
              <View style={s.returnCard}>
                <View style={s.stageCardTitle}>
                  <Text style={s.stageNum}>③</Text>
                  <Text style={s.stageLabel}>Return to Factory</Text>
                </View>
                <Text style={s.stageHint}>All stops complete! Enter the odometer reading at the factory gate.</Text>
                <View style={s.kmRow}>
                  <Text style={s.kmLabel}>Current KM</Text>
                  <TextInput
                    style={s.kmInput}
                    value={returnKm}
                    onChangeText={setReturnKm}
                    keyboardType="numeric"
                    placeholder="e.g. 45510"
                  />
                </View>
                <TouchableOpacity style={[s.returnBtn, actionBusy && { opacity: 0.6 }]} onPress={handleReturnToFactory} disabled={actionBusy}>
                  {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.returnBtnText}>🏭  RETURN TO FACTORY</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── STAGE 3: Returned ── */}
        {stage === "RETURNED" && (
          <View style={[s.stageCard, { backgroundColor: "#e8f5e9" }]}>
            <Text style={{ fontSize: 42, textAlign: "center", marginBottom: 10 }}>🎉</Text>
            <Text style={s.returnedTitle}>Trip Complete!</Text>
            {kmDriven && <Text style={s.returnedKm}>Total driven: {kmDriven} km</Text>}
            <View style={s.returnedInfo}>
              <Text style={s.returnedInfoRow}>🕐 Left factory: {tsStop.factory_exit_at ? new Date(tsStop.factory_exit_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, day: "2-digit", month: "short" }) : "—"}</Text>
              <Text style={s.returnedInfoRow}>🏭 Returned: {tsStop.factory_return_at ? new Date(tsStop.factory_return_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, day: "2-digit", month: "short" }) : "—"}</Text>
            </View>
            <Text style={s.returnedNote}>The supervisor will complete the paperwork. Well done!</Text>
          </View>
        )}

      </ScrollView>
    </Layout>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f6f8" },
  pageContent: { padding: 14, paddingBottom: 50 },
  centerFill: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Greeting
  greetRow: { marginBottom: 16 },
  greetName: { fontSize: 20, fontWeight: "800", color: "#1a2a3a" },
  greetSub: { fontSize: 13, color: "#888", marginTop: 2 },

  // Dispatch card
  dispCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  dispCardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  dispCardCustomer: { fontSize: 16, fontWeight: "800", color: "#1a2a3a" },
  dispCardCity: { fontSize: 12, color: "#888", marginTop: 1 },
  dispCardBadge: { backgroundColor: "#e3f2fd", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, marginLeft: 8 },
  dispCardBadgeText: { fontSize: 11, color: "#1565C0", fontWeight: "700" },
  dispCardMeta: { flexDirection: "row", gap: 12, marginBottom: 8 },
  dispCardMetaItem: { fontSize: 12, color: "#555" },
  dispCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dispCardItems: { fontSize: 12, color: "#888", flex: 1 },
  dispCardOpen: { fontSize: 13, color: "#1565C0", fontWeight: "700" },

  // Detail header
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff", borderRadius: 8 },
  backBtnText: { color: "#1565C0", fontWeight: "700", fontSize: 13 },
  detailCustomer: { fontSize: 15, fontWeight: "800", color: "#1a2a3a" },
  detailMeta: { fontSize: 12, color: "#888", marginTop: 1 },

  // Stage pill
  stagePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stagePillText: { fontSize: 12, fontWeight: "700" },

  // Stage card
  stageCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 10 },
  stageCardTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  stageNum: { fontSize: 20, color: "#1565C0" },
  stageLabel: { fontSize: 15, fontWeight: "800", color: "#1a2a3a" },
  stageHint: { fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 18 },

  kmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  kmLabel: { fontSize: 13, fontWeight: "700", color: "#555", width: 90 },
  kmInput: { flex: 1, height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 9, paddingHorizontal: 12, fontSize: 16, backgroundColor: "#f8f9fa" },

  startBtn: { backgroundColor: "#1565C0", padding: 15, borderRadius: 10, alignItems: "center" },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  returnCard: { backgroundColor: "#fff3e0", borderRadius: 12, padding: 16, marginTop: 6, marginBottom: 10 },
  returnBtn: { backgroundColor: "#e65100", padding: 15, borderRadius: 10, alignItems: "center" },
  returnBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Stop card
  stopCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  stopHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  stopNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1565C0", justifyContent: "center", alignItems: "center" },
  stopNumText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  stopCustomer: { fontSize: 15, fontWeight: "800", color: "#1a2a3a" },
  stopMeta: { fontSize: 12, color: "#888", marginTop: 1 },
  donePill: { backgroundColor: "#e8f5e9", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  donePillText: { fontSize: 12, color: "#2e7d32", fontWeight: "700" },
  stopBody: { padding: 12, gap: 8 },

  // Action button
  actionBtn: { borderLeftWidth: 4, borderRadius: 10, padding: 12, backgroundColor: "#fafafa" },
  actionBtnCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  actionBtnIcon: { fontSize: 18 },
  actionBtnLabel: { fontSize: 14, fontWeight: "800" },
  actionBtnSub: { fontSize: 11, color: "#999", marginTop: 1 },

  // Done tag
  doneTag: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#e8f5e9", borderRadius: 8, padding: 10 },
  doneTagIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2e7d32", color: "#fff", textAlign: "center", lineHeight: 24, fontSize: 13, fontWeight: "800" },
  doneTagText: { fontSize: 13, color: "#2e7d32", fontWeight: "600" },

  // Post-unload
  postUnload: { gap: 10 },
  postRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e3f2fd" },
  photoBtnLabel: { fontSize: 13, color: "#1565C0", fontWeight: "700" },
  photoThumb: { width: 48, height: 48, borderRadius: 6 },

  sigRow: { flexDirection: "row", gap: 10 },
  sigBlock: { flex: 1, backgroundColor: "#f8f9fa", borderRadius: 10, padding: 10, alignItems: "center" },
  sigTitle: { fontSize: 11, fontWeight: "700", color: "#888", marginBottom: 6, textTransform: "uppercase" },
  sigImg: { width: "100%", height: 56, marginBottom: 6 },
  sigPlaceholder: { width: "100%", height: 40, borderRadius: 6, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center", marginBottom: 6 },
  sigPlaceholderText: { fontSize: 10, color: "#aaa" },
  sigBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, width: "100%", alignItems: "center" },
  sigBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Returned
  returnedTitle: { fontSize: 20, fontWeight: "800", color: "#2e7d32", textAlign: "center", marginBottom: 4 },
  returnedKm: { fontSize: 24, fontWeight: "900", color: "#1a2a3a", textAlign: "center", marginBottom: 12 },
  returnedInfo: { backgroundColor: "#fff", borderRadius: 10, padding: 12, gap: 6, marginBottom: 12 },
  returnedInfoRow: { fontSize: 13, color: "#555", lineHeight: 20 },
  returnedNote: { fontSize: 12, color: "#888", textAlign: "center", fontStyle: "italic" },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#1a2a3a" },
  emptyText: { fontSize: 14, color: "#888" },
});
