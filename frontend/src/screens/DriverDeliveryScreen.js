import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import SignatureCanvas from "react-signature-canvas";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Modal from "../components/Modal";
import colors from "../theme/colors";
import { dispatchApi } from "../api/client";
import { showError, showSuccess } from "../utils/customAlerts";
import { API_BASE_URL } from "../api/client";
import { storage } from "../utils/storage";

const STATUS_COLOR = {
  DISPATCHED: "#f59e0b",
  "PARTIALLY DELIVERED": "#3b82f6",
  PARTIAL: "#3b82f6",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
};

const STATUS_BG = {
  DISPATCHED: "#fffbeb",
  "PARTIALLY DELIVERED": "#eff6ff",
  PARTIAL: "#eff6ff",
  DELIVERED: "#f0fdf4",
  CANCELLED: "#fef2f2",
};

function formatDateTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildFormData(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  return fd;
}

async function buildFileFormData(fieldName, asset) {
  const fd = new FormData();
  if (asset.uri.startsWith("data:") || asset.uri.startsWith("blob:")) {
    const blob = await fetch(asset.uri).then((r) => r.blob());
    fd.append(fieldName, blob, "image.jpg");
  } else {
    fd.append(fieldName, {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: "image.jpg",
    });
  }
  return fd;
}

