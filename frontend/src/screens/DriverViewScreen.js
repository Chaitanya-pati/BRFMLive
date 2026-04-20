import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Image, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import SignatureCanvas from "react-signature-canvas";
import Layout from "../components/Layout";
import { dispatchApi, getApiClient, API_BASE_URL } from "../api/client";
import { storage } from "../utils/storage";
import { showError, showSuccess } from "../utils/customAlerts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return "—";
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
// A pending stop (not yet in DB) counts as NOT done
function allStopsDone(stops) {
  if (!stops || stops.length === 0) return false;
  return stops.every(s => !s._pending && !!s.unloading_end);
}

// ─── Signature modal — rendered into document.body via portal ───────────────
function SigModal({ label, onClose, onSave }) {
  const ref = useRef(null);

  const content = (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24,
        width: "100%", maxWidth: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#1a2a3a" }}>{label}</span>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 12, marginTop: 0 }}>Draw signature in the box below using mouse or finger.</p>
        <div style={{ border: "2px solid #1565C0", borderRadius: 10, overflow: "hidden", background: "#f8faff", cursor: "crosshair" }}>
          <SignatureCanvas
            ref={ref}
            penColor="#1a2a3a"
            canvasProps={{
              style: { display: "block", width: "100%", height: 200, touchAction: "none" },
            }}
            backgroundColor="rgb(248,250,255)"
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => ref.current?.clear()}
            style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: "1px solid #ddd", background: "#f1f5f9", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#555" }}
          >
            Clear
          </button>
          <button
            onClick={() => {
              if (!ref.current || ref.current.isEmpty()) { showError("Please draw a signature first"); return; }
              ref.current.getCanvas().toBlob(b => { if (b) onSave(b); }, "image/png");
            }}
            style={{ flex: 2, padding: "12px 0", borderRadius: 9, border: "none", background: "#1565C0", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
          >
            ✓ Save Signature
          </button>
        </div>
      </div>
    </div>
  );

  if (Platform.OS === "web") {
    // Use createPortal to render at document.body — bypasses all scroll/stacking contexts
    const ReactDOM = require("react-dom");
    return ReactDOM.createPortal(content, document.body);
  }
  return null;
}

// ─── Inline photo capture button ─────────────────────────────────────────────
function PhotoBtn({ photos, onCapture, busy, label }) {
  return (
    <View style={s.photoRow}>
      <TouchableOpacity style={s.photoBtn} onPress={onCapture} disabled={busy}>
        {busy
          ? <ActivityIndicator color="#1565C0" size="small" />
          : <><Text style={{ fontSize: 18 }}>📸</Text><Text style={s.photoBtnTxt}>{label || "Add Photo"}{photos?.length > 0 ? ` (${photos.length})` : ""}</Text></>
        }
      </TouchableOpacity>
      {(photos || []).map((p, i) => (
        <Image key={p.id || i} source={{ uri: `${API_BASE_URL}/${p.photo_path}` }} style={s.photoThumb} resizeMode="cover" />
      ))}
    </View>
  );
}

// ─── Done row ────────────────────────────────────────────────────────────────
function DoneRow({ icon, text }) {
  return (
    <View style={s.doneRow}>
      <View style={s.doneCheck}><Text style={s.doneCheckTxt}>✓</Text></View>
      <Text style={s.doneTxt}>{icon} {text}</Text>
    </View>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, sublabel, color, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, { borderLeftColor: disabled ? "#ddd" : color, opacity: disabled ? 0.45 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
    >
      {loading
        ? <ActivityIndicator color={color} size="small" style={{ marginVertical: 4 }} />
        : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[s.actionCircle, { backgroundColor: disabled ? "#bbb" : color }]}>
              <Text style={{ fontSize: 17 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionLabel, { color: disabled ? "#aaa" : "#1a2a3a" }]}>{label}</Text>
              {sublabel ? <Text style={s.actionSub}>{sublabel}</Text> : null}
            </View>
            {!disabled && <Text style={{ color, fontSize: 16, marginRight: 2 }}>›</Text>}
          </View>
        )
      }
    </TouchableOpacity>
  );
}

