/* =============================================
   PPK-Canteen — app.js
   SPA Router + All Page Modules
   ============================================= */
'use strict';

// ── Page Registry ──
const APP_PAGES = {
  'dashboard':        { render: pgDashboard, roles: null },
  'stalls':           { render: pgStalls, roles: ['admin'] },
  'contracts':        { render: pgContracts, roles: ['admin'] },
  'users':            { render: pgUsers, roles: ['admin'] },
  'documents':        { render: pgDocuments, roles: ['admin'] },
  'biddings':         { render: pgBiddings, roles: ['admin'] },

  'bills':            { render: pgBills, roles: ['admin','staff'] },
  'payments':         { render: pgPayments, roles: ['admin','staff'] },
  'receipts':         { render: pgReceipts, roles: ['admin','staff'] },
  'inspections':      { render: pgInspections, roles: ['admin','inspector','executive'] },
  'penalties':        { render: pgPenalties, roles: ['admin','inspector'] },
  'menus-admin':      { render: pgMenusAdmin, roles: ['admin'] },
  'complaints-admin': { render: pgComplaintsAdmin, roles: ['admin','executive'] },
  'reports':          { render: pgReports, roles: ['admin','executive'] },
  'activity-log':     { render: pgActivityLog, roles: ['admin'] },
  'settings':         { render: pgSettings, roles: ['admin'] },
  'notifications':    { render: pgNotifications, roles: null },
  'profile':          { render: pgProfile, roles: null },
  // Stall Owner pages
  'my-bills':         { render: pgMyBills, roles: ['stall_owner'] },
  'my-payments':      { render: pgMyPayments, roles: ['stall_owner'] },
  'upload-slip':      { render: pgUploadSlip, roles: ['stall_owner'] },
  'my-contract':      { render: pgMyContract, roles: ['stall_owner'] },
  'my-menus':         { render: pgMyMenus, roles: ['stall_owner'] },
  'my-inspections':   { render: pgMyInspections, roles: ['stall_owner'] },
  // New HOME-PPK-style pages
  'record-water':     { render: pgRecordWater, roles: ['admin','staff'] },
  'record-electric':  { render: pgRecordElectric, roles: ['admin','staff'] },
  'notify-bills':     { render: pgNotifyBills, roles: ['admin','staff'] },
  'check-slips':      { render: pgCheckSlips, roles: ['admin','staff'] },
};

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
async function pgDashboard() {
  const el = document.getElementById('content');
  const user = getCurrentUser();

  if (user.role === 'stall_owner') return pgDashboardStallOwner(el, user);
  if (user.role === 'executive') return pgDashboardExec(el, user);
  if (user.role === 'inspector') return pgDashboardInspector(el, user);

  // Admin / staff dashboard
  const stats = await callAPI('GET', '/reports/dashboard-stats');
  const s = stats.data || {};

  // Admin Stats Bar
  const pendingSlips = s.pending_payments || 0;
  const overdueCount = s.overdue_bills || 0;
  const collectionRate = s.collection_rate;

  el.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat" onclick="location.hash='#/stalls'">
        <div class="admin-stat-icon">🏪</div>
        <div class="admin-stat-value ok">${s.total_stalls || 0}</div>
        <div class="admin-stat-label">ร้านค้าทั้งหมด</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/contracts'">
        <div class="admin-stat-icon">📋</div>
        <div class="admin-stat-value ok">${s.occupied_stalls || 0}</div>
        <div class="admin-stat-label">มีผู้เช่า</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/check-slips'">
        <div class="admin-stat-icon">🔍</div>
        <div class="admin-stat-value ${pendingSlips > 0 ? 'danger' : 'ok'}">${pendingSlips}</div>
        <div class="admin-stat-label">สลิปรอตรวจ</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/bills'">
        <div class="admin-stat-icon">⏳</div>
        <div class="admin-stat-value ${overdueCount > 0 ? 'danger' : 'ok'}">${overdueCount}</div>
        <div class="admin-stat-label">บิลค้างชำระ</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/payments'">
        <div class="admin-stat-icon">💰</div>
        <div class="admin-stat-value">${collectionRate != null ? collectionRate + '%' : '—'}</div>
        <div class="admin-stat-label">ชำระแล้วเดือนนี้</div>
      </div>
    </div>

    <div class="hub-grid" id="adminHubGrid"></div>`;

  // Build Hub Grid
  buildAdminHubGrid(user);
}

function buildAdminHubGrid(user) {
  const grid = document.getElementById('adminHubGrid');
  if (!grid) return;
  const isAdmin = user.role === 'admin';

  const sections = [
    { title: '📊 จัดการข้อมูล', items: [
      { path: 'stalls', icon: '🏪', label: 'ร้านค้า', bg: '#F0FDF4' },
      { path: 'contracts', icon: '📋', label: 'สัญญาเช่า', bg: '#EFF6FF' },
      { path: 'users', icon: '👥', label: 'ผู้ใช้งาน', bg: '#EEF2FF' },
      { path: 'documents', icon: '📁', label: 'เอกสาร', bg: '#FFF7ED' },
      { path: 'biddings', icon: '🔨', label: 'ประมูล', bg: '#FFFBEB' },
    ]},
    { title: '💰 การเงิน', items: [
      { path: 'record-water', icon: '💧', label: 'บันทึกค่าน้ำ', bg: '#EFF6FF' },
      { path: 'record-electric', icon: '⚡', label: 'บันทึกค่าไฟ', bg: '#FFFBEB' },
      { path: 'notify-bills', icon: '📢', label: 'แจ้งยอดชำระ', bg: '#FEF2F2' },
      { path: 'check-slips', icon: '🔍', label: 'ตรวจสลิป', bg: '#F0FDF4' },
      { path: 'receipts', icon: '🧾', label: 'ใบเสร็จ', bg: '#FFFBEB' },
      { path: 'bills', icon: '💰', label: 'ใบแจ้งหนี้', bg: '#EEF2FF' },
      { path: 'payments', icon: '💳', label: 'การชำระเงิน', bg: '#F0FDF4' },
    ]},
    { title: '🔍 คุณภาพ', items: [
      { path: 'inspections', icon: '🔍', label: 'ตรวจสุขอนามัย', bg: '#F0FDF4' },
      { path: 'penalties', icon: '⚠️', label: 'เตือน/ลงโทษ', bg: '#FEF2F2' },
      { path: 'menus-admin', icon: '🍜', label: 'เมนู/ราคา', bg: '#FFFBEB' },
      { path: 'complaints-admin', icon: '📢', label: 'ข้อร้องเรียน', bg: '#FFF7ED' },
    ]},
    { title: '⚙️ ระบบ', items: [
      { path: 'reports', icon: '📈', label: 'รายงาน', bg: '#EEF2FF' },
      { path: 'activity-log', icon: '📝', label: 'ประวัติ', bg: '#F1F5F9' },
      { path: 'settings', icon: '⚙️', label: 'ตั้งค่า', bg: '#F1F5F9' },
    ]},
  ];

  // Filter sections based on role
  const viewSections = isAdmin ? sections : sections.filter(s => s.title.includes('การเงิน'));

  let html = '';
  for (const sec of viewSections) {
    html += `<div class="hub-section">${sec.title}</div>`;
    for (const item of sec.items) {
      html += `<a class="hub-item" href="#/${item.path}">
        <div class="hub-icon" style="background:${item.bg}">${item.icon}</div>
        <span class="hub-label">${item.label}</span>
      </a>`;
    }
  }
  grid.innerHTML = html;
}

async function pgDashboardStallOwner(el, user) {
  const realRole = user.real_role || user.role;
  const isSimulating = realRole === 'admin' && user.role === 'stall_owner';

  // If admin simulating stall_owner without stall_id, show stall picker
  if (isSimulating && !user.stall_id) {
    const stallsRes = await callAPI('GET', '/stalls');
    const stalls = (stallsRes.data || []).filter(s => s.status === 'occupied');
    if (!stalls.length) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-light)">ยังไม่มีร้านค้าที่มีผู้เช่า</div>`;
      return;
    }
    el.innerHTML = `
      <div class="page-header"><h1>👁️ จำลองมุมมองเจ้าของร้าน</h1></div>
      <div class="card" style="max-width:500px">
        <div class="card-header"><h3>เลือกร้านที่ต้องการดู</h3></div>
        <div style="padding:1rem">
          <select id="sim-stall" class="form-select" style="margin-bottom:1rem">
            ${stalls.map(s => `<option value="${s.id}">${escapeHtml(s.name || s.zone + '-' + s.number)} [${s.status}]</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="simulateStallOwner()" style="width:100%">📊 ดูแดชบอร์ดร้านนี้</button>
        </div>
      </div>`;
    return;
  }

  const stallId = user.stall_id;
  const [billsRes, contractRes, paymentsRes, stallsRes, bankRes, bankNoRes, bankNameRes, ppRes] = await Promise.all([
    callAPI('GET', '/billing/bills?stall_id=' + stallId + '&limit=20'),
    callAPI('GET', '/contracts?stall_id=' + stallId + '&status=active'),
    callAPI('GET', '/payments?stall_id=' + stallId + '&limit=10'),
    isSimulating ? callAPI('GET', '/stalls') : Promise.resolve(null),
    callAPI('GET', '/settings/bank_name'),
    callAPI('GET', '/settings/bank_account_no'),
    callAPI('GET', '/settings/bank_account_name'),
    callAPI('GET', '/settings/promptpay_id')
  ]);
  const bills = billsRes.data || [];
  const contract = (contractRes.data || [])[0] || {};
  const payments = paymentsRes.data || [];
  const allStalls = isSimulating ? (stallsRes?.data || []).filter(s => s.status === 'occupied') : [];
  const bankName = bankRes.data?.value || '';
  const bankAccountNo = bankNoRes.data?.value || '';
  const bankAccountName = bankNameRes.data?.value || '';
  const promptPayId = ppRes.data?.value || '';

  // Find latest active bill
  const activeBill = bills.find(b => b.status === 'issued' || b.status === 'overdue') || null;
  const amount = activeBill ? (activeBill.total_amount || 0) : 0;

  // Fetch meter readings for this bill's period
  let waterReading = null, electricReading = null;
  if (activeBill && activeBill.billing_period_id) {
    const readRes = await callAPI('GET', '/billing/readings?stall_id=' + stallId + '&period_id=' + activeBill.billing_period_id);
    const readings = readRes.data || [];
    waterReading = readings.find(r => r.type === 'water') || null;
    electricReading = readings.find(r => r.type === 'electric') || null;
  }

  // Check if there's a pending/reviewing payment for this bill
  let slipStatus = 'none';
  let reviewNote = '';
  let paymentId = null;
  if (activeBill) {
    const billPayment = payments.find(p => p.bill_id === activeBill.id);
    if (billPayment) {
      paymentId = billPayment.id;
      if (billPayment.status === 'approved' || billPayment.status === 'verified') slipStatus = 'success';
      else if (billPayment.status === 'rejected') { slipStatus = 'rejected'; reviewNote = billPayment.notes || ''; }
      else if (billPayment.status === 'pending') slipStatus = 'reviewing';
    }
  }

  // Compute outstanding (overdue bills total)
  const overdueBills = bills.filter(b => b.status === 'overdue');
  const outstanding = overdueBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const periodLabel = activeBill ? (activeBill.period_label || '') : '';
  const stallName = user.stall_name || contract.stall_name || 'ร้านของฉัน';
  const firstName = user.name || '';

  // Stall switcher (admin simulation)
  let stallSwitcherHTML = '';
  if (isSimulating && allStalls.length > 1) {
    const opts = allStalls.map(s => `<option value="${s.id}" ${s.id === stallId ? 'selected' : ''}>${escapeHtml(s.name || s.zone + '-' + s.number)}</option>`).join('');
    stallSwitcherHTML = `<select class="stall-switcher" onchange="switchSimStall(this.value)">${opts}</select>`;
  }

  // -- Format date helper --
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }) : '-';

  // -- Due date --
  let dueDateHTML = '';
  let dueDateStr = '';
  if (activeBill && activeBill.due_date && amount > 0 && slipStatus !== 'success') {
    const dd = new Date(activeBill.due_date);
    dueDateStr = dd.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });
    const daysLeft = Math.ceil((dd - new Date()) / 86400000);
    let cls = '';
    let daysText = '';
    if (daysLeft < 0) { cls = 'urgent'; daysText = ` (เลยกำหนด ${Math.abs(daysLeft)} วัน)`; }
    else if (daysLeft === 0) { cls = 'urgent'; daysText = ' (ครบกำหนดวันนี้!)'; }
    else if (daysLeft <= 3) { cls = 'soon'; daysText = ` (เหลือ ${daysLeft} วัน)`; }
    else if (daysLeft <= 7) { daysText = ` (เหลือ ${daysLeft} วัน)`; }
    dueDateHTML = `<div class="so-due ${cls}">⏰ ชำระภายใน ${escapeHtml(dueDateStr)}${daysText}</div>`;
  }

  // -- Status badge --
  let badgeHTML = '';
  if (slipStatus === 'success') badgeHTML = '<span class="so-badge paid">✅ ชำระแล้ว</span>';
  else if (slipStatus === 'reviewing') badgeHTML = '<span class="so-badge pending">🔍 รอตรวจสอบ</span>';
  else if (slipStatus === 'rejected') badgeHTML = '<span class="so-badge rejected">❌ สลิปไม่ผ่าน</span>';
  else if (amount > 0) badgeHTML = '<span class="so-badge waiting">⏳ รอชำระ</span>';

  // -- Rejection banner --
  let rejectHTML = '';
  if (slipStatus === 'rejected') {
    rejectHTML = `<div class="so-reject">⚠️ <strong>สลิปถูกปฏิเสธ</strong>${reviewNote ? ' — ' + escapeHtml(reviewNote) : ''}</div>`;
  }

  // -- CTA --
  let ctaHTML = '';
  if (slipStatus === 'success') {
    ctaHTML = '<button class="so-cta paid" disabled>✅ ชำระสำเร็จแล้ว</button>';
  } else if (slipStatus === 'reviewing') {
    ctaHTML = '<button class="so-cta reviewing" disabled>🔍 อยู่ระหว่างตรวจสอบ</button>';
  } else if (slipStatus === 'rejected') {
    ctaHTML = `<button class="so-cta rejected" onclick="location.hash='#/upload-slip'">⚠️ สลิปไม่ผ่าน — กดส่งใหม่</button>`;
  } else if (amount > 0) {
    ctaHTML = `<button class="so-cta pay" onclick="location.hash='#/upload-slip'">📤 ส่งสลิปชำระเงิน</button>`;
  }

  // -- Cancel slip --
  let cancelHTML = '';
  if (slipStatus === 'reviewing' || slipStatus === 'rejected') {
    cancelHTML = `<button class="so-cancel-btn" onclick="cancelSlipFromDashboard(${paymentId})">🗑️ ยกเลิกสลิปที่ส่งไว้</button>`;
  }

  // -- Meter readings rows --
  const w = activeBill ? (activeBill.water_amount || 0) : 0;
  const e = activeBill ? (activeBill.electric_amount || 0) : 0;
  const r = activeBill ? (activeBill.rent_amount || 0) : 0;
  const c = activeBill ? (activeBill.common_fee || 0) : 0;
  const wUnits = activeBill ? (activeBill.water_units || 0) : 0;
  const eUnits = activeBill ? (activeBill.electric_units || 0) : 0;

  // Build invoice table rows
  let invoiceRows = '';
  if (r > 0) invoiceRows += `<tr><td>🏪 ค่าเช่าแผงค้า</td><td class="r">-</td><td class="r">-</td><td class="r">-</td><td class="r">-</td><td class="r"><strong>${formatMoney(r)}</strong></td></tr>`;
  if (waterReading || wUnits > 0) {
    const wp = waterReading ? waterReading.prev_reading : '-';
    const wc = waterReading ? waterReading.curr_reading : '-';
    const wd = waterReading ? fmtDate(waterReading.read_at) : '-';
    invoiceRows += `<tr><td>💧 ค่าน้ำประปา</td><td class="r">${wp}</td><td class="r">${wc}</td><td class="r">${wUnits}</td><td class="r">${wd}</td><td class="r"><strong>${formatMoney(w)}</strong></td></tr>`;
  }
  if (electricReading || eUnits > 0) {
    const ep = electricReading ? electricReading.prev_reading : '-';
    const ec = electricReading ? electricReading.curr_reading : '-';
    const ed = electricReading ? fmtDate(electricReading.read_at) : '-';
    invoiceRows += `<tr><td>⚡ ค่าไฟฟ้า</td><td class="r">${ep}</td><td class="r">${ec}</td><td class="r">${eUnits}</td><td class="r">${ed}</td><td class="r"><strong>${formatMoney(e)}</strong></td></tr>`;
  }
  if (c > 0) invoiceRows += `<tr><td>🧹 ค่าส่วนกลาง</td><td class="r">-</td><td class="r">-</td><td class="r">-</td><td class="r">-</td><td class="r"><strong>${formatMoney(c)}</strong></td></tr>`;

  // -- QR Code + Bank Account section --
  let qrSectionHTML = '';
  if (amount > 0 && slipStatus !== 'success' && slipStatus !== 'reviewing') {
    const hasBankInfo = bankName && bankAccountNo;
    const bankInfoHTML = hasBankInfo ? `
      <div class="so-bank-info">
        <div class="so-bank-row"><span class="so-bank-label">🏦 ธนาคาร</span><strong>${escapeHtml(bankName)}</strong></div>
        <div class="so-bank-row"><span class="so-bank-label">📋 เลขบัญชี</span><strong>${escapeHtml(bankAccountNo)}</strong></div>
        ${bankAccountName ? `<div class="so-bank-row"><span class="so-bank-label">👤 ชื่อบัญชี</span><strong>${escapeHtml(bankAccountName)}</strong></div>` : ''}
        <div class="so-bank-row"><span class="so-bank-label">💰 ยอดชำระ</span><strong style="color:#e11d48">${formatMoney(amount)} บาท</strong></div>
      </div>` : '';

    if (promptPayId) {
      qrSectionHTML = `
        <div class="so-qr-section">
          <div class="so-qr-title">📱 สแกน QR Code เพื่อชำระเงิน</div>
          <div id="so-qr-container" style="display:flex;justify-content:center;padding:1rem"></div>
          ${bankInfoHTML}
          <div class="so-qr-note">💡 หลังชำระแล้ว กรุณากด "ส่งสลิปชำระเงิน" พร้อมแนบสลิป</div>
        </div>`;
    } else if (hasBankInfo) {
      qrSectionHTML = `
        <div class="so-qr-section">
          <div class="so-qr-title">🏦 ข้อมูลสำหรับชำระเงิน</div>
          ${bankInfoHTML}
          <div class="so-qr-note">💡 หลังโอนเงินแล้ว กรุณากด "ส่งสลิปชำระเงิน" พร้อมแนบสลิป</div>
        </div>`;
    } else {
      qrSectionHTML = `
        <div class="so-qr-section">
          <div style="padding:1rem;color:#94a3b8;font-size:.9rem">⚠️ ยังไม่ได้ตั้งค่าข้อมูลบัญชีธนาคาร — กรุณาแจ้งผู้ดูแลระบบ</div>
        </div>`;
    }
  }

  // -- Payment stats --
  const paidCount = bills.filter(b => b.status === 'paid').length;
  const totalBills = bills.length;
  const paidTotal = bills.filter(b => b.status === 'paid').reduce((s, b) => s + (b.total_amount || 0), 0);

  el.innerHTML = `
    <div class="so-invoice-card">
      <div class="so-header">
        <div class="so-header-top">
          <div>
            <div class="so-greeting">สวัสดี${firstName ? ', ' + escapeHtml(firstName) : ''} 👋</div>
            <div class="so-stall-name">🏪 ${escapeHtml(stallName)} ${stallSwitcherHTML}</div>
          </div>
          <div style="text-align:right">${badgeHTML}</div>
        </div>
        ${periodLabel ? `<div class="so-period">📅 รอบบิล: <strong>${escapeHtml(periodLabel)}</strong></div>` : ''}
      </div>

      ${rejectHTML}

      ${activeBill && amount > 0 ? `
      <div class="so-invoice-body">
        <div class="so-invoice-title">📋 รายละเอียดค่าใช้จ่าย</div>
        <div class="so-table-wrap">
          <table class="so-invoice-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th class="r">เลขก่อน</th>
                <th class="r">เลขหลัง</th>
                <th class="r">หน่วย</th>
                <th class="r">วันที่จด</th>
                <th class="r">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceRows}
            </tbody>
            <tfoot>
              <tr class="so-total-row">
                <td colspan="5"><strong>💰 รวมทั้งสิ้น</strong></td>
                <td class="r"><strong>${formatMoney(amount)} บาท</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        ${dueDateHTML}
      </div>

      ${qrSectionHTML}
      ` : `
      <div class="so-no-bill">
        <div style="font-size:3rem;margin-bottom:.5rem">🎉</div>
        <div style="font-size:1.1rem;font-weight:600;color:var(--text)">ไม่มียอดค้างชำระ</div>
        <div style="color:var(--text-light);margin-top:.25rem">ยังไม่มีบิลที่ต้องชำระในขณะนี้</div>
      </div>
      `}

      <div class="so-cta-area">
        ${ctaHTML}
        ${cancelHTML}
      </div>
    </div>

    ${outstanding > 0 && slipStatus !== 'success' ? `
    <div class="outstanding-banner">
      <div class="ob-icon">⚠️</div>
      <div class="ob-info">
        <div class="ob-label">ยอดคงค้างสะสม</div>
        <div class="ob-amount">${formatMoney(outstanding)} บาท</div>
        <div style="font-size:0.75rem;color:#92400E;margin-top:2px">${overdueBills.length} บิลค้างชำระ</div>
      </div>
      <button class="ob-btn" onclick="location.hash='#/upload-slip'">ส่งสลิป</button>
    </div>` : ''}

    <div class="quick-actions">
      <a class="quick-action" href="#/upload-slip"><div class="qa-icon" style="background:#EEF2FF">📤</div><span class="qa-label">ส่งสลิป</span></a>
      <a class="quick-action" href="#/my-payments"><div class="qa-icon" style="background:#F0FDF4">💳</div><span class="qa-label">ประวัติชำระ</span></a>
      <a class="quick-action" href="#/my-menus"><div class="qa-icon" style="background:#FFFBEB">🍜</div><span class="qa-label">จัดการเมนู</span></a>
      <a class="quick-action" href="#/profile"><div class="qa-icon" style="background:#EFF6FF">⚙️</div><span class="qa-label">ตั้งค่า</span></a>
    </div>

    <div class="owner-stats">
      <div class="owner-stat-card">
        <div class="owner-stat-icon" style="background:#EEF2FF;color:#4F46E5">📊</div>
        <div class="owner-stat-val">${paidCount}/${totalBills}</div>
        <div class="owner-stat-lbl">บิลชำระแล้ว</div>
      </div>
      <div class="owner-stat-card">
        <div class="owner-stat-icon" style="background:#F0FDF4;color:#059669">💰</div>
        <div class="owner-stat-val">${formatMoney(paidTotal)}</div>
        <div class="owner-stat-lbl">ชำระรวม (บาท)</div>
      </div>
      <div class="owner-stat-card">
        <div class="owner-stat-icon" style="background:${outstanding > 0 ? '#FEF2F2' : '#F0FDF4'};color:${outstanding > 0 ? '#DC2626' : '#059669'}">⏳</div>
        <div class="owner-stat-val" style="color:${outstanding > 0 ? '#DC2626' : 'inherit'}">${formatMoney(outstanding)}</div>
        <div class="owner-stat-lbl">ค้างชำระ (บาท)</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>📋 ประวัติชำระล่าสุด</h3></div>
      ${renderTable([
        {key:'bill_id',label:'บิล'},{key:'amount',label:'ยอด',money:true},
        {key:'method',label:'ช่องทาง',render:v=>({cash:'เงินสด',transfer:'โอน',promptpay:'PromptPay'}[v]||v)},
        {key:'paid_at',label:'วันชำระ',date:true},{key:'status',label:'สถานะ',badge:STATUS_PAYMENT}
      ], payments)}
    </div>`;

  // Render QR code after DOM is ready
  if (promptPayId && amount > 0 && slipStatus !== 'success' && slipStatus !== 'reviewing') {
    setTimeout(() => renderPromptPayQR('so-qr-container', promptPayId, amount, 220), 100);
  }
}

window.simulateStallOwner = function() {
  const stallId = document.getElementById('sim-stall').value;
  if (!stallId) return toast('กรุณาเลือกร้านค้า', 'warning');
  const user = getCurrentUser();
  _currentUser = null;
  setCurrentUser({ ...user, stall_id: stallId });
  pgDashboard();
};

window.switchSimStall = function(stallId) {
  if (!stallId) return;
  const user = getCurrentUser();
  _currentUser = null;
  setCurrentUser({ ...user, stall_id: stallId });
  pgDashboard();
};

window.cancelSlipFromDashboard = async function(paymentId) {
  if (!paymentId) return;
  const ok = await ppkConfirm('ต้องการยกเลิกสลิปที่ส่งไว้?');
  if (!ok) return;
  const res = await callAPI('DELETE', '/payments/' + paymentId);
  if (res.error) return toast(res.error, 'error');
  toast('ยกเลิกสลิปแล้ว', 'success');
  pgDashboard();
};

async function pgDashboardExec(el, user) {
  const stats = await callAPI('GET', '/reports/dashboard-stats');
  const s = stats.data || {};
  el.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat"><div class="admin-stat-icon">🏪</div><div class="admin-stat-value ok">${s.total_stalls || 0}</div><div class="admin-stat-label">ร้านค้าทั้งหมด</div></div>
      <div class="admin-stat"><div class="admin-stat-icon">📋</div><div class="admin-stat-value ok">${s.occupied_stalls || 0}</div><div class="admin-stat-label">มีผู้เช่า</div></div>
      <div class="admin-stat"><div class="admin-stat-icon">💰</div><div class="admin-stat-value">${formatMoney(s.total_revenue || 0)}</div><div class="admin-stat-label">รายได้ปีงบฯ</div></div>
      <div class="admin-stat"><div class="admin-stat-icon">🔍</div><div class="admin-stat-value">${s.avg_inspection || '—'}</div><div class="admin-stat-label">คะแนนตรวจเฉลี่ย</div></div>
    </div>
    <div class="card"><div class="card-header"><h3>รายงานรายเดือน</h3></div><div id="exec-chart-container" style="height:300px;display:flex;align-items:center;justify-content:center"><small>กำลังโหลดกราฟ...</small></div></div>`;
}

