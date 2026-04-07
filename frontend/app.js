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
  'billing-periods':  { render: pgBillingPeriods, roles: ['admin','staff'] },
  'meter-read':       { render: pgMeterRead, roles: ['admin','staff'] },
  'meter-history':    { render: pgMeterHistory, roles: ['admin','staff'] },
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

  // Admin / officer dashboard
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
      { path: 'billing-periods', icon: '📅', label: 'รอบบิล', bg: '#EFF6FF' },
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
  const [billsRes, contractRes, paymentsRes] = await Promise.all([
    callAPI('GET', '/billing/bills?stall_id=' + user.stall_id + '&limit=10'),
    callAPI('GET', '/contracts?stall_id=' + user.stall_id + '&status=active'),
    callAPI('GET', '/payments?stall_id=' + user.stall_id + '&limit=5')
  ]);
  const bills = billsRes.data || [];
  const contract = (contractRes.data || [])[0] || {};
  const payments = paymentsRes.data || [];

  // Find latest active bill
  const activeBill = bills.find(b => b.status === 'issued' || b.status === 'overdue') || null;
  const amount = activeBill ? (activeBill.total_amount || 0) : 0;

  // Check if there's a pending/reviewing payment for this bill
  let slipStatus = 'none';
  let reviewNote = '';
  let paymentId = null;
  if (activeBill) {
    const billPayment = payments.find(p => p.bill_id === activeBill.id);
    if (billPayment) {
      paymentId = billPayment.id;
      if (billPayment.status === 'approved' || billPayment.status === 'verified') slipStatus = 'success';
      else if (billPayment.status === 'rejected') { slipStatus = 'rejected'; reviewNote = billPayment.review_note || ''; }
      else if (billPayment.status === 'pending') slipStatus = 'reviewing';
    }
  }

  // Compute outstanding (overdue bills total)
  const outstanding = bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Period display
  const periodLabel = activeBill ? (activeBill.period_label || '') : '';
  const stallName = user.stall_name || contract.stall_name || 'ร้านของฉัน';
  const firstName = user.name || '';

  // Due date info
  let dueDateHTML = '';
  if (activeBill && activeBill.due_date && amount > 0 && slipStatus !== 'success') {
    const dd = new Date(activeBill.due_date);
    const ddStr = dd.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const daysLeft = Math.ceil((dd - new Date()) / (1000 * 60 * 60 * 24));
    let cls = '';
    let daysText = '';
    if (daysLeft < 0) { cls = 'urgent'; daysText = ` (เลยกำหนดแล้ว ${Math.abs(daysLeft)} วัน)`; }
    else if (daysLeft === 0) { cls = 'urgent'; daysText = ' (ครบกำหนดวันนี้!)'; }
    else if (daysLeft <= 3) { cls = 'soon'; daysText = ` (เหลืออีก ${daysLeft} วัน)`; }
    else if (daysLeft <= 7) { daysText = ` (เหลืออีก ${daysLeft} วัน)`; }
    dueDateHTML = `<div class="hero-due-warning ${cls}">⏰ กรุณาชำระภายในวันที่ ${escapeHtml(ddStr)}${daysText}</div>`;
  }

  // Status badge
  let badgeHTML = '';
  if (slipStatus === 'success') badgeHTML = '<div class="hero-status paid">✅ ชำระแล้ว</div>';
  else if (slipStatus === 'reviewing') badgeHTML = '<div class="hero-status pending">🔍 รอตรวจสอบ</div>';
  else if (slipStatus === 'rejected') badgeHTML = '<div class="hero-status rejected">❌ สลิปไม่ผ่าน</div>';
  else if (amount > 0) badgeHTML = '<div class="hero-status overdue">⏳ รอชำระ</div>';

  // CTA button
  let ctaHTML = '';
  if (slipStatus === 'success') {
    ctaHTML = '<button class="hero-cta success">✅ ชำระสำเร็จแล้ว</button>';
  } else if (slipStatus === 'reviewing') {
    ctaHTML = '<button class="hero-cta reviewing">🔍 อยู่ระหว่างตรวจสอบ</button>';
  } else if (slipStatus === 'rejected') {
    ctaHTML = `<button class="hero-cta rejected-cta" onclick="location.hash='#/upload-slip'">⚠️ สลิปไม่ผ่าน — กดส่งใหม่</button>`;
  } else if (amount > 0) {
    ctaHTML = `<button class="hero-cta" onclick="location.hash='#/upload-slip'">📤 ส่งสลิปชำระเงิน</button>`;
  } else {
    ctaHTML = '<button class="hero-cta success">🎉 ไม่มียอดค้างชำระ</button>';
  }

  // Bill breakdown
  let breakdownHTML = '';
  if (activeBill && amount > 0) {
    const w = activeBill.water_amount || 0;
    const e = activeBill.electric_amount || 0;
    const r = activeBill.rent_amount || 0;
    const c = activeBill.common_fee || 0;
    if (w > 0 || e > 0 || r > 0 || c > 0) {
      breakdownHTML = `<div class="hero-breakdown">
        ${r > 0 ? `<div class="hb-item"><span class="hb-dot rent"></span><span class="hb-label">ค่าเช่า</span><span class="hb-val">${formatMoney(r)} บาท</span></div>` : ''}
        ${w > 0 ? `<div class="hb-item"><span class="hb-dot water"></span><span class="hb-label">ค่าน้ำ</span><span class="hb-val">${formatMoney(w)} บาท</span></div>` : ''}
        ${e > 0 ? `<div class="hb-item"><span class="hb-dot electric"></span><span class="hb-label">ค่าไฟ</span><span class="hb-val">${formatMoney(e)} บาท</span></div>` : ''}
        ${c > 0 ? `<div class="hb-item"><span class="hb-dot common"></span><span class="hb-label">ค่าส่วนกลาง</span><span class="hb-val">${formatMoney(c)} บาท</span></div>` : ''}
      </div>`;
    }
  }

  // Rejection banner
  let rejectHTML = '';
  if (slipStatus === 'rejected') {
    rejectHTML = `<div class="hero-reject-banner">⚠️ <strong>สลิปถูกปฏิเสธ</strong>${reviewNote ? '<br>เหตุผล: <strong>' + escapeHtml(reviewNote) + '</strong>' : ''}<br>กรุณากด <strong>"⚠️ สลิปไม่ผ่าน — กดส่งใหม่"</strong> เพื่ออัพโหลดสลิปใหม่</div>`;
  }

  // Cancel button
  let cancelHTML = '';
  if (slipStatus === 'reviewing' || slipStatus === 'rejected') {
    cancelHTML = `<button class="hero-cancel-btn" onclick="cancelSlipFromDashboard(${paymentId})">🗑️ ยกเลิกสลิปที่ส่งไว้</button>`;
  }

  el.innerHTML = `
    <div class="hero-payment">
      <div class="hero-greeting">สวัสดี${firstName ? ', ' + escapeHtml(firstName) : ''}</div>
      <div class="hero-stall">🏪 ${escapeHtml(stallName)}</div>
      <hr class="hero-divider">
      <div class="hero-row">
        <div class="hero-col">
          <div class="hero-label">💳 ยอดชำระเดือนนี้</div>
          <div class="hero-amount${amount === 0 ? ' zero' : ''}">${amount > 0 ? formatMoney(amount) + ' บาท' : 'ยังไม่มียอดแจ้ง'}</div>
          ${breakdownHTML}
          <div class="hero-period">${periodLabel ? '📅 ' + escapeHtml(periodLabel) : ''}</div>
        </div>
        <div class="hero-col" style="text-align:right">${badgeHTML}</div>
      </div>
      ${dueDateHTML}
      ${ctaHTML}
      ${rejectHTML}
      ${cancelHTML}
    </div>

    ${outstanding > 0 && slipStatus !== 'success' ? `
    <div class="outstanding-banner">
      <div class="ob-icon">⚠️</div>
      <div class="ob-info">
        <div class="ob-label">ยอดค้างชำระทั้งหมด</div>
        <div class="ob-amount">${formatMoney(outstanding)} บาท</div>
      </div>
      <button class="ob-btn" onclick="location.hash='#/my-bills'">ดูทั้งหมด</button>
    </div>` : ''}

    <div class="quick-actions">
      <a class="quick-action" href="#/upload-slip"><div class="qa-icon" style="background:#F0FDF4">📤</div><span class="qa-label">ส่งสลิป</span></a>
      <a class="quick-action" href="#/my-bills"><div class="qa-icon" style="background:#EFF6FF">💰</div><span class="qa-label">ใบแจ้งหนี้</span></a>
      <a class="quick-action" href="#/my-payments"><div class="qa-icon" style="background:#FFFBEB">💳</div><span class="qa-label">ประวัติชำระ</span></a>
      <a class="quick-action" href="#/my-menus"><div class="qa-icon" style="background:#FFF7ED">🍜</div><span class="qa-label">จัดการเมนู</span></a>
    </div>

    <div class="card">
      <div class="card-header"><h3>📋 ประวัติชำระล่าสุด</h3></div>
      ${renderTable([
        {key:'bill_id',label:'บิล'},{key:'amount',label:'ยอด',money:true},
        {key:'method',label:'ช่องทาง',render:v=>({cash:'เงินสด',transfer:'โอน',promptpay:'PromptPay'}[v]||v)},
        {key:'paid_at',label:'วันชำระ',date:true},{key:'status',label:'สถานะ',badge:STATUS_PAYMENT}
      ], payments)}
    </div>`;
}

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
  const stallOpts = stalls.map(s => `<option value="${s.id}" ${c.stall_id===s.id?'selected':''}>${s.name} (${s.zone||'-'})</option>`).join('');

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
  const stallOpts = stalls.map(s=>`<option value="${s.id}" ${u.stall_id===s.id?'selected':''}>${s.name}</option>`).join('');

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
  const opts = stalls.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
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
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required><option value="">-- เลือก --</option>${stalls.map(s=>`<option value="${s.id}" ${b.stall_id===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div>
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
// BILLING PERIODS (รอบบิล)
// ═══════════════════════════════════════════════
async function pgBillingPeriods() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/billing/periods');
  el.innerHTML = `
    <div class="page-header"><h1>รอบบิล</h1><button class="btn btn-primary" onclick="showBillingPeriodForm()">+ สร้างรอบบิลใหม่</button></div>
    <div class="card">
      ${renderTable([
        {key:'id',label:'รหัส'},{key:'year',label:'ปี'},{key:'month',label:'เดือน',render:v=>THAI_MONTHS[v-1]||v},
        {key:'water_rate',label:'ค่าน้ำ/หน่วย',money:true},{key:'electric_rate',label:'ค่าไฟ/หน่วย',money:true},
        {key:'status',label:'สถานะ',badge:{open:{text:'เปิด',class:'badge-success'},closed:{text:'ปิด',class:'badge-secondary'}}}
      ], res.data || [], row => `
        <button class="btn btn-sm btn-primary" onclick="location.hash='#/meter-read?period=${row.id}'">จดมิเตอร์</button>
        <button class="btn btn-sm btn-info" onclick="generateBills('${row.id}')">สร้างบิล</button>
        <button class="btn btn-sm btn-secondary" onclick="showBillingPeriodForm('${row.id}')">แก้ไข</button>
      `)}
    </div>`;
}

window.showBillingPeriodForm = async function(id) {
  let p = {};
  if (id) { const r = await callAPI('GET', '/billing/periods/' + id); p = r.data || {}; }
  const now = new Date();
  const monthOpts = THAI_MONTHS.map((m,i)=>`<option value="${i+1}" ${(p.month||now.getMonth()+1)===(i+1)?'selected':''}>${m}</option>`).join('');
  showModal(`
    <div class="modal-header"><h2>${id?'แก้ไข':'สร้าง'}รอบบิล</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveBillingPeriod(event,'${id||''}')">
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ปี (พ.ศ.) *</label><input type="number" name="year" value="${p.year||now.getFullYear()+543}" required></div>
          <div class="form-group"><label>เดือน *</label><select name="month" required>${monthOpts}</select></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ค่าน้ำ/หน่วย *</label><input type="number" step="0.01" name="water_rate" value="${p.water_rate||18}" required></div>
          <div class="form-group"><label>ค่าไฟ/หน่วย *</label><input type="number" step="0.01" name="electric_rate" value="${p.electric_rate||8}" required></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>เลขที่บิลต้นทางน้ำ</label><input name="source_water_bill_no" value="${escapeHtml(p.source_water_bill_no||'')}"></div>
          <div class="form-group"><label>เลขที่บิลต้นทางไฟ</label><input name="source_electric_bill_no" value="${escapeHtml(p.source_electric_bill_no||'')}"></div>
        </div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.saveBillingPeriod = async function(e, id) {
  e.preventDefault();
  const data = getFormData(e.target);
  const res = id ? await callAPI('PUT', '/billing/periods/' + id, data) : await callAPI('POST', '/billing/periods', data);
  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success'); closeModal(); pgBillingPeriods();
};

window.generateBills = async function(periodId) {
  if (!await confirmDialog('สร้างบิลสำหรับรอบนี้? ระบบจะคำนวณยอดจากมิเตอร์ + สัญญาเช่า')) return;
  const res = await callAPI('POST', '/billing/generate', { period_id: periodId });
  if (res.error) return toast(res.error, 'error');
  toast(`สร้างบิลสำเร็จ ${res.data?.count || 0} ร้าน`, 'success');
  pgBillingPeriods();
};

// ═══════════════════════════════════════════════
// METER READING (จดมิเตอร์)
// ═══════════════════════════════════════════════
async function pgMeterRead() {
  const el = document.getElementById('content');
  const periodsRes = await callAPI('GET', '/billing/periods?status=open');
  const periods = periodsRes.data || [];

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const selectedPeriod = params.get('period') || (periods[0]?.id || '');

  const periodOpts = periods.map(p => `<option value="${p.id}" ${p.id===selectedPeriod?'selected':''}>${THAI_MONTHS[(p.month||1)-1]} ${p.year}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>จดมิเตอร์</h1></div>
    <div class="card">
      <div class="card-header">
        <div style="display:flex;gap:1rem;align-items:center">
          <label>รอบบิล:</label>
          <select id="period-select" onchange="loadMeterStalls(this.value)" style="min-width:200px">${periodOpts}</select>
        </div>
      </div>
      <div id="meter-stalls-container"><div class="loading">กำลังโหลด...</div></div>
    </div>`;

  if (selectedPeriod) loadMeterStalls(selectedPeriod);
}

window.loadMeterStalls = async function(periodId) {
  const [stallsRes, readingsRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/billing/readings?period_id=' + periodId)
  ]);

  const stalls = stallsRes.data || [];
  const readings = readingsRes.data || [];
  const readingMap = {};
  readings.forEach(r => { readingMap[r.stall_id + '_' + r.type] = r; });

  const html = stalls.map(stall => {
    const wr = readingMap[stall.id + '_water'];
    const er = readingMap[stall.id + '_electric'];
    return `
      <div class="card" style="margin-bottom:1rem">
        <div class="card-header"><h3>${escapeHtml(stall.name)} (${stall.zone||'-'})</h3></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem">
          <div>
            <h4>💧 น้ำ ${wr ? '<span class="badge badge-success">จดแล้ว</span>' : '<span class="badge badge-warning">ยังไม่จด</span>'}</h4>
            ${wr ? `<p>ครั้งก่อน: ${wr.prev_reading} → ปัจจุบัน: ${wr.curr_reading} (ใช้ ${wr.curr_reading - wr.prev_reading} หน่วย)</p>` : ''}
            <button class="btn btn-sm btn-primary" onclick="showMeterForm('${stall.id}','${periodId}','water','${wr?.id||''}')">
              ${wr ? 'แก้ไข' : 'จดมิเตอร์น้ำ'}
            </button>
          </div>
          <div>
            <h4>⚡ ไฟ ${er ? '<span class="badge badge-success">จดแล้ว</span>' : '<span class="badge badge-warning">ยังไม่จด</span>'}</h4>
            ${er ? `<p>ครั้งก่อน: ${er.prev_reading} → ปัจจุบัน: ${er.curr_reading} (ใช้ ${er.curr_reading - er.prev_reading} หน่วย)</p>` : ''}
            <button class="btn btn-sm btn-primary" onclick="showMeterForm('${stall.id}','${periodId}','electric','${er?.id||''}')">
              ${er ? 'แก้ไข' : 'จดมิเตอร์ไฟ'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('meter-stalls-container').innerHTML = html || '<p style="padding:1rem">ไม่มีร้านค้าที่มีผู้เช่า</p>';
};

window.showMeterForm = async function(stallId, periodId, type, readingId) {
  let reading = {};
  if (readingId) {
    const r = await callAPI('GET', '/billing/readings/' + readingId);
    reading = r.data || {};
  }
  const typeLabel = type === 'water' ? 'น้ำ' : 'ไฟ';
  showModal(`
    <div class="modal-header"><h2>จดมิเตอร์${typeLabel}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveMeterReading(event,'${readingId||''}','${stallId}','${periodId}','${type}')">
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label>ค่าครั้งก่อน</label><input type="number" step="0.01" name="prev_reading" value="${reading.prev_reading||0}" required></div>
          <div class="form-group"><label>ค่าปัจจุบัน *</label><input type="number" step="0.01" name="curr_reading" value="${reading.curr_reading||''}" required></div>
        </div>
        <div class="form-group">
          <label>📷 ถ่ายภาพมิเตอร์ (OCR อัตโนมัติ)</label>
          <input type="file" name="photo" accept="image/*" capture="environment" onchange="handleMeterPhoto(this)">
          <div id="ocr-result" style="margin-top:0.5rem"></div>
        </div>
        <div id="meter-photo-preview"></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึก</button></div>
    </form>`);
};

window.handleMeterPhoto = async function(input) {
  if (!input.files[0]) return;
  const preview = document.getElementById('meter-photo-preview');
  const ocrDiv = document.getElementById('ocr-result');

  // Show preview
  const url = URL.createObjectURL(input.files[0]);
  preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:0.5rem">`;

  // Try OCR
  ocrDiv.innerHTML = '<span class="loading" style="font-size:0.85rem">กำลังอ่านค่า OCR...</span>';
  try {
    const compressed = await compressImage(input.files[0], 800, 0.8);
    const fd = new FormData();
    fd.append('photo', compressed, 'meter.jpg');
    const res = await callAPI('POST', '/upload/ocr-meter', fd, true);
    if (res.data?.value) {
      ocrDiv.innerHTML = `<span class="badge badge-success">OCR อ่านได้: ${res.data.value}</span>`;
      const currInput = document.querySelector('[name="curr_reading"]');
      if (currInput && !currInput.value) currInput.value = res.data.value;
    } else {
      ocrDiv.innerHTML = '<span class="badge badge-warning">ไม่สามารถอ่านค่าได้ กรุณากรอกเอง</span>';
    }
  } catch (err) {
    ocrDiv.innerHTML = '<span class="badge badge-warning">OCR ผิดพลาด กรุณากรอกเอง</span>';
  }
};

window.saveMeterReading = async function(e, readingId, stallId, periodId, type) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  fd.append('stall_id', stallId);
  fd.append('billing_period_id', periodId);
  fd.append('type', type);

  const res = readingId
    ? await callAPI('PUT', '/billing/readings/' + readingId, fd, true)
    : await callAPI('POST', '/billing/readings', fd, true);

  if (res.error) return toast(res.error, 'error');
  toast('บันทึกสำเร็จ', 'success');
  closeModal();
  loadMeterStalls(periodId);
};

async function pgMeterHistory() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/billing/readings?limit=50');
  el.innerHTML = `
    <div class="page-header"><h1>ประวัติจดมิเตอร์</h1></div>
    <div class="card">
      ${renderTable([
        {key:'stall_name',label:'ร้าน'},{key:'type',label:'ประเภท',render:v=>v==='water'?'💧 น้ำ':'⚡ ไฟ'},
        {key:'prev_reading',label:'ก่อน'},{key:'curr_reading',label:'ปัจจุบัน'},
        {key:'usage',label:'ใช้ไป',render:(v,row)=>((row.curr_reading||0)-(row.prev_reading||0)).toFixed(2)},
        {key:'read_at',label:'วันที่จด',date:true},{key:'reader_name',label:'ผู้จด'}
      ], res.data || [])}
    </div>`;
}

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
async function pgInspections() {
  const el = document.getElementById('content');
  const res = await callAPI('GET', '/inspections');
  const user = getCurrentUser();
  const canInspect = ['admin','inspector'].includes(user.role);

  el.innerHTML = `
    <div class="page-header"><h1>ตรวจสุขอนามัย</h1>${canInspect ? '<button class="btn btn-primary" onclick="showInspectionForm()">+ ตรวจร้าน</button>' : ''}</div>
    <div class="card">
      ${renderTable([
        {key:'stall_name',label:'ร้าน'},{key:'inspection_date',label:'วันตรวจ',date:true},
        {key:'score',label:'คะแนน',render:v=>`<strong>${v||0}</strong>/100`},
        {key:'result',label:'ผลลัพธ์',badge:STATUS_INSPECTION},{key:'inspector_name',label:'ผู้ตรวจ'}
      ], res.data || [], row => `<button class="btn btn-sm btn-secondary" onclick="showInspectionDetail('${row.id}')">ดูรายละเอียด</button>`)}
    </div>`;
}

window.showInspectionForm = async function() {
  const [stallsRes, settingsRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/settings/inspection_checklist')
  ]);
  const stalls = stallsRes.data || [];
  let checklist = [];
  try { checklist = JSON.parse(settingsRes.data?.value || '[]'); } catch {}

  const stallOpts = stalls.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  const checklistHTML = checklist.map((cat, ci) => `
    <div style="margin-bottom:1rem">
      <h4>${escapeHtml(cat.category)}</h4>
      ${(cat.items||[]).map((item, ii) => `
        <label style="display:flex;align-items:center;gap:0.5rem;margin:0.25rem 0">
          <input type="checkbox" name="check_${ci}_${ii}" data-cat="${ci}" data-item="${ii}"> ${escapeHtml(item)}
        </label>
      `).join('')}
    </div>
  `).join('');

  showModal(`
    <div class="modal-header"><h2>ตรวจสุขอนามัย</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="saveInspection(event)">
      <div class="modal-body">
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required><option value="">-- เลือก --</option>${stallOpts}</select></div>
        <div class="form-group"><label>วันที่ตรวจ *</label><input type="date" name="inspection_date" value="${new Date().toISOString().split('T')[0]}" required></div>
        <h3>รายการตรวจ</h3>
        <div id="checklist-container">${checklistHTML}</div>
        <div class="form-group"><label>หมายเหตุ</label><textarea name="notes"></textarea></div>
      </div>
      <div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button type="submit" class="btn btn-primary">บันทึกผล</button></div>
    </form>`, {large:true});
};

window.saveInspection = async function(e) {
  e.preventDefault();
  const fd = getFormData(e.target);
  // Build checklist JSON from checkboxes
  const checks = e.target.querySelectorAll('[name^="check_"]');
  const results = [];
  checks.forEach(cb => {
    results.push({ cat: cb.dataset.cat, item: cb.dataset.item, passed: cb.checked });
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
  const res = await callAPI('POST', '/inspections', data);
  if (res.error) return toast(res.error, 'error');
  toast(`บันทึกผลตรวจ: ${score} คะแนน (${data.result === 'pass' ? 'ผ่าน' : data.result === 'warning' ? 'เตือน' : 'ไม่ผ่าน'})`, data.result === 'pass' ? 'success' : 'warning');
  closeModal(); pgInspections();
};

window.showInspectionDetail = async function(id) {
  const res = await callAPI('GET', '/inspections/' + id);
  const insp = res.data || {};
  let checklist = [];
  try { checklist = JSON.parse(insp.checklist_json || '[]'); } catch {}
  showModal(`
    <div class="modal-header"><h2>ผลตรวจ ${formatDate(insp.inspection_date)}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
      <p><strong>ร้าน:</strong> ${escapeHtml(insp.stall_name||'')}</p>
      <p><strong>คะแนน:</strong> ${insp.score}/100 — ${renderBadge(insp.result, STATUS_INSPECTION)}</p>
      <p><strong>ผู้ตรวจ:</strong> ${escapeHtml(insp.inspector_name||'')}</p>
      ${checklist.length ? `<h4>รายการตรวจ:</h4><ul>${checklist.map(c => `<li>${c.passed ? '✅' : '❌'} รายการ ${c.item}</li>`).join('')}</ul>` : ''}
      ${insp.notes ? `<p><strong>หมายเหตุ:</strong> ${escapeHtml(insp.notes)}</p>` : ''}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">ปิด</button></div>
  `);
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
        <div class="form-group"><label>ร้านค้า *</label><select name="stall_id" required><option value="">-- เลือก --</option>${stalls.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
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
    <form class="card" onsubmit="saveSettings(event)" style="padding:1.5rem">
      <h3>ข้อมูลทั่วไป</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>ชื่อโรงเรียน</label><input name="school_name" value="${escapeHtml(s.school_name||'')}"></div>
        <div class="form-group"><label>PromptPay ID</label><input name="promptpay_id" value="${escapeHtml(s.promptpay_id||'')}"></div>
      </div>
      <h3>อัตราค่าบริการ</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
        <div class="form-group"><label>ค่าน้ำ/หน่วย (บาท)</label><input type="number" step="0.01" name="water_rate" value="${s.water_rate||18}"></div>
        <div class="form-group"><label>ค่าไฟ/หน่วย (บาท)</label><input type="number" step="0.01" name="electric_rate" value="${s.electric_rate||8}"></div>
        <div class="form-group"><label>ค่าส่วนกลาง (บาท)</label><input type="number" step="0.01" name="common_fee" value="${s.common_fee||500}"></div>
      </div>
      <h3>การควบคุม</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>ราคาอาหารสูงสุด (บาท)</label><input type="number" name="max_food_price" value="${s.max_food_price||35}"></div>
        <div class="form-group"><label>เก็บรูปภาพ (วัน)</label><input type="number" name="photo_retention_days" value="${s.photo_retention_days||90}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="form-group"><label>เตือนสัญญาล่วงหน้า (วัน)</label><input type="number" name="contract_warning_days" value="${s.contract_warning_days||30}"></div>
        <div class="form-group"><label>เตือนใบรับรองแพทย์ (วัน)</label><input type="number" name="health_cert_warning_days" value="${s.health_cert_warning_days||30}"></div>
      </div>
      <div class="form-group"><label>เดือนเริ่มปีงบฯ</label><input type="number" name="fiscal_year_start_month" value="${s.fiscal_year_start_month||10}" min="1" max="12"></div>
      <div style="margin-top:1.5rem"><button type="submit" class="btn btn-primary">💾 บันทึกตั้งค่า</button></div>
    </form>

    <div class="card" style="margin-top:1rem;padding:1.5rem">
      <h3>🔐 เปลี่ยนรหัสผ่าน</h3>
      <form onsubmit="changePassword(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
          <div class="form-group"><label>รหัสผ่านปัจจุบัน</label><input type="password" name="current_password" required></div>
          <div class="form-group"><label>รหัสผ่านใหม่</label><input type="password" name="new_password" minlength="8" required></div>
          <div class="form-group"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" name="confirm_password" minlength="8" required></div>
        </div>
        <button type="submit" class="btn btn-secondary">เปลี่ยนรหัสผ่าน</button>
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
  const periodsRes = await callAPI('GET', '/billing/periods?status=open');
  const periods = periodsRes.data || [];
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const selectedPeriod = params.get('period') || (periods[0]?.id || '');
  const periodOpts = periods.map(p => `<option value="${p.id}" ${p.id===selectedPeriod?'selected':''}>${THAI_MONTHS[(p.month||1)-1]} ${p.year}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>บันทึกค่าน้ำ</h1></div>
    <div class="card">
      <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
        <label class="form-label" style="margin:0">รอบบิล:</label>
        <select class="form-select" id="rw-period" onchange="loadRecordWater(this.value)" style="max-width:250px">${periodOpts}</select>
      </div>
      <div id="rw-container"><div class="loading">กำลังโหลด...</div></div>
      <div id="rw-summary" style="display:none;margin-top:1rem;padding:1rem;background:#F0FDF4;border-radius:var(--radius-sm);display:flex;gap:2rem;flex-wrap:wrap;font-size:.95rem">
        <span>📊 กรอกแล้ว: <strong id="rw-cnt">0</strong> ร้าน</span>
        <span>💧 รวมหน่วย: <strong id="rw-units">0</strong></span>
        <span>💰 รวมเงิน: <strong id="rw-amt">0</strong> บาท</span>
      </div>
      <div style="margin-top:1rem"><button class="btn btn-primary" onclick="saveAllRecordWater()">💾 บันทึกทั้งหมด</button></div>
    </div>`;
  if (selectedPeriod) loadRecordWater(selectedPeriod);
}

window.loadRecordWater = async function(periodId) {
  const [stallsRes, readingsRes, periodRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/billing/readings?period_id=' + periodId + '&type=water'),
    callAPI('GET', '/billing/periods/' + periodId)
  ]);
  const stalls = stallsRes.data || [], readings = readingsRes.data || [], period = periodRes.data || {};
  const rMap = {}; readings.forEach(r => { rMap[r.stall_id] = r; });
  const rate = period.water_rate || 18;

  const rows = stalls.map((s,i) => {
    const r = rMap[s.id]; const prev = r?.prev_reading||0; const curr = r?.curr_reading||'';
    const usage = curr !== '' ? (curr-prev) : 0; const amt = usage > 0 ? usage*rate : 0;
    return `<tr data-sid="${s.id}" data-rid="${r?.id||''}" data-rate="${rate}">
      <td>${i+1}</td><td>${escapeHtml(s.name)}</td><td>${s.zone||'-'}</td>
      <td><input class="form-input rw-p" type="number" step="0.01" value="${prev}" style="width:100px" onchange="calcMeterRow(this,'rw')"></td>
      <td><input class="form-input rw-c" type="number" step="0.01" value="${curr}" style="width:100px" onchange="calcMeterRow(this,'rw')"></td>
      <td class="rw-u">${usage>0?usage.toFixed(2):'-'}</td>
      <td class="rw-a">${amt>0?formatMoney(amt):'-'}</td>
      <td>${r?'<span class="badge badge-success">จดแล้ว</span>':'<span class="badge badge-warning">รอจด</span>'}</td>
    </tr>`;
  }).join('');

  document.getElementById('rw-container').innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>ร้านค้า</th><th>โซน</th><th>มิเตอร์ก่อน</th><th>มิเตอร์ปัจจุบัน</th><th>หน่วยใช้</th><th>ยอดเงิน</th><th>สถานะ</th></tr></thead>
    <tbody id="rw-body">${rows}</tbody></table></div>`;
  document.getElementById('rw-summary').style.display = 'flex';
  updateMeterSummary('rw'); window._rwPeriod = periodId;
};

window.calcMeterRow = function(input, prefix) {
  const tr = input.closest('tr'); const p = parseFloat(tr.querySelector('.'+prefix+'-p').value)||0;
  const c = parseFloat(tr.querySelector('.'+prefix+'-c').value)||0; const rate = parseFloat(tr.dataset.rate);
  const u = c>p?c-p:0; const a = u*rate;
  tr.querySelector('.'+prefix+'-u').textContent = u>0?u.toFixed(2):'-';
  tr.querySelector('.'+prefix+'-a').textContent = a>0?formatMoney(a):'-';
  updateMeterSummary(prefix);
};

function updateMeterSummary(prefix) {
  let cnt=0,units=0,amt=0;
  document.querySelectorAll('#'+prefix+'-body tr').forEach(tr => {
    const c=parseFloat(tr.querySelector('.'+prefix+'-c').value); const p=parseFloat(tr.querySelector('.'+prefix+'-p').value)||0;
    if(c||c===0){cnt++;const u=c>p?c-p:0;units+=u;amt+=u*parseFloat(tr.dataset.rate);}
  });
  const ce=document.getElementById(prefix+'-cnt'),ue=document.getElementById(prefix+'-units'),ae=document.getElementById(prefix+'-amt');
  if(ce)ce.textContent=cnt; if(ue)ue.textContent=units.toFixed(2); if(ae)ae.textContent=formatMoney(amt);
}

window.saveAllRecordWater = async function() {
  await saveAllMeterReadings('rw','water',window._rwPeriod);
};

async function saveAllMeterReadings(prefix, type, periodId) {
  const rows = document.querySelectorAll('#'+prefix+'-body tr');
  let saved=0,errors=0;
  for(const tr of rows){
    const c=tr.querySelector('.'+prefix+'-c').value; if(c===''||c===undefined)continue;
    const p=tr.querySelector('.'+prefix+'-p').value||0;
    const fd=new FormData();fd.append('stall_id',tr.dataset.sid);fd.append('billing_period_id',periodId);
    fd.append('type',type);fd.append('prev_reading',p);fd.append('curr_reading',c);
    const res=tr.dataset.rid?await callAPI('PUT','/billing/readings/'+tr.dataset.rid,fd,true):await callAPI('POST','/billing/readings',fd,true);
    if(res.error)errors++;else saved++;
  }
  toast(`บันทึก${type==='water'?'ค่าน้ำ':'ค่าไฟ'} ${saved} ร้าน${errors?' (ผิดพลาด '+errors+')':''}`,errors?'warning':'success');
  if(type==='water')loadRecordWater(periodId);else loadRecordElectric(periodId);
}

// ═══════════════════════════════════════════════
// RECORD ELECTRIC (บันทึกค่าไฟ) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgRecordElectric() {
  const el = document.getElementById('content');
  const periodsRes = await callAPI('GET', '/billing/periods?status=open');
  const periods = periodsRes.data || [];
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const selectedPeriod = params.get('period') || (periods[0]?.id || '');
  const periodOpts = periods.map(p => `<option value="${p.id}" ${p.id===selectedPeriod?'selected':''}>${THAI_MONTHS[(p.month||1)-1]} ${p.year}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>บันทึกค่าไฟ</h1></div>
    <div class="card">
      <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
        <label class="form-label" style="margin:0">รอบบิล:</label>
        <select class="form-select" id="re-period" onchange="loadRecordElectric(this.value)" style="max-width:250px">${periodOpts}</select>
      </div>
      <div id="re-container"><div class="loading">กำลังโหลด...</div></div>
      <div id="re-summary" style="display:none;margin-top:1rem;padding:1rem;background:#FFFBEB;border-radius:var(--radius-sm);display:flex;gap:2rem;flex-wrap:wrap;font-size:.95rem">
        <span>📊 กรอกแล้ว: <strong id="re-cnt">0</strong> ร้าน</span>
        <span>⚡ รวมหน่วย: <strong id="re-units">0</strong></span>
        <span>💰 รวมเงิน: <strong id="re-amt">0</strong> บาท</span>
      </div>
      <div style="margin-top:1rem"><button class="btn btn-primary" onclick="saveAllRecordElectric()">💾 บันทึกทั้งหมด</button></div>
    </div>`;
  if (selectedPeriod) loadRecordElectric(selectedPeriod);
}

window.loadRecordElectric = async function(periodId) {
  const [stallsRes, readingsRes, periodRes] = await Promise.all([
    callAPI('GET', '/stalls?status=occupied'),
    callAPI('GET', '/billing/readings?period_id=' + periodId + '&type=electric'),
    callAPI('GET', '/billing/periods/' + periodId)
  ]);
  const stalls = stallsRes.data || [], readings = readingsRes.data || [], period = periodRes.data || {};
  const rMap = {}; readings.forEach(r => { rMap[r.stall_id] = r; });
  const rate = period.electric_rate || 8;

  const rows = stalls.map((s,i) => {
    const r = rMap[s.id]; const prev = r?.prev_reading||0; const curr = r?.curr_reading||'';
    const usage = curr !== '' ? (curr-prev) : 0; const amt = usage > 0 ? usage*rate : 0;
    return `<tr data-sid="${s.id}" data-rid="${r?.id||''}" data-rate="${rate}">
      <td>${i+1}</td><td>${escapeHtml(s.name)}</td><td>${s.zone||'-'}</td>
      <td><input class="form-input re-p" type="number" step="0.01" value="${prev}" style="width:100px" onchange="calcMeterRow(this,'re')"></td>
      <td><input class="form-input re-c" type="number" step="0.01" value="${curr}" style="width:100px" onchange="calcMeterRow(this,'re')"></td>
      <td class="re-u">${usage>0?usage.toFixed(2):'-'}</td>
      <td class="re-a">${amt>0?formatMoney(amt):'-'}</td>
      <td>${r?'<span class="badge badge-success">จดแล้ว</span>':'<span class="badge badge-warning">รอจด</span>'}</td>
    </tr>`;
  }).join('');

  document.getElementById('re-container').innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>ร้านค้า</th><th>โซน</th><th>มิเตอร์ก่อน</th><th>มิเตอร์ปัจจุบัน</th><th>หน่วยใช้</th><th>ยอดเงิน</th><th>สถานะ</th></tr></thead>
    <tbody id="re-body">${rows}</tbody></table></div>`;
  document.getElementById('re-summary').style.display = 'flex';
  updateMeterSummary('re'); window._rePeriod = periodId;
};

window.saveAllRecordElectric = async function() {
  await saveAllMeterReadings('re','electric',window._rePeriod);
};

// ═══════════════════════════════════════════════
// NOTIFY BILLS (แจ้งยอดชำระ) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgNotifyBills() {
  const el = document.getElementById('content');
  const periodsRes = await callAPI('GET', '/billing/periods');
  const periods = periodsRes.data || [];
  const periodOpts = periods.map(p => `<option value="${p.id}">${THAI_MONTHS[(p.month||1)-1]} ${p.year} (${p.status==='open'?'เปิด':'ปิด'})</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>แจ้งยอดชำระ</h1></div>
    <div class="card">
      <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
        <label class="form-label" style="margin:0">รอบบิล:</label>
        <select class="form-select" id="nb-period" style="max-width:250px">${periodOpts}</select>
        <button class="btn btn-primary" onclick="loadNotifyBills()">📋 ดึงข้อมูล</button>
      </div>
      <div id="nb-container"></div>
    </div>`;
}

window.loadNotifyBills = async function() {
  const periodId = document.getElementById('nb-period').value;
  if (!periodId) return toast('เลือกรอบบิลก่อน', 'warning');

  const [billsRes, periodRes] = await Promise.all([
    callAPI('GET', '/billing/bills?period_id=' + periodId),
    callAPI('GET', '/billing/periods/' + periodId)
  ]);
  const bills = billsRes.data || [], period = periodRes.data || {};
  const periodLabel = `${THAI_MONTHS[(period.month||1)-1]} ${period.year}`;

  let totalRent=0,totalWater=0,totalElec=0,totalCommon=0,totalAll=0;
  const rows = bills.map((b,i) => {
    totalRent+=b.rent_amount||0; totalWater+=b.water_amount||0; totalElec+=b.electric_amount||0;
    totalCommon+=b.common_fee||0; totalAll+=b.total_amount||0;
    const statusBadge = b.status==='issued'?'<span class="badge badge-info">ออกแล้ว</span>':
      b.status==='paid'?'<span class="badge badge-success">ชำระแล้ว</span>':
      b.status==='draft'?'<span class="badge badge-secondary">ร่าง</span>':
      b.status==='overdue'?'<span class="badge badge-danger">ค้าง</span>':renderBadge(b.status,STATUS_BILL);
    return `<tr>
      <td>${i+1}</td><td>${escapeHtml(b.stall_name||'')}</td>
      <td class="right">${formatMoney(b.rent_amount)}</td>
      <td class="right">${formatMoney(b.water_amount)}</td>
      <td class="right">${formatMoney(b.electric_amount)}</td>
      <td class="right">${formatMoney(b.common_fee)}</td>
      <td class="right" style="font-weight:700">${formatMoney(b.total_amount)}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');

  const draftCount = bills.filter(b=>b.status==='draft').length;
  const issuedCount = bills.filter(b=>b.status==='issued'||b.status==='overdue').length;

  document.getElementById('nb-container').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="stat-card"><div class="stat-value">${bills.length}</div><div class="stat-label">ร้านทั้งหมด</div></div>
      <div class="stat-card"><div class="stat-value">${formatMoney(totalAll)}</div><div class="stat-label">ยอดรวม</div></div>
      <div class="stat-card"><div class="stat-value">${draftCount}</div><div class="stat-label">รอออกบิล</div></div>
      <div class="stat-card"><div class="stat-value">${issuedCount}</div><div class="stat-label">ออกบิลแล้ว</div></div>
    </div>
    <h3>📋 สรุปยอด — ${periodLabel}</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>ร้านค้า</th><th>ค่าเช่า</th><th>ค่าน้ำ</th><th>ค่าไฟ</th><th>ส่วนกลาง</th><th>รวม</th><th>สถานะ</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:700;background:#F8FAFC">
        <td colspan="2">รวมทั้งสิ้น</td><td class="right">${formatMoney(totalRent)}</td><td class="right">${formatMoney(totalWater)}</td>
        <td class="right">${formatMoney(totalElec)}</td><td class="right">${formatMoney(totalCommon)}</td>
        <td class="right" style="font-size:1.1em">${formatMoney(totalAll)}</td><td></td>
      </tr></tfoot>
    </table></div>
    ${draftCount ? `<div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="batchIssueBills('${periodId}')">📤 ออกบิลทั้งหมด (${draftCount} ร้าน)</button>
    </div>` : '<div style="margin-top:1rem;padding:1rem;background:#D1FAE5;border-radius:8px">✅ ออกบิลครบทุกร้านแล้ว</div>'}`;
};

window.batchIssueBills = async function(periodId) {
  if (!await confirmDialog('ออกบิลทุกร้านที่ยังเป็นร่าง? ผู้เช่าจะได้รับแจ้งยอด')) return;
  const bills = (await callAPI('GET', '/billing/bills?period_id=' + periodId + '&status=draft')).data || [];
  let ok=0,fail=0;
  for (const b of bills) {
    const res = await callAPI('POST', '/billing/bills/' + b.id + '/issue');
    if(res.error)fail++;else ok++;
  }
  toast(`ออกบิลสำเร็จ ${ok} ร้าน${fail?' (ผิดพลาด '+fail+')':''}`, fail?'warning':'success');
  loadNotifyBills();
};

// ═══════════════════════════════════════════════
// CHECK SLIPS (ตรวจสลิป) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgCheckSlips() {
  const el = document.getElementById('content');
  const periodsRes = await callAPI('GET', '/billing/periods');
  const periods = periodsRes.data || [];
  const periodOpts = periods.map(p => `<option value="${p.id}">${THAI_MONTHS[(p.month||1)-1]} ${p.year}</option>`).join('');

  el.innerHTML = `
    <div class="page-header"><h1>ตรวจสลิป</h1></div>
    <div class="card">
      <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
        <label class="form-label" style="margin:0">รอบบิล:</label>
        <select class="form-select" id="cs-period" style="max-width:250px">${periodOpts}</select>
        <button class="btn btn-primary" onclick="loadCheckSlips()">🔍 โหลดข้อมูล</button>
      </div>
      <div id="cs-container"></div>
    </div>`;
}

window.loadCheckSlips = async function() {
  const periodId = document.getElementById('cs-period').value;
  if (!periodId) return toast('เลือกรอบบิลก่อน', 'warning');

  const [billsRes, paymentsRes] = await Promise.all([
    callAPI('GET', '/billing/bills?period_id=' + periodId),
    callAPI('GET', '/payments?period_id=' + periodId)
  ]);
  const bills = billsRes.data || [], payments = paymentsRes.data || [];
  const payMap = {}; payments.forEach(p => { if(!payMap[p.bill_id])payMap[p.bill_id]=[]; payMap[p.bill_id].push(p); });

  let verified=0,pending=0,rejected=0,unpaid=0;
  const rows = bills.filter(b=>b.status!=='draft').map((b,i) => {
    const pays = payMap[b.id] || [];
    const latestPay = pays[0];
    let statusHTML='',rowBg='';

    if (!latestPay) {
      unpaid++; statusHTML='<span class="badge badge-danger">ยังไม่ชำระ</span>'; rowBg='#FEF2F2';
    } else if (latestPay.status==='verified') {
      verified++; statusHTML='<span class="badge badge-success">✅ อนุมัติ</span>'; rowBg='#F0FDF4';
    } else if (latestPay.status==='rejected') {
      rejected++; statusHTML='<span class="badge badge-danger">❌ ปฏิเสธ</span>'; rowBg='#FEF2F2';
    } else {
      pending++;
      const diff = Math.abs((latestPay.amount||0) - (b.total_amount||0));
      statusHTML = diff < 1 ? '<span class="badge badge-warning">⏳ รอตรวจ (ยอดตรง)</span>' : '<span class="badge badge-warning">⚠️ รอตรวจ (ยอดไม่ตรง)</span>';
      rowBg='#FFFBEB';
    }

    return `<tr style="background:${rowBg}">
      <td>${i+1}</td><td>${escapeHtml(b.stall_name||'')}</td>
      <td class="right">${formatMoney(b.total_amount)}</td>
      <td class="right">${latestPay?formatMoney(latestPay.amount):'-'}</td>
      <td>${statusHTML}</td>
      <td>${latestPay?.slip_photo_key?`<button class="btn btn-sm btn-secondary" onclick="showSlipLightbox('${latestPay.slip_photo_key}','${latestPay.id}','${escapeHtml(b.stall_name||'')}',${b.total_amount},${latestPay.amount})">👁 ดูสลิป</button>`:'-'}</td>
      <td>${latestPay&&latestPay.status==='pending'?`
        <button class="btn btn-sm btn-success" onclick="quickApprove('${latestPay.id}')">✓ อนุมัติ</button>
        <button class="btn btn-sm btn-danger" onclick="quickReject('${latestPay.id}')">✕ ปฏิเสธ</button>
      `:''}</td>
    </tr>`;
  }).join('');

  document.getElementById('cs-container').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="stat-card" style="border-left:4px solid var(--success)"><div class="stat-value">${verified}</div><div class="stat-label">✅ อนุมัติ</div></div>
      <div class="stat-card" style="border-left:4px solid var(--warning)"><div class="stat-value">${pending}</div><div class="stat-label">⏳ รอตรวจ</div></div>
      <div class="stat-card" style="border-left:4px solid var(--danger)"><div class="stat-value">${rejected}</div><div class="stat-label">❌ ปฏิเสธ</div></div>
      <div class="stat-card" style="border-left:4px solid #9CA3AF"><div class="stat-value">${unpaid}</div><div class="stat-label">🔴 ยังไม่ชำระ</div></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>ร้านค้า</th><th>ยอดแจ้ง</th><th>ยอดชำระ</th><th>สถานะ</th><th>สลิป</th><th>ดำเนินการ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  window._csPeriod = periodId;
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
      <div style="margin-top:1rem;display:flex;justify-content:center;gap:2rem;font-size:1rem">
        <div><small style="color:#6B7280">ยอดแจ้ง</small><div style="font-weight:700;font-size:1.2em">${formatMoney(notified)}</div></div>
        <div><small style="color:#6B7280">ยอดชำระ</small><div style="font-weight:700;font-size:1.2em;color:${match?'var(--success)':'var(--danger)'}">${formatMoney(paid)}</div></div>
      </div>
      ${!match?`<div style="margin-top:.5rem;color:var(--danger);font-weight:600">⚠️ ยอดต่างกัน ${formatMoney(diff)} บาท</div>`:'<div style="margin-top:.5rem;color:var(--success);font-weight:600">✅ ยอดตรงกัน</div>'}
    </div>
    <div class="modal-footer" style="justify-content:center;gap:1rem">
      <button class="btn btn-success" onclick="closeModal();quickApprove('${paymentId}')" style="min-width:150px">✓ อนุมัติ</button>
      <button class="btn btn-danger" onclick="closeModal();quickReject('${paymentId}')" style="min-width:150px">✕ ปฏิเสธ</button>
    </div>`, {large:true});
};

window.quickApprove = async function(id) {
  if (!await confirmDialog('อนุมัติการชำระนี้?')) return;
  const res = await callAPI('PUT', '/payments/' + id + '/verify', { status: 'verified' });
  if (res.error) return toast(res.error, 'error');
  toast('อนุมัติสำเร็จ', 'success'); loadCheckSlips();
};

window.quickReject = async function(id) {
  if (!await confirmDialog('ปฏิเสธสลิปนี้? ผู้เช่าจะต้องส่งสลิปใหม่', {danger:true})) return;
  const res = await callAPI('PUT', '/payments/' + id + '/verify', { status: 'rejected' });
  if (res.error) return toast(res.error, 'error');
  toast('ปฏิเสธสำเร็จ', 'success'); loadCheckSlips();
};

// ═══════════════════════════════════════════════
// UPLOAD SLIP (ส่งสลิป — stall owner) — HOME PPK Style
// ═══════════════════════════════════════════════
async function pgUploadSlip() {
  const el = document.getElementById('content');
  const user = getCurrentUser();
  const billsRes = await callAPI('GET', '/billing/bills?stall_id=' + user.stall_id);
  const bills = (billsRes.data || []).filter(b => b.status === 'issued' || b.status === 'overdue');
  const paymentsRes = await callAPI('GET', '/payments?stall_id=' + user.stall_id);
  const payments = paymentsRes.data || [];
  const paidBillIds = payments.filter(p=>p.status!=='rejected').map(p=>p.bill_id);
  const unpaid = bills.filter(b => !paidBillIds.includes(b.id));

  el.innerHTML = `
    <div class="page-header"><h1>ส่งสลิป</h1></div>
    ${unpaid.length ? `
    <div style="display:grid;gap:1rem;max-width:600px">
      ${unpaid.map(b => `
        <div class="card" style="border-left:4px solid ${b.status==='overdue'?'var(--danger)':'var(--warning)'}">
          <div class="card-header"><h3 class="card-title">${escapeHtml(b.period_label||b.id)}</h3>${renderBadge(b.status,STATUS_BILL)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.9rem;margin-bottom:1rem">
            <div>ค่าเช่า: <strong>${formatMoney(b.rent_amount)}</strong></div>
            <div>ค่าน้ำ: <strong>${formatMoney(b.water_amount)}</strong></div>
            <div>ค่าไฟ: <strong>${formatMoney(b.electric_amount)}</strong></div>
            <div>ส่วนกลาง: <strong>${formatMoney(b.common_fee)}</strong></div>
          </div>
          <div style="font-size:1.3em;font-weight:700;color:var(--primary);margin-bottom:1rem">
            รวม: ${formatMoney(b.total_amount)} บาท
          </div>
          ${b.due_date?`<div style="font-size:.85rem;color:${b.status==='overdue'?'var(--danger)':'var(--text-light)'}">กำหนดชำระ: ${formatDate(b.due_date)}</div>`:''}
          <div style="margin-top:1rem">
            <button class="btn btn-primary" onclick="showSlipUploadForm('${b.id}',${b.total_amount})">📤 ส่งสลิป</button>
          </div>
        </div>
      `).join('')}
    </div>` : '<div class="card" style="text-align:center;padding:3rem;color:var(--text-light)">🎉 ไม่มียอดค้างชำระ</div>'}

    <h3 style="margin-top:2rem">📋 ประวัติการชำระ</h3>
    <div class="card">
      ${renderTable([
        {key:'bill_id',label:'บิล'},{key:'amount',label:'ยอด',money:true},
        {key:'method',label:'ช่องทาง',render:v=>({cash:'เงินสด',transfer:'โอน',promptpay:'PromptPay'}[v]||v)},
        {key:'paid_at',label:'วันชำระ',date:true},{key:'status',label:'สถานะ',badge:STATUS_PAYMENT}
      ], payments, row => row.slip_photo_key?`<button class="btn btn-sm btn-secondary" onclick="viewSlip('${row.slip_photo_key}')">ดูสลิป</button>`:'')}
    </div>`;
}

window.showSlipUploadForm = function(billId, amount) {
  showModal(`
    <div class="modal-header"><h2>📤 ส่งสลิปชำระเงิน</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <form onsubmit="submitSlipUpload(event)">
      <div class="modal-body">
        <input type="hidden" name="bill_id" value="${billId}">
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="font-size:.9rem;color:var(--text-light)">ยอดที่ต้องชำระ</div>
          <div style="font-size:2em;font-weight:700;color:var(--primary)">${formatMoney(amount)} บาท</div>
        </div>
        <div class="form-group">
          <label class="form-label">จำนวนเงินที่ชำระ *</label>
          <input class="form-input" type="number" step="0.01" name="amount" value="${amount}" required>
        </div>
        <div class="form-group">
          <label class="form-label">ช่องทาง *</label>
          <select class="form-select" name="method" required>
            <option value="transfer">โอนเงิน</option>
            <option value="promptpay">PromptPay</option>
            <option value="cash">เงินสด</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">📷 แนบสลิป *</label>
          <input class="form-input" type="file" name="slip" accept="image/*" required onchange="previewSlipFile(this)">
          <div id="slip-preview" style="margin-top:.5rem"></div>
        </div>
        <div class="form-group">
          <label class="form-label">เลขอ้างอิง / หมายเหตุ</label>
          <input class="form-input" name="reference_no" placeholder="เช่น เลขที่รายการโอน">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button type="submit" class="btn btn-primary">📤 ส่งสลิป</button>
      </div>
    </form>`, {large:true});
};

window.previewSlipFile = function(input) {
  const preview = document.getElementById('slip-preview');
  if (!input.files[0]) { preview.innerHTML = ''; return; }
  const url = URL.createObjectURL(input.files[0]);
  preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--border)">`;
};

window.submitSlipUpload = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await callAPI('POST', '/payments', fd, true);
  if (res.error) return toast(res.error, 'error');
  toast('ส่งสลิปสำเร็จ รอตรวจสอบ', 'success'); closeModal(); pgUploadSlip();
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
  const res = await callAPI('GET', '/payments?stall_id=' + user.stall_id);
  el.innerHTML = `
    <div class="page-header"><h1>ประวัติชำระเงิน</h1></div>
    <div class="card">
      ${renderTable([
        {key:'bill_id',label:'บิล'},{key:'amount',label:'ยอด',money:true},
        {key:'method',label:'ช่องทาง',render:v=>({cash:'เงินสด',transfer:'โอน',promptpay:'PromptPay'}[v]||v)},
        {key:'paid_at',label:'วันชำระ',date:true},{key:'status',label:'สถานะ',badge:STATUS_PAYMENT}
      ], res.data || [])}
    </div>`;
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
  el.innerHTML = `
    <div class="page-header"><h1>ผลตรวจสุขอนามัย</h1></div>
    <div class="card">
      ${renderTable([
        {key:'inspection_date',label:'วันตรวจ',date:true},{key:'score',label:'คะแนน',render:v=>`<strong>${v||0}</strong>/100`},
        {key:'result',label:'ผลลัพธ์',badge:STATUS_INSPECTION},{key:'inspector_name',label:'ผู้ตรวจ'}
      ], res.data || [], row => `<button class="btn btn-sm btn-secondary" onclick="showInspectionDetail('${row.id}')">ดูรายละเอียด</button>`)}
    </div>`;
}
