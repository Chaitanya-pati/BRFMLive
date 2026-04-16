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
    if (n < 20)       return ones[n];
    if (n < 100)      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)     return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + conv(n % 100) : '');
    if (n < 100000)   return conv(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + conv(n % 1000) : '');
    if (n < 10000000) return conv(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + conv(n % 100000) : '');
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

// ─── PlatformDiv: a real <div> on web (gives a true HTMLDivElement ref),
//     falls back to View on native. This guarantees .innerHTML works. ─────────
const PlatformDiv = Platform.OS === 'web'
  ? React.forwardRef(({ style, id, ...rest }, ref) => (
      // eslint-disable-next-line react/no-unknown-property
      <div ref={ref} id={id} style={style} {...rest} />
    ))
  : View;

// ─── Company info ─────────────────────────────────────────────────────────────
// CO is now populated at runtime from bill.branch_profile — see buildInvoiceHTML()

// ─── Print helpers (web only) ─────────────────────────────────────────────────
const PRINT_STYLE_ID = 'inv-print-style';

function injectPrintCSS() {
  if (Platform.OS !== 'web') return;
  let el = document.getElementById(PRINT_STYLE_ID);
  if (!el) { el = document.createElement('style'); el.id = PRINT_STYLE_ID; document.head.appendChild(el); }
  el.textContent = `
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      body > * { visibility: hidden !important; }
      #inv-print-root, #inv-print-root * { visibility: visible !important; }
      #inv-print-root {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 190mm !important; background: #fff !important;
      }
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
    window.addEventListener('afterprint', removePrintCSS, { once: true });
  }, 80);
}

// ─── Build HTML invoice string ────────────────────────────────────────────────
function buildInvoiceHTML(bill) {
  // Resolve branch profile (populated by the bill API via joinedload)
  const bp = bill.branch_profile || {};
  const CO = {
    name:         bp.company_name    || 'Your Mill Name (P) Ltd',
    address:      bp.address_line1   || 'Industrial Area, Plot No. XX',
    address2:     bp.address_line2   || '',
    city:         [bp.city, bp.pin_code].filter(Boolean).join(' - ') || 'Your City',
    state:        bp.state           || 'Your State',
    stateCode:    bp.state_code      || '00',
    cin:          bp.cin             || 'U00000XX0000PTC000000',
    gstin:        bp.gstin           || 'XXXXXXXXXXXXXXXXX',
    pan:          bp.pan             || 'XXXXXXXXXX',
    jurisdiction: bp.jurisdiction    || 'YOUR CITY',
    phone:        bp.phone           || '',
    email:        bp.email           || '',
  };
  const cust     = bill.order?.customer || {};
  const custName = cust.customer_name   || bill.destination || '—';
  const custGSTIN= cust.gst_number      || '—';
  const custState= cust.state           || '—';
  const custAddr = [cust.address, cust.city, cust.state, cust.pin_code].filter(Boolean).join(', ') || '—';
  const vehicleNo= bill.dispatch?.truck?.truck_number  || '—';
  const driverNm = bill.dispatch?.driver?.driver_name  || '—';
  const buyerOrd = bill.order?.order_code              || '—';
  const items    = bill.items || [];
  const totalBags= items.reduce((s, it) => s + (it.quantity_bags || 0), 0);

  const hasCGST = (bill.cgst_percent || 0) > 0;
  const hasSGST = (bill.sgst_percent || 0) > 0;
  const hasIGST = (bill.igst_percent || 0) > 0;

  const hsnMap = {};
  items.forEach(it => { const k = it.hsn_sac_code || 'N/A'; hsnMap[k] = (hsnMap[k] || 0) + (it.amount || 0); });
  const hsnRows = Object.entries(hsnMap);
  const taxWords = (bill.total_tax_amount || 0) > 0 ? amountInWords(bill.total_tax_amount) : 'NIL';

  const B  = (v, fb = '') => (v != null) ? String(v) : fb;
  const N  = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const D  = (d) => d ? formatISTDate(d) : '';

  // ── Reusable CSS fragments ──
  const BRD  = 'border:1px solid #000;';
  const BR   = 'border-right:1px solid #000;';
  const BB   = 'border-bottom:1px solid #000;';
  const BT   = 'border-top:1px solid #000;';
  const BT2  = 'border-top:2px solid #000;';
  const LBL  = 'font-size:8.5pt;color:#555;padding:3px 6px;vertical-align:top;';
  const VAL  = 'font-size:10pt;font-weight:600;padding:3px 6px;vertical-align:top;';
  const P6   = 'padding:6px;';
  const BGTH = 'background:#f0f0f0;';
  const BGTL = 'background:#f7f7f7;';
  const CELL = 'padding:4px 6px;vertical-align:middle;';

  // ── Build items rows ──
  let itemRows = '';
  items.forEach(it => {
    const isBag = (it.quantity_bags || 0) > 0;
    const qty   = isBag
      ? `<b>${it.quantity_bags} Bags</b><br><span style="font-size:8pt;color:#666;">(${(it.quantity_ton||0).toFixed(3)} kgs)</span>`
      : `<b>${(it.quantity_ton||0).toFixed(3)} kgs</b>`;
    const rate  = isBag ? N(it.rate_per_bag) : N(it.rate_per_ton);
    const unit  = isBag ? 'Bags' : 'Tons';
    itemRows += `
      <tr>
        <td style="${BR}${BB}${CELL}font-size:10.5pt;font-weight:700;">${B(it.product_name)}</td>
        <td style="${BR}${BB}${CELL}text-align:center;">${B(it.hsn_sac_code)}</td>
        <td style="${BR}${BB}${CELL}text-align:center;line-height:1.5;">${qty}</td>
        <td style="${BR}${BB}${CELL}text-align:right;">${rate}</td>
        <td style="${BR}${BB}${CELL}text-align:center;">${unit}</td>
        <td style="${BB}${CELL}text-align:right;padding-right:8px;font-weight:600;">${N(it.amount)}</td>
      </tr>`;
  });
  const padCount = Math.max(0, 5 - items.length);
  for (let i = 0; i < padCount; i++) {
    itemRows += `<tr style="height:22px;"><td style="${BR}${BB}"></td><td style="${BR}${BB}"></td><td style="${BR}${BB}"></td><td style="${BR}${BB}"></td><td style="${BR}${BB}"></td><td style="${BB}"></td></tr>`;
  }

  // ── Build HSN summary rows ──
  let hsnThCols = `<th style="${BR}${BGTH}${P6}text-align:left;font-size:9.5pt;">HSN/SAC</th>
                   <th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">Taxable Value</th>`;
  if (hasCGST) hsnThCols += `<th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">CGST %</th><th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">CGST Amt</th>`;
  if (hasSGST) hsnThCols += `<th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">SGST %</th><th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">SGST Amt</th>`;
  if (hasIGST) hsnThCols += `<th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">IGST %</th><th style="${BR}${BGTH}${P6}text-align:center;font-size:9.5pt;">IGST Amt</th>`;
  hsnThCols += `<th style="${BGTH}${P6}text-align:right;font-size:9.5pt;padding-right:8px;">Taxable Value</th>`;

  let hsnDataRows = '';
  hsnRows.forEach(([hsn, amt]) => {
    hsnDataRows += `
      <tr>
        <td style="${BR}${BB}${CELL}">${hsn}</td>
        <td style="${BR}${BB}${CELL}text-align:right;">${N(amt)}</td>
        ${hasCGST ? `<td style="${BR}${BB}${CELL}text-align:center;">${bill.cgst_percent}%</td><td style="${BR}${BB}${CELL}text-align:right;">${N(bill.cgst_amount)}</td>` : ''}
        ${hasSGST ? `<td style="${BR}${BB}${CELL}text-align:center;">${bill.sgst_percent}%</td><td style="${BR}${BB}${CELL}text-align:right;">${N(bill.sgst_amount)}</td>` : ''}
        ${hasIGST ? `<td style="${BR}${BB}${CELL}text-align:center;">${bill.igst_percent}%</td><td style="${BR}${BB}${CELL}text-align:right;">${N(bill.igst_amount)}</td>` : ''}
        <td style="${BB}${CELL}text-align:right;padding-right:8px;font-weight:700;">${N(amt)}</td>
      </tr>`;
  });

  let hsnTotalCols = `<td style="${BR}${BT2}${CELL}${BGTL}font-weight:900;">Total</td>
                      <td style="${BR}${BT2}${CELL}${BGTL}text-align:right;font-weight:900;">${N(bill.taxable_value)}</td>`;
  if (hasCGST) hsnTotalCols += `<td style="${BR}${BT2}${CELL}${BGTL}"></td><td style="${BR}${BT2}${CELL}${BGTL}text-align:right;font-weight:900;">${N(bill.cgst_amount)}</td>`;
  if (hasSGST) hsnTotalCols += `<td style="${BR}${BT2}${CELL}${BGTL}"></td><td style="${BR}${BT2}${CELL}${BGTL}text-align:right;font-weight:900;">${N(bill.sgst_amount)}</td>`;
  if (hasIGST) hsnTotalCols += `<td style="${BR}${BT2}${CELL}${BGTL}"></td><td style="${BR}${BT2}${CELL}${BGTL}text-align:right;font-weight:900;">${N(bill.igst_amount)}</td>`;
  hsnTotalCols += `<td style="${BT2}${CELL}${BGTL}text-align:right;padding-right:8px;font-weight:900;">${N(bill.total_amount)}</td>`;

  return `
<div style="font-family:Arial,sans-serif;font-size:10pt;line-height:1.4;color:#000;">
<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;${BRD}">

  <!-- ─── Section 1: Company | Heading | Meta ─── -->
  <tr>
    <td width="35%" style="${BR}${BB}${P6}vertical-align:top;">
      <div style="font-size:12pt;font-weight:900;margin-bottom:3px;">${CO.name}</div>
      <div style="font-size:9pt;line-height:1.5;">${CO.address}</div>
      ${CO.address2 ? `<div style="font-size:9pt;line-height:1.5;">${CO.address2}</div>` : ''}
      <div style="font-size:9pt;line-height:1.5;">${CO.city}</div>
      <div style="font-size:9pt;line-height:1.5;">CIN : ${CO.cin}</div>
      <div style="font-size:9pt;line-height:1.5;">GSTIN/UIN : ${CO.gstin}</div>
      <div style="font-size:9pt;line-height:1.5;">State Name : ${CO.state}, Code : ${CO.stateCode}</div>
      ${CO.phone ? `<div style="font-size:9pt;line-height:1.5;">Ph : ${CO.phone}</div>` : ''}
    </td>
    <td width="30%" style="${BR}${BB}text-align:center;vertical-align:middle;padding:14px 8px;">
      <div style="font-size:17pt;font-weight:900;letter-spacing:0.5px;">Tax Invoice</div>
      <div style="font-size:8pt;font-style:italic;margin-top:5px;color:#444;">(ORIGINAL FOR RECIPIENT)</div>
    </td>
    <td width="35%" style="${BB}padding:0;vertical-align:top;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td width="50%" style="${BR}${BB}${LBL}">Invoice No.</td><td style="${BB}${LBL}">Dated</td></tr>
        <tr><td style="${BR}${BB}${VAL}">${B(bill.invoice_number)}</td><td style="${BB}${VAL}">${D(bill.invoice_date)}</td></tr>
        <tr><td style="${BR}${BB}${LBL}">Delivery Note</td><td style="${BB}${LBL}">Mode/Terms of Payment</td></tr>
        <tr><td style="${BR}${BB}${VAL}">${B(bill.delivery_note_no)}</td><td style="${BB}${VAL}">${B(bill.terms_of_delivery)}</td></tr>
        <tr><td style="${BR}${BB}${LBL}">Reference No. &amp; Date</td><td style="${BB}${LBL}">Other References</td></tr>
        <tr><td style="${BR}${VAL}">${B(bill.reference_no)}</td><td style="${VAL}">${B(bill.other_references)}</td></tr>
      </table>
    </td>
  </tr>

  <!-- ─── Section 2: Consignee label | Buyer Order | Dispatch Doc ─── -->
  <tr>
    <td style="${BR}${BB}${LBL}font-weight:700;color:#555;">Consignee (Ship to)</td>
    <td style="${BR}${BB}padding:0;vertical-align:top;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td width="50%" style="${BR}${BB}${LBL}">Buyer's Order No.</td><td style="${BB}${LBL}">Dated</td></tr>
        <tr><td style="${BR}${VAL}">${buyerOrd}</td><td style="${VAL}">${D(bill.invoice_date)}</td></tr>
      </table>
    </td>
    <td style="${BB}padding:0;vertical-align:top;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td width="50%" style="${BR}${BB}${LBL}">Dispatch Doc No.</td><td style="${BB}${LBL}">Delivery Note Date</td></tr>
        <tr><td style="${BR}${VAL}">${B(bill.dispatch_id)}</td><td style="${VAL}">${bill.delivery_note_date ? D(bill.delivery_note_date) : ''}</td></tr>
      </table>
    </td>
  </tr>

  <!-- ─── Section 3: Consignee address | Dispatch/Dest/LR/Vehicle ─── -->
  <tr>
    <td style="${BR}${BB}${P6}vertical-align:top;">
      <div style="font-size:11pt;font-weight:900;margin-bottom:2px;">${custName}</div>
      <div style="font-size:9pt;line-height:1.5;">${custAddr}</div>
      <div style="font-size:9pt;line-height:1.5;">GSTIN/UIN &nbsp;:&nbsp; ${custGSTIN}</div>
      <div style="font-size:9pt;line-height:1.5;">State Name &nbsp;:&nbsp; ${custState}</div>
    </td>
    <td colspan="2" style="${BB}padding:0;vertical-align:top;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td width="50%" style="${BR}${BB}${LBL}">Dispatched through</td>
          <td style="${BB}${LBL}">Destination</td>
        </tr>
        <tr>
          <td style="${BR}${BB}${VAL}">${driverNm}</td>
          <td style="${BB}${VAL}">${B(bill.destination, '—')}</td>
        </tr>
        <tr>
          <td style="${BR}${BB}${LBL}">Bill of Lading / LR-RR No.</td>
          <td style="${BB}${LBL}">Motor Vehicle No.</td>
        </tr>
        <tr>
          <td style="${BR}${VAL}">${B(bill.lr_rr_no)}</td>
          <td style="${VAL}font-weight:900;">${vehicleNo}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ─── Section 4: Buyer (Bill to) | Terms of Delivery ─── -->
  <tr>
    <td style="${BR}${BB}${P6}vertical-align:top;">
      <div style="font-size:8.5pt;font-weight:700;color:#555;margin-bottom:4px;">Buyer (Bill to)</div>
      <div style="font-size:11pt;font-weight:900;margin-bottom:2px;">${custName}</div>
      <div style="font-size:9pt;line-height:1.5;">${custAddr}</div>
      <div style="font-size:9pt;line-height:1.5;">GSTIN/UIN &nbsp;:&nbsp; ${custGSTIN}</div>
      <div style="font-size:9pt;line-height:1.5;">State Name &nbsp;:&nbsp; ${custState}</div>
    </td>
    <td colspan="2" style="${BB}${P6}vertical-align:top;">
      <div style="font-size:8.5pt;color:#555;margin-bottom:4px;">Terms of Delivery</div>
      <div style="font-weight:600;">${B(bill.terms_of_delivery)}</div>
    </td>
  </tr>

  <!-- ─── Items table ─── -->
  <tr>
    <td colspan="3" style="${BB}padding:0;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <!-- Header -->
        <tr style="${BGTH}">
          <th width="31%" style="${BR}${BB}padding:5px 6px;text-align:left;">Description of Goods</th>
          <th width="12%" style="${BR}${BB}padding:5px 6px;text-align:center;">HSN/SAC</th>
          <th width="16%" style="${BR}${BB}padding:5px 6px;text-align:center;">Quantity</th>
          <th width="15%" style="${BR}${BB}padding:5px 6px;text-align:center;">Rate</th>
          <th width="9%"  style="${BR}${BB}padding:5px 6px;text-align:center;">per</th>
          <th width="17%" style="${BB}padding:5px 8px 5px 6px;text-align:right;">Amount</th>
        </tr>
        <!-- Data rows + padding rows -->
        ${itemRows}
        <!-- Total -->
        <tr style="${BGTL}">
          <td style="${BR}${BT2}padding:5px 6px;font-size:11pt;font-weight:900;">Total</td>
          <td style="${BR}${BT2}padding:5px 6px;"></td>
          <td style="${BR}${BT2}padding:5px 6px;text-align:center;font-size:11pt;font-weight:900;">${totalBags > 0 ? totalBags + ' Bags' : ''}</td>
          <td style="${BR}${BT2}padding:5px 6px;"></td>
          <td style="${BR}${BT2}padding:5px 6px;"></td>
          <td style="${BT2}padding:5px 8px 5px 6px;text-align:right;font-size:11pt;font-weight:900;">${N(bill.total_amount)} ₹</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ─── Amount in words ─── -->
  <tr>
    <td colspan="3" style="${BB}${P6}">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:8.5pt;color:#666;margin-bottom:2px;">Amount Chargeable (in words)</div>
          <div style="font-size:11pt;font-weight:900;">${amountInWords(bill.total_amount)}</div>
        </div>
        <div style="font-size:8.5pt;color:#666;font-style:italic;white-space:nowrap;margin-left:12px;">E. &amp; O.E</div>
      </div>
    </td>
  </tr>

  <!-- ─── HSN/SAC Summary ─── -->
  <tr>
    <td colspan="3" style="${BB}padding:0;">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>${hsnThCols}</tr>
        ${hsnDataRows}
        <tr>${hsnTotalCols}</tr>
      </table>
    </td>
  </tr>

  <!-- ─── Tax amount in words + PAN ─── -->
  <tr>
    <td colspan="3" style="${BB}${P6}font-size:9pt;line-height:1.7;">
      Tax Amount (in words) &nbsp;:&nbsp; <b>${taxWords}</b>
      &nbsp;&nbsp;&nbsp;&nbsp;
      Company's PAN &nbsp;:&nbsp; <b>${CO.pan}</b>
    </td>
  </tr>

  <!-- ─── Declaration + Signatory ─── -->
  <tr>
    <td style="${BR}${BB}${P6}vertical-align:top;width:60%;">
      <div style="font-size:8.5pt;font-weight:700;color:#555;margin-bottom:4px;">Declaration</div>
      <div style="font-size:9pt;line-height:1.6;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
    </td>
    <td colspan="2" style="${BB}${P6}text-align:right;vertical-align:top;">
      <div style="font-size:9pt;">for <b>${CO.name}</b></div>
      <div style="font-size:9pt;font-style:italic;margin-top:30px;">Authorised Signatory</div>
    </td>
  </tr>

  <!-- ─── Jurisdiction ─── -->
  <tr>
    <td colspan="3" style="${BB}padding:5px;text-align:center;font-weight:700;font-size:9.5pt;">
      SUBJECT TO ${CO.jurisdiction.toUpperCase()} JURISDICTION
    </td>
  </tr>

  <!-- ─── Computer generated ─── -->
  <tr>
    <td colspan="3" style="padding:4px;text-align:center;font-size:8.5pt;color:#777;">
      This is a Computer Generated Invoice
    </td>
  </tr>

</table>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function DeliveryBillsScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const filterDispatchId = route?.params?.dispatch_id || null;

  const [bills, setBills]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [previewBill, setPreviewBill]       = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDispatchId) params.dispatch_id = filterDispatchId;
      const res = await deliveryBillApi.getAll(params);
      setBills(res.data || []);
    } catch { showError('Failed to load bills'); }
    finally   { setLoading(false); }
  }, [filterDispatchId]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleUpdateStatus = async (billId, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await deliveryBillApi.updatePaymentStatus(billId, newStatus);
      setPreviewBill(res.data);
      await loadBills();
      showSuccess('Payment status updated');
    } catch { showError('Failed to update status'); }
    finally   { setUpdatingStatus(false); }
  };

  const handleDelete = async (bill) => {
    const ok = await showConfirm('Delete Bill', `Delete invoice ${bill.invoice_number}?`);
    if (!ok) return;
    try {
      await deliveryBillApi.delete(bill.id);
      showSuccess('Bill deleted');
      loadBills();
      if (previewBill?.id === bill.id) setPreviewBill(null);
    } catch { showError('Failed to delete bill'); }
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
                  {!isMobile && <Text style={[ls.cell, colWidth('Dispatch', isMobile)]}>#{bill.dispatch_id}</Text>}
                  <Text style={[ls.cell, colWidth('Customer', isMobile)]} numberOfLines={1}>{customerName}</Text>
                  {!isMobile && <Text style={[ls.cell, colWidth('Date', isMobile)]}>{formatISTDate(bill.invoice_date)}</Text>}
                  {!isMobile && <Text style={[ls.cell, colWidth('Taxable', isMobile)]}>₹{(bill.taxable_value||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</Text>}
                  {!isMobile && <Text style={[ls.cell, colWidth('Tax', isMobile)]}>₹{(bill.total_tax_amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</Text>}
                  <Text style={[ls.cell, colWidth('Amount', isMobile), ls.amountCell]}>₹{(bill.total_amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</Text>
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
// BILL PREVIEW — uses real HTML <table> on web for pixel-perfect alignment
// ═══════════════════════════════════════════════════════════════════════════════
function BillPreview({ bill, onClose, onUpdateStatus, onDelete, updatingStatus }) {
  const sc = STATUS_COLORS[bill.payment_status] || STATUS_COLORS.PENDING;
  const invoiceRef = useRef(null);

  // Inject HTML after mount. Because PlatformDiv renders a real <div> on web,
  // invoiceRef.current is a true HTMLDivElement and .innerHTML is guaranteed.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (invoiceRef.current) {
      invoiceRef.current.innerHTML = buildInvoiceHTML(bill);
    }
  }, [bill]);

  return (
    <View>
      {/* ── Toolbar ── */}
      <View style={inv.toolbar}>
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

      {/* ── Invoice body ──
          PlatformDiv renders a real <div> on web → ref.current is HTMLDivElement
          → innerHTML works perfectly. On native it falls back to a View.        ── */}
      <PlatformDiv
        ref={invoiceRef}
        id="inv-print-root"
        style={{ marginBottom: 4 }}
      />

      {/* ── Action Buttons ── */}
      <View style={inv.actions}>
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

// ─── Invoice toolbar/button styles ────────────────────────────────────────────
const inv = StyleSheet.create({
  toolbar:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pill:         { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:     { fontSize: 11, fontWeight: '700' },
  invNoLabel:   { fontSize: 13, fontWeight: '700', color: colors.primary },
  printBtn:     { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  printBtnText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  closeBtn:     { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  closeBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  actions:      { paddingTop: 12, gap: 10 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  markLabel:    { fontSize: 12, color: '#374151', fontWeight: '600', marginRight: 4 },
  sBtn:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db' },
  sBtnActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  sBtnTxt:      { fontSize: 12, fontWeight: '600', color: '#374151' },
  sBtnTxtActive:{ color: '#fff' },
  btnRow:       { flexDirection: 'row', gap: 10 },
  delBtn:       { flex: 1, paddingVertical: 11, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', alignItems: 'center' },
  delBtnTxt:    { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  closeActionBtn:    { flex: 2, paddingVertical: 11, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center' },
  closeActionBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

// ─── List-view styles ─────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  filterBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  filterText:   { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  filterClear:  { fontSize: 13, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  emptyBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyNote:    { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  tableWrap:    { flex: 1 },
  table:        { minWidth: '100%' },
  row:          { flexDirection: 'row', alignItems: 'center' },
  headerRow:    { backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  dataRow:      { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 4 },
  cell:         { paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 },
  headerCell:   { fontWeight: '700', color: '#374151', fontSize: 12 },
  invoiceCell:  { color: colors.primary, fontWeight: '600' },
  amountCell:   { fontWeight: '700', color: '#111827' },
  statusPill:   { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText:   { fontSize: 11, fontWeight: '700' },
  viewBtn:      { backgroundColor: colors.primary, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 },
  viewBtnText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  previewPanel: {
    backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 780, maxHeight: '95%',
    ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }, default: { elevation: 12 } }),
  },
  previewPanelMobile: { maxWidth: '100%' },
});