async function pgDashboardInspector(el, user) {
  const [inspRes, penRes] = await Promise.all([
    callAPI('GET', '/inspections?limit=10'),
    callAPI('GET', '/penalties?limit=5')
  ]);
  const inspections = inspRes.data || [];
  const penalties = penRes.data || [];

  // Count recent stats
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthInspections = inspections.filter(i => (i.inspection_date || i.created_at || '').startsWith(thisMonth));
  const pendingPenalties = penalties.filter(p => p.status === 'active');

  el.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat" onclick="location.hash='#/inspections'">
        <div class="admin-stat-icon">🔍</div>
        <div class="admin-stat-value ok">${monthInspections.length}</div>
        <div class="admin-stat-label">ตรวจเดือนนี้</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/inspections'">
        <div class="admin-stat-icon">📋</div>
        <div class="admin-stat-value ok">${inspections.length}</div>
        <div class="admin-stat-label">ตรวจทั้งหมด</div>
      </div>
      <div class="admin-stat" onclick="location.hash='#/penalties'">
        <div class="admin-stat-icon">⚠️</div>
        <div class="admin-stat-value ${pendingPenalties.length > 0 ? 'danger' : 'ok'}">${pendingPenalties.length}</div>
        <div class="admin-stat-label">เตือนค้างดำเนินการ</div>
      </div>
    </div>

    <div class="hub-grid">
      <div class="hub-section">🔍 งานตรวจสอบ</div>
      <a class="hub-item" href="#/inspections"><div class="hub-icon" style="background:#F0FDF4">🔍</div><span class="hub-label">ตรวจร้าน</span></a>
      <a class="hub-item" href="#/penalties"><div class="hub-icon" style="background:#FEF2F2">⚠️</div><span class="hub-label">เตือน/ลงโทษ</span></a>
    </div>

    <div class="card">
      <div class="card-header"><h3>📋 ผลตรวจล่าสุด</h3></div>
      ${renderTable([
        {key:'stall_name',label:'ร้านค้า'},{key:'inspection_date',label:'วันที่ตรวจ',date:true},
        {key:'score',label:'คะแนน'},{key:'result',label:'ผล',badge:{pass:{text:'ผ่าน',class:'badge-success'},fail:{text:'ไม่ผ่าน',class:'badge-danger'},warning:{text:'เตือน',class:'badge-warning'}}}
      ], inspections.slice(0, 5))}
    </div>`;
}

// ═══════════════════════════════════════════════
// STALLS (ร้านค้า)
// ═══════════════════════════════════════════════
async function pgStalls() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/stalls');
  const data = res.data || [];

  el.innerHTML = `
    <div class="page-header">
      <h1>จัดการร้านค้า</h1>
      <button class="btn btn-primary" onclick="showStallForm()">+ เพิ่มร้านค้า</button>
    </div>
    <div class="card">
      <div class="card-header"><h3>ร้านค้าทั้งหมด (${data.length})</h3></div>
      ${renderTable([
        {key:'id',label:'รหัส'},{key:'name',label:'ชื่อร้าน'},{key:'zone',label:'โซน'},{key:'area_sqm',label:'พื้นที่(ตร.ม.)'},
        {key:'water_meter_no',label:'มิเตอร์น้ำ'},{key:'electric_meter_no',label:'มิเตอร์ไฟ'},
        {key:'status',label:'สถานะ',badge:STATUS_STALL}
      ], data, row => `
        <button class="btn btn-sm btn-secondary" onclick="showStallForm('${row.id}')">แก้ไข</button>
        <button class="btn btn-sm btn-danger" onclick="deleteStall('${row.id}')">ลบ</button>
      `)}
    </div>`;
}

window.showStallForm = async function(id) {
  let stall = {};
  if (id) {
    const res = await callAPI('GET', '/stalls/' + id);
    stall = res.data || {};
  }
  showModal(`
    <div class="modal-header"><h2>${id ? 'แก้ไข' : 'เพิ่ม'}ร้านค้า</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form id="stall-form" onsubmit="saveStall(event, '${id || ''}')">
      <div class="modal-body">
        <div class="form-group"><label>ชื่อร้าน *</label><input name="name" value="${escapeHtml(stall.name||'')}" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>โซน</label><input name="zone" value="${escapeHtml(stall.zone||'')}"></div>
          <div class="form-group"><label>พื้นที่ (ตร.ม.)</label><input name="area_sqm" type="number" step="0.01" value="${stall.area_sqm||''}"></div>
        </div>
        <div class="form-group"><label>คำอธิบายตำแหน่ง</label><input name="location_desc" value="${escapeHtml(stall.location_desc||'')}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>เลขมิเตอร์น้ำ</label><input name="water_meter_no" value="${escapeHtml(stall.water_meter_no||'')}"></div>
          <div class="form-group"><label>เลขมิเตอร์ไฟ</label><input name="electric_meter_no" value="${escapeHtml(stall.electric_meter_no||'')}"></div>
        </div>
        <div class="form-group"><label>สถานะ</label>
          <select name="status"><option value="vacant" ${stall.status==='vacant'?'selected':''}>ว่าง</option><option value="occupied" ${stall.status==='occupied'?'selected':''}>มีผู้เช่า</option><option value="reserved" ${stall.status==='reserved'?'selected':''}>จอง</option><option value="maintenance" ${stall.status==='maintenance'?'selected':''}>ปรับปรุง</option></select>
        </div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.saveStall = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  if (!validateRequired([{key:'name',label:'ชื่อร้าน'}], data)) return;
  const res = id ? await callAPI('PUT', '/stalls/' + id, data) : await callAPI('POST', '/stalls', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success');
  closeModal();
  pgStalls();
};

window.deleteStall = async function(id) {
  if (!await confirmDialog('ต้องการลบร้านค้านี้?', {danger:true})) return;
  const res = await callAPI('DELETE', '/stalls/' + id);
  if (res.error) return toast(res.error, 'error');
  toast('ลบสำเร็จ', 'success');
  pgStalls();
};

// ═══════════════════════════════════════════════
// CONTRACTS (สัญญาเช่า)
// ═══════════════════════════════════════════════
async function pgContracts() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/contracts');
  const data = res.data || [];

  el.innerHTML = `
    <div class="page-header"><h1>สัญญาเช่า</h1><button class="btn btn-primary" onclick="showContractForm()">+ สร้างสัญญา</button></div>
    <div class="card">
      ${renderTable([
        {key:'id',label:'เลขที่'},{key:'stall_name',label:'ร้าน'},{key:'tenant_name',label:'ผู้เช่า'},
        {key:'monthly_rent',label:'ค่าเช่า/เดือน',money:true},{key:'start_date',label:'เริ่ม',date:true},
        {key:'end_date',label:'สิ้นสุด',date:true},{key:'status',label:'สถานะ',badge:STATUS_CONTRACT}
      ], data, row => `
        <button class="btn btn-sm btn-secondary" onclick="showContractForm('${row.id}')">แก้ไข</button>
      `)}
    </div>`;
}

window.showContractForm = async function(id) {
  const [stallsRes, contract] = await Promise.all([
    callAPI('GET', '/stalls?status=vacant'),
    id ? callAPI('GET', '/contracts/' + id) : {data:{}}
  ]);
  const stalls = stallsRes.data || [];
  const c = contract.data || {};
  const stallOpts = stalls.map(s => `<option value="${s.id}" ${c.stall_id===s.id?'selected':''}>${escapeHtml(s.name)} (${escapeHtml(s.zone||'-')})</option>`).join('');

  showModal(`
    <div class="modal-header"><h2>${id?'แก้ไข':'สร้าง'}สัญญาเช่า</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveContract(event,'${id||''}')">
      <div class="modal-body">
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required>${id?`<option value="${c.stall_id}" selected>${c.stall_name||c.stall_id}</option>`:'<option value="">-- เลือก --</option>'}${stallOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ชื่อผู้เช่า *</label><input name="tenant_name" value="${escapeHtml(c.tenant_name||'')}" required></div>
          <div class="form-group"><label>เบอร์โทร</label><input name="tenant_phone" value="${escapeHtml(c.tenant_phone||'')}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>วันเริ่ม *</label><input type="date" name="start_date" value="${c.start_date||''}" required></div>
          <div class="form-group"><label>วันสิ้นสุด *</label><input type="date" name="end_date" value="${c.end_date||''}" required></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
          <div class="form-group"><label>ค่าเช่า/เดือน *</label><input type="number" name="monthly_rent" value="${c.monthly_rent||''}" required></div>
          <div class="form-group"><label>เงินประกัน</label><input type="number" name="deposit_amount" value="${c.deposit_amount||0}"></div>
          <div class="form-group"><label>ค่าส่วนกลาง</label><input type="number" name="common_fee" value="${c.common_fee||0}"></div>
        </div>
        <div class="form-group"><label>เลขอ้างอิงคำสั่งคณะกรรมการ</label><input name="committee_approval_ref" value="${escapeHtml(c.committee_approval_ref||'')}"></div>
        <div class="form-group"><label>สถานะ</label><select name="status"><option value="active" ${c.status==='active'?'selected':''}>ใช้งาน</option><option value="expired" ${c.status==='expired'?'selected':''}>หมดอายุ</option><option value="terminated" ${c.status==='terminated'?'selected':''}>ยกเลิก</option></select></div>
        <div class="form-group"><label>หมายเหตุ</label><textarea name="notes">${escapeHtml(c.notes||'')}</textarea></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`, {large:true});
};

window.saveContract = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = id ? await callAPI('PUT', '/contracts/' + id, data) : await callAPI('POST', '/contracts', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgContracts();
};

// ═══════════════════════════════════════════════
// USERS (ผู้ใช้งาน)
// ═══════════════════════════════════════════════
async function pgUsers() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/users');
  const data = res.data || [];

  el.innerHTML = `
    <div class="page-header"><h1>ผู้ใช้งาน</h1><button class="btn btn-primary" onclick="showUserForm()">+ เพิ่มผู้ใช้</button></div>
    <div class="card">
      ${renderTable([
        {key:'id',label:'รหัส'},{key:'name',label:'ชื่อ'},{key:'phone',label:'เบอร์โทร'},
        {key:'role',label:'บทบาท',render:v=>ROLE_NAMES[v]||v},{key:'stall_name',label:'ร้าน'},
        {key:'is_active',label:'สถานะ',render:v=>v?'<span class="badge badge-success">ใช้งาน</span>':'<span class="badge badge-danger">ระงับ</span>'},
        {key:'setup_token',label:'Token',render:v=>v?`<code style="font-size:.75rem">${v}</code>`:'<span style="color:#9CA3AF">ตั้ง pw แล้ว</span>'}
      ], data, row => `
        <button class="btn btn-sm btn-secondary" onclick="showUserForm('${row.id}')">แก้ไข</button>
        ${row.id !== getCurrentUser().id ? `<button class="btn btn-sm btn-danger" onclick="toggleUserActive('${row.id}', ${row.is_active})">${row.is_active?'ระงับ':'เปิด'}</button>` : ''}
      `)}
    </div>`;
}

