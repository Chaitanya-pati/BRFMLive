import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, useWindowDimensions, Platform,
} from 'react-native';
import Layout from '../components/Layout';
import SelectDropdown from '../components/SelectDropdown';
import { deliveryBillApi, dispatchApi } from '../api/client';
import { showConfirm, showSuccess, showError } from '../utils/customAlerts';
import colors from '../theme/colors';
import { formatISTDate } from '../utils/dateUtils';

const STATUS_COLORS = {
  PENDING:  { bg: '#fef3c7', text: '#92400e' },
  PARTIAL:  { bg: '#dbeafe', text: '#1e40af' },
  PAID:     { bg: '#dcfce7', text: '#15803d' },
};

function AmountWords(amount) {
  if (!amount || isNaN(amount)) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = convert(rupees) + ' Rupees';
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
  return words + ' Only';
}

export default function DeliveryBillsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const filterDispatchId = route?.params?.dispatch_id || null;

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewBill, setPreviewBill] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDispatchId) params.dispatch_id = filterDispatchId;
      const res = await deliveryBillApi.getAll(params);
      setBills(res.data || []);
    } catch (e) {
      showError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [filterDispatchId]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleUpdateStatus = async (billId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await deliveryBillApi.updatePaymentStatus(billId, newStatus);
      setPreviewBill(res.data);
      await loadBills();
      showSuccess('Payment status updated');
    } catch {
      showError('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (bill) => {
    const ok = await showConfirm('Delete Bill', `Delete invoice ${bill.invoice_number}?`);
    if (!ok) return;
    try {
      await deliveryBillApi.delete(bill.id);
      showSuccess('Bill deleted');
      loadBills();
      if (previewBill?.id === bill.id) setPreviewBill(null);
    } catch {
      showError('Failed to delete bill');
    }
  };

  const cols = isMobile
    ? ['Invoice No.', 'Customer', 'Amount', 'Status']
    : ['Invoice No.', 'Dispatch', 'Customer', 'Date', 'Taxable', 'Tax', 'Total', 'Status'];

  return (
    <Layout title="Delivery Bills" navigation={navigation} currentRoute="DeliveryBills">
      {filterDispatchId && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>Showing bills for Dispatch #{filterDispatchId}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ dispatch_id: null })}>
            <Text style={styles.filterClear}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : bills.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Bills Found</Text>
          <Text style={styles.emptyNote}>Bills are automatically created when a dispatch is saved.</Text>
        </View>
      ) : (
        <ScrollView style={styles.tableWrap} horizontal>
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.row, styles.headerRow]}>
              {cols.map(c => (
                <Text key={c} style={[styles.cell, styles.headerCell, colWidth(c, isMobile)]}>{c}</Text>
              ))}
              <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Actions</Text>
            </View>

            {bills.map(bill => {
              const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;
              const customerName = bill.order?.customer?.customer_name || bill.destination || '—';
              return (
                <View key={bill.id} style={[styles.row, styles.dataRow]}>
                  {!isMobile && (
                    <Text style={[styles.cell, colWidth('Invoice No.', isMobile), styles.invoiceCell]}>
                      {bill.invoice_number}
                    </Text>
                  )}
                  {isMobile && (
                    <Text style={[styles.cell, colWidth('Invoice No.', isMobile), styles.invoiceCell]}>
                      {bill.invoice_number}
                    </Text>
                  )}
                  {!isMobile && (
                    <Text style={[styles.cell, colWidth('Dispatch', isMobile)]}>#{bill.dispatch_id}</Text>
                  )}
                  <Text style={[styles.cell, colWidth('Customer', isMobile)]} numberOfLines={1}>{customerName}</Text>
                  {!isMobile && (
                    <Text style={[styles.cell, colWidth('Date', isMobile)]}>
                      {formatISTDate(bill.invoice_date)}
                    </Text>
                  )}
                  {!isMobile && (
                    <Text style={[styles.cell, colWidth('Taxable', isMobile)]}>
                      ₹{(bill.taxable_value || 0).toFixed(2)}
                    </Text>
                  )}
                  {!isMobile && (
                    <Text style={[styles.cell, colWidth('Tax', isMobile)]}>
                      ₹{(bill.total_tax_amount || 0).toFixed(2)}
                    </Text>
                  )}
                  <Text style={[styles.cell, colWidth('Amount', isMobile), styles.amountCell]}>
                    ₹{(bill.total_amount || 0).toFixed(2)}
                  </Text>
                  <View style={[styles.cell, colWidth('Status', isMobile)]}>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{bill.payment_status}</Text>
                    </View>
                  </View>
                  <View style={[styles.cell, { width: 100, flexDirection: 'row', gap: 6 }]}>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => setPreviewBill(bill)}>
                      <Text style={styles.viewBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Bill Preview Modal */}
      <Modal
        visible={!!previewBill}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewBill(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={[styles.previewPanel, isMobile && styles.previewPanelMobile]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {previewBill && <BillPreview
                bill={previewBill}
                onClose={() => setPreviewBill(null)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
                updatingStatus={updatingStatus}
              />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

function BillPreview({ bill, onClose, onUpdateStatus, onDelete, updatingStatus }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;
  const customerName = bill.order?.customer?.customer_name || bill.destination || '—';
  const customerGST = bill.order?.customer?.gst_number || '—';
  const customerAddr = [
    bill.order?.customer?.address,
    bill.order?.customer?.city,
    bill.order?.customer?.state,
    bill.order?.customer?.pin_code,
  ].filter(Boolean).join(', ') || '—';

  return (
    <View style={previewStyles.container}>
      {/* Header bar */}
      <View style={previewStyles.header}>
        <Text style={previewStyles.headerTitle}>Tax Invoice</Text>
        <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn}>
          <Text style={previewStyles.closeBtnText}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {/* Invoice title block */}
      <View style={previewStyles.invoiceTitle}>
        <Text style={previewStyles.invoiceNo}>{bill.invoice_number}</Text>
        <View style={[previewStyles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[previewStyles.statusBadgeText, { color: sc.text }]}>{bill.payment_status}</Text>
        </View>
      </View>

      {/* Two-col: Bill To + Bill Info */}
      <View style={[previewStyles.twoCol, isMobile && previewStyles.twoColMobile]}>
        <View style={previewStyles.colBox}>
          <Text style={previewStyles.colLabel}>Bill To</Text>
          <Text style={previewStyles.colValue}>{customerName}</Text>
          <Text style={previewStyles.colSub}>{customerAddr}</Text>
          <Text style={previewStyles.colSub}>GSTIN: {customerGST}</Text>
        </View>
        <View style={previewStyles.colBox}>
          <Text style={previewStyles.colLabel}>Invoice Details</Text>
          <InfoRow label="Date" value={formatISTDate(bill.invoice_date)} />
          <InfoRow label="Dispatch #" value={bill.dispatch_id} />
          {bill.destination && <InfoRow label="Destination" value={bill.destination} />}
          {bill.terms_of_delivery && <InfoRow label="Terms" value={bill.terms_of_delivery} />}
          {bill.lr_rr_no && <InfoRow label="LR/RR No." value={bill.lr_rr_no} />}
        </View>
      </View>

      {/* Items table */}
      <View style={previewStyles.section}>
        <Text style={previewStyles.sectionTitle}>Items</Text>
        <View style={previewStyles.itemsTable}>
          <View style={[previewStyles.itemRow, previewStyles.itemHeader]}>
            <Text style={[previewStyles.itemCell, { flex: 2 }]}>Product</Text>
            <Text style={previewStyles.itemCell}>HSN</Text>
            <Text style={previewStyles.itemCell}>Bags</Text>
            <Text style={previewStyles.itemCell}>Tons</Text>
            <Text style={previewStyles.itemCell}>Rate</Text>
            <Text style={[previewStyles.itemCell, previewStyles.rightAlign]}>Amount</Text>
          </View>
          {(bill.items || []).map((item, i) => (
            <View key={i} style={previewStyles.itemRow}>
              <Text style={[previewStyles.itemCell, { flex: 2 }]}>{item.product_name}</Text>
              <Text style={previewStyles.itemCell}>{item.hsn_sac_code || '—'}</Text>
              <Text style={previewStyles.itemCell}>{item.quantity_bags || 0}</Text>
              <Text style={previewStyles.itemCell}>{(item.quantity_ton || 0).toFixed(3)}</Text>
              <Text style={previewStyles.itemCell}>
                {item.quantity_bags > 0
                  ? `₹${(item.rate_per_bag || 0).toFixed(2)}/bag`
                  : `₹${(item.rate_per_ton || 0).toFixed(2)}/t`}
              </Text>
              <Text style={[previewStyles.itemCell, previewStyles.rightAlign]}>
                ₹{(item.amount || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tax breakdown */}
      <View style={previewStyles.taxBlock}>
        <TaxRow label="Taxable Value" value={bill.taxable_value} />
        {bill.cgst_percent > 0 && (
          <TaxRow label={`CGST @ ${bill.cgst_percent}%`} value={bill.cgst_amount} />
        )}
        {bill.sgst_percent > 0 && (
          <TaxRow label={`SGST @ ${bill.sgst_percent}%`} value={bill.sgst_amount} />
        )}
        {bill.igst_percent > 0 && (
          <TaxRow label={`IGST @ ${bill.igst_percent}%`} value={bill.igst_amount} />
        )}
        <View style={previewStyles.totalRow}>
          <Text style={previewStyles.totalLabel}>Total Amount</Text>
          <Text style={previewStyles.totalValue}>₹{(bill.total_amount || 0).toFixed(2)}</Text>
        </View>
      </View>

      {/* Amount in words */}
      <View style={previewStyles.wordsBox}>
        <Text style={previewStyles.wordsLabel}>Amount in Words:</Text>
        <Text style={previewStyles.wordsValue}>{AmountWords(bill.total_amount)}</Text>
      </View>

      {/* Update payment status */}
      <View style={previewStyles.statusSection}>
        <Text style={previewStyles.statusSectionLabel}>Update Payment Status</Text>
        <View style={previewStyles.statusBtns}>
          {['PENDING', 'PARTIAL', 'PAID'].map(s => (
            <TouchableOpacity
              key={s}
              style={[
                previewStyles.statusBtn,
                bill.payment_status === s && previewStyles.statusBtnActive,
              ]}
              onPress={() => onUpdateStatus(bill.id, s)}
              disabled={updatingStatus || bill.payment_status === s}
            >
              {updatingStatus && bill.payment_status !== s ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[
                  previewStyles.statusBtnText,
                  bill.payment_status === s && previewStyles.statusBtnTextActive,
                ]}>{s}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer actions */}
      <View style={previewStyles.footerActions}>
        <TouchableOpacity style={previewStyles.deleteBtn} onPress={() => onDelete(bill)}>
          <Text style={previewStyles.deleteBtnText}>Delete Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={previewStyles.doneBtn} onPress={onClose}>
          <Text style={previewStyles.doneBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 3 }}>
      <Text style={{ fontSize: 12, color: '#6b7280', width: 80 }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: '#111827', flex: 1, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function TaxRow({ label, value }) {
  return (
    <View style={previewStyles.taxRow}>
      <Text style={previewStyles.taxLabel}>{label}</Text>
      <Text style={previewStyles.taxValue}>₹{(value || 0).toFixed(2)}</Text>
    </View>
  );
}

function colWidth(col, isMobile) {
  const map = {
    'Invoice No.': { width: isMobile ? 160 : 180 },
    'Dispatch': { width: 80 },
    'Customer': { width: isMobile ? 130 : 180 },
    'Date': { width: 110 },
    'Taxable': { width: 110 },
    'Tax': { width: 100 },
    'Total': { width: 110 },
    'Amount': { width: 110 },
    'Status': { width: 110 },
  };
  return map[col] || { width: 100 };
}

const styles = StyleSheet.create({
  filterBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  filterText: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  filterClear: { fontSize: 13, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyNote: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  tableWrap: { flex: 1 },
  table: { minWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  headerRow: { backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  dataRow: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 4 },
  cell: { paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 },
  headerCell: { fontWeight: '700', color: '#374151', fontSize: 12 },
  invoiceCell: { color: colors.primary, fontWeight: '600' },
  amountCell: { fontWeight: '700', color: '#111827' },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  viewBtn: {
    backgroundColor: colors.primary, borderRadius: 5,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  previewPanel: {
    backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 680,
    maxHeight: '92%',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' },
      default: { elevation: 12 },
    }),
  },
  previewPanelMobile: { maxWidth: '100%' },
});

const previewStyles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  invoiceTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  invoiceNo: { fontSize: 15, fontWeight: '700', color: colors.primary },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  twoColMobile: { flexDirection: 'column' },
  colBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  colLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  colValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  colSub: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  itemsTable: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemHeader: { backgroundColor: '#f8fafc' },
  itemCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12 },
  rightAlign: { textAlign: 'right' },
  taxBlock: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  taxLabel: { fontSize: 13, color: '#374151' },
  taxValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#374151', marginTop: 8, paddingTop: 8 },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 14, fontWeight: '800', color: colors.primary },
  wordsBox: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a' },
  wordsLabel: { fontSize: 11, color: '#92400e', fontWeight: '700', marginBottom: 3 },
  wordsValue: { fontSize: 12, color: '#78350f', fontStyle: 'italic' },
  statusSection: { marginBottom: 16 },
  statusSectionLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  statusBtns: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  statusBtnTextActive: { color: '#fff' },
  footerActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  deleteBtn: { flex: 1, paddingVertical: 11, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  doneBtn: { flex: 2, paddingVertical: 11, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