function StopCard({ stop, dispatch, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [sigPadFor, setSigPadFor] = useState(null); // null | 'driver' | 'customer'

  const recordTime = async (field) => {
    setBusy(field);
    try {
      const fd = buildFormData({ [field]: new Date().toISOString() });
      await dispatchApi.updateStopTimes(dispatch.dispatch_id, stop.id, fd);
      await onRefresh();
      showSuccess("Time recorded");
    } catch (e) {
      showError(e?.message || "Failed to record time");
    } finally {
      setBusy(null);
    }
  };

  const uploadSignatureBlob = async (type, blob) => {
    setSigPadFor(null);
    setBusy(type);
    try {
      const fd = new FormData();
      fd.append("signature", blob, "signature.png");
      if (type === "driver") {
        await dispatchApi.uploadDriverSignature(dispatch.dispatch_id, stop.id, fd);
      } else {
        await dispatchApi.uploadCustomerSignature(dispatch.dispatch_id, stop.id, fd);
      }
      await onRefresh();
      showSuccess("Signature saved");
    } catch (e) {
      showError(e?.message || "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const pickAndUpload = async (endpoint) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setBusy(endpoint);
      const fd = await buildFileFormData(
        endpoint === "photo" ? "photo" : "signature",
        result.assets[0]
      );
      if (endpoint === "photo") {
        await dispatchApi.addStopPhoto(dispatch.dispatch_id, stop.id, fd);
      } else if (endpoint === "driver") {
        await dispatchApi.uploadDriverSignature(dispatch.dispatch_id, stop.id, fd);
      } else if (endpoint === "customer") {
        await dispatchApi.uploadCustomerSignature(dispatch.dispatch_id, stop.id, fd);
      }
      await onRefresh();
      showSuccess("Uploaded successfully");
    } catch (e) {
      showError(e?.message || "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setBusy("photo");
      const fd = await buildFileFormData("photo", result.assets[0]);
      await dispatchApi.addStopPhoto(dispatch.dispatch_id, stop.id, fd);
      await onRefresh();
      showSuccess("Photo added");
    } catch (e) {
      showError(e?.message || "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const isLoading = (key) => busy === key;

  return (
    <View style={ss.stopCard}>
      <View style={ss.stopHeader}>
        <Text style={ss.stopCustomer}>{stop.customer_name || "Customer"}</Text>
        {stop.order_id ? (
          <Text style={ss.stopOrderId}>Order #{stop.order_id}</Text>
        ) : null}
      </View>

      {/* Timings */}
      <View style={ss.timingGrid}>
        <TimingRow
          label="Arrived at Customer"
          value={stop.arrived_at}
          busy={isLoading("arrived_at")}
          onRecord={() => recordTime("arrived_at")}
        />
        <TimingRow
          label="Unloading Start"
          value={stop.unloading_start}
          busy={isLoading("unloading_start")}
          onRecord={() => recordTime("unloading_start")}
        />
        <TimingRow
          label="Unloading End"
          value={stop.unloading_end}
          busy={isLoading("unloading_end")}
          onRecord={() => recordTime("unloading_end")}
        />
      </View>

      {/* Photos */}
      <View style={ss.sectionRow}>
        <Text style={ss.sectionTitle}>
          Delivery Photos ({stop.photos?.length || 0})
        </Text>
        <View style={ss.photoActions}>
          <TouchableOpacity
            style={ss.smallBtn}
            onPress={() => pickAndUpload("photo")}
            disabled={isLoading("photo")}
          >
            {isLoading("photo") ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={ss.smallBtnText}>Camera</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[ss.smallBtn, { backgroundColor: "#64748b" }]}
            onPress={pickFromGallery}
            disabled={isLoading("photo")}
          >
            <Text style={ss.smallBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {stop.photos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.photoScroll}>
          {stop.photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: `${API_BASE_URL}/${p.photo_path}` }}
              style={ss.thumbImg}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Signatures */}
      <View style={ss.sigRow}>
        <SignatureBlock
          label="Driver Signature"
          value={stop.driver_signature}
          busy={isLoading("driver")}
          onCapture={() =>
            Platform.OS === "web"
              ? setSigPadFor("driver")
              : pickAndUpload("driver")
          }
        />
        <SignatureBlock
          label="Customer Signature"
          value={stop.customer_signature}
          busy={isLoading("customer")}
          onCapture={() =>
            Platform.OS === "web"
              ? setSigPadFor("customer")
              : pickAndUpload("customer")
          }
        />
      </View>

      {Platform.OS === "web" && (
        <SignaturePadModal
          visible={sigPadFor !== null}
          label={sigPadFor === "driver" ? "Driver Signature" : "Customer Signature"}
          onClose={() => setSigPadFor(null)}
          onSave={(blob) => uploadSignatureBlob(sigPadFor, blob)}
        />
      )}
    </View>
  );
}

function TimingRow({ label, value, busy, onRecord }) {
  return (
    <View style={ss.timingRow}>
      <View style={{ flex: 1 }}>
        <Text style={ss.timingLabel}>{label}</Text>
        {value ? (
          <Text style={ss.timingValue}>{formatDateTime(value)}</Text>
        ) : (
          <Text style={ss.timingMissing}>Not recorded</Text>
        )}
      </View>
      <TouchableOpacity
        style={[ss.timeBtn, value && ss.timeBtnDone]}
        onPress={onRecord}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={ss.timeBtnText}>{value ? "Update" : "Record Now"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SignatureBlock({ label, value, busy, onCapture }) {
  return (
    <View style={ss.sigBlock}>
      <Text style={ss.sigLabel}>{label}</Text>
      {value ? (
        <Image
          source={{ uri: `${API_BASE_URL}/${value}` }}
          style={ss.sigImg}
          resizeMode="contain"
        />
      ) : (
        <View style={ss.sigPlaceholder}>
          <Text style={ss.sigPlaceholderText}>Not captured</Text>
        </View>
      )}
      <TouchableOpacity style={ss.sigBtn} onPress={onCapture} disabled={busy}>
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={ss.sigBtnText}>{value ? "Re-sign" : "Sign"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SignaturePadModal({ visible, label, onClose, onSave }) {
  const sigRef = useRef(null);

  if (!visible) return null;

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleSave = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      showError("Please draw a signature first");
      return;
    }
    sigRef.current.getCanvas().toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{label}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#64748b",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10, marginTop: 0 }}>
          Draw your signature in the box below
        </p>

        <div
          style={{
            border: "2px solid #6366f1",
            borderRadius: 10,
            overflow: "hidden",
            backgroundColor: "#f8fafc",
            cursor: "crosshair",
          }}
        >
          <SignatureCanvas
            ref={sigRef}
            penColor="#1e293b"
            canvasProps={{
              width: 432,
              height: 200,
              style: { display: "block", width: "100%", height: 200, touchAction: "none" },
            }}
            backgroundColor="rgba(248,250,252,1)"
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              backgroundColor: "#f1f5f9",
              color: "#374151",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#6366f1",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverDeliveryScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUserAndDispatches();
  }, []);

  const loadUserAndDispatches = async () => {
    try {
      const userData = await storage.getUserData();
      if (!userData) {
        showError("Could not load user data. Please log in again.");
        return;
      }
      setCurrentUser(userData);
      const admin = userData.role === "admin";
      setIsAdmin(admin);
      await fetchDispatches(userData, admin);
    } catch (e) {
      console.error("Error loading user data:", e);
      showError("Failed to load user data");
    }
  };

  const fetchDispatches = async (userData, admin) => {
    setLoading(true);
    try {
      const res = await dispatchApi.getAll();
      const all = res.data || [];
      const dispatched = all.filter((d) => d.status === "DISPATCHED");

      if (admin) {
        setDispatches(dispatched);
      } else {
        const userDriverId = userData.driver_id ? userData.driver_id.toString() : null;
        const driverName = (userData.full_name || userData.username || "").toLowerCase().trim();
        const filtered = dispatched.filter((d) => {
          if (userDriverId && d.driver_id?.toString() === userDriverId) return true;
          const dispatchDriverName = (d.driver?.driver_name || "").toLowerCase().trim();
          return driverName && dispatchDriverName === driverName;
        });
        setDispatches(filtered);
      }
    } catch {
      showError("Failed to load dispatches");
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (dispatch) => {
    setSelectedDispatch(dispatch);
    setModalVisible(true);
    await loadStops(dispatch);
  };

  const loadStops = async (dispatch) => {
    setStopsLoading(true);
    try {
      const res = await dispatchApi.getDeliveryStops(dispatch.dispatch_id);
      const existingStops = res.data || [];

      const orderIds = getOrderIds(dispatch);
      const merged = orderIds.map((orderId, idx) => {
        const existing = existingStops.find((s) => s.order_id === orderId);
        if (existing) return existing;
        return { _pending: true, order_id: orderId, customer_name: getCustomerName(dispatch, orderId, idx) };
      });

      if (orderIds.length === 0 && existingStops.length === 0) {
        const existing = existingStops.find((s) => !s.order_id);
        if (existing) {
          setStops([existing]);
        } else {
          setStops([{ _pending: true, order_id: null, customer_name: dispatch.order?.customer?.customer_name || "Customer" }]);
        }
      } else {
        setStops(merged);
      }
    } catch (e) {
      showError("Failed to load delivery stops");
      setStops([]);
    } finally {
      setStopsLoading(false);
    }
  };

  const getOrderIds = (dispatch) => {
    if (!dispatch?.items || dispatch.items.length === 0) {
      return dispatch?.order_id ? [dispatch.order_id] : [];
    }
    const ids = [];
    dispatch.items.forEach((item) => {
      const oid = item.order_item?.order_id || item.order_item?.customer_order_id || dispatch.order_id;
      if (oid && !ids.includes(oid)) ids.push(oid);
    });
    return ids.length > 0 ? ids : (dispatch.order_id ? [dispatch.order_id] : []);
  };

  const getCustomerName = (dispatch, orderId, idx) => {
    if (dispatch.order?.customer?.customer_name) return dispatch.order.customer.customer_name;
    return `Customer ${idx + 1}`;
  };

  const ensureStop = async (dispatch, pendingStop) => {
    const fd = buildFormData({
      order_id: pendingStop.order_id,
    });
    const res = await dispatchApi.createOrUpdateStop(dispatch.dispatch_id, fd);
    return res.data;
  };

  const refreshStops = useCallback(async () => {
    if (!selectedDispatch) return;
    await loadStops(selectedDispatch);
  }, [selectedDispatch]);

  const handleMarkDelivered = async () => {
    if (!selectedDispatch) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("delivery_date", new Date().toISOString());
      const placeholderBlob = new Blob([""], { type: "image/jpeg" });
      form.append("driver_photo", placeholderBlob, "placeholder.jpg");
      await dispatchApi.uploadDeliveryProof(selectedDispatch.dispatch_id, form);
      showSuccess("Dispatch marked as Delivered");
      setModalVisible(false);
      loadUserAndDispatches();
    } catch (e) {
      showError(e?.message || "Failed to mark as delivered");
    } finally {
      setSubmitting(false);
    }
  };

  const driverName = currentUser?.full_name || currentUser?.username || "";

  return (
    <Layout title="Driver Delivery" navigation={navigation}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Driver Delivery Proof</Text>
            <Text style={styles.subtitle}>
              {isAdmin
                ? "Showing all pending deliveries across all drivers"
                : driverName
                ? `Assigned to: ${driverName}`
                : "Your assigned deliveries"}
            </Text>
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin View</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : dispatches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>No Pending Deliveries</Text>
            <Text style={styles.emptyText}>
              {isAdmin
                ? "There are no dispatches awaiting delivery confirmation."
                : "You have no dispatches awaiting delivery confirmation."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.sectionLabel}>
              {dispatches.length} Pending {dispatches.length === 1 ? "Delivery" : "Deliveries"}
            </Text>
            {dispatches.map((dispatch) => {
              const customerName = dispatch.order?.customer?.customer_name || "Unknown Customer";
              const orderCodes =
                dispatch.order_codes && dispatch.order_codes.length > 0
                  ? dispatch.order_codes
                  : dispatch.order?.order_code
                  ? [dispatch.order.order_code]
                  : dispatch.order_id
                  ? [`Order #${dispatch.order_id}`]
                  : ["—"];
              const displayCode = orderCodes.join(", ");
              const totalQty = dispatch.dispatched_quantity_ton || 0;
              const statusColor = STATUS_COLOR[dispatch.status] || "#64748b";
              const dispatchDriverName = dispatch.driver?.driver_name || `Driver #${dispatch.driver_id}`;

              return (
                <View key={dispatch.dispatch_id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderCode}>{displayCode}</Text>
                      {orderCodes.length === 1 && (
                        <Text style={styles.customerName}>{customerName}</Text>
                      )}
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                      <Text style={styles.badgeText}>{dispatch.status}</Text>
                    </View>
                  </View>

                  {isAdmin && (
                    <View style={styles.driverRow}>
                      <Text style={styles.driverLabel}>Driver: </Text>
                      <Text style={styles.driverValue}>{dispatchDriverName}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    {dispatch.truck?.truck_number ? (
                      <Text style={styles.infoText}>Truck: {dispatch.truck.truck_number}</Text>
                    ) : null}
                    <Text style={styles.infoText}>
                      Dispatched: {formatDate(dispatch.actual_dispatch_date)}
                    </Text>
                    <Text style={styles.infoText}>
                      Total: {totalQty.toFixed(2)} Tons
                    </Text>
                  </View>

                  {dispatch.items && dispatch.items.length > 0 && (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsLabel}>Items:</Text>
                      {dispatch.items.map((item, idx) => (
                        <Text key={idx} style={styles.itemText}>
                          {item.product_name || item.finished_good?.product_name || `Item ${idx + 1}`}
                          : {(item.dispatched_qty_ton || 0).toFixed(2)} t
                          {item.dispatched_bags ? ` (${item.dispatched_bags} bags)` : ""}
                        </Text>
                      ))}
                    </View>
                  )}

                  <Button
                    title="Manage Delivery"
                    onPress={() => openModal(dispatch)}
                    style={styles.uploadBtn}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Delivery Management"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedDispatch && (
            <>
              <View style={styles.dispatchSummary}>
                <Text style={styles.dispatchSummaryTitle}>
                  Dispatch #{selectedDispatch.dispatch_id}
                </Text>
                <Text style={styles.dispatchSummaryDetail}>
                  {selectedDispatch.truck?.truck_number
                    ? `Truck: ${selectedDispatch.truck.truck_number}  `
                    : ""}
                  Driver: {selectedDispatch.driver?.driver_name || "—"}
                </Text>
                <Text style={styles.dispatchSummaryDetail}>
                  {(selectedDispatch.dispatched_quantity_ton || 0).toFixed(2)} Tons
                  {selectedDispatch.dispatched_bags
                    ? ` · ${selectedDispatch.dispatched_bags} Bags`
                    : ""}
                </Text>
              </View>

              <View style={styles.dividerSection}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Customer Stops</Text>
                <View style={styles.dividerLine} />
              </View>

              {stopsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
              ) : (
                stops.map((stop, idx) =>
                  stop._pending ? (
                    <PendingStopCard
                      key={`pending-${idx}`}
                      stop={stop}
                      dispatch={selectedDispatch}
                      onCreated={refreshStops}
                    />
                  ) : (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      dispatch={selectedDispatch}
                      onRefresh={refreshStops}
                    />
                  )
                )
              )}

              <View style={styles.dividerSection}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Return Journey</Text>
                <View style={styles.dividerLine} />
              </View>

              <JourneyTimingSection
                stops={stops}
                dispatch={selectedDispatch}
                onRefresh={refreshStops}
              />

              <View style={styles.dividerSection}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Finalise</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.finaliseNote}>
                Once all stops are completed, mark the dispatch as Delivered.
              </Text>

              <Button
                title={submitting ? "Processing..." : "Mark Dispatch as Delivered"}
                onPress={handleMarkDelivered}
                style={{ marginTop: 12, marginBottom: 8 }}
                disabled={submitting}
              />
            </>
          )}
        </ScrollView>
      </Modal>
    </Layout>
  );
}

function JourneyTimingSection({ stops, dispatch, onRefresh }) {
  const [busy, setBusy] = useState(null);

  const firstRealStop = stops.find(s => !s._pending);
  if (!firstRealStop) return null;

  const recordJourneyTime = async (field) => {
    setBusy(field);
    try {
      const fd = buildFormData({ [field]: new Date().toISOString() });
      await dispatchApi.updateStopTimes(dispatch.dispatch_id, firstRealStop.id, fd);
      await onRefresh();
      showSuccess("Time recorded");
    } catch (e) {
      showError(e?.message || "Failed to record time");
    } finally {
      setBusy(null);
    }
  };

  const returnStarted = !!firstRealStop.return_journey_at;
  const factoryReturned = !!firstRealStop.factory_return_at;

  return (
    <View style={ss.journeySection}>
      {/* Return Journey Start */}
      <View style={ss.journeyRow}>
        <View style={{ flex: 1 }}>
          <Text style={ss.journeyLabel}>Return Journey Start</Text>
          {returnStarted ? (
            <Text style={ss.journeyTime}>{formatDateTime(firstRealStop.return_journey_at)}</Text>
          ) : (
            <Text style={ss.journeyMissing}>Not recorded</Text>
          )}
        </View>
        <TouchableOpacity
          style={[ss.journeyBtn, returnStarted && ss.journeyBtnDone]}
          onPress={() => recordJourneyTime("return_journey_at")}
          disabled={busy === "return_journey_at"}
        >
          {busy === "return_journey_at" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={ss.journeyBtnText}>{returnStarted ? "Update" : "Record Now"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Factory Return — only after return journey started */}
      {returnStarted && (
        <View style={ss.journeyRow}>
          <View style={{ flex: 1 }}>
            <Text style={ss.journeyLabel}>Factory Return</Text>
            {factoryReturned ? (
              <Text style={ss.journeyTime}>{formatDateTime(firstRealStop.factory_return_at)}</Text>
            ) : (
              <Text style={ss.journeyMissing}>Not recorded</Text>
            )}
          </View>
          <TouchableOpacity
            style={[ss.journeyBtn, { backgroundColor: "#27ae60" }, factoryReturned && ss.journeyBtnDone]}
            onPress={() => recordJourneyTime("factory_return_at")}
            disabled={busy === "factory_return_at"}
          >
            {busy === "factory_return_at" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={ss.journeyBtnText}>{factoryReturned ? "Update" : "Record Now"}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PendingStopCard({ stop, dispatch, onCreated }) {
  const [busy, setBusy] = useState(false);

  const initStop = async () => {
    setBusy(true);
    try {
      const fd = buildFormData({
        order_id: stop.order_id,
      });
      await dispatchApi.createOrUpdateStop(dispatch.dispatch_id, fd);
      await onCreated();
    } catch (e) {
      showError(e?.message || "Failed to initialise stop");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    initStop();
  }, []);

  return (
    <View style={ss.stopCard}>
      <Text style={ss.stopCustomer}>{stop.customer_name || "Customer"}</Text>
      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
      <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Initialising stop...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", maxWidth: 340 },
  adminBadge: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  adminBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
    marginTop: 8,
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 30,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  emptyIcon: { fontSize: 40, color: "#10b981", marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#064e3b", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#065f46", textAlign: "center" },
  list: { marginTop: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderCode: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  customerName: { fontSize: 13, color: "#475569", marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  driverRow: { flexDirection: "row", marginBottom: 4 },
  driverLabel: { fontSize: 13, color: "#64748b" },
  driverValue: { fontSize: 13, fontWeight: "600", color: "#1e293b" },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  infoText: { fontSize: 12, color: "#64748b" },
  itemsBox: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 10 },
  itemsLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 4 },
  itemText: { fontSize: 12, color: "#64748b", marginBottom: 2 },
  uploadBtn: { marginTop: 4 },
  dispatchSummary: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dispatchSummaryTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  dispatchSummaryDetail: { fontSize: 13, color: "#475569", marginTop: 2 },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  finaliseNote: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
  },
});

const ss = StyleSheet.create({
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stopCustomer: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  stopOrderId: { fontSize: 12, color: "#64748b" },
  timingGrid: { gap: 8, marginBottom: 12 },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
  },
  timingLabel: { fontSize: 12, fontWeight: "600", color: "#475569" },
  timingValue: { fontSize: 12, color: "#10b981", marginTop: 2 },
  timingMissing: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  timeBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  timeBtnDone: { backgroundColor: "#10b981" },
  timeBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#475569" },
  photoActions: { flexDirection: "row", gap: 6 },
  smallBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 64,
    alignItems: "center",
  },
  smallBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  photoScroll: { marginBottom: 12 },
  thumbImg: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  sigRow: { flexDirection: "row", gap: 10 },
  sigBlock: { flex: 1, alignItems: "center" },
  sigLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    textAlign: "center",
  },
  sigImg: {
    width: "100%",
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  sigPlaceholder: {
    width: "100%",
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sigPlaceholderText: { fontSize: 11, color: "#94a3b8" },
  sigBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    width: "100%",
  },
  sigBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  journeySection: { marginBottom: 8 },
  journeyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  journeyLabel: { fontSize: 13, fontWeight: "700", color: "#065f46" },
  journeyTime: { fontSize: 12, color: "#059669", marginTop: 3 },
  journeyMissing: { fontSize: 12, color: "#94a3b8", marginTop: 3 },
  journeyBtn: {
    backgroundColor: "#16a085",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  journeyBtnDone: { backgroundColor: "#10b981" },
  journeyBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