window.showUserForm = async function(id) {
  const [stallsRes, userRes] = await Promise.all([
    callAPI('GET', '/stalls'),
    id ? callAPI('GET', '/users/' + id) : {data:{}}
  ]);
  const stalls = stallsRes.data || [];
  const u = userRes.data || {};
  const roles = Object.entries(ROLE_NAMES).map(([k,v])=>`<option value="${k}" ${u.role===k?'selected':''}>${v}</option>`).join('');
  const stallOpts = stalls.map(s=>`<option value="${s.id}" ${u.stall_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('');

  showModal(`
    <div class="modal-header"><h2>${id?'แก้ไข':'เพิ่ม'}ผู้ใช้</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveUser(event,'${id||''}')">
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ชื่อ-สกุล *</label><input name="name" value="${escapeHtml(u.name||'')}" required></div>
          <div class="form-group"><label>เบอร์โทร *</label><input name="phone" value="${escapeHtml(u.phone||'')}" required maxlength="10"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>บทบาท *</label><select name="role" required>${roles}</select></div>
          <div class="form-group"><label>ร้านค้า (ถ้าเป็นเจ้าของร้าน)</label><select name="stall_id"><option value="">-- ไม่ระบุ --</option>${stallOpts}</select></div>
        </div>
        <div class="form-group"><label>อีเมล</label><input type="email" name="email" value="${escapeHtml(u.email||'')}"></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.saveUser = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = id ? await callAPI('PUT', '/users/' + id, data) : await callAPI('POST', '/users', data);
  if (res.error) return toast(res.error, 'error');
  if (!id && res.data?.setup_token) {
    await alertDialog(`สร้างผู้ใช้สำเร็จ!\n\nSetup Token: ${res.data.setup_token}\n\nส่ง Token นี้ให้ผู้ใช้เพื่อตั้งรหัสผ่านครั้งแรก`, { title: 'Setup Token' });
  } else {
    toast('บันทึกสำเร็จ', 'success');
  }
  closeModal(); pgUsers();
};

window.toggleUserActive = async function(id, currentActive) {
  const action = currentActive ? 'ระงับ' : 'เปิดใช้งาน';
  if (!await confirmDialog(`ต้องการ${action}ผู้ใช้นี้?`, {danger:currentActive})) return;
  const res = await callAPI('PUT', '/users/' + id, { is_active: currentActive ? 0 : 1 });
  if (res.error) return toast(res.error, 'error');
  toast(`${action}สำเร็จ`, 'success'); pgUsers();
};

// ═══════════════════════════════════════════════
// DOCUMENTS (เอกสาร)
// ═══════════════════════════════════════════════
async function pgDocuments() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/documents');
  el.innerHTML = `
    <div class="page-header"><h1>เอกสาร</h1><button class="btn btn-primary" onclick="showDocUploadForm()">+ อัปโหลดเอกสาร</button></div>
    <div class="card">
      ${renderTable([
        {key:'stall_name',label:'ร้าน'},{key:'type',label:'ประเภท',render:v=>DOC_TYPES[v]||v},
        {key:'file_name',label:'ชื่อไฟล์'},{key:'expires_at',label:'หมดอายุ',date:true},{key:'uploaded_at',label:'อัปโหลด',date:true}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-secondary" onclick="viewDocument('${row.file_key}')">ดู</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDocument('${row.id}')">ลบ</button>
      `)}
    </div>`;
}

const DOC_TYPES = { id_card:'บัตรประชาชน', license:'ใบอนุญาต', health_cert:'ใบรับรองแพทย์', hygiene_cert:'ใบอนุญาตสุขอนามัย', committee_order:'คำสั่งคณะกรรมการ', source_bill:'ต้นฉบับบิลค่าน้ำ/ไฟ', other:'อื่นๆ' };

window.showDocUploadForm = async function() {
  const stalls = (await callAPI('GET', '/stalls')).data || [];
  const opts = stalls.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  const typeOpts = Object.entries(DOC_TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  showModal(`
    <div class="modal-header"><h2>อัปโหลดเอกสาร</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="uploadDocument(event)">
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ร้านค้า</label><select name="stall_id"><option value="">-- ไม่ระบุ --</option>${opts}</select></div>
          <div class="form-group"><label>ประเภท *</label><select name="type" required>${typeOpts}</select></div>
        </div>
        <div class="form-group"><label>วันหมดอายุ</label><input type="date" name="expires_at"></div>
        <div class="form-group"><label>ไฟล์ *</label><input type="file" name="file" accept="image/*,.pdf" required></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">อัปโหลด</button></div>
    </form>`);
};

window.uploadDocument = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await callAPI('POST', '/documents', fd, true);
  if (res.error) return toast(res.error, 'error');
  toast('อัปโหลดสำเร็จ', 'success'); closeModal(); pgDocuments();
};

window.viewDocument = function(fileKey) { window.open('/api/upload/' + fileKey, '_blank'); };
window.deleteDocument = async function(id) {
  if (!await confirmDialog('ต้องการลบเอกสารนี้?',{danger:true})) return;
  const res = await callAPI('DELETE', '/documents/' + id);
  if (res.error) return toast(res.error,'error');
  toast('ลบสำเร็จ','success'); pgDocuments();
};

// ═══════════════════════════════════════════════
// BIDDINGS (ประมูล)
// ═══════════════════════════════════════════════
async function pgBiddings() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/biddings');
  el.innerHTML = `
    <div class="page-header"><h1>จัดการประมูล</h1><button class="btn btn-primary" onclick="showBiddingForm()">+ สร้างประมูล</button></div>
    <div class="card">
      ${renderTable([
        {key:'id',label:'รหัส'},{key:'title',label:'หัวข้อ'},{key:'stall_name',label:'ร้าน'},
        {key:'min_price',label:'ราคาขั้นต่ำ',money:true},{key:'open_date',label:'เปิดรับ',date:true},
        {key:'close_date',label:'ปิดรับ',date:true},{key:'status',label:'สถานะ',badge:STATUS_BIDDING},
        {key:'app_count',label:'ผู้สมัคร'}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-secondary" onclick="showBiddingForm('${row.id}')">แก้ไข</button>
        <button class="btn btn-sm btn-info" onclick="showBidApps('${row.id}')">ดูผู้สมัคร</button>
      `)}
    </div>`;
}

window.showBiddingForm = async function(id) {
  const [stallsRes, bidding] = await Promise.all([
    callAPI('GET', '/stalls?status=vacant'),
    id ? callAPI('GET', '/biddings/' + id) : {data:{}}
  ]);
  const stalls = stallsRes.data || [];
  const b = bidding.data || {};
  showModal(`
    <div class="modal-header"><h2>${id?'แก้ไข':'สร้าง'}ประมูล</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveBidding(event,'${id||''}')">
      <div class="modal-body">
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required><option value="">-- เลือก --</option>${stalls.map(s=>`<option value="${s.id}" ${b.stall_id===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label>หัวข้อ *</label><input name="title" value="${escapeHtml(b.title||'')}" required></div>
        <div class="form-group"><label>รายละเอียด</label><textarea name="description">${escapeHtml(b.description||'')}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
          <div class="form-group"><label>ราคาขั้นต่ำ</label><input type="number" name="min_price" value="${b.min_price||''}"></div>
          <div class="form-group"><label>เปิดรับสมัคร *</label><input type="date" name="open_date" value="${b.open_date||''}" required></div>
          <div class="form-group"><label>ปิดรับสมัคร *</label><input type="date" name="close_date" value="${b.close_date||''}" required></div>
        </div>
        <div class="form-group"><label>สถานะ</label><select name="status"><option value="draft" ${b.status==='draft'?'selected':''}>ร่าง</option><option value="open" ${b.status==='open'?'selected':''}>เปิดรับสมัคร</option><option value="closed" ${b.status==='closed'?'selected':''}>ปิดรับ</option><option value="awarded" ${b.status==='awarded'?'selected':''}>ประกาศผล</option><option value="cancelled" ${b.status==='cancelled'?'selected':''}>ยกเลิก</option></select></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`, {large:true});
};

window.saveBidding = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = id ? await callAPI('PUT', '/biddings/' + id, data) : await callAPI('POST', '/biddings', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgBiddings();
};

window.showBidApps = async function(biddingId) {
  const res = await callAPI('GET', '/biddings/' + biddingId + '/applications');
  const apps = res.data || [];
  showModal(`
    <div class="modal-header"><h2>ผู้สมัครประมูล</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      ${renderTable([
        {key:'applicant_name',label:'ชื่อ'},{key:'applicant_phone',label:'โทร'},{key:'bid_price',label:'ราคาเสนอ',money:true},
        {key:'total_score',label:'คะแนน'},{key:'status',label:'สถานะ',badge:{submitted:{text:'รอพิจารณา',class:'badge-warning'},shortlisted:{text:'ผ่านคัดเลือก',class:'badge-info'},awarded:{text:'ได้รับสิทธิ์',class:'badge-success'},rejected:{text:'ไม่ผ่าน',class:'badge-danger'}}}
      ], apps, row => `
        <button class="btn btn-sm btn-success" onclick="awardBidApp('${biddingId}','${row.id}')">เลือกผู้ชนะ</button>
      `)}
    </div>`, {large:true});
};

window.awardBidApp = async function(biddingId, appId) {
  if (!await confirmDialog('ยืนยันเลือกผู้สมัครนี้เป็นผู้ชนะ?')) return;
  const res = await callAPI('POST', '/biddings/' + biddingId + '/award', { application_id: appId });
  if (res.error) return toast(res.error, 'error');
  toast('ประกาศผลสำเร็จ', 'success'); closeModal(); pgBiddings();
};

// ═══════════════════════════════════════════════
// BILLS (ใบแจ้งหนี้)
// ═══════════════════════════════════════════════
async function pgBills() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/billing/bills');
  el.innerHTML = `
    <div class="page-header"><h1>ใบแจ้งหนี้</h1></div>
    <div class="card">
      <div class="tabs" style="margin-bottom:1rem">
        <button class="tab active" onclick="filterBills(this,'all')">ทั้งหมด</button>
        <button class="tab" onclick="filterBills(this,'draft')">ร่าง</button>
        <button class="tab" onclick="filterBills(this,'issued')">ออกบิลแล้ว</button>
        <button class="tab" onclick="filterBills(this,'overdue')">ค้างชำระ</button>
        <button class="tab" onclick="filterBills(this,'paid')">ชำระแล้ว</button>
      </div>
      <div id="bills-table">
        ${renderBillsTable(res.data || [])}
      </div>
    </div>`;
  window._billsData = res.data || [];
}

function renderBillsTable(data) {
  return renderTable([
    {key:'id',label:'เลขที่'},{key:'stall_name',label:'ร้าน'},{key:'period_label',label:'รอบ'},
    {key:'rent_amount',label:'ค่าเช่า',money:true},{key:'water_amount',label:'ค่าน้ำ',money:true},
    {key:'electric_amount',label:'ค่าไฟ',money:true},{key:'total_amount',label:'รวม',money:true},
    {key:'status',label:'สถานะ',badge:STATUS_BILL},{key:'due_date',label:'ครบกำหนด',date:true}
  ], data, row => {
    let btns = '';
    if (row.status === 'draft') btns += `<button class="btn btn-sm btn-primary" onclick="issueBill('${row.id}')">ออกบิล</button> `;
    if (row.status === 'issued' || row.status === 'overdue') btns += `<button class="btn btn-sm btn-success" onclick="location.hash='#/payments?bill=${row.id}'">บันทึกชำระ</button> `;
    btns += `<button class="btn btn-sm btn-secondary" onclick="showBillDetail('${row.id}')">ดู</button>`;
    return btns;
  });
}

window.filterBills = function(btn, status) {
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? window._billsData : window._billsData.filter(b=>b.status===status);
  document.getElementById('bills-table').innerHTML = renderBillsTable(filtered);
};

window.issueBill = async function(id) {
  if (!await confirmDialog('ออกบิลนี้? ผู้เช่าจะได้รับแจ้ง')) return;
  const res = await callAPI('POST', '/billing/bills/' + id + '/issue');
  if (res.error) return toast(res.error, 'error');
  toast('ออกบิลสำเร็จ', 'success'); pgBills();
};

window.showBillDetail = async function(id) {
  const res = await callAPI('GET', '/billing/bills/' + id);
  const b = res.data || {};
  showModal(`
    <div class="modal-header"><h2>ใบแจ้งหนี้ ${escapeHtml(b.id)}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <table style="width:100%">
        <tr><td><strong>ร้านค้า:</strong></td><td>${escapeHtml(b.stall_name||'')}</td></tr>
        <tr><td><strong>รอบบิล:</strong></td><td>${escapeHtml(b.period_label||'')}</td></tr>
        <tr><td colspan="2"><hr></td></tr>
        <tr><td>ค่าเช่า</td><td style="text-align:right">${formatMoney(b.rent_amount)}</td></tr>
        <tr><td>ค่าน้ำ (${b.water_units||0} หน่วย)</td><td style="text-align:right">${formatMoney(b.water_amount)}</td></tr>
        <tr><td>ค่าไฟ (${b.electric_units||0} หน่วย)</td><td style="text-align:right">${formatMoney(b.electric_amount)}</td></tr>
        <tr><td>ค่าส่วนกลาง</td><td style="text-align:right">${formatMoney(b.common_fee)}</td></tr>
        ${b.other_fee ? `<tr><td>${escapeHtml(b.other_fee_desc||'อื่นๆ')}</td><td style="text-align:right">${formatMoney(b.other_fee)}</td></tr>` : ''}
        <tr><td colspan="2"><hr></td></tr>
        <tr style="font-size:1.2em;font-weight:700"><td>รวมทั้งสิ้น</td><td style="text-align:right">${formatMoney(b.total_amount)}</td></tr>
        <tr><td><strong>สถานะ:</strong></td><td>${renderBadge(b.status, STATUS_BILL)}</td></tr>
        <tr><td><strong>ครบกำหนด:</strong></td><td>${formatDate(b.due_date)}</td></tr>
      </table>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">ปิด</button></div>
  `, {large:true});
};

// ═══════════════════════════════════════════════
// PAYMENTS (การชำระเงิน)
// ═══════════════════════════════════════════════
async function pgPayments() {
  const el = document.getElementById('content');
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const billId = params.get('bill');

  const res = await callAPI('GET', '/payments' + (billId ? '?bill_id=' + billId : ''));
  el.innerHTML = `
    <div class="page-header"><h1>การชำระเงิน</h1><button class="btn btn-primary" onclick="showPaymentForm()">+ บันทึกชำระ</button></div>
    <div class="card">
      <div class="tabs" style="margin-bottom:1rem">
        <button class="tab active" onclick="filterPayments(this,'all')">ทั้งหมด</button>
        <button class="tab" onclick="filterPayments(this,'pending')">รอตรวจสอบ</button>
        <button class="tab" onclick="filterPayments(this,'verified')">อนุมัติ</button>
        <button class="tab" onclick="filterPayments(this,'rejected')">ปฏิเสธ</button>
      </div>
      <div id="payments-table">
        ${renderPaymentsTable(res.data || [])}
      </div>
    </div>`;
  window._paymentsData = res.data || [];
}

function renderPaymentsTable(data) {
  return renderTable([
    {key:'id',label:'รหัส'},{key:'bill_id',label:'บิล'},{key:'stall_name',label:'ร้าน'},
    {key:'amount',label:'ยอด',money:true},{key:'method',label:'ช่องทาง',render:v=>({cash:'เงินสด',transfer:'โอน',promptpay:'PromptPay'}[v]||v)},
    {key:'paid_at',label:'วันชำระ',date:true},{key:'status',label:'สถานะ',badge:STATUS_PAYMENT}
  ], data, row => {
    let btns = '';
    if (row.status === 'pending') {
      btns += `<button class="btn btn-sm btn-success" onclick="verifyPayment('${row.id}','verified')">อนุมัติ</button> `;
      btns += `<button class="btn btn-sm btn-danger" onclick="verifyPayment('${row.id}','rejected')">ปฏิเสธ</button> `;
    }
    if (row.slip_photo_key) btns += `<button class="btn btn-sm btn-secondary" onclick="viewSlip('${row.slip_photo_key}')">ดูสลิป</button>`;
    return btns;
  });
}

window.filterPayments = function(btn, status) {
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? window._paymentsData : window._paymentsData.filter(p=>p.status===status);
  document.getElementById('payments-table').innerHTML = renderPaymentsTable(filtered);
};

window.showPaymentForm = async function() {
  const bills = (await callAPI('GET', '/billing/bills?status=issued,overdue')).data || [];
  const billOpts = bills.map(b=>`<option value="${b.id}">${b.id} — ${b.stall_name} — ${formatMoney(b.total_amount)} บาท</option>`).join('');
  showModal(`
    <div class="modal-header"><h2>บันทึกชำระเงิน</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="savePayment(event)">
      <div class="modal-body">
        <div class="form-group"><label>ใบแจ้งหนี้ *</label><select name="bill_id" required><option value="">-- เลือก --</option>${billOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>จำนวนเงิน *</label><input type="number" step="0.01" name="amount" required></div>
          <div class="form-group"><label>ช่องทาง *</label><select name="method" required><option value="cash">เงินสด</option><option value="transfer">โอน</option><option value="promptpay">PromptPay</option></select></div>
        </div>
        <div class="form-group"><label>เลขอ้างอิง</label><input name="reference_no"></div>
        <div class="form-group"><label>สลิป (ถ้ามี)</label><input type="file" name="slip" accept="image/*"></div>
        <div class="form-group"><label>หมายเหตุ</label><textarea name="notes"></textarea></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.savePayment = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await callAPI('POST', '/payments', fd, true);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกชำระสำเร็จ', 'success'); closeModal(); pgPayments();
};

window.verifyPayment = async function(id, status) {
  const action = status === 'verified' ? 'อนุมัติ' : 'ปฏิเสธ';
  if (!await confirmDialog(`${action}การชำระนี้?`, { danger: status === 'rejected' })) return;
  const res = await callAPI('PUT', '/payments/' + id + '/verify', { status });
  if (res.error) return toast(res.error, 'error');
  toast(`${action}สำเร็จ`, 'success'); pgPayments();
};

window.viewSlip = function(fileKey) { window.open('/api/upload/' + fileKey, '_blank'); };

// ═══════════════════════════════════════════════
// RECEIPTS (ใบเสร็จ)
// ═══════════════════════════════════════════════
async function pgReceipts() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/receipts');
  el.innerHTML = `
    <div class="page-header"><h1>ใบเสร็จรับเงิน</h1></div>
    <div class="card">
      ${renderTable([
        {key:'receipt_no',label:'เลขที่'},{key:'stall_name',label:'ร้าน'},{key:'amount',label:'ยอด',money:true},
        {key:'fiscal_year',label:'ปีงบฯ'},{key:'issued_at',label:'วันออก',date:true},
        {key:'cancelled',label:'สถานะ',render:v=>v?'<span class="badge badge-danger">ยกเลิก</span>':'<span class="badge badge-success">ปกติ</span>'}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-primary" onclick="printReceipt('${row.id}')">พิมพ์</button>
        ${!row.cancelled ? `<button class="btn btn-sm btn-danger" onclick="cancelReceipt('${row.id}')">ยกเลิก</button>` : ''}
      `)}
    </div>`;
}

window.printReceipt = async function(id) {
  const res = await callAPI('GET', '/receipts/' + id);
  const r = res.data || {};
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html><head><title>ใบเสร็จ ${r.receipt_no}</title>
    <style>body{font-family:'TH Sarabun New',sans-serif;padding:2cm;font-size:14pt}table{width:100%;border-collapse:collapse}td,th{padding:4px 8px}h1{text-align:center}hr{margin:8px 0}.right{text-align:right}</style>
    </head><body>
    <h1>ใบเสร็จรับเงิน</h1>
    <p style="text-align:center">โรงเรียนพะเยาพิทยาคม — โรงอาหาร</p>
    <hr>
    <table>
      <tr><td><strong>เลขที่:</strong> ${escapeHtml(r.receipt_no)}</td><td class="right"><strong>วันที่:</strong> ${formatDate(r.issued_at)}</td></tr>
      <tr><td><strong>ปีงบประมาณ:</strong> ${r.fiscal_year}</td><td class="right"><strong>ร้าน:</strong> ${escapeHtml(r.stall_name||'')}</td></tr>
    </table>
    <hr>
    <table><tr><td><strong>จำนวนเงิน:</strong></td><td class="right" style="font-size:18pt;font-weight:bold">${formatMoney(r.amount)} บาท</td></tr></table>
    <hr>
    <p style="margin-top:2cm"><strong>ผู้รับเงิน:</strong> _____________________ วันที่: ___________</p>
    <script>window.print()</script>
    </body></html>`);
};

window.cancelReceipt = async function(id) {
  if (!await confirmDialog('ยกเลิกใบเสร็จนี้?',{danger:true})) return;
  const res = await callAPI('POST', '/receipts/' + id + '/cancel');
  if (res.error) return toast(res.error,'error');
  toast('ยกเลิกสำเร็จ','success'); pgReceipts();
};

// ═══════════════════════════════════════════════
// INSPECTIONS (ตรวจสุขอนามัย)
// ═══════════════════════════════════════════════
// ── Inspection Checklist (อ้างอิง กฎกระทรวงสุขลักษณะสถานที่จำหน่ายอาหาร พ.ศ.2561 + มาตรฐาน Clean Food Good Taste กรมอนามัย) ──
const INSPECTION_CHECKLIST = [
  { cat: '1. สุขลักษณะสถานที่', icon: '🏪', items: [
    'พื้นที่ประกอบอาหารสะอาด ไม่มีเศษอาหาร คราบสกปรก',
    'พื้นผิวสัมผัสอาหาร (เคาน์เตอร์, โต๊ะ) สะอาด อยู่ในสภาพดี',
    'มีการแยกพื้นที่ปรุง-จำหน่าย เป็นสัดส่วน',
    'มีแสงสว่างเพียงพอ อากาศถ่ายเทดี',
    'ไม่มีสัตว์พาหะนำโรค (แมลงสาบ หนู แมลงวัน)',
    'ถังขยะมีฝาปิดมิดชิด แยกขยะเปียก-แห้ง',
  ]},
  { cat: '2. สุขลักษณะอาหาร', icon: '🍜', items: [
    'วัตถุดิบสด สะอาด ไม่หมดอายุ มีแหล่งที่มาชัดเจน',
    'อาหารปรุงสำเร็จมีการปกปิดป้องกันฝุ่น/แมลง',
    'อาหารเก็บรักษาอุณหภูมิเหมาะสม (ร้อน ≥60°C, เย็น ≤5°C)',
    'ไม่ใช้สีผสมอาหาร/สารเคมีต้องห้ามในอาหาร',
    'น้ำดื่ม น้ำแข็ง สะอาดปลอดภัย ได้มาตรฐาน',
    'ไม่จำหน่ายอาหารที่มีราคาเกินกำหนด',
  ]},
  { cat: '3. สุขลักษณะภาชนะ/อุปกรณ์', icon: '🍽️', items: [
    'ภาชนะใส่อาหาร สะอาด ไม่แตกร้าว ไม่เป็นสนิม',
    'อุปกรณ์ประกอบอาหาร (มีด เขียง ทัพพี) สะอาด เก็บเป็นระเบียบ',
    'มีที่ล้างภาชนะพร้อมน้ำยาล้าง แยกจากที่ล้างวัตถุดิบ',
    'ผ้าเช็ดสะอาด แยกใช้งานชัดเจน',
  ]},
  { cat: '4. สุขลักษณะผู้สัมผัสอาหาร', icon: '👨‍🍳', items: [
    'สวมเสื้อผ้าสะอาด ผ้ากันเปื้อน หมวกคลุมผม',
    'ตัดเล็บสั้น สะอาด ไม่ทาเล็บ ไม่สวมเครื่องประดับ',
    'ล้างมือด้วยสบู่ก่อนสัมผัสอาหารและหลังเข้าห้องน้ำ',
    'ไม่ไอ จาม ลงบนอาหาร ไม่สูบบุหรี่ขณะปรุง/จำหน่าย',
    'ไม่มีบาดแผลเปิดที่มือ/แขน (ถ้ามีต้องปิดด้วยพลาสเตอร์กันน้ำ+สวมถุงมือ)',
    'มีใบรับรองแพทย์ / ผ่านการตรวจสุขภาพประจำปี',
  ]},
  { cat: '5. ระบบน้ำ/ของเสีย', icon: '🚰', items: [
    'มีน้ำสะอาดเพียงพอสำหรับล้างวัตถุดิบ ภาชนะ และมือ',
    'ระบบระบายน้ำไม่อุดตัน ไม่มีน้ำขัง ไม่ส่งกลิ่น',
    'น้ำเสียไม่ไหลลงสู่แหล่งอาหาร',
  ]},
  { cat: '6. ป้ายและเอกสาร', icon: '📋', items: [
    'แสดงป้ายราคาอาหารชัดเจน',
    'แสดงป้ายชื่อร้าน / เลขที่แผง',
    'มีเอกสารสัญญาเช่า / ใบอนุญาตพร้อมแสดง',
  ]},
];
const INSPECTION_TOTAL_ITEMS = INSPECTION_CHECKLIST.reduce((s, c) => s + c.items.length, 0);

async function pgInspections() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/inspections');
  const user = getCurrentUser();
  const canInspect = ['admin','inspector'].includes(user.role);
  const inspections = res.data || [];

  // Stats
  const total = inspections.length;
  const passCount = inspections.filter(i => i.result === 'pass').length;
  const warnCount = inspections.filter(i => i.result === 'warning').length;
  const failCount = inspections.filter(i => i.result === 'fail').length;
  const avgScore = total ? (inspections.reduce((s, i) => s + (i.score || 0), 0) / total).toFixed(1) : '-';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>🔍 ตรวจสุขอนามัยร้านอาหาร</h1>
        <p style="margin:0;font-size:.85rem;color:var(--text-light)">อ้างอิง กฎกระทรวงสุขลักษณะสถานที่จำหน่ายอาหาร พ.ศ.2561 + มาตรฐาน Clean Food Good Taste กรมอนามัย</p>
      </div>
      ${canInspect ? '<button class="btn btn-primary" onclick="showInspectionForm()">📝 เริ่มตรวจร้าน</button>' : ''}
    </div>

    <div class="insp-stats">
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#EEF2FF;color:#4F46E5">📊</div><div class="insp-stat-val">${total}</div><div class="insp-stat-lbl">ตรวจทั้งหมด</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#F0FDF4;color:#059669">✅</div><div class="insp-stat-val">${passCount}</div><div class="insp-stat-lbl">ผ่าน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#FFFBEB;color:#D97706">⚠️</div><div class="insp-stat-val">${warnCount}</div><div class="insp-stat-lbl">เตือน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#FEF2F2;color:#DC2626">❌</div><div class="insp-stat-val">${failCount}</div><div class="insp-stat-lbl">ไม่ผ่าน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#F5F3FF;color:#7C3AED">🎯</div><div class="insp-stat-val">${avgScore}</div><div class="insp-stat-lbl">คะแนนเฉลี่ย</div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3>📋 ประวัติการตรวจ</h3></div>
      ${inspections.length === 0 ? '<div style="padding:2rem;text-align:center;color:var(--text-light)">ยังไม่มีข้อมูลการตรวจ</div>' : `
      <div class="insp-list">
        ${inspections.map(insp => {
          const scoreClass = insp.result === 'pass' ? 'pass' : insp.result === 'warning' ? 'warn' : 'fail';
          const resultLabel = insp.result === 'pass' ? '✅ ผ่าน' : insp.result === 'warning' ? '⚠️ เตือน' : '❌ ไม่ผ่าน';
          const dateStr = insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }) : '-';
          return `
          <div class="insp-row" onclick="showInspectionDetail('${insp.id}')">
            <div class="insp-row-left">
              <div class="insp-score-circle ${scoreClass}">${insp.score || 0}</div>
              <div>
                <div class="insp-row-stall">${escapeHtml(insp.stall_name || '-')}</div>
                <div class="insp-row-meta">📅 ${dateStr} · 👤 ${escapeHtml(insp.inspector_name || '-')}</div>
              </div>
            </div>
            <div class="insp-row-right">
              <span class="insp-result-badge ${scoreClass}">${resultLabel}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

window.showInspectionForm = async function() {
  const stallsRes = await callAPI('GET', '/stalls?status=occupied');
  const stalls = stallsRes.data || [];
  const stallOpts = stalls.map(s => `<option value="${s.id}">${escapeHtml(s.name || s.zone + '-' + s.number)}</option>`).join('');

  const checklistHTML = INSPECTION_CHECKLIST.map((cat, ci) => `
    <div class="insp-cat">
      <div class="insp-cat-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span>${cat.icon} ${cat.cat}</span>
        <span class="insp-cat-count" id="cat-count-${ci}">0/${cat.items.length}</span>
      </div>
      <div class="insp-cat-body">
        ${cat.items.map((item, ii) => `
          <label class="insp-check-item" onclick="event.stopPropagation()">
            <input type="checkbox" name="chk_${ci}_${ii}" data-cat="${ci}" data-item="${ii}" onchange="updateInspScore()">
            <span class="insp-check-text">${escapeHtml(item)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  showModal(`
    <div class="modal-header"><h2>📝 ตรวจสุขอนามัยร้านค้า</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form id="insp-form" onsubmit="saveInspection(event)">
      <div class="modal-body" style="max-height:70vh;overflow-y:auto">
        <div class="form-row">
          <div class="form-group"><label>🏪 ร้านค้า *</label><select class="form-select" name="stall_id" required><option value="">-- เลือกร้าน --</option>${stallOpts}</select></div>
          <div class="form-group"><label>📅 วันที่ตรวจ *</label><input type="date" class="form-input" name="inspection_date" value="${new Date().toISOString().split('T')[0]}" required></div>
        </div>

        <div class="insp-score-display">
          <div class="insp-score-big" id="insp-live-score">0</div>
          <div class="insp-score-label">คะแนน / 100</div>
          <div class="insp-score-bar"><div class="insp-score-fill" id="insp-score-fill" style="width:0%"></div></div>
          <div class="insp-score-result" id="insp-live-result">ยังไม่ได้ตรวจ</div>
        </div>

        <div class="insp-checklist-title">📋 รายการตรวจ (${INSPECTION_TOTAL_ITEMS} ข้อ) — กดเลือกข้อที่ <strong>ผ่าน</strong></div>
        ${checklistHTML}

        <div class="form-group" style="margin-top:1rem">
          <label>📝 หมายเหตุ / ข้อสังเกต</label>
          <textarea class="form-input" name="notes" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม เช่น เรื่องที่ต้องแก้ไข จุดเสี่ยงที่พบ"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button type="submit" class="btn btn-primary" id="insp-submit-btn">💾 บันทึกผลตรวจ</button>
      </div>
    </form>`, {large:true});
};

window.updateInspScore = function() {
  const form = document.getElementById('insp-form');
  if (!form) return;
  const checks = form.querySelectorAll('[name^="chk_"]');
  let passed = 0, total = checks.length;
  // Per-category counts
  const catCounts = {};
  checks.forEach(cb => {
    const ci = cb.dataset.cat;
    if (!catCounts[ci]) catCounts[ci] = { pass: 0, total: 0 };
    catCounts[ci].total++;
    if (cb.checked) { passed++; catCounts[ci].pass++; }
  });
  const score = total ? Math.round((passed / total) * 100) : 0;
  const scoreEl = document.getElementById('insp-live-score');
  const fillEl = document.getElementById('insp-score-fill');
  const resultEl = document.getElementById('insp-live-result');
  if (scoreEl) scoreEl.textContent = score;
  if (fillEl) {
    fillEl.style.width = score + '%';
    fillEl.className = 'insp-score-fill ' + (score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail');
  }
  if (resultEl) {
    if (passed === 0) resultEl.textContent = 'ยังไม่ได้ตรวจ';
    else if (score >= 80) { resultEl.textContent = '✅ ผ่านเกณฑ์'; resultEl.className = 'insp-score-result pass'; }
    else if (score >= 50) { resultEl.textContent = '⚠️ ต้องปรับปรุง'; resultEl.className = 'insp-score-result warn'; }
    else { resultEl.textContent = '❌ ไม่ผ่านเกณฑ์'; resultEl.className = 'insp-score-result fail'; }
  }
  // Update per-category counts
  for (const ci in catCounts) {
    const el = document.getElementById('cat-count-' + ci);
    if (el) {
      el.textContent = catCounts[ci].pass + '/' + catCounts[ci].total;
      el.className = 'insp-cat-count ' + (catCounts[ci].pass === catCounts[ci].total ? 'all-pass' : '');
    }
  }
};

window.saveInspection = async function(e) {
  e.preventDefault();
  const fd = getFormData(e.target);
  const checks = e.target.querySelectorAll('[name^="chk_"]');
  const results = [];
  checks.forEach(cb => {
    const ci = parseInt(cb.dataset.cat);
    const ii = parseInt(cb.dataset.item);
    results.push({
      category: INSPECTION_CHECKLIST[ci]?.cat || '',
      item: INSPECTION_CHECKLIST[ci]?.items[ii] || '',
      passed: cb.checked
    });
  });
  const totalItems = results.length;
  const passedItems = results.filter(r => r.passed).length;
  const score = totalItems ? Math.round((passedItems / totalItems) * 100) : 0;

  const data = {
    stall_id: fd.stall_id,
    inspection_date: fd.inspection_date,
    score: score,
    checklist_json: JSON.stringify(results),
    notes: fd.notes,
    result: score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'
  };

  const btn = document.getElementById('insp-submit-btn');
  btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

  const res = await callAPI('POST', '/inspections', data);
  if (res.error) { toast(res.error, 'error'); btn.disabled = false; btn.textContent = '💾 บันทึกผลตรวจ'; return; }
  const resultText = data.result === 'pass' ? 'ผ่าน ✅' : data.result === 'warning' ? 'ต้องปรับปรุง ⚠️' : 'ไม่ผ่าน ❌';
  toast(`บันทึกผลตรวจสำเร็จ: ${score}/100 — ${resultText}`, data.result === 'pass' ? 'success' : 'warning');
  closeModal(); pgInspections();
};

window.showInspectionDetail = async function(id) {
  const res = await callAPI('GET', '/inspections/' + id);
  const insp = res.data || {};
  let checklist = [];
  try { checklist = JSON.parse(insp.checklist_json || '[]'); } catch {}
  const dateStr = insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) : '-';
  const scoreClass = insp.result === 'pass' ? 'pass' : insp.result === 'warning' ? 'warn' : 'fail';
  const resultLabel = insp.result === 'pass' ? '✅ ผ่านเกณฑ์' : insp.result === 'warning' ? '⚠️ ต้องปรับปรุง' : '❌ ไม่ผ่านเกณฑ์';

  // Group checklist by category
  const catMap = {};
  checklist.forEach(c => {
    const cat = c.category || 'อื่นๆ';
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(c);
  });

  const failedItems = checklist.filter(c => !c.passed);

  const catHTML = Object.entries(catMap).map(([cat, items]) => {
    const catPass = items.filter(i => i.passed).length;
    return `
      <div class="insp-detail-cat">
        <div class="insp-detail-cat-head">
          <span>${escapeHtml(cat)}</span>
          <span class="insp-cat-count ${catPass === items.length ? 'all-pass' : ''}">${catPass}/${items.length}</span>
        </div>
        ${items.map(c => `
          <div class="insp-detail-item ${c.passed ? 'pass' : 'fail'}">
            <span>${c.passed ? '✅' : '❌'}</span>
            <span>${escapeHtml(c.item || '')}</span>
          </div>
        `).join('')}
      </div>`;
  }).join('');

  showModal(`
    <div class="modal-header"><h2>ผลตรวจสุขอนามัย</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <div class="insp-detail-header">
        <div class="insp-score-circle ${scoreClass}" style="width:64px;height:64px;font-size:1.3rem">${insp.score || 0}</div>
        <div>
          <div style="font-size:1.1rem;font-weight:700">${escapeHtml(insp.stall_name || '-')}</div>
          <div style="font-size:.9rem;color:var(--text-light)">📅 ${dateStr} · 👤 ${escapeHtml(insp.inspector_name || '-')}</div>
          <div class="insp-result-badge ${scoreClass}" style="margin-top:.3rem">${resultLabel}</div>
        </div>
      </div>
      ${failedItems.length > 0 ? `
      <div class="insp-fail-summary">
        <div style="font-weight:700;margin-bottom:.5rem">❌ ข้อที่ไม่ผ่าน (${failedItems.length} ข้อ)</div>
        ${failedItems.map(c => `<div class="insp-fail-item">• ${escapeHtml(c.item || '')}</div>`).join('')}
      </div>` : ''}
      ${insp.notes ? `<div style="background:#f8fafc;padding:.75rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:.9rem"><strong>📝 หมายเหตุ:</strong> ${escapeHtml(insp.notes)}</div>` : ''}
      <div style="font-weight:700;margin-bottom:.5rem">📋 รายการตรวจทั้งหมด</div>
      ${catHTML}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">ปิด</button></div>
  `, {large:true});
};

// ═══════════════════════════════════════════════
// PENALTIES (เตือน/ลงโทษ)
// ═══════════════════════════════════════════════
async function pgPenalties() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/penalties');
  el.innerHTML = `
    <div class="page-header"><h1>เตือน/ลงโทษ</h1><button class="btn btn-primary" onclick="showPenaltyForm()">+ สร้างการเตือน</button></div>
    <div class="card">
      ${renderTable([
        {key:'stall_name',label:'ร้าน'},{key:'type',label:'ประเภท',badge:STATUS_PENALTY},
        {key:'reason',label:'เหตุผล'},{key:'amount',label:'ค่าปรับ',money:true},
        {key:'issued_at',label:'วันที่',date:true},{key:'status',label:'สถานะ',badge:{active:{text:'ดำเนินการ',class:'badge-danger'},resolved:{text:'แก้ไขแล้ว',class:'badge-success'}}}
      ], res.data || [], row => row.status === 'active' ? `<button class="btn btn-sm btn-success" onclick="resolvePenalty('${row.id}')">แก้ไขแล้ว</button>` : '')}
    </div>`;
}

window.showPenaltyForm = async function() {
  const stalls = (await callAPI('GET', '/stalls?status=occupied')).data || [];
  showModal(`
    <div class="modal-header"><h2>สร้างการเตือน/ลงโทษ</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="savePenalty(event)">
      <div class="modal-body">
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required><option value="">-- เลือก --</option>${stalls.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label>ประเภท *</label><select name="type" required><option value="warning">เตือน</option><option value="fine">ปรับ</option><option value="suspension">ระงับ</option><option value="termination">ยกเลิกสัญญา</option></select></div>
        <div class="form-group"><label>เหตุผล *</label><textarea name="reason" required></textarea></div>
        <div class="form-group"><label>ค่าปรับ (ถ้ามี)</label><input type="number" name="amount" step="0.01"></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.savePenalty = async function(e) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = await callAPI('POST', '/penalties', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgPenalties();
};

window.resolvePenalty = async function(id) {
  if (!await confirmDialog('ยืนยันว่าปัญหาได้รับการแก้ไขแล้ว?')) return;
  const res = await callAPI('PUT', '/penalties/' + id, { status: 'resolved', resolved_at: new Date().toISOString() });
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); pgPenalties();
};

// ═══════════════════════════════════════════════
// MENUS ADMIN (เมนู/ราคา — Admin)
// ═══════════════════════════════════════════════
async function pgMenusAdmin() {
  const el = document.getElementById('content');
  const [menusRes, priceRes] = await Promise.all([
    callAPI('GET', '/menus'),
    callAPI('GET', '/menus/price-changes?status=pending')
  ]);
  el.innerHTML = `
    <div class="page-header"><h1>เมนู/ราคา</h1></div>
    ${(priceRes.data||[]).length ? `
      <div class="card" style="border-left:4px solid #D97706;margin-bottom:1rem">
        <div class="card-header"><h3>⏳ รอนุมัติเปลี่ยนราคา (${priceRes.data.length})</h3></div>
        ${renderTable([
          {key:'menu_name',label:'เมนู'},{key:'stall_name',label:'ร้าน'},
          {key:'old_price',label:'ราคาเดิม',money:true},{key:'new_price',label:'ราคาใหม่',money:true}
        ], priceRes.data, row => `
          <button class="btn btn-sm btn-success" onclick="approvePriceChange('${row.id}')">อนุมัติ</button>
          <button class="btn btn-sm btn-danger" onclick="rejectPriceChange('${row.id}')">ปฏิเสธ</button>
        `)}
      </div>` : ''}
    <div class="card">
      <div class="card-header"><h3>เมนูทั้งหมด</h3></div>
      ${renderTable([
        {key:'stall_name',label:'ร้าน'},{key:'name',label:'เมนู'},{key:'price',label:'ราคา',money:true},
        {key:'category',label:'หมวด'},{key:'is_available',label:'สถานะ',render:v=>v?'✅':'❌'}
      ], menusRes.data || [])}
    </div>`;
}

window.approvePriceChange = async function(id) {
  const res = await callAPI('PUT', '/menus/price-changes/' + id, { status: 'approved' });
  if (res.error) return toast(res.error, 'error');
  toast('อนุมัติสำเร็จ', 'success'); pgMenusAdmin();
};

window.rejectPriceChange = async function(id) {
  const res = await callAPI('PUT', '/menus/price-changes/' + id, { status: 'rejected' });
  if (res.error) return toast(res.error, 'error');
  toast('ปฏิเสธแล้ว', 'success'); pgMenusAdmin();
};

// ═══════════════════════════════════════════════
// COMPLAINTS ADMIN (ข้อร้องเรียน — Admin)
// ═══════════════════════════════════════════════
async function pgComplaintsAdmin() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/complaints');
  el.innerHTML = `
    <div class="page-header"><h1>ข้อร้องเรียน</h1></div>
    <div class="card">
      ${renderTable([
        {key:'tracking_code',label:'รหัสติดตาม'},{key:'stall_name',label:'ร้าน'},
        {key:'category',label:'หมวด',render:v=>({food_quality:'คุณภาพอาหาร',hygiene:'สุขอนามัย',price:'ราคา',service:'บริการ',other:'อื่นๆ'}[v]||v)},
        {key:'description',label:'รายละเอียด',render:v=>(v||'').length>50?escapeHtml(v.slice(0,50))+'...':escapeHtml(v||'')},
        {key:'status',label:'สถานะ',badge:STATUS_COMPLAINT},{key:'created_at',label:'วันที่',date:true}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-secondary" onclick="showComplaintDetail('${row.id}')">ดู</button>
        ${row.status!=='resolved'&&row.status!=='dismissed' ? `<button class="btn btn-sm btn-primary" onclick="respondComplaint('${row.id}')">ตอบกลับ</button>` : ''}
      `)}
    </div>`;
}

window.showComplaintDetail = async function(id) {
  const res = await callAPI('GET', '/complaints/' + id);
  const c = res.data || {};
  showModal(`
    <div class="modal-header"><h2>ข้อร้องเรียน ${escapeHtml(c.tracking_code||'')}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <p><strong>ร้าน:</strong> ${escapeHtml(c.stall_name||'ไม่ระบุ')}</p>
      <p><strong>ผู้ร้องเรียน:</strong> ${c.complainant_name||'ไม่ระบุ'} (${c.complainant_type})</p>
      <p><strong>หมวด:</strong> ${c.category}</p>
      <p><strong>รายละเอียด:</strong></p><p>${escapeHtml(c.description||'')}</p>
      ${c.response ? `<hr><p><strong>การตอบกลับ:</strong></p><p>${escapeHtml(c.response)}</p><p><small>โดย ${escapeHtml(c.responder_name||'')} — ${formatDateTime(c.responded_at)}</small></p>` : ''}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">ปิด</button></div>`);
};

window.respondComplaint = async function(id) {
  showModal(`
    <div class="modal-header"><h2>ตอบกลับข้อร้องเรียน</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveComplaintResponse(event,'${id}')">
      <div class="modal-body">
        <div class="form-group"><label>สถานะ *</label><select name="status" required><option value="investigating">กำลังสอบสวน</option><option value="resolved">แก้ไขแล้ว</option><option value="dismissed">ยกเลิก</option></select></div>
        <div class="form-group"><label>การตอบกลับ *</label><textarea name="response" rows="4" required></textarea></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.saveComplaintResponse = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = await callAPI('PUT', '/complaints/' + id, data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgComplaintsAdmin();
};

// ═══════════════════════════════════════════════
// REPORTS (รายงาน)
// ═══════════════════════════════════════════════
async function pgReports() {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="page-header"><h1>รายงาน</h1></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      <div class="card" style="cursor:pointer" onclick="runReport('revenue')">
        <div style="padding:1.5rem;text-align:center"><div style="font-size:2rem">💰</div><h3>รายงานรายได้</h3><p style="color:#6B7280">สรุปรายได้ตามเดือน/ปี</p></div>
      </div>
      <div class="card" style="cursor:pointer" onclick="runReport('bills')">
        <div style="padding:1.5rem;text-align:center"><div style="font-size:2rem">📋</div><h3>รายงานบิล</h3><p style="color:#6B7280">สถานะบิลทั้งหมด</p></div>
      </div>
      <div class="card" style="cursor:pointer" onclick="runReport('inspection')">
        <div style="padding:1.5rem;text-align:center"><div style="font-size:2rem">🔍</div><h3>รายงานตรวจสุขอนามัย</h3><p style="color:#6B7280">สรุปผลตรวจ</p></div>
      </div>
      <div class="card" style="cursor:pointer" onclick="runReport('stalls')">
        <div style="padding:1.5rem;text-align:center"><div style="font-size:2rem">🏪</div><h3>รายงานร้านค้า</h3><p style="color:#6B7280">สถานะร้านค้า / สัญญา</p></div>
      </div>
    </div>
    <div class="card" id="report-result" style="margin-top:1rem;display:none"></div>`;
}

window.runReport = async function(type) {
  const container = document.getElementById('report-result');
  container.style.display = '';
  container.innerHTML = '<div class="loading">กำลังโหลดรายงาน...</div>';
  const res = await callAPI('GET', '/reports/' + type);
  if (res.error) { container.innerHTML = `<p class="alert alert-error">${res.error}</p>`; return; }
  container.innerHTML = `<div class="card-header"><h3>ผลรายงาน</h3></div><pre style="padding:1rem;overflow:auto;font-size:.85rem">${escapeHtml(JSON.stringify(res.data, null, 2))}</pre>`;
};

// ═══════════════════════════════════════════════
// ACTIVITY LOG (ประวัติการใช้งาน)
// ═══════════════════════════════════════════════
async function pgActivityLog() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/settings/audit-log?limit=100');
  el.innerHTML = `
    <div class="page-header"><h1>ประวัติการใช้งาน</h1></div>
    <div class="card">
      ${renderTable([
        {key:'created_at',label:'เวลา',render:v=>formatDateTime(v)},{key:'user_name',label:'ผู้ใช้'},
        {key:'action',label:'กิจกรรม'},{key:'target_table',label:'ตาราง'},{key:'target_id',label:'รหัส'}
      ], res.data || [])}
    </div>`;
}

// ═══════════════════════════════════════════════
// SETTINGS (ตั้งค่า)
// ═══════════════════════════════════════════════
async function pgSettings() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/settings');
  const s = {};
  (res.data || []).forEach(r => { s[r.key] = r.value; });

  el.innerHTML = `
    <div class="page-header"><h1>ตั้งค่าระบบ</h1></div>
    <form class="card" onsubmit="saveSettings(event)">
      <div class="card-header"><h3 class="card-title">⚙️ ข้อมูลทั่วไป</h3></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ชื่อโรงเรียน</label><input class="form-input" name="school_name" value="${escapeHtml(s.school_name||'')}"></div>
        <div class="form-group"><label class="form-label">ชื่อธนาคาร</label><input class="form-input" name="bank_name" value="${escapeHtml(s.bank_name||'')}" placeholder="เช่น ธนาคารกรุงไทย"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">เลขที่บัญชี</label><input class="form-input" name="bank_account_no" value="${escapeHtml(s.bank_account_no||'')}" placeholder="เช่น 123-4-56789-0"></div>
        <div class="form-group"><label class="form-label">ชื่อบัญชี</label><input class="form-input" name="bank_account_name" value="${escapeHtml(s.bank_account_name||'')}" placeholder="เช่น โรงเรียนพะเยาพิทยาคม"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">PromptPay ID (สำหรับ QR Code)</label><input class="form-input" name="promptpay_id" value="${escapeHtml(s.promptpay_id||'')}" placeholder="เบอร์โทร 10 หลัก หรือ เลขบัตร ปชช. 13 หลัก"></div>
      </div>
      <h3 style="margin-top:1.5rem;margin-bottom:1rem;font-size:1rem;color:var(--gray-700)">💧⚡ อัตราค่าบริการ</h3>
      <div class="form-row" style="grid-template-columns:repeat(3,1fr)">
        <div class="form-group"><label class="form-label">ค่าน้ำ/หน่วย (บาท)</label><input class="form-input" type="number" step="0.01" name="water_rate" value="${s.water_rate||18}"></div>
        <div class="form-group"><label class="form-label">ค่าไฟ/หน่วย (บาท)</label><input class="form-input" type="number" step="0.01" name="electric_rate" value="${s.electric_rate||8}"></div>
        <div class="form-group"><label class="form-label">ค่าส่วนกลาง (บาท)</label><input class="form-input" type="number" step="0.01" name="common_fee" value="${s.common_fee||500}"></div>
      </div>
      <h3 style="margin-top:1.5rem;margin-bottom:1rem;font-size:1rem;color:var(--gray-700)">📋 การควบคุม</h3>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ราคาอาหารสูงสุด (บาท)</label><input class="form-input" type="number" name="max_food_price" value="${s.max_food_price||35}"></div>
        <div class="form-group"><label class="form-label">เก็บรูปภาพ (วัน)</label><input class="form-input" type="number" name="photo_retention_days" value="${s.photo_retention_days||90}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">เตือนสัญญาล่วงหน้า (วัน)</label><input class="form-input" type="number" name="contract_warning_days" value="${s.contract_warning_days||30}"></div>
        <div class="form-group"><label class="form-label">เตือนใบรับรองแพทย์ (วัน)</label><input class="form-input" type="number" name="health_cert_warning_days" value="${s.health_cert_warning_days||30}"></div>
      </div>
      <div class="form-row" style="grid-template-columns:1fr 1fr">
        <div class="form-group"><label class="form-label">เดือนเริ่มปีงบฯ</label><input class="form-input" type="number" name="fiscal_year_start_month" value="${s.fiscal_year_start_month||10}" min="1" max="12"></div>
      </div>
      <div class="form-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-primary">💾 บันทึกตั้งค่า</button></div>
    </form>

    <div class="card" style="margin-top:1rem">
      <div class="card-header"><h3 class="card-title">🔐 เปลี่ยนรหัสผ่าน</h3></div>
      <form onsubmit="changePassword(event)">
        <div class="form-row" style="grid-template-columns:repeat(3,1fr)">
          <div class="form-group"><label class="form-label">รหัสผ่านปัจจุบัน</label><input class="form-input" type="password" name="current_password" required autocomplete="current-password"></div>
          <div class="form-group"><label class="form-label">รหัสผ่านใหม่</label><input class="form-input" type="password" name="new_password" minlength="8" required autocomplete="new-password"></div>
          <div class="form-group"><label class="form-label">ยืนยันรหัสผ่านใหม่</label><input class="form-input" type="password" name="confirm_password" minlength="8" required autocomplete="new-password"></div>
        </div>
        <div class="form-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-secondary">เปลี่ยนรหัสผ่าน</button></div>
      </form>
    </div>`;
}

window.saveSettings = async function(e) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = await callAPI('PUT', '/settings', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกตั้งค่าสำเร็จ', 'success');
};

window.changePassword = async function(e) {
  e.preventDefault();
  const data = getFormData(e.target);
  if (data.new_password !== data.confirm_password) return toast('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
  const res = await callAPI('POST', '/auth/change-password', { current_password: data.current_password, new_password: data.new_password });
  if (res.error) return toast(res.error, 'error');
  toast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
  e.target.reset();
};

// ═══════════════════════════════════════════════
// PROFILE (โปรไฟล์)
// ═══════════════════════════════════════════════
async function pgProfile() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/auth/me');
  if (res.error) { el.innerHTML = '<p class="text-center">ไม่สามารถโหลดข้อมูลได้</p>'; return; }
  const u = res.data;
  el.innerHTML = `
    <div class="page-header"><h1>โปรไฟล์</h1></div>
    <div class="card" style="max-width:600px">
      <div class="card-header"><h3 class="card-title">ข้อมูลส่วนตัว</h3></div>
      <form onsubmit="saveProfile(event)">
        <div class="form-group"><label class="form-label">ชื่อ</label><input class="form-input" type="text" name="name" value="${escapeHtml(u.name)}" required></div>
        <div class="form-group"><label class="form-label">เบอร์โทร</label><input class="form-input" type="tel" name="phone" value="${escapeHtml(u.phone)}" maxlength="10" required></div>
        <div class="form-group"><label class="form-label">อีเมล</label><input class="form-input" type="email" name="email" value="${u.email ? escapeHtml(u.email) : ''}" placeholder="example@email.com"></div>
        <div class="form-group"><label class="form-label">บทบาท</label><div style="padding:0.5rem 0"><span class="badge badge-primary">${ROLE_NAMES[u.role] || u.role}</span></div></div>
        ${u.stall_id ? `<div class="form-group"><label class="form-label">ร้านค้า</label><div style="padding:0.5rem 0">${escapeHtml(u.stall_id)}</div></div>` : ''}
        <div class="form-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-primary">💾 บันทึกข้อมูล</button></div>
      </form>
    </div>
    <div class="card" style="max-width:600px">
      <div class="card-header"><h3 class="card-title">🔑 เปลี่ยนรหัสผ่าน</h3></div>
      <form onsubmit="changePassword(event)">
        <div class="form-group"><label class="form-label">รหัสผ่านปัจจุบัน</label><input class="form-input" type="password" name="current_password" required autocomplete="current-password"></div>
        <div class="form-group"><label class="form-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input class="form-input" type="password" name="new_password" minlength="8" required autocomplete="new-password"></div>
        <div class="form-group"><label class="form-label">ยืนยันรหัสผ่านใหม่</label><input class="form-input" type="password" name="confirm_password" minlength="8" required autocomplete="new-password"></div>
        <div class="form-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-primary">💾 เปลี่ยนรหัสผ่าน</button></div>
      </form>
    </div>`;
}

window.saveProfile = async function(e) {
  e.preventDefault();
  const data = getFormData(e.target);
  const user = getCurrentUser();
  const res = await callAPI('PUT', '/users/' + user.id, data);
  if (res.error) return toast(res.error, 'error');
  // Update local user data
  setCurrentUser({ ...user, name: data.name, phone: data.phone, email: data.email || null });
  toast('บันทึกข้อมูลสำเร็จ', 'success');
  // Re-render navbar with updated name
  document.getElementById('app').innerHTML = renderNavbar(getCurrentUser());
  pgProfile();
};

// ═══════════════════════════════════════════════
// NOTIFICATIONS (การแจ้งเตือน)
// ═══════════════════════════════════════════════
async function pgNotifications() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/notifications');
  el.innerHTML = `
    <div class="page-header"><h1>การแจ้งเตือน</h1><button class="btn btn-secondary" onclick="markAllRead()">✓ อ่านทั้งหมด</button></div>
    <div class="card">
      ${(res.data||[]).length ? (res.data||[]).map(n => `
        <div style="padding:1rem;border-bottom:1px solid #E5E7EB;background:${n.is_read?'transparent':'#F0FDF4'};cursor:pointer" onclick="markRead('${n.id}')">
          <div style="display:flex;justify-content:space-between"><strong>${escapeHtml(n.title)}</strong><small style="color:#9CA3AF">${formatDateTime(n.created_at)}</small></div>
          <p style="margin:0.25rem 0 0;color:#6B7280;font-size:0.9rem">${escapeHtml(n.message||'')}</p>
        </div>
      `).join('') : '<p style="padding:2rem;text-align:center;color:#9CA3AF">ไม่มีการแจ้งเตือน</p>'}
    </div>`;
}

window.markRead = async function(id) {
  await callAPI('PUT', '/notifications/' + id, { is_read: 1 });
  pgNotifications();
};

window.markAllRead = async function() {
  await callAPI('POST', '/notifications/mark-all-read');
  toast('อ่านทั้งหมดแล้ว', 'success'); pgNotifications();
};

// ═══════════════════════════════════════════════
// RECORD WATER (บันทึกค่าน้ำ) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgRecordWater() {
  const el = document.getElementById('content');
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear() + 543;
  const monthOpts = THAI_MONTHS.map((m,i) => `<option value="${i+1}" ${(i+1)===curMonth?'selected':''}>${m}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>💧 บันทึกค่าน้ำ</h1></div>
    <div class="card">
      <div style="background:#E0F7FA;border:1px solid #B2EBF2;border-radius:8px;padding:0.8rem 1rem;margin-bottom:1rem;color:#00838F;font-size:.9rem;display:flex;align-items:center;gap:.5rem">
        ℹ️ กรอกเลขมิเตอร์น้ำของแต่ละร้านค้า ระบบจะคำนวณหน่วยใช้งานและยอดเงินโดยอัตโนมัติ
      </div>
      <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem">
        <div class="form-group" style="margin:0;flex:1;min-width:140px">
          <label class="form-label">เดือน</label>
          <select class="form-select" id="rw-month" onchange="startRecordWater()">${monthOpts}</select>
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">ปี (พ.ศ.)</label>
          <input type="number" class="form-input" id="rw-year" value="${curYear}" style="max-width:120px" onchange="startRecordWater()">
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">💧 อัตราค่าน้ำ (บาท/หน่วย)</label>
          <input type="number" class="form-input" id="rw-rate" value="" step="0.5" min="0" readonly style="background:#F0FDFF;font-weight:700;color:#0E7490">
        </div>
      </div>
      <div id="rw-container"><div class="loading">กำลังโหลด...</div></div>
    </div>`;
  startRecordWater();
}

window.startRecordWater = async function() {
  const month = parseInt(document.getElementById('rw-month').value);
  const year = parseInt(document.getElementById('rw-year').value);
  if (!month || !year) return toast('กรุณาเลือกเดือนและปี', 'error');
  const container = document.getElementById('rw-container');
  container.innerHTML = '<div class="loading">⏳ กำลังโหลดข้อมูล...</div>';

  const ensureRes = await callAPI('POST', '/billing/periods/ensure', { year, month });
  if (ensureRes.error) return container.innerHTML = `<p style="color:var(--danger)">${escapeHtml(ensureRes.error)}</p>`;
  const period = ensureRes.data;
  window._rwPeriod = period.id;

  // Show rate
  const rateInput = document.getElementById('rw-rate');
  if (rateInput) rateInput.value = period.water_rate || 18;

  // Get prev period readings for auto-fill
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriodId = `BP-${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const [stallsRes, readingsRes, prevReadingsRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=water'),
    callAPI('GET', '/billing/readings?period_id=' + prevPeriodId + '&type=water')
  ]);
  const stalls = stallsRes.data || [], readings = readingsRes.data || [];
  const prevReadings = prevReadingsRes.data || [];
  const rMap = {}; readings.forEach(r => { rMap[r.stall_id] = r; });
  const prevMap = {}; prevReadings.forEach(r => { prevMap[r.stall_id] = r; });
  const rate = period.water_rate || 18;

  if (!stalls.length) {
    container.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-secondary)">ไม่มีร้านค้าที่มีผู้เช่า</p>';
    return;
  }

  const rows = stalls.map((s,i) => {
    const r = rMap[s.id];
    const prevR = prevMap[s.id];
    // Auto-fill prev_reading from previous period's curr_reading
    const prev = r ? (r.prev_reading || 0) : (prevR ? (prevR.curr_reading || 0) : 0);
    const curr = r ? r.curr_reading : '';
    const usage = curr !== '' && curr !== null ? Math.max(0, curr - prev) : 0;
    const amt = usage > 0 ? usage * rate : 0;
    return `<tr data-sid="${s.id}" data-rid="${r?.id||''}" data-rate="${rate}">
      <td style="text-align:center">${i+1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.zone||'-')}</td>
      <td><input class="form-input rw-p" type="number" step="0.01" value="${prev}" style="width:100px" onchange="calcMeterRow(this,'rw')"></td>
      <td><input class="form-input rw-c" type="number" step="0.01" value="${curr===null?'':curr}" placeholder="กรอกเลข" style="width:100px" onchange="calcMeterRow(this,'rw')"></td>
      <td class="rw-u" style="text-align:right;font-weight:700;color:#0E7490">${usage>0?usage.toFixed(2):'-'}</td>
      <td class="rw-a" style="text-align:right;font-weight:700;color:#059669">${amt>0?formatMoney(amt):'-'}</td>
      <td>${r?'<span class="badge badge-success">จดแล้ว</span>':'<span class="badge badge-warning">รอจด</span>'}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem">
      <strong style="color:#0E7490">📝 บันทึกเลขมิเตอร์</strong>
      <input type="search" id="rw-search" placeholder="🔍 ค้นหาร้านค้า..." oninput="filterMeterTable('rw')" style="padding:.4rem .7rem;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-width:180px">
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>ร้านค้า</th><th>โซน</th><th>มิเตอร์ก่อน</th><th>มิเตอร์ปัจจุบัน</th><th>หน่วยใช้</th><th>ยอดเงิน (฿)</th><th>สถานะ</th></tr></thead>
      <tbody id="rw-body">${rows}</tbody>
    </table></div>
    <div style="background:linear-gradient(135deg,#F0FDFF,#E0F7FA);border:2px solid #B2EBF2;border-radius:12px;padding:1.2rem;margin-top:1rem;display:flex;justify-content:space-around;flex-wrap:wrap;gap:1rem">
      <div style="text-align:center"><div style="font-size:.9rem;color:#0E7490">จำนวนร้าน</div><div style="font-size:1.5rem;font-weight:700;color:#0E7490" id="rw-cnt">0</div></div>
      <div style="text-align:center"><div style="font-size:.9rem;color:#0E7490">รวมหน่วยใช้</div><div style="font-size:1.5rem;font-weight:700;color:#0E7490" id="rw-units">0</div></div>
      <div style="text-align:center"><div style="font-size:.9rem;color:#0E7490">รวมยอดเงิน</div><div style="font-size:1.5rem;font-weight:700;color:#0E7490" id="rw-amt">0</div></div>
    </div>
    <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="saveAllRecordWater()" style="min-width:200px">💾 บันทึกข้อมูล</button>
    </div>`;
  updateMeterSummary('rw');
};

window.filterMeterTable = function(prefix) {
  const q = (document.getElementById(prefix + '-search')?.value || '').trim().toLowerCase();
  const rows = document.querySelectorAll('#' + prefix + '-body tr');
  let shown = 0;
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const match = !q || text.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) shown++;
  });
};

window.calcMeterRow = function(input, prefix) {
  const tr = input.closest('tr');
  const p = parseFloat(tr.querySelector('.' + prefix + '-p').value) || 0;
  const c = parseFloat(tr.querySelector('.' + prefix + '-c').value) || 0;
  const rate = parseFloat(tr.dataset.rate);
  const u = c > p ? c - p : 0;
  const a = u * rate;
  tr.querySelector('.' + prefix + '-u').textContent = u > 0 ? u.toFixed(2) : '-';
  tr.querySelector('.' + prefix + '-a').textContent = a > 0 ? formatMoney(a) : '-';
  updateMeterSummary(prefix);
};

function updateMeterSummary(prefix) {
  let cnt = 0, units = 0, amt = 0;
  document.querySelectorAll('#' + prefix + '-body tr').forEach(tr => {
    const c = parseFloat(tr.querySelector('.' + prefix + '-c').value);
    const p = parseFloat(tr.querySelector('.' + prefix + '-p').value) || 0;
    if (c || c === 0) { cnt++; const u = c > p ? c - p : 0; units += u; amt += u * parseFloat(tr.dataset.rate); }
  });
  const ce = document.getElementById(prefix + '-cnt'), ue = document.getElementById(prefix + '-units'), ae = document.getElementById(prefix + '-amt');
  if (ce) ce.textContent = cnt;
  if (ue) ue.textContent = units.toFixed(2);
  if (ae) ae.textContent = formatMoney(amt);
}

window.saveAllRecordWater = async function() {
  await saveAllMeterReadings('rw', 'water', window._rwPeriod);
};

async function saveAllMeterReadings(prefix, type, periodId) {
  const rows = document.querySelectorAll('#' + prefix + '-body tr');
  let saved = 0, errors = 0, total = 0;
  // Show saving overlay
  const overlay = document.createElement('div');
  overlay.id = 'saving-overlay';
  overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;z-index:99998;backdrop-filter:blur(4px)">
    <div style="background:#fff;border-radius:20px;padding:40px 48px;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.22)">
      <div style="width:48px;height:48px;border:5px solid #e0f2fe;border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px"></div>
      <div style="font-size:18px;font-weight:600;color:#0f172a">กำลังบันทึก...</div>
      <div style="font-size:14px;color:#64748b;margin-top:6px" id="saving-progress">0 / 0</div>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  for (const tr of rows) {
    const c = tr.querySelector('.' + prefix + '-c').value;
    if (c === '' || c === undefined) continue;
    total++;
  }

  let done = 0;
  for (const tr of rows) {
    const c = tr.querySelector('.' + prefix + '-c').value;
    if (c === '' || c === undefined) continue;
    const p = tr.querySelector('.' + prefix + '-p').value || 0;
    const fd = new FormData();
    fd.append('stall_id', tr.dataset.sid);
    fd.append('billing_period_id', periodId);
    fd.append('type', type);
    fd.append('prev_reading', p);
    fd.append('curr_reading', c);
    const res = tr.dataset.rid ? await callAPI('PUT', '/billing/readings/' + tr.dataset.rid, fd, true) : await callAPI('POST', '/billing/readings', fd, true);
    if (res.error) errors++; else saved++;
    done++;
    const prog = document.getElementById('saving-progress');
    if (prog) prog.textContent = `${done} / ${total}`;
  }
  overlay.remove();
  toast(
    `บันทึก${type === 'water' ? 'ค่าน้ำ' : 'ค่าไฟ'} ${saved} ร้าน${errors ? ' (ผิดพลาด ' + errors + ')' : ''}`,
    errors ? 'warning' : 'success'
  );
  if (type === 'water') startRecordWater(); else startRecordElectric();
}

// ═══════════════════════════════════════════════
// RECORD ELECTRIC (บันทึกค่าไฟ) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgRecordElectric() {
  const el = document.getElementById('content');
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear() + 543;
  const monthOpts = THAI_MONTHS.map((m,i) => `<option value="${i+1}" ${(i+1)===curMonth?'selected':''}>${m}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>⚡ บันทึกค่าไฟ</h1></div>
    <div class="card">
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:0.8rem 1rem;margin-bottom:1rem;color:#92400E;font-size:.9rem;display:flex;align-items:center;gap:.5rem">
        ℹ️ กรอกเลขมิเตอร์ไฟฟ้าของแต่ละร้านค้า ระบบจะคำนวณหน่วยใช้งานและยอดเงินโดยอัตโนมัติ
      </div>
      <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem">
        <div class="form-group" style="margin:0;flex:1;min-width:140px">
          <label class="form-label">เดือน</label>
          <select class="form-select" id="re-month" onchange="startRecordElectric()">${monthOpts}</select>
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">ปี (พ.ศ.)</label>
          <input type="number" class="form-input" id="re-year" value="${curYear}" style="max-width:120px" onchange="startRecordElectric()">
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">⚡ อัตราค่าไฟ (บาท/หน่วย)</label>
          <input type="number" class="form-input" id="re-rate" value="" step="0.5" min="0" readonly style="background:#FFFBEB;font-weight:700;color:#B45309">
        </div>
      </div>
      <div id="re-container"><div class="loading">กำลังโหลด...</div></div>
    </div>`;
  startRecordElectric();
}

window.startRecordElectric = async function() {
  const month = parseInt(document.getElementById('re-month').value);
  const year = parseInt(document.getElementById('re-year').value);
  if (!month || !year) return toast('กรุณาเลือกเดือนและปี', 'error');
  const container = document.getElementById('re-container');
  container.innerHTML = '<div class="loading">⏳ กำลังโหลดข้อมูล...</div>';

  const ensureRes = await callAPI('POST', '/billing/periods/ensure', { year, month });
  if (ensureRes.error) return container.innerHTML = `<p style="color:var(--danger)">${escapeHtml(ensureRes.error)}</p>`;
  const period = ensureRes.data;
  window._rePeriod = period.id;

  const rateInput = document.getElementById('re-rate');
  if (rateInput) rateInput.value = period.electric_rate || 8;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriodId = `BP-${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const [stallsRes, readingsRes, prevReadingsRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=electric'),
    callAPI('GET', '/billing/readings?period_id=' + prevPeriodId + '&type=electric')
  ]);
  const stalls = stallsRes.data || [], readings = readingsRes.data || [];
  const prevReadings = prevReadingsRes.data || [];
  const rMap = {}; readings.forEach(r => { rMap[r.stall_id] = r; });
  const prevMap = {}; prevReadings.forEach(r => { prevMap[r.stall_id] = r; });
  const rate = period.electric_rate || 8;

  if (!stalls.length) {
    container.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-secondary)">ไม่มีร้านค้าที่มีผู้เช่า</p>';
    return;
  }

  const rows = stalls.map((s,i) => {
    const r = rMap[s.id];
    const prevR = prevMap[s.id];
    const prev = r ? (r.prev_reading || 0) : (prevR ? (prevR.curr_reading || 0) : 0);
    const curr = r ? r.curr_reading : '';
    const usage = curr !== '' && curr !== null ? Math.max(0, curr - prev) : 0;
    const amt = usage > 0 ? usage * rate : 0;
    return `<tr data-sid="${s.id}" data-rid="${r?.id||''}" data-rate="${rate}">
      <td style="text-align:center">${i+1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.zone||'-')}</td>
      <td><input class="form-input re-p" type="number" step="0.01" value="${prev}" style="width:100px" onchange="calcMeterRow(this,'re')"></td>
      <td><input class="form-input re-c" type="number" step="0.01" value="${curr===null?'':curr}" placeholder="กรอกเลข" style="width:100px" onchange="calcMeterRow(this,'re')"></td>
      <td class="re-u" style="text-align:right;font-weight:700;color:#B45309">${usage>0?usage.toFixed(2):'-'}</td>
      <td class="re-a" style="text-align:right;font-weight:700;color:#059669">${amt>0?formatMoney(amt):'-'}</td>
      <td>${r?'<span class="badge badge-success">จดแล้ว</span>':'<span class="badge badge-warning">รอจด</span>'}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.5rem">
      <strong style="color:#B45309">📝 บันทึกเลขมิเตอร์</strong>
      <input type="search" id="re-search" placeholder="🔍 ค้นหาร้านค้า..." oninput="filterMeterTable('re')" style="padding:.4rem .7rem;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-width:180px">
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>ร้านค้า</th><th>โซน</th><th>มิเตอร์ก่อน</th><th>มิเตอร์ปัจจุบัน</th><th>หน่วยใช้</th><th>ยอดเงิน (฿)</th><th>สถานะ</th></tr></thead>
      <tbody id="re-body">${rows}</tbody>
    </table></div>
    <div style="background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:2px solid #FDE68A;border-radius:12px;padding:1.2rem;margin-top:1rem;display:flex;justify-content:space-around;flex-wrap:wrap;gap:1rem">
      <div style="text-align:center"><div style="font-size:.9rem;color:#92400E">จำนวนร้าน</div><div style="font-size:1.5rem;font-weight:700;color:#B45309" id="re-cnt">0</div></div>
      <div style="text-align:center"><div style="font-size:.9rem;color:#92400E">รวมหน่วยใช้</div><div style="font-size:1.5rem;font-weight:700;color:#B45309" id="re-units">0</div></div>
      <div style="text-align:center"><div style="font-size:.9rem;color:#92400E">รวมยอดเงิน</div><div style="font-size:1.5rem;font-weight:700;color:#B45309" id="re-amt">0</div></div>
    </div>
    <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="saveAllRecordElectric()" style="min-width:200px">💾 บันทึกข้อมูล</button>
    </div>`;
  updateMeterSummary('re');
};

window.saveAllRecordElectric = async function() {
  await saveAllMeterReadings('re', 'electric', window._rePeriod);
};

// ═══════════════════════════════════════════════
// NOTIFY BILLS (แจ้งยอดชำระ) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgNotifyBills() {
  const el = document.getElementById('content');
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear() + 543;
  const monthOpts = THAI_MONTHS.map((m,i) => `<option value="${i+1}" ${(i+1)===curMonth?'selected':''}>${m}</option>`).join('');
  const todayISO = now.toISOString().split('T')[0];

  el.innerHTML = `
    <style>
      .nb-section{background:#ecfdf5;border-radius:14px;padding:1.5rem;margin-bottom:1rem;box-shadow:0 2px 12px rgba(0,0,0,0.03);width:100%;border:1px solid #a7f3d0}
      .nb-section-title{font-size:1.1rem;font-weight:700;color:#059669;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;border-bottom:2px solid #a7f3d0;padding-bottom:.5rem}
      .nb-info{background:#d1fae5;border:1px solid #a7f3d0;border-radius:8px;padding:.8rem 1rem;margin-bottom:1rem;color:#065f46;font-size:.9rem;display:flex;align-items:center;gap:.5rem}
      .nb-capture{width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
      .nb-capture-header{background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-align:center;padding:.9rem 1rem;font-size:1.2rem;font-weight:700;letter-spacing:.5px}
      .nb-tbl{width:100%;border-collapse:collapse;background:#fff;font-size:.92rem}
      .nb-tbl th{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;padding:.65rem .5rem;font-weight:700;text-align:center;border:1px solid #86efac;white-space:nowrap}
      .nb-tbl td{padding:.55rem .5rem;border:1px solid #d1fae5;text-align:center;vertical-align:middle}
      .nb-tbl tr:nth-child(even){background:#f0fdf4}
      .nb-tbl tr:hover{background:#dcfce7}
      .nb-tbl .col-name{min-width:140px;text-align:left;padding-left:.8rem}
      .nb-money{font-weight:700;color:#059669}
      .nb-total{font-weight:700;color:#b45309;font-size:1.05rem}
      .nb-footer{background:#fffbeb;color:#92400e;text-align:center;padding:.6rem;font-size:.85rem;border-top:1px solid #fde68a}
      .nb-common-cell{display:inline-flex;align-items:center;gap:5px}
      .nb-common-val{font-weight:700;color:#059669;min-width:45px;text-align:right;display:inline-block}
      .nb-common-val.editable{cursor:pointer;border-bottom:1px dashed #94a3b8}
      .nb-common-val.editable:hover{color:#2563eb;border-color:#2563eb}
      .nb-exempt-btn{padding:2px 7px;border-radius:6px;border:1.5px solid #fca5a5;background:#fff1f2;color:#ef4444;font-size:.75rem;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;line-height:1.6}
      .nb-exempt-btn:hover{background:#fecaca;border-color:#f87171}
      .nb-exempt-btn.exempted{background:#dcfce7;color:#16a34a;border-color:#86efac}
      .nb-exempt-btn.exempted:hover{background:#bbf7d0}
      .nb-exempted-row .nb-common-val{color:#9ca3af;text-decoration:line-through}
      .nb-edit-input{width:58px;padding:1px 4px;border:1.5px solid #3b82f6;border-radius:5px;font-size:.9rem;font-family:inherit;text-align:center;font-weight:700;color:#1e40af;outline:none}
      .nb-edit-input:focus{box-shadow:0 0 0 2px rgba(59,130,246,.3)}
      .nb-btn{border-radius:10px;font-size:1rem;font-weight:700;padding:.7rem 1.8rem;border:none;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,.06);transition:transform .2s,box-shadow .2s;font-family:inherit;display:inline-flex;align-items:center;gap:.5rem}
      .nb-btn:hover{transform:translateY(-2px);box-shadow:0 6px 8px rgba(0,0,0,.15)}
      .nb-btn:active{transform:translateY(0)}
      .nb-btn-green{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
      .nb-btn-orange{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff}
      .nb-btn-blue{background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff}
      .nb-btn-gray{background:linear-gradient(to right,#e5e7eb,#d1d5db);color:#374151}
      .nb-btn-red{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff}
      @media(max-width:600px){.nb-tbl{font-size:.8rem}.nb-tbl th,.nb-tbl td{padding:.4rem .3rem}.nb-btn{width:100%;justify-content:center}}
    </style>
    <div class="page-header"><h1>📋 แจ้งยอดชำระ</h1></div>
    <div class="nb-info">ℹ️ ข้อมูลค่าน้ำ ค่าไฟ ค่าส่วนกลาง จะถูกดึงจากระบบโดยอัตโนมัติ ระบบจะคำนวณยอดรวมให้ กดปุ่มบันทึกภาพเพื่อส่งแจ้งยอด</div>
    <div class="nb-section">
      <div class="nb-section-title">📅 เลือกรอบบิล</div>
      <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;flex:1;min-width:140px">
          <label class="form-label">เดือน</label>
          <select class="form-select" id="nb-month">${monthOpts}</select>
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">ปี (พ.ศ.)</label>
          <input type="number" class="form-input" id="nb-year" value="${curYear}" style="max-width:120px">
        </div>
        <button class="nb-btn nb-btn-blue" onclick="loadNotifyBills()">📋 ดึงข้อมูล</button>
      </div>
    </div>
    <div class="nb-section">
      <div class="nb-section-title">📅 วันที่แจ้งยอด</div>
      <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;flex:1;min-width:160px">
          <label class="form-label">วันที่แจ้งยอด</label>
          <input type="date" class="form-input" id="nb-notify-date" value="${todayISO}" onchange="nbUpdateDueDate()">
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:200px;display:flex;align-items:flex-end">
          <div id="nb-due-display" style="padding:.7rem 1rem;background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;font-size:1rem;color:#065f46;width:100%">กำหนดชำระ: กำลังคำนวณ...</div>
        </div>
      </div>
    </div>
    <div id="nb-container"><div class="loading">กำลังโหลด...</div></div>`;
  nbUpdateDueDate();
  loadNotifyBills();
}

// Due date: 15 working days from notify date
window.nbUpdateDueDate = function() {
  const notifyVal = document.getElementById('nb-notify-date')?.value;
  if (!notifyVal) return;
  const d = new Date(notifyVal + 'T00:00:00');
  if (isNaN(d.getTime())) return;
  let count = 0;
  while (count < 15) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) count++; }
  const dd = d.getDate(), mm = THAI_MONTHS[d.getMonth()], yy = d.getFullYear() + 543;
  window._nbDueDateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  const el = document.getElementById('nb-due-display');
  if (el) el.textContent = `กำหนดชำระภายในวันที่ ${dd} ${mm} ${yy}`;
  // Update footer notes
  document.querySelectorAll('.nb-footer-note').forEach(f => {
    f.textContent = `งานโรงอาหาร โรงเรียนพะเยาพิทยาคม | กรุณาชำระภายในวันที่ ${dd} ${mm} ${yy}`;
  });
};

window.loadNotifyBills = async function() {
  const month = parseInt(document.getElementById('nb-month').value);
  const year = parseInt(document.getElementById('nb-year').value);
  if (!month || !year) return;
  const container = document.getElementById('nb-container');
  container.innerHTML = '<div class="loading">⏳ กำลังโหลดข้อมูล...</div>';

  const ensureRes = await callAPI('POST', '/billing/periods/ensure', { year, month });
  if (ensureRes.error) return container.innerHTML = `<p style="color:var(--danger)">${escapeHtml(ensureRes.error)}</p>`;
  const period = ensureRes.data;
  window._nbPeriod = period.id;

  // Fetch bills, readings, and stalls in parallel
  let billsRes = await callAPI('GET', '/billing/bills?period_id=' + period.id);
  let bills = billsRes.data || [];

  // Auto-generate bills if readings exist but no bills yet
  if (!bills.length) {
    const [waterRes, electricRes] = await Promise.all([
      callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=water'),
      callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=electric')
    ]);
    const hasReadings = (waterRes.data?.length || 0) + (electricRes.data?.length || 0) > 0;
    if (hasReadings) {
      container.innerHTML = '<div class="loading">⏳ กำลังสร้างบิลจากข้อมูลมิเตอร์...</div>';
      const genRes = await callAPI('POST', '/billing/generate', { period_id: period.id });
      if (!genRes.error && genRes.data?.count > 0) {
        billsRes = await callAPI('GET', '/billing/bills?period_id=' + period.id);
        bills = billsRes.data || [];
      }
    }
  }

  const periodLabel = `${THAI_MONTHS[(period.month||1)-1]} พ.ศ. ${period.year}`;

  if (!bills.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-secondary)">
        <p>📭 ยังไม่มีข้อมูลค่าน้ำ/ค่าไฟ สำหรับรอบ ${periodLabel}</p>
        <p style="font-size:.9rem;color:#94a3b8">กรุณาไปบันทึกค่าน้ำ/ค่าไฟ ที่หน้า "บันทึกค่าน้ำ" / "บันทึกค่าไฟ" ก่อน</p>
      </div>`;
    return;
  }

  // Fetch readings for meter display
  const [waterReadings, electricReadings] = await Promise.all([
    callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=water'),
    callAPI('GET', '/billing/readings?period_id=' + period.id + '&type=electric')
  ]);
  const waterMap = {}; (waterReadings.data || []).forEach(r => { waterMap[r.stall_id] = r; });
  const electricMap = {}; (electricReadings.data || []).forEach(r => { electricMap[r.stall_id] = r; });

  // Summary stats
  let totalRent=0, totalWater=0, totalElec=0, totalCommon=0, totalAll=0;
  const draftCount = bills.filter(b => b.status === 'draft').length;
  const issuedCount = bills.filter(b => b.status === 'issued' || b.status === 'overdue').length;
  const paidCount = bills.filter(b => b.status === 'paid').length;

  const rows = bills.map((b,i) => {
    totalRent += b.rent_amount||0; totalWater += b.water_amount||0;
    totalElec += b.electric_amount||0; totalCommon += b.common_fee||0;
    totalAll += b.total_amount||0;

    const wr = waterMap[b.stall_id];
    const er = electricMap[b.stall_id];
    const wMeter = wr ? `${_last4(wr.prev_reading)} - ${_last4(wr.curr_reading)}` : '-';
    const eMeter = er ? `${_last4(er.prev_reading)} - ${_last4(er.curr_reading)}` : '-';

    const commonVal = b.common_fee || 0;
    const isAdmin = getCurrentUser().role === 'admin';

    return `<tr data-bill-id="${b.id}" data-stall-id="${b.stall_id}" data-idx="${i}">
      <td>${i+1}</td>
      <td class="col-name">${escapeHtml(b.stall_name||'')}</td>
      <td style="font-size:.85rem">${wMeter}</td>
      <td class="nb-money">${(b.water_amount||0) > 0 ? formatMoney(b.water_amount) : '-'}</td>
      <td style="font-size:.85rem">${eMeter}</td>
      <td class="nb-money">${(b.electric_amount||0) > 0 ? formatMoney(b.electric_amount) : '-'}</td>
      <td><div class="nb-common-cell">
        <span class="nb-common-val${isAdmin ? ' editable' : ''}" onclick="nbEditCommon(this)">${commonVal ? formatMoney(commonVal) : '-'}</span>
        <input type="hidden" class="nb-common-input" value="${commonVal}" data-original="${commonVal}">
        <button class="nb-exempt-btn" onclick="nbToggleExempt(this)" title="ยกเว้นค่าส่วนกลาง">ยกเว้น</button>
      </div></td>
      <td class="nb-total">${formatMoney(b.total_amount)}</td>
    </tr>`;
  }).join('');

  const dueText = window._nbDueDateISO ? _formatThaiDate(window._nbDueDateISO) : '...';

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="stat-card" style="border-left:4px solid var(--primary)"><div class="stat-value">${bills.length}</div><div class="stat-label">ร้านทั้งหมด</div></div>
      <div class="stat-card" style="border-left:4px solid var(--info)"><div class="stat-value">${formatMoney(totalAll)}</div><div class="stat-label">ยอดรวม (บาท)</div></div>
      <div class="stat-card" style="border-left:4px solid #9CA3AF"><div class="stat-value">${draftCount}</div><div class="stat-label">ร่าง</div></div>
      <div class="stat-card" style="border-left:4px solid var(--warning)"><div class="stat-value">${issuedCount}</div><div class="stat-label">ออกบิลแล้ว</div></div>
      <div class="stat-card" style="border-left:4px solid var(--success)"><div class="stat-value">${paidCount}</div><div class="stat-label">ชำระแล้ว</div></div>
    </div>

    <div class="nb-capture" id="nb-capture-table">
      <div class="nb-capture-header">📋 แจ้งยอดชำระค่าเช่าร้านค้า ประจำเดือน${periodLabel}</div>
      <div style="overflow-x:auto">
      <table class="nb-tbl">
        <thead><tr>
          <th style="width:40px">#</th><th class="col-name">ร้านค้า</th>
          <th>มิเตอร์น้ำ<br><span style="font-weight:400;font-size:.8rem">(ก่อน - ล่าสุด)</span></th>
          <th>ค่าน้ำ</th>
          <th>มิเตอร์ไฟ<br><span style="font-weight:400;font-size:.8rem">(ก่อน - ล่าสุด)</span></th>
          <th>ค่าไฟ</th>
          <th>ค่าส่วนกลาง</th>
          <th>รวม</th>
        </tr></thead>
        <tbody id="nb-tbody">${rows}</tbody>
        <tfoot><tr style="font-weight:700;background:#f0fdf4">
          <td colspan="3" style="text-align:right;color:#065f46">รวมทั้งสิ้น</td>
          <td class="nb-money">${formatMoney(totalWater)}</td>
          <td></td>
          <td class="nb-money">${formatMoney(totalElec)}</td>
          <td class="nb-money">${formatMoney(totalCommon)}</td>
          <td class="nb-total" style="font-size:1.1em">${formatMoney(totalAll)}</td>
        </tr></tfoot>
      </table>
      </div>
      <div class="nb-footer nb-footer-note">งานโรงอาหาร โรงเรียนพะเยาพิทยาคม | กรุณาชำระภายในวันที่ ${dueText}</div>
    </div>

    <div style="display:flex;gap:1rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap">
      <button class="nb-btn nb-btn-green" onclick="nbSaveAsImage()">💾 บันทึกรูปภาพ</button>
      ${draftCount ? `<button class="nb-btn nb-btn-orange" onclick="nbBatchIssue()">📤 ออกบิลทั้งหมด (${draftCount} ร้าน)</button>` : ''}
      <button class="nb-btn nb-btn-gray" onclick="nbRegenerateBills()">⚙️ สร้างบิลใหม่</button>
    </div>
    ${!draftCount && bills.length ? '<div style="margin-top:1rem;padding:1rem;background:#D1FAE5;border-radius:8px;color:#065F46;text-align:center">✅ ออกบิลครบทุกร้านแล้ว</div>' : ''}`;

  nbUpdateDueDate();
};

function _last4(num) {
  if (num == null) return '-';
  const s = String(num);
  return s.length > 4 ? s.slice(-4) : s;
}
function _formatThaiDate(iso) {
  if (!iso) return '...';
  try {
    const [y,m,d] = iso.split('-');
    return `${parseInt(d)} ${THAI_MONTHS[parseInt(m)-1]} ${parseInt(y)+543}`;
  } catch { return '...'; }
}

// Inline edit common fee
window.nbEditCommon = function(span) {
  if (!span.classList.contains('editable')) return;
  const cell = span.closest('.nb-common-cell');
  const input = cell.querySelector('.nb-common-input');
  const curVal = parseFloat(input.value) || 0;
  const ed = document.createElement('input');
  ed.type = 'number'; ed.className = 'nb-edit-input';
  ed.value = curVal; ed.min = '0'; ed.step = '10';
  span.style.display = 'none';
  cell.insertBefore(ed, span);
  ed.focus(); ed.select();
  function finish() {
    let nv = parseFloat(ed.value) || 0;
    if (nv < 0) nv = 0;
    input.value = nv;
    span.textContent = nv ? formatMoney(nv) : '-';
    span.style.display = '';
    if (ed.parentNode) ed.parentNode.removeChild(ed);
    nbRecalcRow(span.closest('tr'));
  }
  ed.addEventListener('blur', finish);
  ed.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); ed.blur(); }
    if (e.key === 'Escape') { ed.value = curVal; ed.blur(); }
  });
};

