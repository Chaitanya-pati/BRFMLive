import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, useWindowDimensions, Platform,
} from 'react-native';
import Layout from '../components/Layout';
import { deliveryBillApi } from '../api/client';
import { showConfirm, showSuccess, showError } from '../utils/customAlerts';
import colors from '../theme/colors';
import { formatISTDate } from '../utils/dateUtils';

// ─── Status colour map ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  PARTIAL: { bg: '#dbeafe', text: '#1e40af' },
  PAID:    { bg: '#dcfce7', text: '#15803d' },
};

// ─── Indian-style amount-in-words ─────────────────────────────────────────────
function amountInWords(amount) {
  if (!amount || isNaN(amount)) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function conv(n) {
    if (n < 20)      return ones[n];
    if (n < 100)     return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + conv(n % 100) : '');
    if (n < 100000)  return conv(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + conv(n % 1000) : '');
    if (n < 10000000)return conv(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + conv(n % 100000) : '');
    return conv(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + conv(n % 10000000) : '');
  }
  const rs = Math.floor(amount);
  const ps = Math.round((amount - rs) * 100);
  let w = conv(rs) + ' Rupees';
  if (ps > 0) w += ' and ' + conv(ps) + ' Paise';
  return w + ' Only';
}

// ─── Column widths for the list table ─────────────────────────────────────────
function colWidth(col, isMobile) {
  const map = {
    'Invoice No.': { width: isMobile ? 150 : 180 },
    Dispatch:  { width: 80 },
    Customer:  { width: isMobile ? 130 : 180 },
    Date:      { width: 110 },
    Taxable:   { width: 110 },
    Tax:       { width: 100 },
    Total:     { width: 110 },
    Amount:    { width: 110 },
    Status:    { width: 100 },
  };
  return map[col] || { width: 100 };
}

// ─── Company info (edit to match your mill) ───────────────────────────────────
const CO = {
  name:         'Your Mill Name (P) Ltd',
  address:      'Industrial Area, Plot No. XX',
  city:         'Your City',
  state:        'Your State',
  stateCode:    '00',
  cin:          'U00000XX0000PTC000000',
  gstin:        'XXXXXXXXXXXXXXXXX',
  pan:          'XXXXXXXXXX',
  jurisdiction: 'YOUR CITY',
};

// ─── Print helpers (web only) ─────────────────────────────────────────────────
const PRINT_STYLE_ID = 'inv-print-style';