// ─── Single stop ─────────────────────────────────────────────────────────────
function StopSection({ stop, stopIndex, totalStops, onRecordTime, onUploadSig, onUploadPhoto, onOpenSig, photosByStep }) {
  const [busy, setBusy] = useState(null);
  const isL = (k) => busy === k;

  const doRecord = async (field) => {
    setBusy(field);
    try {
      await onRecordTime(stop, field);
      showSuccess("Saved!");
    } catch { showError("Could not save. Try again."); }
    finally { setBusy(null); }
  };

  const doPhoto = async (step) => {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(`photo_${step}`);
      const asset = res.assets[0];
      const fd = new FormData();
      if (asset.uri.startsWith("data:") || asset.uri.startsWith("blob:")) {
        fd.append("photo", await fetch(asset.uri).then(r => r.blob()), "photo.jpg");
      } else {
        fd.append("photo", { uri: asset.uri, type: asset.mimeType || "image/jpeg", name: "photo.jpg" });
      }
      await onUploadPhoto(stop, fd, step);
      showSuccess("Photo added!");
    } catch { showError("Photo upload failed."); }
    finally { setBusy(null); }
  };

  const { arrived_at, unloading_start, unloading_end, customer_signature, driver_signature } = stop;
  const photos_start = photosByStep?.unloading_start || [];
  const photos_end   = photosByStep?.unloading_end   || [];
  const photos_delivery = photosByStep?.delivery      || stop.photos || [];
  const allDone = !!arrived_at && !!unloading_start && !!unloading_end;

  return (
    <View style={s.stopCard}>
      {/* Header */}
      <View style={s.stopHead}>
        <View style={[s.stopNumDot, allDone && { backgroundColor: "#2e7d32" }]}>
          <Text style={s.stopNumTxt}>{allDone ? "✓" : stopIndex + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.stopName}>{stop.customer_name || "Customer"}</Text>
          {stop.order_id ? <Text style={s.stopMeta}>Order #{stop.order_id}</Text> : null}
          {totalStops > 1 ? <Text style={s.stopMeta}>Stop {stopIndex + 1} of {totalStops}</Text> : null}
        </View>
        {allDone && <View style={s.stopDonePill}><Text style={s.stopDonePillTxt}>Done ✓</Text></View>}
      </View>

      <View style={s.stopBody}>

        {/* ── ARRIVED ── */}
        {arrived_at
          ? <DoneRow icon="📍" text={`Arrived at ${fmtTime(arrived_at)}`} />
          : <ActionBtn icon="📍" label="WE ARRIVED" sublabel="Tap when you reach the customer" color="#1565C0" onPress={() => doRecord("arrived_at")} loading={isL("arrived_at")} />
        }

        {/* ── UNLOADING START ── */}
        {arrived_at && (
          unloading_start
            ? <>
              <DoneRow icon="🔓" text={`Unloading started at ${fmtTime(unloading_start)}`} />
              <PhotoBtn photos={photos_start} busy={isL("photo_unloading_start")} label="Unloading Start Photo" onCapture={() => doPhoto("unloading_start")} />
            </>
            : <ActionBtn icon="🔓" label="UNLOADING STARTED" sublabel="Tap when unloading begins" color="#7B1FA2" onPress={() => doRecord("unloading_start")} loading={isL("unloading_start")} />
        )}

        {/* ── UNLOADING DONE ── */}
        {unloading_start && (
          unloading_end
            ? <>
              <DoneRow icon="✅" text={`Unloading done at ${fmtTime(unloading_end)}`} />
              <PhotoBtn photos={photos_end} busy={isL("photo_unloading_end")} label="Unloading Done Photo" onCapture={() => doPhoto("unloading_end")} />
            </>
            : <ActionBtn icon="✅" label="UNLOADING DONE" sublabel="Tap when all goods are offloaded" color="#2e7d32" onPress={() => doRecord("unloading_end")} loading={isL("unloading_end")} />
        )}

        {/* ── POST UNLOADING: delivery photo + signatures ── */}
        {unloading_end && (
          <View style={s.postBox}>
            <Text style={s.postBoxTitle}>Delivery Proof</Text>

            <PhotoBtn photos={photos_delivery} busy={isL("photo_delivery")} label="Delivery Photo" onCapture={() => doPhoto("delivery")} />

            <View style={s.sigRow}>
              {/* Customer sign */}
              <View style={s.sigBlock}>
                <Text style={s.sigLabel}>CUSTOMER SIGN</Text>
                {customer_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${customer_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigEmpty}><Text style={s.sigEmptyTxt}>Not captured</Text></View>
                }
                <TouchableOpacity
                  style={[s.sigBtn, { backgroundColor: customer_signature ? "#546e7a" : "#00796B" }]}
                  onPress={() => onOpenSig(stop, "customer")}
                  disabled={isL("sig_customer")}
                >
                  {isL("sig_customer")
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.sigBtnTxt}>{customer_signature ? "Re-sign" : "Get Signature"}</Text>
                  }
                </TouchableOpacity>
              </View>

              {/* Driver sign */}
              <View style={s.sigBlock}>
                <Text style={s.sigLabel}>MY SIGNATURE</Text>
                {driver_signature
                  ? <Image source={{ uri: `${API_BASE_URL}/${driver_signature}` }} style={s.sigImg} resizeMode="contain" />
                  : <View style={s.sigEmpty}><Text style={s.sigEmptyTxt}>Not captured</Text></View>
                }
                <TouchableOpacity
                  style={[s.sigBtn, { backgroundColor: driver_signature ? "#546e7a" : "#1565C0" }]}
                  onPress={() => onOpenSig(stop, "driver")}
                  disabled={isL("sig_driver")}
                >
                  {isL("sig_driver")
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.sigBtnTxt}>{driver_signature ? "Re-sign" : "Sign Here"}</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Dispatch list card ───────────────────────────────────────────────────────
function DispatchCard({ dispatch, onPress }) {
  const items = dispatch.items || [];
  const totalBags = items.reduce((a, i) => a + (i.dispatched_bags || 0), 0);
  const totalTon  = items.reduce((a, i) => a + (parseFloat(i.dispatched_qty_ton) || 0), 0).toFixed(2);
  const customer  = dispatch.order?.customer?.customer_name || dispatch.customer_name || "Customer";
  const city      = dispatch.order?.customer?.city || "";
  return (
    <TouchableOpacity style={s.dispCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.dispTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.dispName}>{customer}</Text>
          {city ? <Text style={s.dispCity}>{city}</Text> : null}
        </View>
        <View style={s.dispBadge}><Text style={s.dispBadgeTxt}>#{dispatch.dispatch_id}</Text></View>
      </View>
      <View style={s.dispMeta}>
        <Text style={s.dispMetaItem}>🚛 {dispatch.truck?.truck_number || "N/A"}</Text>
        {totalBags > 0 && <Text style={s.dispMetaItem}>📦 {totalBags} bags</Text>}
        {parseFloat(totalTon) > 0 && <Text style={s.dispMetaItem}>⚖️ {totalTon} T</Text>}
      </View>
      {items.length > 0 && (
        <Text style={s.dispItems} numberOfLines={1}>{items.map(i => i.product_name || "Product").join(", ")}</Text>
      )}
      <Text style={s.dispOpen}>Open trip →</Text>
    </TouchableOpacity>
  );
}

// ─── Stage pill ───────────────────────────────────────────────────────────────
function StagePill({ stage }) {
  const M = { NEW: ["Start Trip", "#1565C0", "#e3f2fd"], IN_TRANSIT: ["In Transit", "#e65100", "#fff3e0"], RETURNED: ["Returned", "#2e7d32", "#e8f5e9"] };
  const [l, c, bg] = M[stage] || M.NEW;
  return <View style={[s.stagePill, { backgroundColor: bg }]}><Text style={[s.stagePillTxt, { color: c }]}>{l}</Text></View>;
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
  // Signature modal state — lifted here so portal renders outside ScrollView
  const [sigState, setSigState] = useState(null); // { stop, type } | null
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
      let all = (res.data || []).filter(d =>
        ["DISPATCHED", "PARTIALLY DELIVERED", "PARTIAL", "IN_TRANSIT"].includes(d.status)
      );
      const isAdmin = !userData || ["admin", "manager"].includes(userData?.role);
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
      if (ts?.id) {
        const fullRes = await client.get(`/trip-sheets/${ts.id}/full`);
        fullTs = { ...ts, stop: fullRes.data?.stop || null };
      }
      setTripData({ tripSheet: fullTs, stops: buildStops(stopsRes.data || [], dispatch) });
    } catch (e) {
      console.error(e);
      setTripData({ tripSheet: null, stops: [] });
    } finally { setDetailLoading(false); }
  };

  const refreshStops = useCallback(async () => {
    if (!selected) return;
    const stopsRes = await dispatchApi.getDeliveryStops(selected.dispatch_id);
    setTripData(prev => ({ ...prev, stops: buildStops(stopsRes.data || [], selected) }));
  }, [selected]);

  // ── Ensure a pending stop is created before any action ──────────────────
  const ensureStop = async (stop) => {
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

  // ── Record time ───────────────────────────────────────────────────────────
  const handleRecordTime = async (stop, field) => {
    const actualStop = await ensureStop(stop);
    if (!actualStop?.id) throw new Error("Could not create stop");
    const fd = buildFD({ [field]: new Date().toISOString() });
    await dispatchApi.updateStopTimes(selected.dispatch_id, actualStop.id, fd);
    await refreshStops();
  };

  // ── Upload photo (step = 'delivery'|'unloading_start'|'unloading_end') ───
  const handleUploadPhoto = async (stop, fd, step) => {
    const actualStop = await ensureStop(stop);
    await dispatchApi.addStopPhoto(selected.dispatch_id, actualStop.id, fd);
    await refreshStops();
  };

  // ── Signature: open modal (lifts state to parent for portal rendering) ───
  const handleOpenSig = (stop, type) => { setSigState({ stop, type }); };

  // ── Signature: save ───────────────────────────────────────────────────────
  const handleSaveSig = async (blob) => {
    const { stop, type } = sigState;
    setSigState(null);
    try {
      const actualStop = await ensureStop(stop);
      const fd = new FormData();
      fd.append("signature", blob, "sig.png");
      if (type === "driver") await dispatchApi.uploadDriverSignature(selected.dispatch_id, actualStop.id, fd);
      else await dispatchApi.uploadCustomerSignature(selected.dispatch_id, actualStop.id, fd);
      await refreshStops();
      showSuccess("Signature saved!");
    } catch { showError("Failed to save signature. Try again."); }
  };

  // ── START TRIP ────────────────────────────────────────────────────────────
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

  // ── RETURN TO FACTORY ──────────────────────────────────────────────────────
  const handleReturn = async () => {
    if (!returnKm.trim()) { showError("Enter the odometer reading at factory gate"); return; }
    setActionBusy(true);
    try {
      await client.put(`/trip-sheets/${tripData.tripSheet.id}/stop`, {
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

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  if (!selected) {
    const name = user?.full_name || user?.username || "Driver";
    return (
      <Layout title="Driver View" navigation={navigation}>
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.greet}>
            <Text style={s.greetName}>Hello, {name} 👋</Text>
            <Text style={s.greetSub}>Your deliveries for today</Text>
          </View>
          {loading
            ? <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 60 }} />
            : dispatches.length === 0
              ? <View style={s.emptyBox}>
                <Text style={{ fontSize: 52 }}>🎉</Text>
                <Text style={s.emptyTitle}>All Done!</Text>
                <Text style={s.emptySub}>No pending deliveries right now.</Text>
              </View>
              : dispatches.map(d => <DispatchCard key={d.dispatch_id} dispatch={d} onPress={() => openDispatch(d)} />)
          }
        </ScrollView>
      </Layout>
    );
  }

  if (detailLoading) {
    return (
      <Layout title="Driver View" navigation={navigation}>
        <View style={s.centerFill}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={{ marginTop: 14, color: "#888", fontSize: 14 }}>Loading trip details...</Text>
        </View>
      </Layout>
    );
  }

  const { tripSheet, stops } = tripData || {};
  const stage = getTripStage(tripSheet);
  const tsStop = tripSheet?.stop || {};
  const done = allStopsDone(stops || []);
  const customer = selected.order?.customer?.customer_name || selected.customer_name || "Customer";
  const kmDriven = tsStop.factory_exit_km && tsStop.factory_return_km
    ? Math.round(tsStop.factory_return_km - tsStop.factory_exit_km) : null;

  return (
    <Layout title="Driver View" navigation={navigation}>
      {/* Signature modal renders as a portal at body level — no overlap issues */}
      {sigState && Platform.OS === "web" && (
        <SigModal
          label={sigState.type === "driver" ? "My Signature (Driver)" : "Customer Signature"}
          onClose={() => setSigState(null)}
          onSave={handleSaveSig}
        />
      )}

      <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
        {/* Header */}
        <View style={s.detailHead}>
          <TouchableOpacity style={s.backBtn} onPress={() => { setSelected(null); setTripData(null); }}>
            <Text style={s.backBtnTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.detailCustomer}>{customer}</Text>
            <Text style={s.detailMeta}>Dispatch #{selected.dispatch_id} · {selected.truck?.truck_number || "Truck N/A"}</Text>
          </View>
          <StagePill stage={stage} />
        </View>

        {/* ── STAGE 1: Start Trip ── */}
        {stage === "NEW" && (
          <View style={s.stageCard}>
            <Text style={s.stageTitle}>① Start Your Trip</Text>
            <Text style={s.stageHint}>Enter the odometer reading before leaving the factory.</Text>
            <View style={s.kmRow}>
              <Text style={s.kmLabel}>KM Reading</Text>
              <TextInput style={s.kmInput} value={startKm} onChangeText={setStartKm} keyboardType="numeric" placeholder="e.g. 45230" />
            </View>
            <TouchableOpacity style={[s.startBtn, actionBusy && { opacity: 0.6 }]} onPress={handleStartTrip} disabled={actionBusy}>
              {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.startBtnTxt}>🚛  START TRIP</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STAGE 2: Delivering ── */}
        {stage === "IN_TRANSIT" && (
          <>
            <View style={s.infoCard}>
              <Text style={s.stageTitle}>② Delivering</Text>
              <Text style={s.stageHint}>Complete each stop below. Tap the buttons in order.</Text>
              {tsStop.factory_exit_km ? (
                <Text style={s.kmInfo}>🚦 Started at {tsStop.factory_exit_km} km</Text>
              ) : null}
            </View>

            {(stops || []).map((stop, idx) => (
              <StopSection
                key={stop.id || stop.order_id || idx}
                stop={stop}
                stopIndex={idx}
                totalStops={(stops || []).length}
                onRecordTime={handleRecordTime}
                onUploadSig={null}
                onUploadPhoto={handleUploadPhoto}
                onOpenSig={handleOpenSig}
                photosByStep={{}}
              />
            ))}

            {/* Return to Factory — only when ALL stops done */}
            {done && (
              <View style={s.returnCard}>
                <Text style={s.stageTitle}>③ Return to Factory</Text>
                <Text style={s.stageHint}>All stops complete! Enter the odometer reading at the factory gate.</Text>
                <View style={s.kmRow}>
                  <Text style={s.kmLabel}>KM Reading</Text>
                  <TextInput style={s.kmInput} value={returnKm} onChangeText={setReturnKm} keyboardType="numeric" placeholder="e.g. 45510" />
                </View>
                <TouchableOpacity style={[s.returnBtn, actionBusy && { opacity: 0.6 }]} onPress={handleReturn} disabled={actionBusy}>
                  {actionBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.returnBtnTxt}>🏭  RETURN TO FACTORY</Text>}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── STAGE 3: Returned ── */}
        {stage === "RETURNED" && (
          <View style={[s.stageCard, { backgroundColor: "#e8f5e9", alignItems: "center" }]}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
            <Text style={s.returnedTitle}>Trip Complete!</Text>
            {kmDriven != null && <Text style={s.returnedKm}>{kmDriven} km driven</Text>}
            <View style={s.returnedInfo}>
              <Text style={s.returnedRow}>🕐 Left factory: {fmtTime(tsStop.factory_exit_at)}</Text>
              <Text style={s.returnedRow}>🏭 Returned: {fmtTime(tsStop.factory_return_at)}</Text>
            </View>
            <Text style={s.returnedNote}>The supervisor will complete the paperwork.</Text>
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f6f8" },
  pageContent: { padding: 14, paddingBottom: 50 },
  centerFill: { flex: 1, justifyContent: "center", alignItems: "center" },

  greet: { marginBottom: 16 },
  greetName: { fontSize: 20, fontWeight: "800", color: "#1a2a3a" },
  greetSub: { fontSize: 13, color: "#888", marginTop: 2 },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#1a2a3a" },
  emptySub: { fontSize: 14, color: "#888" },

  // Dispatch card
  dispCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2 },
  dispTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  dispName: { fontSize: 16, fontWeight: "800", color: "#1a2a3a" },
  dispCity: { fontSize: 12, color: "#888", marginTop: 1 },
  dispBadge: { backgroundColor: "#e3f2fd", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, marginLeft: 8 },
  dispBadgeTxt: { fontSize: 11, color: "#1565C0", fontWeight: "700" },
  dispMeta: { flexDirection: "row", gap: 12, marginBottom: 6, flexWrap: "wrap" },
  dispMetaItem: { fontSize: 12, color: "#555" },
  dispItems: { fontSize: 12, color: "#aaa", marginBottom: 6 },
  dispOpen: { fontSize: 13, color: "#1565C0", fontWeight: "700", textAlign: "right" },

  // Detail header
  detailHead: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 4 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 9 },
  backBtnTxt: { color: "#1565C0", fontWeight: "700", fontSize: 13 },
  detailCustomer: { fontSize: 15, fontWeight: "800", color: "#1a2a3a" },
  detailMeta: { fontSize: 12, color: "#888", marginTop: 1 },

  // Stage pill
  stagePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stagePillTxt: { fontSize: 12, fontWeight: "700" },

  // Cards
  stageCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 10 },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 },
  stageTitle: { fontSize: 15, fontWeight: "800", color: "#1a2a3a", marginBottom: 4 },
  stageHint: { fontSize: 13, color: "#888", lineHeight: 18, marginBottom: 12 },
  kmInfo: { fontSize: 13, color: "#555", fontWeight: "600" },
  returnCard: { backgroundColor: "#fff3e0", borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 10 },

  // KM input
  kmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  kmLabel: { fontSize: 13, fontWeight: "700", color: "#555", width: 88 },
  kmInput: { flex: 1, height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 9, paddingHorizontal: 12, fontSize: 16, backgroundColor: "#f8f9fa" },

  startBtn: { backgroundColor: "#1565C0", padding: 15, borderRadius: 10, alignItems: "center" },
  startBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  returnBtn: { backgroundColor: "#e65100", padding: 15, borderRadius: 10, alignItems: "center" },
  returnBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Stop card
  stopCard: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  stopHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  stopNumDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1565C0", justifyContent: "center", alignItems: "center" },
  stopNumTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
  stopName: { fontSize: 14, fontWeight: "800", color: "#1a2a3a" },
  stopMeta: { fontSize: 11, color: "#888", marginTop: 1 },
  stopDonePill: { backgroundColor: "#e8f5e9", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  stopDonePillTxt: { fontSize: 11, color: "#2e7d32", fontWeight: "700" },
  stopBody: { padding: 12, gap: 8 },

  // Action button
  actionBtn: { borderLeftWidth: 4, borderRadius: 9, padding: 12, backgroundColor: "#fafafa" },
  actionCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 14, fontWeight: "800" },
  actionSub: { fontSize: 11, color: "#999", marginTop: 1 },

  // Done row
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  doneCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#2e7d32", justifyContent: "center", alignItems: "center" },
  doneCheckTxt: { color: "#fff", fontSize: 11, fontWeight: "900" },
  doneTxt: { fontSize: 13, color: "#2e7d32", fontWeight: "600" },

  // Photo
  photoRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e3f2fd" },
  photoBtnTxt: { fontSize: 13, color: "#1565C0", fontWeight: "700" },
  photoThumb: { width: 44, height: 44, borderRadius: 7 },

  // Post-unload box
  postBox: { backgroundColor: "#f8f9fa", borderRadius: 10, padding: 12, gap: 10 },
  postBoxTitle: { fontSize: 13, fontWeight: "800", color: "#555", textTransform: "uppercase", letterSpacing: 0.5 },

  // Signatures
  sigRow: { flexDirection: "row", gap: 10 },
  sigBlock: { flex: 1, backgroundColor: "#fff", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#eee" },
  sigLabel: { fontSize: 10, fontWeight: "800", color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  sigImg: { width: "100%", height: 52, marginBottom: 8 },
  sigEmpty: { width: "100%", height: 44, borderRadius: 7, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  sigEmptyTxt: { fontSize: 11, color: "#bbb" },
  sigBtn: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, width: "100%", alignItems: "center" },
  sigBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Returned
  returnedTitle: { fontSize: 20, fontWeight: "800", color: "#2e7d32", marginBottom: 4 },
  returnedKm: { fontSize: 28, fontWeight: "900", color: "#1a2a3a", marginBottom: 12 },
  returnedInfo: { backgroundColor: "#fff", borderRadius: 10, padding: 12, gap: 6, marginBottom: 12, alignSelf: "stretch" },
  returnedRow: { fontSize: 13, color: "#555", lineHeight: 20 },
  returnedNote: { fontSize: 12, color: "#888", fontStyle: "italic", textAlign: "center" },
});