window.nbToggleExempt = function(btn) {
  const tr = btn.closest('tr');
  const input = tr.querySelector('.nb-common-input');
  const display = tr.querySelector('.nb-common-val');
  if (btn.classList.contains('exempted')) {
    btn.classList.remove('exempted');
    btn.textContent = 'ยกเว้น';
    tr.classList.remove('nb-exempted-row');
    input.value = input.getAttribute('data-original');
    display.textContent = parseFloat(input.value) ? formatMoney(parseFloat(input.value)) : '-';
  } else {
    btn.classList.add('exempted');
    btn.textContent = '✓ ยกเว้นอยู่';
    tr.classList.add('nb-exempted-row');
    input.value = 0;
    display.textContent = '-';
  }
  nbRecalcRow(tr);
};

function nbRecalcRow(tr) {
  const cells = tr.querySelectorAll('td');
  const water = parseFloat((cells[3].textContent || '0').replace(/[^0-9.-]/g, '')) || 0;
  const elec = parseFloat((cells[5].textContent || '0').replace(/[^0-9.-]/g, '')) || 0;
  const common = parseFloat(tr.querySelector('.nb-common-input').value) || 0;
  // rent is not shown separately here, pull from original bill
  const totalCell = cells[cells.length - 1];
  // We need rent — get it from the bill data
  // Since we don't have rent column displayed, recalculate from water+elec+common + rent
  // For simplicity, just update the common portion delta
  const origCommon = parseFloat(tr.querySelector('.nb-common-input').getAttribute('data-original')) || 0;
  const origTotal = parseFloat(totalCell.textContent.replace(/[^0-9.-]/g, '')) || 0;
  const newTotal = origTotal - origCommon + common;
  totalCell.textContent = formatMoney(newTotal);
}

