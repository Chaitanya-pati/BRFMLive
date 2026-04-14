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

// Company info — edit these to match your mill's details
const COMPANY_INFO = {
  name: 'Your Mill Name (P) Ltd',
  address: 'Industrial Area, Plot No. XX',
  city: 'Your City',
  state: 'Your State',
  stateCode: '00',
  cin: 'U00000XX0000PTC000000',
  gstin: 'XXXXXXXXXXXXXXXXX',
  pan: 'XXXXXXXXXX',
  jurisdiction: 'YOUR CITY',
};

function BillPreview({ bill, onClose, onUpdateStatus, onDelete, updatingStatus }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;

  const cust = bill.order?.customer || {};
  const customerName = cust.customer_name || bill.destination || '—';
  const customerGSTIN = cust.gst_number || '—';
  const customerState = cust.state || '—';
  const customerAddr = [cust.address, cust.city, cust.state, cust.pin_code]
    .filter(Boolean).join(', ') || '—';

  const vehicleNo = bill.dispatch?.truck?.truck_number || '—';
  const driverName = bill.dispatch?.driver?.driver_name || '—';
  const buyerOrderNo = bill.order?.order_code || '—';

  const totalBags = (bill.items || []).reduce((s, it) => s + (it.quantity_bags || 0), 0);

  // Build HSN summary: group by HSN code
  const hsnMap = {};
  (bill.items || []).forEach(it => {
    const key = it.hsn_sac_code || 'N/A';
    hsnMap[key] = (hsnMap[key] || 0) + (it.amount || 0);
  });

  const hasTax = (bill.total_tax_amount || 0) > 0;
  const taxWords = hasTax ? AmountWords(bill.total_tax_amount) : 'NIL';

  return (
    <View style={inv.outer}>
      {/* ── Toolbar (outside invoice border) ── */}
      <View style={inv.toolbar}>
        <View style={[inv.statusPill, { backgroundColor: sc.bg }]}>
          <Text style={[inv.statusPillText, { color: sc.text }]}>{bill.payment_status}</Text>
        </View>
        <View style={inv.toolbarRight}>
          <Text style={inv.toolbarInvoiceNo}>{bill.invoice_number}</Text>
          <TouchableOpacity onPress={onClose} style={inv.closeBtn}>
            <Text style={inv.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ INVOICE BODY (bordered) ══ */}
      <View style={inv.body}>

        {/* ── Row 1: Company | Heading | Invoice No./Date ── */}
        <View style={[inv.row, { minHeight: 110 }]}>
          {/* Left: Seller info */}
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000' }]}>
            <Text style={inv.companyName}>{COMPANY_INFO.name}</Text>
            <Text style={inv.companyLine}>{COMPANY_INFO.address}</Text>
            <Text style={inv.companyLine}>{COMPANY_INFO.city}</Text>
            <Text style={inv.companyLine}>{COMPANY_INFO.state}</Text>
            <Text style={inv.companyLine}>CIN: {COMPANY_INFO.cin}</Text>
            <Text style={inv.companyLine}>GSTIN/UIN: {COMPANY_INFO.gstin}</Text>
            <Text style={inv.companyLine}>State Name : {COMPANY_INFO.state},  Code : {COMPANY_INFO.stateCode}</Text>
          </View>

          {/* Center: Tax Invoice heading */}
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={inv.invoiceHeading}>Tax Invoice</Text>
            <Text style={inv.originalTag}>(ORIGINAL FOR RECIPIENT)</Text>
          </View>

          {/* Right: Invoice No. + Date */}
          <View style={[inv.col, { flex: 2 }]}>
            <View style={inv.metaRow}>
              <Text style={inv.metaLabel}>Invoice No.</Text>
              <Text style={[inv.metaLabel, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>Dated</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaValue}>{bill.invoice_number}</Text>
              <Text style={[inv.metaValue, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>{formatISTDate(bill.invoice_date)}</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaLabel}>Delivery Note</Text>
              <Text style={[inv.metaLabel, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>Mode/Terms of Payment</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaValue}>{bill.delivery_note_no || ''}</Text>
              <Text style={[inv.metaValue, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>{bill.terms_of_delivery || ''}</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaLabel}>Reference No. &amp; Date.</Text>
              <Text style={[inv.metaLabel, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>Other References</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaValue}>{bill.reference_no || ''}</Text>
              <Text style={[inv.metaValue, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>{bill.other_references || ''}</Text>
            </View>
          </View>
        </View>

        {/* ── Row 2: Buyer's Order No. / Dispatch Doc No. / Dispatched through / LR-RR ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', minHeight: 60 }]}>
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000' }]}>
            <Text style={inv.fieldLabel}>Consignee (Ship to)</Text>
          </View>
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000' }]}>
            <View style={inv.metaRow}>
              <Text style={inv.metaLabel}>Buyer's Order No.</Text>
              <Text style={[inv.metaLabel, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>Dated</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaValue}>{buyerOrderNo}</Text>
              <Text style={[inv.metaValue, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>{formatISTDate(bill.invoice_date)}</Text>
            </View>
          </View>
          <View style={[inv.col, { flex: 2 }]}>
            <View style={inv.metaRow}>
              <Text style={inv.metaLabel}>Dispatch Doc No.</Text>
              <Text style={[inv.metaLabel, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>Delivery Note Date</Text>
            </View>
            <View style={[inv.metaRow, { borderTopWidth: 1, borderTopColor: '#000' }]}>
              <Text style={inv.metaValue}>{bill.dispatch_id}</Text>
              <Text style={[inv.metaValue, { borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 6 }]}>{bill.delivery_note_date ? formatISTDate(bill.delivery_note_date) : ''}</Text>
            </View>
          </View>
        </View>

        {/* ── Row 3: Consignee address | Dispatched through + Destination ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', minHeight: 80 }]}>
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000' }]}>
            <Text style={inv.custName}>{customerName}</Text>
            <Text style={inv.custLine}>{customerAddr}</Text>
            <Text style={inv.custLine}>GSTIN/UIN     : {customerGSTIN}</Text>
            <Text style={inv.custLine}>State Name     : {customerState}</Text>
          </View>
          <View style={[inv.col, { flex: 4 }]}>
            <View style={[inv.metaRow, { flex: 1 }]}>
              <View style={[inv.col, { flex: 1, borderRightWidth: 1, borderRightColor: '#000' }]}>
                <Text style={inv.metaLabel}>Dispatched through</Text>
                <Text style={inv.metaValue}>{driverName}</Text>
              </View>
              <View style={[inv.col, { flex: 1 }]}>
                <Text style={inv.metaLabel}>Destination</Text>
                <Text style={inv.metaValue}>{bill.destination || '—'}</Text>
              </View>
            </View>
            <View style={[inv.metaRow, { flex: 1, borderTopWidth: 1, borderTopColor: '#000' }]}>
              <View style={[inv.col, { flex: 1, borderRightWidth: 1, borderRightColor: '#000' }]}>
                <Text style={inv.metaLabel}>Bill of Lading/LR-RR No.</Text>
                <Text style={inv.metaValue}>{bill.lr_rr_no || ''}</Text>
              </View>
              <View style={[inv.col, { flex: 1 }]}>
                <Text style={inv.metaLabel}>Motor Vehicle No.</Text>
                <Text style={[inv.metaValue, { fontWeight: '700' }]}>{vehicleNo}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Row 4: Buyer (Bill to) | Terms of Delivery ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', minHeight: 80 }]}>
          <View style={[inv.col, { flex: 2, borderRightWidth: 1, borderRightColor: '#000' }]}>
            <Text style={inv.fieldLabel}>Buyer (Bill to)</Text>
            <Text style={inv.custName}>{customerName}</Text>
            <Text style={inv.custLine}>{customerAddr}</Text>
            <Text style={inv.custLine}>GSTIN/UIN     : {customerGSTIN}</Text>
            <Text style={inv.custLine}>State Name     : {customerState}</Text>
          </View>
          <View style={[inv.col, { flex: 4 }]}>
            <Text style={inv.metaLabel}>Terms of Delivery</Text>
            <Text style={inv.metaValue}>{bill.terms_of_delivery || ''}</Text>
          </View>
        </View>

        {/* ── Items Table Header ── */}
        <View style={[inv.row, inv.tableHeader, { borderTopWidth: 1, borderTopColor: '#000' }]}>
          <Text style={[inv.thCell, { flex: 3 }]}>Description of Goods</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 1.2 }]}>HSN/SAC</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 1.5 }]}>Quantity</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>Rate</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 0.8 }]}>per</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8 }]}>Amount</Text>
        </View>

        {/* ── Item Rows ── */}
        {(bill.items || []).map((item, i) => {
          const isBag = (item.quantity_bags || 0) > 0;
          return (
            <View key={i} style={[inv.row, inv.itemRow]}>
              <View style={[inv.col, { flex: 3 }]}>
                <Text style={inv.itemName}>{item.product_name}</Text>
              </View>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1.2 }]}>{item.hsn_sac_code || ''}</Text>
              <View style={[inv.col, inv.thBorder, { flex: 1.5 }]}>
                {isBag
                  ? <Text style={[inv.tdCell, { fontWeight: '700' }]}>{item.quantity_bags} Bags</Text>
                  : null}
                <Text style={[inv.tdCell, { color: '#555' }]}>({(item.quantity_ton || 0).toFixed(3)} kgs)</Text>
              </View>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>
                {isBag
                  ? (item.rate_per_bag || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                  : (item.rate_per_ton || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 0.8 }]}>{isBag ? 'Bags' : 'Tons'}</Text>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8, fontWeight: '600' }]}>
                {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          );
        })}

        {/* ── Empty rows to fill space ── */}
        {[...Array(Math.max(0, 4 - (bill.items || []).length))].map((_, i) => (
          <View key={`empty-${i}`} style={[inv.row, inv.itemRow, { minHeight: 22 }]}>
            <View style={[inv.col, { flex: 3 }]} /><View style={[inv.col, inv.thBorder, { flex: 1.2 }]} />
            <View style={[inv.col, inv.thBorder, { flex: 1.5 }]} /><View style={[inv.col, inv.thBorder, { flex: 1 }]} />
            <View style={[inv.col, inv.thBorder, { flex: 0.8 }]} /><View style={[inv.col, inv.thBorder, { flex: 1.5 }]} />
          </View>
        ))}

        {/* ── Total row ── */}
        <View style={[inv.row, inv.totalRow]}>
          <Text style={[inv.totalLabel, { flex: 3 }]}>Total</Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1.2 }]}></Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1.5 }]}>
            {totalBags > 0 ? `${totalBags} Bags` : ''}
          </Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]}></Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 0.8 }]}></Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8 }]}>
            {(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ₹
          </Text>
        </View>

        {/* ── Amount in words ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', padding: 6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={inv.wordsLabel}>Amount Chargeable (in words)</Text>
            <Text style={inv.wordsValue}>{AmountWords(bill.total_amount)}</Text>
          </View>
          <Text style={inv.eoe}>E. &amp; O.E</Text>
        </View>

        {/* ── HSN/SAC Summary Table ── */}
        <View style={[inv.row, inv.tableHeader, { borderTopWidth: 1, borderTopColor: '#000' }]}>
          <Text style={[inv.thCell, { flex: 2 }]}>HSN/SAC</Text>
          <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>Taxable Value</Text>
          {bill.cgst_percent > 0 && <>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>CGST %</Text>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>CGST Amt</Text>
          </>}
          {bill.sgst_percent > 0 && <>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>SGST %</Text>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>SGST Amt</Text>
          </>}
          {bill.igst_percent > 0 && <>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>IGST %</Text>
            <Text style={[inv.thCell, inv.thBorder, { flex: 1 }]}>IGST Amt</Text>
          </>}
          <Text style={[inv.thCell, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8 }]}>Taxable Value</Text>
        </View>
        {Object.entries(hsnMap).map(([hsn, amt], i) => (
          <View key={i} style={[inv.row, inv.itemRow]}>
            <Text style={[inv.tdCell, { flex: 2 }]}>{hsn}</Text>
            <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            {bill.cgst_percent > 0 && <>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{bill.cgst_percent}%</Text>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{(bill.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </>}
            {bill.sgst_percent > 0 && <>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{bill.sgst_percent}%</Text>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{(bill.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </>}
            {bill.igst_percent > 0 && <>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{bill.igst_percent}%</Text>
              <Text style={[inv.tdCell, inv.thBorder, { flex: 1 }]}>{(bill.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </>}
            <Text style={[inv.tdCell, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8, fontWeight: '700' }]}>{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        ))}
        <View style={[inv.row, inv.totalRow]}>
          <Text style={[inv.totalLabel, { flex: 2 }]}>Total</Text>
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]}>{(bill.taxable_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          {bill.cgst_percent > 0 && <><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]} /><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]}>{(bill.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></>}
          {bill.sgst_percent > 0 && <><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]} /><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]}>{(bill.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></>}
          {bill.igst_percent > 0 && <><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]} /><Text style={[inv.totalLabel, inv.thBorder, { flex: 1 }]}>{(bill.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></>}
          <Text style={[inv.totalLabel, inv.thBorder, { flex: 1.5, textAlign: 'right', paddingRight: 8 }]}>{(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        </View>

        {/* ── Tax Amount in Words + PAN ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', padding: 6, gap: 4 }]}>
          <View style={{ flex: 1 }}>
            <Text style={inv.companyLine}>Tax Amount (in words)  :  <Text style={{ fontWeight: '700' }}>{taxWords}</Text></Text>
            <Text style={inv.companyLine}>Company's PAN  :  <Text style={{ fontWeight: '700' }}>{COMPANY_INFO.pan}</Text></Text>
          </View>
        </View>

        {/* ── Declaration + Signatory ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', minHeight: 60 }]}>
          <View style={[inv.col, { flex: 3, borderRightWidth: 1, borderRightColor: '#000', padding: 6 }]}>
            <Text style={inv.fieldLabel}>Declaration</Text>
            <Text style={[inv.companyLine, { marginTop: 4 }]}>
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </Text>
          </View>
          <View style={[inv.col, { flex: 2, padding: 6, alignItems: 'flex-end' }]}>
            <Text style={inv.companyLine}>for {COMPANY_INFO.name}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[inv.companyLine, { fontStyle: 'italic' }]}>Authorised Signatory</Text>
          </View>
        </View>

        {/* ── Jurisdiction + Computer Invoice ── */}
        <View style={[inv.row, { borderTopWidth: 1, borderTopColor: '#000', padding: 6, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={inv.footer}>SUBJECT TO {COMPANY_INFO.jurisdiction.toUpperCase()} JURISDICTION</Text>
        </View>
        <View style={[inv.row, { padding: 4, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[inv.footer, { fontSize: 9, color: '#666' }]}>This is a Computer Generated Invoice</Text>
        </View>
      </View>

      {/* ── Action Buttons (outside invoice) ── */}
      <View style={inv.actions}>
        <View style={inv.statusBtns}>
          <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600', marginRight: 8 }}>Mark as:</Text>
          {['PENDING', 'PARTIAL', 'PAID'].map(s => (
            <TouchableOpacity
              key={s}
              style={[inv.statusBtn, bill.payment_status === s && inv.statusBtnActive]}
              onPress={() => onUpdateStatus(bill.id, s)}
              disabled={updatingStatus || bill.payment_status === s}
            >
              {updatingStatus && bill.payment_status !== s
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[inv.statusBtnText, bill.payment_status === s && inv.statusBtnTextActive]}>{s}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>
        <View style={inv.actionBtns}>
          <TouchableOpacity style={inv.deleteBtn} onPress={() => onDelete(bill)}>
            <Text style={inv.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={inv.doneBtn} onPress={onClose}>
            <Text style={inv.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
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

const inv = StyleSheet.create({
  outer: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 10 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbarInvoiceNo: { fontSize: 13, fontWeight: '700', color: colors.primary },
  closeBtn: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Invoice bordered body
  body: { borderWidth: 1, borderColor: '#000' },
  row: { flexDirection: 'row' },
  col: { padding: 6 },

  // Typography
  companyName: { fontSize: 12, fontWeight: '800', color: '#000', marginBottom: 2 },
  companyLine: { fontSize: 10, color: '#222', lineHeight: 15 },
  invoiceHeading: { fontSize: 16, fontWeight: '900', color: '#000', textAlign: 'center' },
  originalTag: { fontSize: 9, color: '#444', textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: '#444', marginBottom: 2 },
  custName: { fontSize: 11, fontWeight: '800', color: '#000', marginBottom: 2 },
  custLine: { fontSize: 10, color: '#222', lineHeight: 15 },

  // Metadata grid (right side of header)
  metaRow: { flexDirection: 'row', flex: 1 },
  metaLabel: { flex: 1, fontSize: 9, color: '#555', padding: 3 },
  metaValue: { flex: 1, fontSize: 10, fontWeight: '600', color: '#000', padding: 3 },

  // Table header
  tableHeader: { backgroundColor: '#f0f0f0' },
  thBorder: { borderLeftWidth: 1, borderLeftColor: '#000' },
  thCell: { fontSize: 10, fontWeight: '700', color: '#000', paddingHorizontal: 6, paddingVertical: 5, textAlign: 'center' },

  // Table data rows
  itemRow: { borderTopWidth: 1, borderTopColor: '#ddd', minHeight: 30 },
  itemName: { fontSize: 11, fontWeight: '700', color: '#000', paddingHorizontal: 6, paddingVertical: 4 },
  tdCell: { fontSize: 10, color: '#111', paddingHorizontal: 6, paddingVertical: 5, textAlignVertical: 'center' },

  // Total row
  totalRow: { borderTopWidth: 2, borderTopColor: '#000', backgroundColor: '#f9f9f9' },
  totalLabel: { fontSize: 11, fontWeight: '800', color: '#000', paddingHorizontal: 6, paddingVertical: 5 },

  // Amount in words
  wordsLabel: { fontSize: 9, color: '#555', marginBottom: 2 },
  wordsValue: { fontSize: 11, fontWeight: '800', color: '#000' },
  eoe: { fontSize: 9, color: '#555', fontStyle: 'italic', alignSelf: 'flex-end' },

  // Footer text
  footer: { fontSize: 10, fontWeight: '700', color: '#000', textAlign: 'center' },

  // Action area below invoice
  actions: { paddingTop: 14, gap: 10 },
  statusBtns: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' },
  statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  statusBtnTextActive: { color: '#fff' },
  actionBtns: { flexDirection: 'row', gap: 10 },
  deleteBtn: { flex: 1, paddingVertical: 11, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  doneBtn: { flex: 2, paddingVertical: 11, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
