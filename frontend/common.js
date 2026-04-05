/* =============================================
   PPK-Canteen — Common Utilities
   API helpers, Auth, Toast, Modal, Formatters
   ============================================= */
'use strict';

// ── API Helper ──
async function callAPI(method, path, body, isFormData) {
  const opts = { method, credentials: 'include' };
  if (body && !isFormData) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  } else if (body && isFormData) {
    opts.body = body; // FormData — browser sets Content-Type
  }
  try {
    const res = await fetch('/api' + path, opts);
    if (res.status === 401) { window.location.href = '/'; return { error: 'กรุณาเข้าสู่ระบบ' }; }
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'เกิดข้อผิดพลาด' };
    return data;
  } catch (e) {
    console.error('API Error:', e);
    return { error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
  }
}

// ── Auth Helper ──
let _currentUser = null;
function getCurrentUser() {
  if (_currentUser) return _currentUser;
  try { _currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch {}
  return _currentUser;
}
function setCurrentUser(u) {
  _currentUser = u;
  if (u) localStorage.setItem('currentUser', JSON.stringify(u));
  else localStorage.removeItem('currentUser');
}
async function checkAuth() {
  const res = await callAPI('GET', '/auth/me');
  if (res.error) { window.location.href = '/'; return null; }
  setCurrentUser(res.data);
  return res.data;
}
async function logout() {
  await callAPI('POST', '/auth/logout');
  setCurrentUser(null);
  window.location.href = '/';
}

// ── Toast ──
function toast(message, type = 'info', duration = 3500) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; setTimeout(() => t.remove(), 300); }, duration);
}