// Save table as image
window.nbSaveAsImage = async function() {
  if (typeof html2canvas === 'undefined') return toast('ไม่พบ html2canvas library', 'error');
  const el = document.getElementById('nb-capture-table');
  if (!el) return;

  // Hide exempt buttons before capture
  const exemptBtns = el.querySelectorAll('.nb-exempt-btn');
  exemptBtns.forEach(b => b.style.visibility = 'hidden');

  const month = parseInt(document.getElementById('nb-month').value);
  const year = document.getElementById('nb-year').value;
  const fileName = `แจ้งยอดชำระ_โรงอาหาร_${THAI_MONTHS[month-1]}_${year}.png`;

  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1200 });
    exemptBtns.forEach(b => b.style.visibility = '');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('บันทึกรูปภาพสำเร็จ!', 'success');
  } catch (err) {
    exemptBtns.forEach(b => b.style.visibility = '');
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
};

window.nbBatchIssue = async function() {
  const periodId = window._nbPeriod;
  if (!periodId) return;
  if (!await confirmDialog('ออกบิลทุกร้านที่ยังเป็นร่าง? ผู้เช่าจะได้รับแจ้งยอด')) return;
  const bills = (await callAPI('GET', '/billing/bills?period_id=' + periodId + '&status=draft')).data || [];
  let ok = 0, fail = 0;
  for (const b of bills) {
    const res = await callAPI('POST', '/billing/bills/' + b.id + '/issue');
    if (res.error) fail++; else ok++;
  }
  toast(`ออกบิลสำเร็จ ${ok} ร้าน${fail ? ' (ผิดพลาด ' + fail + ')' : ''}`, fail ? 'warning' : 'success');
  loadNotifyBills();
};