function injectPrintCSS() {
  if (Platform.OS !== 'web') return;
  let el = document.getElementById(PRINT_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = PRINT_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      body > * { visibility: hidden !important; }
      #inv-print-root,
      #inv-print-root * { visibility: visible !important; }
      #inv-print-root {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 210mm !important;
        background: #fff !important;
        padding: 0 !important;
        font-size: 10pt !important;
      }
      .inv-no-break { page-break-inside: avoid !important; }
      .inv-toolbar, .inv-actions { display: none !important; }
    }
  `;
}

function removePrintCSS() {
  if (Platform.OS !== 'web') return;
  const el = document.getElementById(PRINT_STYLE_ID);
  if (el) el.remove();
}

function doPrint() {
  if (Platform.OS !== 'web') return;
  injectPrintCSS();
  setTimeout(() => {
    window.print();
    // remove after print dialog closes
    window.addEventListener('afterprint', removePrintCSS, { once: true });
  }, 80);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function DeliveryBillsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const filterDispatchId = route?.params?.dispatch_id || null;

  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [previewBill, setPreviewBill] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDispatchId) params.dispatch_id = filterDispatchId;
      const res = await deliveryBillApi.getAll(params);
      setBills(res.data || []);
    } catch {
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
        <View style={ls.filterBanner}>
          <Text style={ls.filterText}>Showing bills for Dispatch #{filterDispatchId}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ dispatch_id: null })}>
            <Text style={ls.filterClear}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : bills.length === 0 ? (
        <View style={ls.emptyBox}>
          <Text style={ls.emptyIcon}>📄</Text>
          <Text style={ls.emptyTitle}>No Bills Found</Text>
          <Text style={ls.emptyNote}>Bills are created automatically when a dispatch is saved.</Text>
        </View>
      ) : (
        <ScrollView style={ls.tableWrap} horizontal>
          <View style={ls.table}>
            <View style={[ls.row, ls.headerRow]}>
              {cols.map(c => (
                <Text key={c} style={[ls.cell, ls.headerCell, colWidth(c, isMobile)]}>{c}</Text>
              ))}
              <Text style={[ls.cell, ls.headerCell, { width: 100 }]}>Actions</Text>
            </View>

            {bills.map(bill => {
              const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;
              const customerName = bill.order?.customer?.customer_name || bill.destination || '—';
              return (
                <View key={bill.id} style={[ls.row, ls.dataRow]}>
                  <Text style={[ls.cell, colWidth('Invoice No.', isMobile), ls.invoiceCell]}>
                    {bill.invoice_number}
                  </Text>
                  {!isMobile && (
                    <Text style={[ls.cell, colWidth('Dispatch', isMobile)]}>#{bill.dispatch_id}</Text>
                  )}
                  <Text style={[ls.cell, colWidth('Customer', isMobile)]} numberOfLines={1}>{customerName}</Text>
                  {!isMobile && (
                    <Text style={[ls.cell, colWidth('Date', isMobile)]}>{formatISTDate(bill.invoice_date)}</Text>
                  )}
                  {!isMobile && (
                    <Text style={[ls.cell, colWidth('Taxable', isMobile)]}>
                      ₹{(bill.taxable_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                  {!isMobile && (
                    <Text style={[ls.cell, colWidth('Tax', isMobile)]}>
                      ₹{(bill.total_tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                  <Text style={[ls.cell, colWidth('Amount', isMobile), ls.amountCell]}>
                    ₹{(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                  <View style={[ls.cell, colWidth('Status', isMobile)]}>
                    <View style={[ls.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[ls.statusText, { color: sc.text }]}>{bill.payment_status}</Text>
                    </View>
                  </View>
                  <View style={[ls.cell, { width: 100 }]}>
                    <TouchableOpacity style={ls.viewBtn} onPress={() => setPreviewBill(bill)}>
                      <Text style={ls.viewBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={!!previewBill}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewBill(null)}
      >
        <View style={ls.previewOverlay}>
          <View style={[ls.previewPanel, isMobile && ls.previewPanelMobile]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {previewBill && (
                <BillPreview
                  bill={previewBill}
                  onClose={() => setPreviewBill(null)}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDelete}
                  updatingStatus={updatingStatus}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILL PREVIEW (the formatted Tax Invoice)
// ═══════════════════════════════════════════════════════════════════════════════
function BillPreview({ bill, onClose, onUpdateStatus, onDelete, updatingStatus }) {
  const { width } = useWindowDimensions();
  const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;

  const cust        = bill.order?.customer || {};
  const custName    = cust.customer_name   || bill.destination || '—';
  const custGSTIN   = cust.gst_number      || '—';
  const custState   = cust.state           || '—';
  const custAddr    = [cust.address, cust.city, cust.state, cust.pin_code]
                        .filter(Boolean).join(', ') || '—';

  const vehicleNo   = bill.dispatch?.truck?.truck_number   || '—';
  const driverName  = bill.dispatch?.driver?.driver_name   || '—';
  const buyerOrder  = bill.order?.order_code               || '—';

  const items       = bill.items || [];
  const totalBags   = items.reduce((s, it) => s + (it.quantity_bags || 0), 0);

  // HSN summary grouped by code
  const hsnMap = {};
  items.forEach(it => {
    const k = it.hsn_sac_code || 'N/A';
    hsnMap[k] = (hsnMap[k] || 0) + (it.amount || 0);
  });
  const hsnRows = Object.entries(hsnMap);

  const hasCGST = (bill.cgst_percent || 0) > 0;
  const hasSGST = (bill.sgst_percent || 0) > 0;
  const hasIGST = (bill.igst_percent || 0) > 0;
  const taxWords = (bill.total_tax_amount || 0) > 0
    ? amountInWords(bill.total_tax_amount) : 'NIL';

  // Pad items to minimum 5 rows for visual balance
  const padCount = Math.max(0, 5 - items.length);

  return (
    // nativeID is used by the print CSS to isolate this element
    <View nativeID="inv-print-root">

      {/* ── Toolbar ── */}
      <View style={[inv.toolbar, { marginBottom: 10 }]} className="inv-toolbar">
        <View style={[inv.pill, { backgroundColor: sc.bg }]}>
          <Text style={[inv.pillText, { color: sc.text }]}>{bill.payment_status}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={inv.invNoLabel}>{bill.invoice_number}</Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={inv.printBtn} onPress={doPrint}>
            <Text style={inv.printBtnText}>🖨 Print</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={inv.closeBtn} onPress={onClose}>
          <Text style={inv.closeBtnText}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════ INVOICE BODY ══════════════════ */}
      <View style={inv.body}>

        {/* ── Section 1: Seller | Heading | Invoice meta ── */}
        <View style={[inv.hrow, { borderBottomWidth: 1, borderBottomColor: '#000' }]}>
          {/* Seller */}
          <View style={[inv.hcol, { flex: 5, borderRightWidth: 1 }]}>
            <Text style={inv.coName}>{CO.name}</Text>
            <Text style={inv.coLine}>{CO.address}</Text>
            <Text style={inv.coLine}>{CO.city}</Text>
            <Text style={inv.coLine}>CIN : {CO.cin}</Text>
            <Text style={inv.coLine}>GSTIN/UIN : {CO.gstin}</Text>
            <Text style={inv.coLine}>State Name : {CO.state},  Code : {CO.stateCode}</Text>
          </View>
          {/* Heading */}
          <View style={[inv.hcol, { flex: 4, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={inv.heading}>Tax Invoice</Text>
            <Text style={inv.subHeading}>(ORIGINAL FOR RECIPIENT)</Text>
          </View>
          {/* Meta grid */}
          <View style={[inv.hcol, { flex: 5, padding: 0 }]}>
            {/* Row: Invoice No. | Dated */}
            <View style={[inv.metaHdr, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mLabel, { flex: 1, borderRightWidth: 1 }]}>Invoice No.</Text>
              <Text style={[inv.mLabel, { flex: 1 }]}>Dated</Text>
            </View>
            <View style={[inv.metaVal, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mValue, { flex: 1, borderRightWidth: 1 }]}>{bill.invoice_number}</Text>
              <Text style={[inv.mValue, { flex: 1 }]}>{formatISTDate(bill.invoice_date)}</Text>
            </View>
            {/* Row: Delivery Note | Mode/Terms */}
            <View style={[inv.metaHdr, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mLabel, { flex: 1, borderRightWidth: 1 }]}>Delivery Note</Text>
              <Text style={[inv.mLabel, { flex: 1 }]}>Mode/Terms of Payment</Text>
            </View>
            <View style={[inv.metaVal, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mValue, { flex: 1, borderRightWidth: 1 }]}>{bill.delivery_note_no || ''}</Text>
              <Text style={[inv.mValue, { flex: 1 }]}>{bill.terms_of_delivery || ''}</Text>
            </View>
            {/* Row: Reference No. | Other Refs */}
            <View style={[inv.metaHdr, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mLabel, { flex: 1, borderRightWidth: 1 }]}>Reference No. &amp; Date</Text>
              <Text style={[inv.mLabel, { flex: 1 }]}>Other References</Text>
            </View>
            <View style={inv.metaVal}>
              <Text style={[inv.mValue, { flex: 1, borderRightWidth: 1 }]}>{bill.reference_no || ''}</Text>
              <Text style={[inv.mValue, { flex: 1 }]}>{bill.other_references || ''}</Text>
            </View>
          </View>
        </View>

        {/* ── Section 2: Consignee header row ── */}
        <View style={[inv.hrow, { borderBottomWidth: 1 }]}>
          <View style={[inv.hcol, { flex: 5, borderRightWidth: 1 }]}>
            <Text style={inv.secLabel}>Consignee (Ship to)</Text>
          </View>
          <View style={[inv.hcol, { flex: 4, borderRightWidth: 1, padding: 0 }]}>
            <View style={[inv.metaHdr, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mLabel, { flex: 1, borderRightWidth: 1 }]}>Buyer's Order No.</Text>
              <Text style={[inv.mLabel, { flex: 1 }]}>Dated</Text>
            </View>
            <View style={inv.metaVal}>
              <Text style={[inv.mValue, { flex: 1, borderRightWidth: 1 }]}>{buyerOrder}</Text>
              <Text style={[inv.mValue, { flex: 1 }]}>{formatISTDate(bill.invoice_date)}</Text>
            </View>
          </View>
          <View style={[inv.hcol, { flex: 5, padding: 0 }]}>
            <View style={[inv.metaHdr, { borderBottomWidth: 1 }]}>
              <Text style={[inv.mLabel, { flex: 1, borderRightWidth: 1 }]}>Dispatch Doc No.</Text>
              <Text style={[inv.mLabel, { flex: 1 }]}>Delivery Note Date</Text>
            </View>
            <View style={inv.metaVal}>
              <Text style={[inv.mValue, { flex: 1, borderRightWidth: 1 }]}>{bill.dispatch_id}</Text>
              <Text style={[inv.mValue, { flex: 1 }]}>
                {bill.delivery_note_date ? formatISTDate(bill.delivery_note_date) : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: Consignee address | Dispatch/Dest | LR/Vehicle ── */}
        <View style={[inv.hrow, { borderBottomWidth: 1, minHeight: 72 }]}>
          <View style={[inv.hcol, { flex: 5, borderRightWidth: 1 }]}>
            <Text style={inv.custName}>{custName}</Text>
            <Text style={inv.custLine}>{custAddr}</Text>
            <Text style={inv.custLine}>GSTIN/UIN  :  {custGSTIN}</Text>
            <Text style={inv.custLine}>State Name  :  {custState}</Text>
          </View>
          <View style={[inv.hcol, { flex: 9, padding: 0 }]}>
            {/* Top half: Dispatched through | Destination */}
            <View style={[inv.hrow, { borderBottomWidth: 1, flex: 1 }]}>
              <View style={[inv.hcol, { flex: 1, borderRightWidth: 1 }]}>
                <Text style={inv.mLabel}>Dispatched through</Text>
                <Text style={inv.mValue}>{driverName}</Text>
              </View>
              <View style={[inv.hcol, { flex: 1 }]}>
                <Text style={inv.mLabel}>Destination</Text>
                <Text style={inv.mValue}>{bill.destination || '—'}</Text>
              </View>
            </View>
            {/* Bottom half: LR-RR | Motor Vehicle */}
            <View style={[inv.hrow, { flex: 1 }]}>
              <View style={[inv.hcol, { flex: 1, borderRightWidth: 1 }]}>
                <Text style={inv.mLabel}>Bill of Lading / LR-RR No.</Text>
                <Text style={inv.mValue}>{bill.lr_rr_no || ''}</Text>
              </View>
              <View style={[inv.hcol, { flex: 1 }]}>
                <Text style={inv.mLabel}>Motor Vehicle No.</Text>
                <Text style={[inv.mValue, { fontWeight: '700' }]}>{vehicleNo}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Section 4: Buyer (Bill to) | Terms of Delivery ── */}
        <View style={[inv.hrow, { borderBottomWidth: 1, minHeight: 72 }]}>
          <View style={[inv.hcol, { flex: 5, borderRightWidth: 1 }]}>
            <Text style={inv.secLabel}>Buyer (Bill to)</Text>
            <Text style={inv.custName}>{custName}</Text>
            <Text style={inv.custLine}>{custAddr}</Text>
            <Text style={inv.custLine}>GSTIN/UIN  :  {custGSTIN}</Text>
            <Text style={inv.custLine}>State Name  :  {custState}</Text>
          </View>
          <View style={[inv.hcol, { flex: 9 }]}>
            <Text style={inv.mLabel}>Terms of Delivery</Text>
            <Text style={inv.mValue}>{bill.terms_of_delivery || ''}</Text>
          </View>
        </View>

        {/* ── Items Table: header ── */}
        <View style={[inv.trow, inv.tHead, { borderBottomWidth: 1 }]}>
          <Text style={[inv.th, T.desc]}>Description of Goods</Text>
          <Text style={[inv.th, T.hsn,  inv.tbdr]}>HSN/SAC</Text>
          <Text style={[inv.th, T.qty,  inv.tbdr]}>Quantity</Text>
          <Text style={[inv.th, T.rate, inv.tbdr]}>Rate</Text>
          <Text style={[inv.th, T.per,  inv.tbdr]}>per</Text>
          <Text style={[inv.th, T.amt,  inv.tbdr, { textAlign: 'right' }]}>Amount</Text>
        </View>

        {/* ── Items Table: data rows ── */}
        {items.map((item, i) => {
          const isBag = (item.quantity_bags || 0) > 0;
          return (
            <View key={i} style={[inv.trow, { borderBottomWidth: 1, borderBottomColor: '#ddd', minHeight: 34 }]}>
              <View style={[T.desc, { padding: 4 }]}>
                <Text style={inv.itemName}>{item.product_name}</Text>
              </View>
              <Text style={[inv.td, T.hsn,  inv.tbdr]}>{item.hsn_sac_code || ''}</Text>
              <View style={[T.qty, inv.tbdr, { padding: 4 }]}>
                {isBag && <Text style={[inv.td, { fontWeight: '700', lineHeight: 16 }]}>{item.quantity_bags} Bags</Text>}
                <Text style={[inv.td, { color: '#555', lineHeight: 15 }]}>
                  ({(item.quantity_ton || 0).toFixed(3)} kgs)
                </Text>
              </View>
              <Text style={[inv.td, T.rate, inv.tbdr, { textAlign: 'right' }]}>
                {isBag
                  ? (item.rate_per_bag || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                  : (item.rate_per_ton || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[inv.td, T.per, inv.tbdr, { textAlign: 'center' }]}>
                {isBag ? 'Bags' : 'Tons'}
              </Text>
              <Text style={[inv.td, T.amt, inv.tbdr, { textAlign: 'right', fontWeight: '600' }]}>
                {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          );
        })}

        {/* Padding rows */}
        {[...Array(padCount)].map((_, i) => (
          <View key={`pad-${i}`} style={[inv.trow, { borderBottomWidth: 1, borderBottomColor: '#eee', minHeight: 22 }]}>
            <View style={T.desc} /><View style={[T.hsn,  inv.tbdr]} />
            <View style={[T.qty,  inv.tbdr]} /><View style={[T.rate, inv.tbdr]} />
            <View style={[T.per,  inv.tbdr]} /><View style={[T.amt,  inv.tbdr]} />
          </View>
        ))}

        {/* ── Total ── */}
        <View style={[inv.trow, inv.totalRow]}>
          <Text style={[inv.totalCell, T.desc]}>Total</Text>
          <Text style={[inv.totalCell, T.hsn,  inv.tbdr]} />
          <Text style={[inv.totalCell, T.qty,  inv.tbdr, { fontWeight: '800' }]}>
            {totalBags > 0 ? `${totalBags} Bags` : ''}
          </Text>
          <Text style={[inv.totalCell, T.rate, inv.tbdr]} />
          <Text style={[inv.totalCell, T.per,  inv.tbdr]} />
          <Text style={[inv.totalCell, T.amt,  inv.tbdr, { textAlign: 'right', fontWeight: '800' }]}>
            {(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ₹
          </Text>
        </View>

        {/* ── Amount in words ── */}
        <View style={[inv.hrow, { borderTopWidth: 1, padding: 6, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={inv.wordsLabel}>Amount Chargeable (in words)</Text>
            <Text style={inv.wordsValue}>{amountInWords(bill.total_amount)}</Text>
          </View>
          <Text style={inv.eoe}>E. &amp; O.E</Text>
        </View>

        {/* ── HSN/SAC Summary Table ── */}
        <View style={{ borderTopWidth: 1, borderTopColor: '#000' }}>
          {/* Header */}
          <View style={[inv.trow, inv.tHead, { borderBottomWidth: 1 }]}>
            <Text style={[inv.th, H.hsn]}>HSN/SAC</Text>
            <Text style={[inv.th, H.tv, inv.tbdr]}>Taxable Value</Text>
            {hasCGST && <>
              <Text style={[inv.th, H.pct, inv.tbdr]}>CGST %</Text>
              <Text style={[inv.th, H.amt, inv.tbdr]}>CGST Amt</Text>
            </>}
            {hasSGST && <>
              <Text style={[inv.th, H.pct, inv.tbdr]}>SGST %</Text>
              <Text style={[inv.th, H.amt, inv.tbdr]}>SGST Amt</Text>
            </>}
            {hasIGST && <>
              <Text style={[inv.th, H.pct, inv.tbdr]}>IGST %</Text>
              <Text style={[inv.th, H.amt, inv.tbdr]}>IGST Amt</Text>
            </>}
            <Text style={[inv.th, H.tv, inv.tbdr, { textAlign: 'right' }]}>Taxable Value</Text>
          </View>

          {/* Data rows */}
          {hsnRows.map(([hsn, amt], i) => (
            <View key={i} style={[inv.trow, { borderBottomWidth: 1, borderBottomColor: '#ddd' }]}>
              <Text style={[inv.td, H.hsn]}>{hsn}</Text>
              <Text style={[inv.td, H.tv,  inv.tbdr]}>
                {amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              {hasCGST && <>
                <Text style={[inv.td, H.pct, inv.tbdr]}>{bill.cgst_percent}%</Text>
                <Text style={[inv.td, H.amt, inv.tbdr]}>
                  {(bill.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </>}
              {hasSGST && <>
                <Text style={[inv.td, H.pct, inv.tbdr]}>{bill.sgst_percent}%</Text>
                <Text style={[inv.td, H.amt, inv.tbdr]}>
                  {(bill.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </>}
              {hasIGST && <>
                <Text style={[inv.td, H.pct, inv.tbdr]}>{bill.igst_percent}%</Text>
                <Text style={[inv.td, H.amt, inv.tbdr]}>
                  {(bill.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </>}
              <Text style={[inv.td, H.tv, inv.tbdr, { textAlign: 'right', fontWeight: '700' }]}>
                {amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}

          {/* HSN Total row */}
          <View style={[inv.trow, inv.totalRow]}>
            <Text style={[inv.totalCell, H.hsn]}>Total</Text>
            <Text style={[inv.totalCell, H.tv,  inv.tbdr]}>
              {(bill.taxable_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            {hasCGST && <>
              <Text style={[inv.totalCell, H.pct, inv.tbdr]} />
              <Text style={[inv.totalCell, H.amt, inv.tbdr]}>
                {(bill.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </>}
            {hasSGST && <>
              <Text style={[inv.totalCell, H.pct, inv.tbdr]} />
              <Text style={[inv.totalCell, H.amt, inv.tbdr]}>
                {(bill.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </>}
            {hasIGST && <>
              <Text style={[inv.totalCell, H.pct, inv.tbdr]} />
              <Text style={[inv.totalCell, H.amt, inv.tbdr]}>
                {(bill.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </>}
            <Text style={[inv.totalCell, H.tv, inv.tbdr, { textAlign: 'right' }]}>
              {(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* ── Tax Amount in Words + PAN ── */}
        <View style={[inv.hrow, { borderTopWidth: 1, padding: 6 }]}>
          <Text style={inv.coLine}>
            Tax Amount (in words){'  '}:{' '}
            <Text style={{ fontWeight: '700' }}>{taxWords}</Text>
          </Text>
          {'  '}
          <Text style={inv.coLine}>
            Company's PAN{'  '}:{' '}
            <Text style={{ fontWeight: '700' }}>{CO.pan}</Text>
          </Text>
        </View>

        {/* ── Declaration + Authorised Signatory ── */}
        <View style={[inv.hrow, { borderTopWidth: 1, minHeight: 70 }]}>
          <View style={[inv.hcol, { flex: 3, borderRightWidth: 1 }]}>
            <Text style={inv.secLabel}>Declaration</Text>
            <Text style={[inv.coLine, { marginTop: 4 }]}>
              We declare that this invoice shows the actual price of the goods described
              and that all particulars are true and correct.
            </Text>
          </View>
          <View style={[inv.hcol, { flex: 2, alignItems: 'flex-end', justifyContent: 'space-between' }]}>
            <Text style={inv.coLine}>for {CO.name}</Text>
            <Text style={[inv.coLine, { fontStyle: 'italic' }]}>Authorised Signatory</Text>
          </View>
        </View>

        {/* ── Jurisdiction ── */}
        <View style={[inv.hrow, { borderTopWidth: 1, paddingVertical: 5, justifyContent: 'center' }]}>
          <Text style={inv.footer}>SUBJECT TO {CO.jurisdiction.toUpperCase()} JURISDICTION</Text>
        </View>
        <View style={[inv.hrow, { paddingVertical: 4, justifyContent: 'center' }]}>
          <Text style={[inv.footer, { fontSize: 9, color: '#777' }]}>This is a Computer Generated Invoice</Text>
        </View>
      </View>
      {/* ══════════════════ END INVOICE BODY ══════════════════ */}

      {/* ── Action Buttons ── */}
      <View style={inv.actions} className="inv-actions">
        <View style={inv.statusRow}>
          <Text style={inv.markLabel}>Mark as:</Text>
          {['PENDING', 'PARTIAL', 'PAID'].map(s => (
            <TouchableOpacity
              key={s}
              style={[inv.sBtn, bill.payment_status === s && inv.sBtnActive]}
              onPress={() => onUpdateStatus(bill.id, s)}
              disabled={updatingStatus || bill.payment_status === s}
            >
              {updatingStatus && bill.payment_status !== s
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[inv.sBtnTxt, bill.payment_status === s && inv.sBtnTxtActive]}>{s}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>
        <View style={inv.btnRow}>
          <TouchableOpacity style={inv.delBtn} onPress={() => onDelete(bill)}>
            <Text style={inv.delBtnTxt}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={inv.closeActionBtn} onPress={onClose}>
            <Text style={inv.closeActionBtnTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Items-table column widths ────────────────────────────────────────────────
// Using fixed widths so columns always align perfectly on screen AND in print
const T = StyleSheet.create({
  desc: { width: 160 },
  hsn:  { width: 70 },
  qty:  { width: 90 },
  rate: { width: 80 },
  per:  { width: 50 },
  amt:  { width: 90 },
});

// ─── HSN summary table column widths ─────────────────────────────────────────
const H = StyleSheet.create({
  hsn: { width: 70 },
  tv:  { width: 90 },
  pct: { width: 55 },
  amt: { width: 75 },
});

// ─── Invoice styles ───────────────────────────────────────────────────────────
const inv = StyleSheet.create({
  // ── Toolbar ──
  toolbar:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill:        { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:    { fontSize: 11, fontWeight: '700' },
  invNoLabel:  { fontSize: 13, fontWeight: '700', color: colors.primary },
  printBtn:    { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  printBtnText:{ fontSize: 12, color: '#15803d', fontWeight: '600' },
  closeBtn:    { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText:{ fontSize: 12, color: '#374151', fontWeight: '600' },

  // ── Invoice bordered body ──
  body: {
    borderWidth: 1, borderColor: '#000',
    ...Platform.select({ web: { pageBreakInside: 'auto' } }),
  },
  // Horizontal (section) rows
  hrow: { flexDirection: 'row', borderColor: '#000' },
  hcol: { padding: 6, borderColor: '#000' },

  // ── Typography ──
  coName:    { fontSize: 12, fontWeight: '800', color: '#000', marginBottom: 2 },
  coLine:    { fontSize: 10, color: '#222', lineHeight: 15 },
  heading:   { fontSize: 16, fontWeight: '900', color: '#000', textAlign: 'center' },
  subHeading:{ fontSize: 9, color: '#555', textAlign: 'center', fontStyle: 'italic', marginTop: 3 },
  secLabel:  { fontSize: 9, fontWeight: '700', color: '#555', marginBottom: 3 },
  custName:  { fontSize: 11, fontWeight: '800', color: '#000', marginBottom: 2 },
  custLine:  { fontSize: 10, color: '#222', lineHeight: 15 },

  // ── Meta grid ──
  metaHdr:   { flexDirection: 'row', borderColor: '#000' },
  metaVal:   { flexDirection: 'row', borderColor: '#000' },
  mLabel:    { fontSize: 9, color: '#555', padding: 4, borderColor: '#000', flex: 1 },
  mValue:    { fontSize: 10, fontWeight: '600', color: '#000', padding: 4, borderColor: '#000', flex: 1 },

  // ── Table ──
  trow:      { flexDirection: 'row', borderColor: '#000' },
  tHead:     { backgroundColor: '#f0f0f0' },
  tbdr:      { borderLeftWidth: 1, borderLeftColor: '#000' },
  th:        { fontSize: 10, fontWeight: '700', color: '#000', paddingHorizontal: 6, paddingVertical: 5, textAlign: 'center' },
  td:        { fontSize: 10, color: '#111', paddingHorizontal: 6, paddingVertical: 4, textAlignVertical: 'center' },
  itemName:  { fontSize: 11, fontWeight: '700', color: '#000' },

  // ── Total row ──
  totalRow:  { borderTopWidth: 2, borderTopColor: '#000', backgroundColor: '#f7f7f7' },
  totalCell: { fontSize: 11, fontWeight: '800', color: '#000', paddingHorizontal: 6, paddingVertical: 5 },

  // ── Amount in words ──
  wordsLabel:{ fontSize: 9, color: '#666', marginBottom: 2 },
  wordsValue:{ fontSize: 11, fontWeight: '800', color: '#000' },
  eoe:       { fontSize: 9, color: '#666', fontStyle: 'italic', alignSelf: 'flex-end', paddingLeft: 12 },

  // ── Footer ──
  footer:    { fontSize: 10, fontWeight: '700', color: '#000', textAlign: 'center' },

  // ── Action area ──
  actions:   { paddingTop: 14, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  markLabel: { fontSize: 12, color: '#374151', fontWeight: '600', marginRight: 4 },
  sBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' },
  sBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  sBtnTxt:   { fontSize: 12, fontWeight: '600', color: '#374151' },
  sBtnTxtActive: { color: '#fff' },
  btnRow:    { flexDirection: 'row', gap: 10 },
  delBtn:    { flex: 1, paddingVertical: 11, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', alignItems: 'center' },
  delBtnTxt: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  closeActionBtn:    { flex: 2, paddingVertical: 11, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center' },
  closeActionBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ─── List-view styles ─────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  filterBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  filterText:  { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  filterClear: { fontSize: 13, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  emptyBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyNote:   { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  tableWrap:   { flex: 1 },
  table:       { minWidth: '100%' },
  row:         { flexDirection: 'row', alignItems: 'center' },
  headerRow:   { backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  dataRow:     { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 4 },
  cell:        { paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 },
  headerCell:  { fontWeight: '700', color: '#374151', fontSize: 12 },
  invoiceCell: { color: colors.primary, fontWeight: '600' },
  amountCell:  { fontWeight: '700', color: '#111827' },
  statusPill:  { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText:  { fontSize: 11, fontWeight: '700' },
  viewBtn:     { backgroundColor: colors.primary, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  previewPanel: {
    backgroundColor: '#fff', borderRadius: 12,
    width: '100%', maxWidth: 760, maxHeight: '95%',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' },
      default: { elevation: 12 },
    }),
  },
  previewPanelMobile: { maxWidth: '100%' },
});
