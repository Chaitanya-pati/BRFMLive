import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Modal from "../components/Modal";
import DatePicker from "../components/DatePicker";
import colors from "../theme/colors";
import { dispatchApi } from "../api/client";
import { showError, showSuccess } from "../utils/customAlerts";
import { API_BASE_URL } from "../api/client";
import { storage } from "../utils/storage";

const STATUS_COLOR = {
  DISPATCHED: "#f59e0b",
  PARTIAL: "#3b82f6",
  DELIVERED: "#10b981",
  CANCELLED: "#ef4444",
};

const STATUS_BG = {
  DISPATCHED: "#fffbeb",
  PARTIAL: "#eff6ff",
  DELIVERED: "#f0fdf4",
  CANCELLED: "#fef2f2",
};

export default function DriverDeliveryScreen({ navigation, route }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [proofPhoto, setProofPhoto] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date());
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
        const userDriverId = userData.driver_id
          ? userData.driver_id.toString()
          : null;
        const driverName = (userData.full_name || userData.username || "")
          .toLowerCase()
          .trim();

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

  const openModal = (dispatch) => {
    setSelectedDispatch(dispatch);
    setProofPhoto(null);
    setDeliveryDate(new Date());
    setModalVisible(true);
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) setProofPhoto(result.assets[0]);
    } catch {
      showError("Failed to pick image");
    }
  };

  const capturePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) setProofPhoto(result.assets[0]);
    } catch {
      showError("Failed to capture photo");
    }
  };

  const handleSubmit = async () => {
    if (!proofPhoto) {
      showError("Please select or capture a delivery photo first");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();

      if (proofPhoto.uri.startsWith("data:") || proofPhoto.uri.startsWith("blob:")) {
        const fetchResponse = await fetch(proofPhoto.uri);
        const blob = await fetchResponse.blob();
        form.append("driver_photo", blob, "delivery_proof.jpg");
      } else {
        form.append("driver_photo", {
          uri: proofPhoto.uri,
          type: proofPhoto.mimeType || "image/jpeg",
          name: "delivery_proof.jpg",
        });
      }

      form.append("delivery_date", deliveryDate.toISOString());
      await dispatchApi.uploadDeliveryProof(selectedDispatch.dispatch_id, form);
      showSuccess("Delivery proof uploaded. Status updated automatically.");
      setModalVisible(false);
      loadUserAndDispatches();
    } catch (e) {
      console.error("Upload error:", e);
      showError(e?.message || "Failed to upload delivery proof");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
                ? `Showing deliveries assigned to: ${driverName}`
                : "Showing your assigned deliveries"}
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
                ? "There are no dispatches awaiting proof upload."
                : "You have no dispatches awaiting proof upload."}
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
                      <Text style={styles.driverLabel}>🚚 Driver: </Text>
                      <Text style={styles.driverValue}>{dispatchDriverName}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    {dispatch.city ? (
                      <Text style={styles.infoText}>
                        📍 {dispatch.city}{dispatch.state ? `, ${dispatch.state}` : ""}
                      </Text>
                    ) : null}
                    <Text style={styles.infoText}>
                      📅 Dispatched: {formatDate(dispatch.actual_dispatch_date)}
                    </Text>
                    <Text style={styles.infoText}>
                      ⚖️ Total: {totalQty.toFixed(2)} Tons
                    </Text>
                  </View>

                  {dispatch.items && dispatch.items.length > 0 && (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsLabel}>Items:</Text>
                      {dispatch.items.map((item, idx) => (
                        <Text key={idx} style={styles.itemText}>
                          • {item.product_name || item.finished_good?.product_name || `Item ${idx + 1}`}
                          : {(item.dispatched_qty_ton || 0).toFixed(2)} t
                          {item.dispatched_bags ? ` (${item.dispatched_bags} bags)` : ""}
                        </Text>
                      ))}
                    </View>
                  )}

                  <Button
                    title="Upload Delivery Proof"
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
        title="Upload Delivery Proof"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedDispatch && (
            <>
              {/* ── Customer Order Details ── */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionIcon}>🧾</Text>
                  <Text style={styles.detailSectionTitle}>Customer Orders</Text>
                </View>

                {(() => {
                  const modalOrderCodes =
                    selectedDispatch.order_codes && selectedDispatch.order_codes.length > 0
                      ? selectedDispatch.order_codes
                      : selectedDispatch.order?.order_code
                      ? [selectedDispatch.order.order_code]
                      : [];

                  if (modalOrderCodes.length > 1) {
                    // Multi-order dispatch
                    return (
                      <View style={styles.detailCard}>
                        <View style={{ padding: 12 }}>
                          <Text style={styles.detailLabel}>Orders in this dispatch</Text>
                          {modalOrderCodes.map((code, idx) => (
                            <Text key={idx} style={[styles.detailValue, { marginTop: 4 }]}>
                              • {code}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  }

                  // Single order (legacy or first-order)
                  return (
                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailFlex}>
                          <Text style={styles.detailLabel}>Order Code</Text>
                          <Text style={styles.detailValue}>
                            {modalOrderCodes[0] || `#${selectedDispatch.order_id}` || "—"}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusPill,
                          {
                            backgroundColor: STATUS_BG[selectedDispatch.order?.order_status] || "#f1f5f9",
                            borderColor: STATUS_COLOR[selectedDispatch.order?.order_status] || "#94a3b8",
                          }
                        ]}>
                          <Text style={[
                            styles.statusPillText,
                            { color: STATUS_COLOR[selectedDispatch.order?.order_status] || "#64748b" }
                          ]}>
                            {selectedDispatch.order?.order_status || "—"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.detailGrid}>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>Customer</Text>
                          <Text style={styles.detailValue}>
                            {selectedDispatch.order?.customer?.customer_name || "—"}
                          </Text>
                        </View>
                        <View style={styles.detailCell}>
                          <Text style={styles.detailLabel}>Order Date</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(selectedDispatch.order?.order_date)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* ── Dispatch Details ── */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionIcon}>🚛</Text>
                  <Text style={styles.detailSectionTitle}>Dispatch Details</Text>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Dispatch ID</Text>
                      <Text style={styles.detailValue}>#{selectedDispatch.dispatch_id}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Dispatch Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedDispatch.actual_dispatch_date)}
                      </Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Driver</Text>
                      <Text style={styles.detailValue}>
                        {selectedDispatch.driver?.driver_name || `#${selectedDispatch.driver_id}`}
                      </Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Destination</Text>
                      <Text style={styles.detailValue}>
                        {[selectedDispatch.city, selectedDispatch.state].filter(Boolean).join(", ") || "—"}
                      </Text>
                    </View>
                    {selectedDispatch.warehouse_loader ? (
                      <View style={styles.detailCell}>
                        <Text style={styles.detailLabel}>Warehouse Loader</Text>
                        <Text style={styles.detailValue}>{selectedDispatch.warehouse_loader}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Total Quantity</Text>
                      <Text style={[styles.detailValue, styles.detailValueBold]}>
                        {(selectedDispatch.dispatched_quantity_ton || 0).toFixed(2)} Tons
                      </Text>
                    </View>
                    {selectedDispatch.dispatched_bags ? (
                      <View style={styles.detailCell}>
                        <Text style={styles.detailLabel}>Total Bags</Text>
                        <Text style={[styles.detailValue, styles.detailValueBold]}>
                          {selectedDispatch.dispatched_bags}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* ── Items Dispatched ── */}
              {selectedDispatch.items && selectedDispatch.items.length > 0 && (
                <View style={styles.detailSection}>
                  <View style={styles.detailSectionHeader}>
                    <Text style={styles.detailSectionIcon}>📦</Text>
                    <Text style={styles.detailSectionTitle}>Items Dispatched</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>Product</Text>
                      <Text style={[styles.tableCell, styles.tableCellRight]}>Qty (Ton)</Text>
                      <Text style={[styles.tableCell, styles.tableCellRight]}>Bags</Text>
                    </View>
                    {selectedDispatch.items.map((item, idx) => (
                      <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : null]}>
                        <Text style={[styles.tableBodyCell, { flex: 2 }]} numberOfLines={2}>
                          {item.product_name || item.finished_good?.product_name || `Item ${idx + 1}`}
                        </Text>
                        <Text style={[styles.tableBodyCell, styles.tableCellRight]}>
                          {(item.dispatched_qty_ton || 0).toFixed(2)}
                        </Text>
                        <Text style={[styles.tableBodyCell, styles.tableCellRight]}>
                          {item.dispatched_bags || "—"}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.tableTotalRow}>
                      <Text style={[styles.tableTotalCell, { flex: 2 }]}>Total</Text>
                      <Text style={[styles.tableTotalCell, styles.tableCellRight]}>
                        {(selectedDispatch.dispatched_quantity_ton || 0).toFixed(2)}
                      </Text>
                      <Text style={[styles.tableTotalCell, styles.tableCellRight]}>
                        {selectedDispatch.dispatched_bags || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ── Remarks ── */}
              {selectedDispatch.remarks ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.remarksLabel}>Remarks</Text>
                  <Text style={styles.remarksText}>{selectedDispatch.remarks}</Text>
                </View>
              ) : null}

              {/* ── Divider before upload ── */}
              <View style={styles.uploadDivider}>
                <View style={styles.uploadDividerLine} />
                <Text style={styles.uploadDividerText}>Delivery Confirmation</Text>
                <View style={styles.uploadDividerLine} />
              </View>
            </>
          )}

          {/* ── Photo Upload ── */}
          <Text style={styles.photoLabel}>Delivery Photo *</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={capturePhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>

          {proofPhoto ? (
            <Image source={{ uri: proofPhoto.uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.placeholderText}>No photo selected</Text>
            </View>
          )}

          <DatePicker label="Delivery Date" value={deliveryDate} onChange={setDeliveryDate} />

          <Text style={styles.autoStatusNote}>
            ℹ️ Order status will be updated automatically based on delivered vs ordered quantities
          </Text>

          <Button
            title={submitting ? "Submitting..." : "Submit Delivery Proof"}
            onPress={handleSubmit}
            style={{ marginTop: 16, marginBottom: 8 }}
            disabled={submitting}
          />
        </ScrollView>
      </Modal>
    </Layout>
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
  orderCode: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  customerName: { fontSize: 13, color: "#475569", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  driverLabel: { fontSize: 13, color: "#475569", fontWeight: "600" },
  driverValue: { fontSize: 13, color: "#0f172a", fontWeight: "700" },
  infoRow: { marginBottom: 10, gap: 3 },
  infoText: { fontSize: 13, color: "#64748b" },
  itemsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemsLabel: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 4 },
  itemText: { fontSize: 13, color: "#475569", marginBottom: 2 },
  uploadBtn: { marginTop: 4 },

  // ── Modal detail sections ──
  detailSection: { marginBottom: 14 },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailSectionIcon: { fontSize: 15, marginRight: 6 },
  detailSectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", letterSpacing: 0.2 },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  detailFlex: { flex: 1 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  detailCell: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  detailValue: { fontSize: 13, color: "#1e293b", fontWeight: "500" },
  detailValueBold: { fontWeight: "700", color: colors.primary },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 12 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  // ── Items table ──
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableCell: { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 },
  tableCellRight: { flex: 1, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowEven: { backgroundColor: "#fafafa" },
  tableBodyCell: { fontSize: 13, color: "#334155" },
  tableTotalRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderTopColor: "#bae6fd",
  },
  tableTotalCell: { fontSize: 13, fontWeight: "700", color: "#0369a1" },

  // ── Remarks ──
  remarksBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  remarksLabel: { fontSize: 11, fontWeight: "700", color: "#92400e", textTransform: "uppercase", marginBottom: 4 },
  remarksText: { fontSize: 13, color: "#78350f" },

  // ── Upload divider ──
  uploadDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  uploadDividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  uploadDividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginHorizontal: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Photo upload ──
  photoLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 10 },
  photoButtons: { flexDirection: "row", gap: 12, marginBottom: 16 },
  photoBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
  },
  photoBtnIcon: { fontSize: 24, marginBottom: 4 },
  photoBtnText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  preview: { width: "100%", height: 200, borderRadius: 10, marginBottom: 16 },
  photoPlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  placeholderText: { fontSize: 14, color: "#94a3b8" },
  autoStatusNote: {
    fontSize: 12,
    color: "#64748b",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
});