window.nbRegenerateBills = async function() {
  const month = parseInt(document.getElementById('nb-month').value);
  const year = parseInt(document.getElementById('nb-year').value);
  if (!month || !year) return toast('กรุณาเลือกเดือนและปี', 'error');
  if (!await confirmDialog('สร้างบิลใหม่จากข้อมูลสัญญาและมิเตอร์?')) return;

  const ensureRes = await callAPI('POST', '/billing/periods/ensure', { year, month });
  if (ensureRes.error) return toast(ensureRes.error, 'error');

  const res = await callAPI('POST', '/billing/generate', { period_id: ensureRes.data.id });
  if (res.error) return toast(res.error, 'error');
  toast(`สร้างบิลสำเร็จ ${res.data?.count || 0} ร้าน`, 'success');
  loadNotifyBills();
};

// ═══════════════════════════════════════════════
// CHECK SLIPS (ตรวจสลิป) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgCheckSlips() {
  const el = document.getElementById('content');
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear() + 543;
  const monthOpts = THAI_MONTHS.map((m,i) => `<option value="${i+1}" ${(i+1)===curMonth?'selected':''}>${m}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>✓ ตรวจสลิป</h1></div>
    <div class="card">
      <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem">
        <div class="form-group" style="margin:0;flex:1;min-width:140px">
          <label class="form-label">เดือน</label>
          <select class="form-select" id="cs-month" onchange="loadCheckSlips()">${monthOpts}</select>
        </div>
        <div class="form-group" style="margin:0;flex:1;min-width:100px">
          <label class="form-label">ปี (พ.ศ.)</label>
          <input type="number" class="form-input" id="cs-year" value="${curYear}" style="max-width:120px" onchange="loadCheckSlips()">
        </div>
        <button class="btn btn-primary" onclick="loadCheckSlips()">🔍 โหลดข้อมูล</button>
      </div>
      <div id="cs-container"><div class="loading">กำลังโหลด...</div></div>
    </div>`;
  loadCheckSlips();
}