// ── Modal ──
function showModal(html, opts = {}) {
  closeModal();
  const div = document.createElement('div');
  div.id = 'modal-root';
  div.innerHTML = `<div class="modal-overlay" onclick="${opts.persistent ? '' : 'closeModal()'}">
    <div class="modal ${opts.large ? 'modal-lg' : ''}" onclick="event.stopPropagation()">
      ${html}
    </div>
  </div>`;
  document.body.appendChild(div);
  document.body.style.overflow = 'hidden';
  const firstInput = div.querySelector('input:not([type=hidden]),select,textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}
function closeModal() {
  const m = document.getElementById('modal-root');
  if (m) { m.remove(); document.body.style.overflow = ''; }
}

async function confirmDialog(message, opts = {}) {
  return new Promise(resolve => {
    const id = 'confirm-' + Date.now();
    showModal(`
      <div class="modal-header"><h2>${opts.title || 'ยืนยัน'}</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal(); window._confirmResolve(false)">ยกเลิก</button>
        <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" onclick="closeModal(); window._confirmResolve(true)">${opts.okText || 'ยืนยัน'}</button>
      </div>`, { persistent: true });
    window._confirmResolve = resolve;
  });
}

async function alertDialog(message, opts = {}) {
  return new Promise(resolve => {
    const types = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    showModal(`
      <div class="modal-header"><h2>${opts.title || (types[opts.type] || '') + ' แจ้งเตือน'}</h2></div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="closeModal(); window._alertResolve()">ตกลง</button>
      </div>`, { persistent: true });
    window._alertResolve = resolve;
  });
}

// ── Form Helpers ──
function getFormData(formEl) {
  const fd = new FormData(formEl);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

function validateRequired(fields, data) {
  for (const f of fields) {
    if (!data[f.key] || !String(data[f.key]).trim()) {
      toast(`กรุณากรอก${f.label}`, 'error');
      const el = document.querySelector(`[name="${f.key}"]`);
      if (el) { el.classList.add('error'); el.focus(); }
      return false;
    }
  }
  return true;
}

function isValidPhone(phone) { return /^[0-9]{9,10}$/.test(phone); }
function isValidEmail(email) { return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// ── Table Renderer ──
function renderTable(columns, data, actions) {
  if (!data || !data.length) return `<div class="table-empty">ไม่มีข้อมูล</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}${actions ? '<th style="width:120px">จัดการ</th>' : ''}</tr></thead>
    <tbody>${data.map(row => `<tr>${columns.map(c => {
      let val = row[c.key];
      if (c.render) val = c.render(val, row);
      else if (c.badge) val = renderBadge(val, c.badge);
      else if (c.date) val = formatDate(val);
      else if (c.money) val = formatMoney(val);
      else val = escapeHtml(String(val ?? '-'));
      return `<td>${val}</td>`;
    }).join('')}${actions ? `<td class="btn-group">${actions(row)}</td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
}

function renderBadge(val, map) {
  const m = map[val] || { text: val, class: 'badge-secondary' };
  return `<span class="badge ${m.class}">${m.text}</span>`;
}

// ── Formatters ──
function formatMoney(n) { return n == null ? '-' : Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; } }
function formatDateTime(d) { if (!d) return '-'; try { return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function maskIdCard(s) { if (!s || s.length < 4) return s; return 'x-xxxx-xxxxx-xx-' + s.slice(-4); }

// ── ID Generator ──
function generateId(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

// ── Image Compression ──
async function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ── Fiscal Year ──
function getFiscalYear(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const m = d.getMonth() + 1;
  const y = d.getFullYear() + 543; // พ.ศ.
  return m >= 10 ? y + 1 : y;
}

// ── Status Maps ──
const STATUS_BILL = { draft: { text: 'ร่าง', class: 'badge-secondary' }, issued: { text: 'ออกบิลแล้ว', class: 'badge-info' }, paid: { text: 'ชำระแล้ว', class: 'badge-success' }, overdue: { text: 'ค้างชำระ', class: 'badge-danger' }, partial: { text: 'ชำระบางส่วน', class: 'badge-warning' } };
const STATUS_PAYMENT = { pending: { text: 'รอตรวจสอบ', class: 'badge-warning' }, verified: { text: 'อนุมัติ', class: 'badge-success' }, rejected: { text: 'ปฏิเสธ', class: 'badge-danger' } };
const STATUS_CONTRACT = { active: { text: 'ใช้งาน', class: 'badge-success' }, expired: { text: 'หมดอายุ', class: 'badge-warning' }, terminated: { text: 'ยกเลิก', class: 'badge-danger' } };
const STATUS_STALL = { vacant: { text: 'ว่าง', class: 'badge-success' }, occupied: { text: 'มีผู้เช่า', class: 'badge-info' }, reserved: { text: 'จอง', class: 'badge-warning' }, maintenance: { text: 'ปรับปรุง', class: 'badge-secondary' } };
const STATUS_BIDDING = { draft: { text: 'ร่าง', class: 'badge-secondary' }, open: { text: 'เปิดรับสมัคร', class: 'badge-success' }, closed: { text: 'ปิดรับ', class: 'badge-warning' }, awarded: { text: 'ประกาศผล', class: 'badge-info' }, cancelled: { text: 'ยกเลิก', class: 'badge-danger' } };
const STATUS_COMPLAINT = { open: { text: 'รอดำเนินการ', class: 'badge-warning' }, investigating: { text: 'กำลังสอบสวน', class: 'badge-info' }, resolved: { text: 'แก้ไขแล้ว', class: 'badge-success' }, dismissed: { text: 'ยกเลิก', class: 'badge-secondary' } };
const STATUS_INSPECTION = { pass: { text: 'ผ่าน', class: 'badge-success' }, warning: { text: 'เตือน', class: 'badge-warning' }, fail: { text: 'ไม่ผ่าน', class: 'badge-danger' } };
const STATUS_PENALTY = { warning: { text: 'เตือน', class: 'badge-warning' }, fine: { text: 'ปรับ', class: 'badge-danger' }, suspension: { text: 'ระงับ', class: 'badge-danger' }, termination: { text: 'ยกเลิกสัญญา', class: 'badge-danger' } };
const STATUS_PRICE = { pending: { text: 'รออนุมัติ', class: 'badge-warning' }, approved: { text: 'อนุมัติ', class: 'badge-success' }, rejected: { text: 'ปฏิเสธ', class: 'badge-danger' }, auto_rejected: { text: 'เกินเพดาน', class: 'badge-danger' } };
const ROLE_NAMES = { admin: 'ผู้ดูแลระบบ', meter_reader: 'ผู้จดมิเตอร์', billing_officer: 'เจ้าหน้าที่บิล', payment_verifier: 'ผู้ตรวจสอบชำระ', inspector: 'ผู้ตรวจสุขอนามัย', executive: 'ผู้บริหาร', stall_owner: 'เจ้าของร้าน' };