window.loadCheckSlips = async function() {
  const month = parseInt(document.getElementById('cs-month').value);
  const year = parseInt(document.getElementById('cs-year').value);
  if (!month || !year) return;
  const container = document.getElementById('cs-container');
  container.innerHTML = '<div class="loading">⏳ กำลังโหลดข้อมูล...</div>';

  const ensureRes = await callAPI('POST', '/billing/periods/ensure', { year, month });
  if (ensureRes.error) return container.innerHTML = `<p style="color:var(--danger)">${escapeHtml(ensureRes.error)}</p>`;
  const period = ensureRes.data;
  window._csPeriod = period.id;

  const [billsRes, paymentsRes] = await Promise.all([
    callAPI('GET', '/billing/bills?period_id=' + period.id),
    callAPI('GET', '/payments?period_id=' + period.id)
  ]);
  const bills = billsRes.data || [], payments = paymentsRes.data || [];
  const payMap = {};
  payments.forEach(p => { if (!payMap[p.bill_id]) payMap[p.bill_id] = []; payMap[p.bill_id].push(p); });

  let verified = 0, pending = 0, rejected = 0, unpaid = 0;

  const issuedBills = bills.filter(b => b.status !== 'draft');

  if (!issuedBills.length) {
    container.innerHTML = `<p style="padding:2rem;text-align:center;color:var(--text-secondary)">ไม่มีบิลที่ออกแล้วสำหรับรอบ ${THAI_MONTHS[(period.month||1)-1]} ${period.year}</p>`;
    return;
  }

  const rows = issuedBills.map((b,i) => {
    const pays = payMap[b.id] || [];
    const latestPay = pays[0];
    let statusHTML = '', rowBg = '';

    if (!latestPay) {
      unpaid++;
      statusHTML = '<span class="badge badge-danger">ยังไม่ชำระ</span>';
      rowBg = '#FEF2F2';
    } else if (latestPay.status === 'verified') {
      verified++;
      statusHTML = '<span class="badge badge-success">✅ อนุมัติ</span>';
      rowBg = '#F0FDF4';
    } else if (latestPay.status === 'rejected') {
      rejected++;
      statusHTML = '<span class="badge badge-danger">❌ ปฏิเสธ</span>';
      rowBg = '#FEF2F2';
    } else {
      pending++;
      const diff = Math.abs((latestPay.amount || 0) - (b.total_amount || 0));
      statusHTML = diff < 1
        ? '<span class="badge badge-warning">⏳ รอตรวจ (ยอดตรง)</span>'
        : '<span class="badge badge-warning">⚠️ รอตรวจ (ยอดไม่ตรง)</span>';
      rowBg = '#FFFBEB';
    }

    const slipBtn = latestPay?.slip_photo_key
      ? `<button class="btn btn-sm btn-secondary" onclick="showSlipLightbox('${latestPay.slip_photo_key}','${latestPay.id}','${escapeHtml(b.stall_name||'')}',${b.total_amount},${latestPay.amount})">👁 ดูสลิป</button>`
      : '-';

    const actionBtns = latestPay && latestPay.status === 'pending'
      ? `<button class="btn btn-sm btn-success" onclick="quickApprove('${latestPay.id}')">✓ อนุมัติ</button>
         <button class="btn btn-sm btn-danger" onclick="quickReject('${latestPay.id}')">✕ ปฏิเสธ</button>`
      : (latestPay && latestPay.status === 'verified'
        ? `<button class="btn btn-sm" style="background:#DBEAFE;color:#1E40AF" onclick="sendReceipt('${b.id}','${latestPay.id}')">📧 ใบเสร็จ</button>`
        : '');

    return `<tr style="background:${rowBg}">
      <td style="text-align:center">${i+1}</td>
      <td>${escapeHtml(b.stall_name||'')}</td>
      <td class="right">${formatMoney(b.total_amount)}</td>
      <td class="right">${latestPay ? formatMoney(latestPay.amount) : '-'}</td>
      <td>${statusHTML}</td>
      <td>${slipBtn}</td>
      <td>${actionBtns}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="stat-card" style="border-left:4px solid var(--success)"><div class="stat-value">${verified}</div><div class="stat-label">✅ อนุมัติ</div></div>
      <div class="stat-card" style="border-left:4px solid var(--warning)"><div class="stat-value">${pending}</div><div class="stat-label">⏳ รอตรวจ</div></div>
      <div class="stat-card" style="border-left:4px solid var(--danger)"><div class="stat-value">${rejected}</div><div class="stat-label">❌ ปฏิเสธ</div></div>
      <div class="stat-card" style="border-left:4px solid #9CA3AF"><div class="stat-value">${unpaid}</div><div class="stat-label">🔴 ยังไม่ชำระ</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>ร้านค้า</th><th>ยอดแจ้ง</th><th>ยอดชำระ</th><th>สถานะ</th><th>สลิป</th><th>ดำเนินการ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${verified > 0 ? `<div style="margin-top:1rem"><button class="btn" style="background:#DBEAFE;color:#1E40AF" onclick="batchSendReceipts()">📧 ส่งใบเสร็จทั้งหมด (${verified} ร้าน)</button></div>` : ''}`;
};

window.showSlipLightbox = function(fileKey, paymentId, stallName, notified, paid) {
  const diff = Math.abs(notified - paid);
  const match = diff < 1;
  showModal(`
    <div class="modal-header">
      <h2>สลิป — ${stallName}</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="text-align:center">
      <img src="/api/upload/${fileKey}" style="max-width:100%;max-height:60vh;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15)" onerror="this.src='';this.alt='ไม่สามารถโหลดรูปได้'">
      <div style="margin-top:1.5rem;display:flex;justify-content:center;gap:2rem;font-size:1rem">
        <div style="background:#F0FDF4;border:2px solid #BBF7D0;border-radius:12px;padding:1rem 1.5rem;min-width:120px">
          <small style="color:#6B7280">ยอดแจ้ง</small>
          <div style="font-weight:700;font-size:1.4em;color:#059669">${formatMoney(notified)}</div>
        </div>
        <div style="background:${match?'#F0FDF4':'#FEF2F2'};border:2px solid ${match?'#BBF7D0':'#FECACA'};border-radius:12px;padding:1rem 1.5rem;min-width:120px">
          <small style="color:#6B7280">ยอดชำระ</small>
          <div style="font-weight:700;font-size:1.4em;color:${match?'#059669':'#DC2626'}">${formatMoney(paid)}</div>
        </div>
      </div>
      ${!match
        ? `<div style="margin-top:1rem;padding:.75rem 1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#DC2626;font-weight:600">⚠️ ยอดต่างกัน ${formatMoney(diff)} บาท</div>`
        : '<div style="margin-top:1rem;padding:.75rem 1rem;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;color:#059669;font-weight:600">✅ ยอดตรงกัน</div>'}
    </div>
    <div class="modal-footer" style="justify-content:center;gap:1rem">
      <button class="btn btn-success" onclick="closeModal();quickApprove('${paymentId}')" style="min-width:150px">✓ อนุมัติ</button>
      <button class="btn btn-danger" onclick="closeModal();quickReject('${paymentId}')" style="min-width:150px">✕ ปฏิเสธ</button>
    </div>`, { large: true });
};

window.quickApprove = async function(id) {
  if (!await confirmDialog('อนุมัติการชำระนี้?')) return;
  const res = await callAPI('PUT', '/payments/' + id + '/verify', { status: 'verified' });
  if (res.error) return toast(res.error, 'error');
  toast('อนุมัติสำเร็จ', 'success');
  loadCheckSlips();
};

window.quickReject = async function(id) {
  if (!await confirmDialog('ปฏิเสธสลิปนี้? ผู้เช่าจะต้องส่งสลิปใหม่', { danger: true })) return;
  const res = await callAPI('PUT', '/payments/' + id + '/verify', { status: 'rejected' });
  if (res.error) return toast(res.error, 'error');
  toast('ปฏิเสธสำเร็จ', 'success');
  loadCheckSlips();
};

window.sendReceipt = async function(billId, paymentId) {
  toast('กำลังสร้างใบเสร็จ...', 'info');
  const res = await callAPI('POST', '/receipts', { bill_id: billId, payment_id: paymentId });
  if (res.error) return toast(res.error, 'error');
  toast('สร้างใบเสร็จสำเร็จ', 'success');
};

window.batchSendReceipts = async function() {
  if (!await confirmDialog('สร้างใบเสร็จสำหรับร้านที่อนุมัติแล้วทั้งหมด?')) return;
  toast('กำลังดำเนินการ...', 'info');
  // Re-fetch data to get payment IDs
  const periodId = window._csPeriod;
  const [billsRes, paymentsRes] = await Promise.all([
    callAPI('GET', '/billing/bills?period_id=' + periodId),
    callAPI('GET', '/payments?period_id=' + periodId)
  ]);
  const bills = billsRes.data || [], payments = paymentsRes.data || [];
  const payMap = {};
  payments.forEach(p => { if (!payMap[p.bill_id]) payMap[p.bill_id] = []; payMap[p.bill_id].push(p); });

  let ok = 0, fail = 0;
  for (const b of bills) {
    const pays = payMap[b.id] || [];
    const verified = pays.find(p => p.status === 'verified');
    if (!verified) continue;
    const res = await callAPI('POST', '/receipts', { bill_id: b.id, payment_id: verified.id });
    if (res.error) fail++; else ok++;
  }
  toast(`สร้างใบเสร็จ ${ok} ร้าน${fail ? ' (ผิดพลาด ' + fail + ')' : ''}`, fail ? 'warning' : 'success');
};

// ═══════════════════════════════════════════════
// UPLOAD SLIP (ส่งสลิป — stall owner) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgUploadSlip() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  el.innerHTML = `<div class="loading">กำลังโหลด...</div>`;

  const stallId = user.stall_id;
  const [billsRes, paymentsRes, contractRes, bankRes, bankNoRes, bankNameRes, ppRes] = await Promise.all([
    callAPI('GET', '/billing/bills?stall_id=' + stallId + '&limit=20'),
    callAPI('GET', '/payments?stall_id=' + stallId + '&limit=20'),
    callAPI('GET', '/contracts?stall_id=' + stallId + '&status=active'),
    callAPI('GET', '/settings/bank_name'),
    callAPI('GET', '/settings/bank_account_no'),
    callAPI('GET', '/settings/bank_account_name'),
    callAPI('GET', '/settings/promptpay_id')
  ]);
  const allBills = billsRes.data || [];
  const allPayments = paymentsRes.data || [];
  const contract = (contractRes.data || [])[0] || {};
  const stallName = user.stall_name || contract.stall_name || 'ร้านของฉัน';
  const bankName = bankRes.data?.value || '';
  const bankAccountNo = bankNoRes.data?.value || '';
  const bankAccountName = bankNameRes.data?.value || '';
  const promptPayId = ppRes.data?.value || '';

  // Find unpaid bills (issued/overdue, no pending/verified payment)
  const paidBillIds = allPayments.filter(p => p.status !== 'rejected').map(p => p.bill_id);
  const unpaidBills = allBills.filter(b => (b.status === 'issued' || b.status === 'overdue') && !paidBillIds.includes(b.id));
  // Find pending payment for edit mode
  const pendingPayment = allPayments.find(p => p.status === 'pending');

  // Outstanding list HTML
  let outstandingHTML = '';
  if (unpaidBills.length > 1) {
    outstandingHTML = `
    <div class="slip-outstanding-panel">
      <div class="outstanding-title">🔔 ยอดค้างชำระ ${unpaidBills.length} เดือน — เลือกเดือนที่ต้องการชำระ</div>
      <div class="outstanding-list">
        ${unpaidBills.map((b, idx) => {
          const isOverdue = b.status === 'overdue';
          return `<div class="outstanding-item${idx === 0 ? ' active' : ''}" id="out-item-${b.id}" onclick="selectBillForSlip('${b.id}')">
            <div style="display:flex;flex-direction:column;gap:0.15rem">
              <span class="out-period-label">${escapeHtml(b.period_label || '')}</span>
              <span style="font-size:0.8rem;color:#6b7280">
                ${b.rent_amount ? 'ค่าเช่า ' + formatMoney(b.rent_amount) + ' + ' : ''}น้ำ ${formatMoney(b.water_amount)} + ไฟ ${formatMoney(b.electric_amount)}${b.common_fee ? ' + ส่วนกลาง ' + formatMoney(b.common_fee) : ''}
              </span>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span class="out-amount">฿${formatMoney(b.total_amount)}</span>
              <span class="out-badge ${isOverdue ? 'overdue' : 'select'}">${isOverdue ? '⚠️ ค้างชำระ' : 'ชำระได้'}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Edit mode banner
  let editBannerHTML = '';
  if (pendingPayment) {
    editBannerHTML = `
    <div class="slip-edit-banner">
      <div style="font-weight:700;color:#b45309;margin-bottom:0.4rem">✏️ คุณมีสลิปที่รอตรวจสอบอยู่</div>
      <div style="font-size:0.9rem;color:#92400e">บิล ${escapeHtml(pendingPayment.bill_id)} — ยอด ${formatMoney(pendingPayment.amount)} บาท</div>
      <button class="btn btn-sm" style="margin-top:0.5rem;background:transparent;border:1px solid #d97706;color:#92400e" onclick="cancelSlipFromDashboard('${pendingPayment.id}')">🗑️ ยกเลิกสลิปที่ส่งไว้</button>
    </div>`;
  }

  // Select first unpaid bill by default
  const defaultBill = unpaidBills[0] || null;

  el.innerHTML = `
    <button class="slip-back-btn" onclick="location.hash='#/dashboard'">← กลับแดชบอร์ด</button>
    <div class="slip-form-header"><h2>📤 ส่งสลิปชำระเงิน</h2></div>

    ${editBannerHTML}
    ${outstandingHTML}

    ${defaultBill ? `
    <div class="form-section">
      <div class="form-section-title">🏪 ข้อมูลการชำระ</div>
      <div class="form-group">
        <label>ร้านค้า</label>
        <div id="slip-stall-name" style="font-size:1.1rem;font-weight:700;color:var(--primary)">${escapeHtml(stallName)}</div>
      </div>
      <div class="form-group">
        <label>ประจำเดือน</label>
        <div id="slip-period" style="font-size:1rem;color:var(--text-primary)">${escapeHtml(defaultBill.period_label || '')}</div>
      </div>
      <div class="form-group">
        <label>ยอดที่ต้องชำระ (บาท)</label>
        <div id="slip-amount-display" style="font-size:1.3rem;font-weight:700;color:#e11d48">${formatMoney(defaultBill.total_amount)} บาท</div>
        <div id="slip-breakdown" style="margin-top:0.4rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem">
            ${defaultBill.rent_amount ? `<div style="background:#F8FAFC;padding:.4rem .6rem;border-radius:6px">ค่าเช่า: <strong>${formatMoney(defaultBill.rent_amount)}</strong></div>` : ''}
            <div style="background:#F0FDFF;padding:.4rem .6rem;border-radius:6px">ค่าน้ำ: <strong>${formatMoney(defaultBill.water_amount)}</strong></div>
            <div style="background:#FFFBEB;padding:.4rem .6rem;border-radius:6px">ค่าไฟ: <strong>${formatMoney(defaultBill.electric_amount)}</strong></div>
            ${defaultBill.common_fee ? `<div style="background:#F0FDF4;padding:.4rem .6rem;border-radius:6px">ส่วนกลาง: <strong>${formatMoney(defaultBill.common_fee)}</strong></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">💳 ข้อมูลสลิป</div>
      ${defaultBill.total_amount > 0 && (promptPayId || bankAccountNo) ? `
      <div class="so-qr-section" style="margin-bottom:1rem;border-radius:12px;border:1px solid #e2e8f0">
        ${promptPayId ? `
          <div class="so-qr-title">📱 สแกน QR Code เพื่อชำระเงิน</div>
          <div id="slip-qr-container" style="display:flex;justify-content:center;padding:1rem"></div>` : `
          <div class="so-qr-title">🏦 ข้อมูลสำหรับชำระเงิน</div>`}
        ${bankName ? `<div class="so-bank-info">
          <div class="so-bank-row"><span class="so-bank-label">🏦 ธนาคาร</span><strong>${escapeHtml(bankName)}</strong></div>
          <div class="so-bank-row"><span class="so-bank-label">📋 เลขบัญชี</span><strong>${escapeHtml(bankAccountNo)}</strong></div>
          ${bankAccountName ? `<div class="so-bank-row"><span class="so-bank-label">👤 ชื่อบัญชี</span><strong>${escapeHtml(bankAccountName)}</strong></div>` : ''}
          <div class="so-bank-row"><span class="so-bank-label">💰 ยอดชำระ</span><strong style="color:#e11d48">${formatMoney(defaultBill.total_amount)} บาท</strong></div>
        </div>` : `
          <div class="so-qr-info">จำนวน: <strong>${formatMoney(defaultBill.total_amount)} บาท</strong></div>`}
      </div>` : ''}
      <input type="hidden" id="slip-bill-id" value="${defaultBill.id}">
      <div class="form-group">
        <label>จำนวนเงินที่ชำระ (บาท) *</label>
        <input type="number" class="form-input" id="slip-paid-amount" step="0.01" value="${defaultBill.total_amount}" required min="1">
      </div>
      <div class="form-group">
        <label>ช่องทางชำระ *</label>
        <select class="form-select" id="slip-method">
          <option value="transfer">โอนเงิน</option>
          <option value="promptpay">PromptPay</option>
          <option value="cash">เงินสด</option>
        </select>
      </div>
      <div class="form-group">
        <label>📷 แนบรูปสลิป (สูงสุด 3 รูป) *</label>
        <input type="file" id="slip-file-input" accept="image/*" multiple style="display:none">
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.5rem">
          <button type="button" class="add-slip-btn" id="add-slip-btn" onclick="document.getElementById('slip-file-input').click()">📎 เพิ่มสลิป</button>
          <span id="slip-count-label" style="font-size:0.85rem;color:var(--text-secondary)">ยังไม่ได้เลือกไฟล์</span>
        </div>
        <div id="slip-preview-container" style="display:flex;gap:0.5rem;flex-wrap:wrap"></div>
      </div>
      <div class="form-group">
        <label>เลขอ้างอิง / หมายเหตุ</label>
        <input type="text" class="form-input" id="slip-reference" placeholder="เช่น เลขที่รายการโอน">
      </div>
    </div>

    <button class="slip-submit-btn" id="slip-submit-btn" onclick="doSubmitSlip()">📤 ยืนยันส่งสลิป</button>
    ` : `
    <div class="form-section" style="text-align:center;padding:3rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
      <div style="font-size:1.2rem;font-weight:700;color:var(--success)">ไม่มียอดค้างชำระ</div>
      <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:0.5rem">ทุกบิลได้รับการชำระแล้ว หรือรอตรวจสอบอยู่</div>
    </div>`}
  `;

  // Setup file input handler
  window._slipFiles = [];
  window._slipPromptPayId = promptPayId;
  const fileInput = document.getElementById('slip-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const newFiles = Array.from(e.target.files);
      const remaining = 3 - window._slipFiles.length;
      window._slipFiles = window._slipFiles.concat(newFiles.slice(0, remaining));
      e.target.value = '';
      renderSlipThumbs();
    });
  }
  // Render QR code on upload-slip page
  if (promptPayId && defaultBill && defaultBill.total_amount > 0) {
    setTimeout(() => renderPromptPayQR('slip-qr-container', promptPayId, defaultBill.total_amount, 200), 100);
  }
}

function renderSlipThumbs() {
  const container = document.getElementById('slip-preview-container');
  const countLbl = document.getElementById('slip-count-label');
  const addBtn = document.getElementById('add-slip-btn');
  if (!container) return;
  container.innerHTML = '';
  if (window._slipFiles.length === 0) {
    countLbl.textContent = 'ยังไม่ได้เลือกไฟล์';
    addBtn.style.display = '';
    return;
  }
  countLbl.textContent = window._slipFiles.length + ' ไฟล์' + (window._slipFiles.length >= 3 ? ' (เต็มแล้ว)' : '');
  addBtn.style.display = window._slipFiles.length >= 3 ? 'none' : '';
  window._slipFiles.forEach((file, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'slip-thumb-wrap';
    const img = document.createElement('img');
    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'slip-thumb-del'; delBtn.textContent = '×';
    delBtn.onclick = () => { window._slipFiles.splice(idx, 1); renderSlipThumbs(); };
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    reader.readAsDataURL(file);
    wrap.appendChild(img); wrap.appendChild(delBtn);
    container.appendChild(wrap);
  });
}

window.selectBillForSlip = function(billId) {
  // Highlight selected outstanding item
  document.querySelectorAll('.outstanding-item').forEach(el => el.classList.remove('active'));
  const sel = document.getElementById('out-item-' + billId);
  if (sel) sel.classList.add('active');
  // Update form with selected bill data (re-fetch from page data)
  const bills = document.querySelectorAll('.outstanding-item');
  // We need to refetch - simplest: store bills in window
  // Update bill_id
  const billIdInput = document.getElementById('slip-bill-id');
  if (billIdInput) billIdInput.value = billId;
  // Trigger full reload for simplicity
  callAPI('GET', '/billing/bills/' + billId).then(res => {
    const b = res.data;
    if (!b) return;
    document.getElementById('slip-period').textContent = b.period_label || '';
    document.getElementById('slip-amount-display').textContent = formatMoney(b.total_amount) + ' บาท';
    document.getElementById('slip-paid-amount').value = b.total_amount;
    const bd = document.getElementById('slip-breakdown');
    if (bd) {
      bd.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem">
        ${b.rent_amount ? `<div style="background:#F8FAFC;padding:.4rem .6rem;border-radius:6px">ค่าเช่า: <strong>${formatMoney(b.rent_amount)}</strong></div>` : ''}
        <div style="background:#F0FDFF;padding:.4rem .6rem;border-radius:6px">ค่าน้ำ: <strong>${formatMoney(b.water_amount)}</strong></div>
        <div style="background:#FFFBEB;padding:.4rem .6rem;border-radius:6px">ค่าไฟ: <strong>${formatMoney(b.electric_amount)}</strong></div>
        ${b.common_fee ? `<div style="background:#F0FDF4;padding:.4rem .6rem;border-radius:6px">ส่วนกลาง: <strong>${formatMoney(b.common_fee)}</strong></div>` : ''}
      </div>`;
    }
  });
};

window.doSubmitSlip = async function() {
  const billId = document.getElementById('slip-bill-id')?.value;
  const amount = parseFloat(document.getElementById('slip-paid-amount')?.value) || 0;
  const method = document.getElementById('slip-method')?.value || 'transfer';
  const reference = document.getElementById('slip-reference')?.value || '';
  const files = window._slipFiles || [];

  if (!billId) return toast('ไม่พบข้อมูลบิล', 'error');
  if (amount <= 0) return toast('กรุณากรอกจำนวนเงิน', 'warning');
  if (files.length === 0) return toast('กรุณาแนบรูปสลิปอย่างน้อย 1 รูป', 'warning');
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) return toast('ไฟล์ ' + f.name + ' ใหญ่เกิน 5MB', 'error');
  }

  const btn = document.getElementById('slip-submit-btn');
  btn.disabled = true;
  btn.textContent = 'กำลังส่ง...';

  try {
    // Use first file for upload (API accepts single file via FormData)
    const fd = new FormData();
    fd.append('bill_id', billId);
    fd.append('amount', amount);
    fd.append('method', method);
    fd.append('reference_no', reference);
    fd.append('slip', files[0]);

    const res = await callAPI('POST', '/payments', fd, true);
    if (res.error) {
      toast(res.error, 'error');
      btn.disabled = false;
      btn.textContent = '📤 ยืนยันส่งสลิป';
      return;
    }
    toast('✅ ส่งสลิปสำเร็จ รอตรวจสอบ', 'success');
    window._slipFiles = [];
    location.hash = '#/dashboard';
  } catch (err) {
    toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '📤 ยืนยันส่งสลิป';
  }
};

// ═══════════════════════════════════════════════
// STALL OWNER PAGES
// ═══════════════════════════════════════════════
async function pgMyBills() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const res = await callAPI('GET', '/billing/bills?stall_id=' + user.stall_id);
  el.innerHTML = `
    <div class="page-header"><h1>ใบแจ้งหนี้ของฉัน</h1></div>
    <div class="card">
      ${renderTable([
        {key:'id',label:'เลขที่'},{key:'period_label',label:'รอบ'},
        {key:'rent_amount',label:'ค่าเช่า',money:true},{key:'water_amount',label:'ค่าน้ำ',money:true},
        {key:'electric_amount',label:'ค่าไฟ',money:true},{key:'total_amount',label:'รวม',money:true},
        {key:'status',label:'สถานะ',badge:STATUS_BILL}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-secondary" onclick="showBillDetail('${row.id}')">ดู</button>
        ${['issued','overdue'].includes(row.status)?`<button class="btn btn-sm btn-primary" onclick="showMyPaymentForm('${row.id}','${row.total_amount}')">ชำระ</button>`:''}
      `)}
    </div>`;
}

async function pgMyPayments() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const [payRes, billsRes, contractRes] = await Promise.all([
    callAPI('GET', '/payments?stall_id=' + user.stall_id),
    callAPI('GET', '/billing/bills?stall_id=' + user.stall_id + '&limit=50'),
    callAPI('GET', '/contracts?stall_id=' + user.stall_id + '&status=active')
  ]);
  const payments = payRes.data || [];
  const bills = billsRes.data || [];
  const contract = (contractRes.data || [])[0] || {};
  const stallName = user.stall_name || contract.stall_name || 'ร้านของฉัน';
  const billMap = {};
  bills.forEach(b => { billMap[b.id] = b; });

  // Build enriched rows
  const rows = payments.map(p => {
    const bill = billMap[p.bill_id] || {};
    return {
      ...p,
      period_label: bill.period_label || '-',
      water_amount: bill.water_amount || 0,
      electric_amount: bill.electric_amount || 0,
      rent_amount: bill.rent_amount || 0,
      common_fee: bill.common_fee || 0,
      total_amount: bill.total_amount || p.amount
    };
  });

  el.innerHTML = `
    <div class="page-header"><h1>📋 ประวัติชำระเงิน</h1><p style="color:var(--text-light);margin:0">🏪 ${escapeHtml(stallName)}</p></div>
    ${rows.length === 0 ? '<div class="card" style="text-align:center;padding:2rem;color:var(--text-light)">ยังไม่มีประวัติชำระเงิน</div>' : `
    <div class="my-pay-list">
      ${rows.map(p => {
        const bill = billMap[p.bill_id] || {};
        const statusMap = { pending: ['🔍 รอตรวจ','#F59E0B','#FFFBEB'], verified: ['✅ ตรวจแล้ว','#10B981','#F0FDF4'], approved: ['✅ อนุมัติ','#10B981','#F0FDF4'], rejected: ['❌ ไม่ผ่าน','#EF4444','#FEF2F2'] };
        const [sLabel, sColor, sBg] = statusMap[p.status] || ['⏳','#6B7280','#F9FAFB'];
        const methodLabel = { cash:'เงินสด', transfer:'โอนเงิน', promptpay:'PromptPay' }[p.method] || p.method;
        const dateStr = p.paid_at ? new Date(p.paid_at).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : (p.created_at ? new Date(p.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }) : '-');
        return `
        <div class="my-pay-card">
          <div class="my-pay-top">
            <div>
              <div class="my-pay-period">📅 ${escapeHtml(p.period_label)}</div>
              <div class="my-pay-date">${dateStr} · ${escapeHtml(methodLabel)}</div>
            </div>
            <span class="my-pay-status" style="background:${sBg};color:${sColor}">${sLabel}</span>
          </div>
          <div class="my-pay-detail">
            ${p.rent_amount ? `<div class="my-pay-row"><span>🏪 ค่าเช่า</span><span>${formatMoney(p.rent_amount)}</span></div>` : ''}
            ${p.water_amount ? `<div class="my-pay-row"><span>💧 ค่าน้ำ</span><span>${formatMoney(p.water_amount)}</span></div>` : ''}
            ${p.electric_amount ? `<div class="my-pay-row"><span>⚡ ค่าไฟ</span><span>${formatMoney(p.electric_amount)}</span></div>` : ''}
            ${p.common_fee ? `<div class="my-pay-row"><span>🧹 ส่วนกลาง</span><span>${formatMoney(p.common_fee)}</span></div>` : ''}
          </div>
          <div class="my-pay-total">
            <span>💰 ยอดชำระ</span>
            <span class="my-pay-amount">${formatMoney(p.amount)} บาท</span>
          </div>
          ${p.reference_no ? `<div class="my-pay-ref">อ้างอิง: ${escapeHtml(p.reference_no)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`}
  `;
}

window.showMyPaymentForm = async function(billId, amount) {
  showModal(`
    <div class="modal-header"><h2>ชำระเงิน</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveMyPayment(event)">
      <div class="modal-body">
        <input type="hidden" name="bill_id" value="${billId}">
        <div class="form-group"><label>จำนวนเงิน</label><input type="number" step="0.01" name="amount" value="${amount}" required></div>
        <div class="form-group"><label>ช่องทาง *</label><select name="method" required><option value="transfer">โอน</option><option value="promptpay">PromptPay</option><option value="cash">เงินสด</option></select></div>
        <div class="form-group"><label>เลขอ้างอิง</label><input name="reference_no"></div>
        <div class="form-group"><label>สลิป</label><input type="file" name="slip" accept="image/*"></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">ส่งหลักฐาน</button></div>
    </form>`);
};

window.saveMyPayment = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await callAPI('POST', '/payments', fd, true);
  if (res.error) return toast(res.error, 'error');
  toast('ส่งหลักฐานชำระสำเร็จ รอตรวจสอบ', 'success'); closeModal(); pgMyBills();
};

async function pgMyContract() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const res = await callAPI('GET', '/contracts?stall_id=' + user.stall_id + '&status=active');
  const c = (res.data || [])[0] || {};
  el.innerHTML = `
    <div class="page-header"><h1>สัญญาเช่าของฉัน</h1></div>
    <div class="card" style="padding:1.5rem">
      ${Object.keys(c).length ? `
        <table style="width:100%">
          <tr><td><strong>เลขที่สัญญา:</strong></td><td>${escapeHtml(c.id)}</td></tr>
          <tr><td><strong>ร้าน:</strong></td><td>${escapeHtml(c.stall_name||'')}</td></tr>
          <tr><td><strong>ผู้เช่า:</strong></td><td>${escapeHtml(c.tenant_name)}</td></tr>
          <tr><td><strong>ค่าเช่า/เดือน:</strong></td><td>${formatMoney(c.monthly_rent)} บาท</td></tr>
          <tr><td><strong>เงินประกัน:</strong></td><td>${formatMoney(c.deposit_amount)} บาท</td></tr>
          <tr><td><strong>วันเริ่ม:</strong></td><td>${formatDate(c.start_date)}</td></tr>
          <tr><td><strong>วันสิ้นสุด:</strong></td><td>${formatDate(c.end_date)}</td></tr>
          <tr><td><strong>สถานะ:</strong></td><td>${renderBadge(c.status, STATUS_CONTRACT)}</td></tr>
        </table>
      ` : '<p style="text-align:center;color:#9CA3AF">ไม่พบสัญญาเช่า</p>'}
    </div>`;
}

async function pgMyMenus() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const res = await callAPI('GET', '/menus?stall_id=' + user.stall_id);
  el.innerHTML = `
    <div class="page-header"><h1>จัดการเมนู</h1><button class="btn btn-primary" onclick="showMyMenuForm()">+ เพิ่มเมนู</button></div>
    <div class="card">
      ${renderTable([
        {key:'name',label:'ชื่อเมนู'},{key:'price',label:'ราคา',money:true},
        {key:'category',label:'หมวด'},{key:'is_available',label:'ขาย',render:v=>v?'✅':'❌'}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-secondary" onclick="showMyMenuForm('${row.id}')">แก้ไข</button>
        <button class="btn btn-sm btn-warning" onclick="requestPriceChange('${row.id}','${row.name}','${row.price}')">เปลี่ยนราคา</button>
      `)}
    </div>`;
}

window.showMyMenuForm = async function(id) {
  let m = {};
  if (id) { const r = await callAPI('GET', '/menus/' + id); m = r.data || {}; }
  showModal(`
    <div class="modal-header"><h2>${id?'แก้ไข':'เพิ่ม'}เมนู</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveMyMenu(event,'${id||''}')">
      <div class="modal-body">
        <div class="form-group"><label>ชื่อเมนู *</label><input name="name" value="${escapeHtml(m.name||'')}" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ราคา *</label><input type="number" step="0.01" name="price" value="${m.price||''}" required></div>
          <div class="form-group"><label>หมวด</label><input name="category" value="${escapeHtml(m.category||'')}"></div>
        </div>
        <div class="form-group"><label><input type="checkbox" name="is_available" value="1" ${m.is_available!==0?'checked':''}> เปิดขาย</label></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.saveMyMenu = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  data.is_available = data.is_available ? 1 : 0;
  data.stall_id = getCurrentUser().stall_id;
  const res = id ? await callAPI('PUT', '/menus/' + id, data) : await callAPI('POST', '/menus', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgMyMenus();
};

window.requestPriceChange = async function(menuId, name, currentPrice) {
  showModal(`
    <div class="modal-header"><h2>ขอเปลี่ยนราคา: ${escapeHtml(name)}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="savePriceChangeRequest(event,'${menuId}','${currentPrice}')">
      <div class="modal-body">
        <p>ราคาปัจจุบัน: <strong>${formatMoney(currentPrice)} บาท</strong></p>
        <div class="form-group"><label>ราคาใหม่ *</label><input type="number" step="0.01" name="new_price" required></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">ส่งคำขอ</button></div>
    </form>`);
};

window.savePriceChangeRequest = async function(e, menuId, oldPrice) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = await callAPI('POST', '/menus/price-changes', { menu_id: menuId, old_price: oldPrice, new_price: data.new_price });
  if (res.error) return toast(res.error, 'error');
  toast('ส่งคำขอเปลี่ยนราคาสำเร็จ รอผู้ดูแลอนุมัติ', 'success'); closeModal();
};

async function pgMyInspections() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const res = await callAPI('GET', '/inspections?stall_id=' + user.stall_id);
  const inspections = res.data || [];

  // Stats
  const total = inspections.length;
  const passCount = inspections.filter(i => i.result === 'pass').length;
  const warnCount = inspections.filter(i => i.result === 'warning').length;
  const failCount = inspections.filter(i => i.result === 'fail').length;
  const avgScore = total ? (inspections.reduce((s, i) => s + (i.score || 0), 0) / total).toFixed(1) : '-';
  const latestResult = inspections.length ? inspections[0].result : null;
  const latestClass = latestResult === 'pass' ? 'pass' : latestResult === 'warning' ? 'warn' : latestResult === 'fail' ? 'fail' : '';
  const latestLabel = latestResult === 'pass' ? '✅ ผ่าน' : latestResult === 'warning' ? '⚠️ ต้องปรับปรุง' : latestResult === 'fail' ? '❌ ไม่ผ่าน' : '-';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>🔍 ผลตรวจสุขอนามัย</h1>
        <p style="margin:0;font-size:.85rem;color:var(--text-light)">ประวัติผลการตรวจสุขอนามัยร้านค้าของคุณ</p>
      </div>
    </div>

    <div class="insp-stats my-insp-stats">
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#EEF2FF;color:#4F46E5">📊</div><div class="insp-stat-val">${total}</div><div class="insp-stat-lbl">ตรวจทั้งหมด</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#F0FDF4;color:#059669">✅</div><div class="insp-stat-val">${passCount}</div><div class="insp-stat-lbl">ผ่าน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#FFFBEB;color:#D97706">⚠️</div><div class="insp-stat-val">${warnCount}</div><div class="insp-stat-lbl">เตือน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#FEF2F2;color:#DC2626">❌</div><div class="insp-stat-val">${failCount}</div><div class="insp-stat-lbl">ไม่ผ่าน</div></div>
      <div class="insp-stat-card"><div class="insp-stat-icon" style="background:#F5F3FF;color:#7C3AED">🎯</div><div class="insp-stat-val">${avgScore}</div><div class="insp-stat-lbl">คะแนนเฉลี่ย</div></div>
    </div>

    ${latestResult ? `
    <div class="my-insp-latest ${latestClass}">
      <div class="my-insp-latest-label">ผลตรวจล่าสุด</div>
      <div class="my-insp-latest-score">
        <div class="insp-score-circle ${latestClass}" style="width:56px;height:56px;font-size:1.2rem">${inspections[0].score || 0}</div>
        <div>
          <div class="insp-result-badge ${latestClass}">${latestLabel}</div>
          <div style="font-size:.8rem;color:var(--text-light);margin-top:.25rem">📅 ${inspections[0].inspection_date ? new Date(inspections[0].inspection_date).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }) : '-'}</div>
        </div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-header"><h3>📋 ประวัติการตรวจทั้งหมด</h3></div>
      ${inspections.length === 0 ? '<div style="padding:2rem;text-align:center;color:var(--text-light)">ยังไม่มีข้อมูลการตรวจ</div>' : `
      <div class="insp-list">
        ${inspections.map(insp => {
          const scoreClass = insp.result === 'pass' ? 'pass' : insp.result === 'warning' ? 'warn' : 'fail';
          const resultLabel = insp.result === 'pass' ? '✅ ผ่าน' : insp.result === 'warning' ? '⚠️ เตือน' : '❌ ไม่ผ่าน';
          const dateStr = insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' }) : '-';
          return `
          <div class="insp-row" onclick="showInspectionDetail('${insp.id}')">
            <div class="insp-row-left">
              <div class="insp-score-circle ${scoreClass}">${insp.score || 0}</div>
              <div>
                <div class="insp-row-stall">คะแนน ${insp.score || 0}/100</div>
                <div class="insp-row-meta">📅 ${dateStr} · 👤 ${escapeHtml(insp.inspector_name || '-')}</div>
              </div>
            </div>
            <div class="insp-row-right">
              <span class="insp-result-badge ${scoreClass}">${resultLabel}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}