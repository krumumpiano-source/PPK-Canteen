/* =============================================
   PPK-Canteen — Navbar v2.0 (HOME PPK Style)
   Avatar, descriptions, badges, animations
   ============================================= */
'use strict';

function renderNavbar(user) {
  const role = user.role;
  const menus = getMenusForRole(role);
  const displayName = escapeHtml(user.name || 'ผู้ใช้');
  const roleLabel = ROLE_NAMES[role] || role;

  const menuHTML = menus.map(item => {
    if ('section' in item) {
      return item.section
        ? `<div class="sidebar-section">${item.section}</div>`
        : '<div style="margin:4px 0"></div>';
    }
    const desc = item.desc ? `<span class="nav-desc">${item.desc}</span>` : '';
    return `<a href="#/${item.path}" data-page="${item.path}" onclick="closeSidebar()">${item.icon} ${item.label}${desc}</a>`;
  }).join('');

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header" style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:1.5rem;margin-bottom:2px">🍽️</div>
          <h2>โรงอาหาร PPK</h2>
          <small>ระบบจัดการโรงอาหาร</small>
        </div>
        <button class="sidebar-close-btn" onclick="closeSidebar()">✕</button>
      </div>
      <div class="sidebar-user-block">
        <div class="sidebar-avatar">👤</div>
        <div style="min-width:0">
          <div class="sidebar-user-name">${displayName}</div>
          <div class="sidebar-user-role">${roleLabel}</div>
        </div>
      </div>
      <nav class="sidebar-nav">${menuHTML}</nav>
      <div class="sidebar-bottom">
        <button class="nav-logout" onclick="logout()">🚪 ออกจากระบบ</button>
      </div>
    </aside>`;

  const topbarHTML = `
    <header class="topbar" id="topbar">
      <button class="hamburger" id="hamburgerBtn" onclick="toggleSidebar()"><span></span><span></span><span></span></button>
      <span class="topbar-title">🍽️ โรงอาหาร PPK</span>
      <button class="hamburger" onclick="location.hash='#/notifications'" style="font-size:1.2rem;flex-direction:row">🔔</button>
    </header>
    <div class="overlay" id="overlay" onclick="closeSidebar()"></div>`;

  return topbarHTML + sidebarHTML;
}

function getMenusForRole(role) {
  const m = [];

  // Dashboard
  m.push({ section: 'หน้าหลัก' });
  m.push({ path: 'dashboard', label: 'แดชบอร์ด', icon: '📊', desc: 'ภาพรวมและทางลัด' });

  if (role === 'admin') {
    m.push({ section: 'จัดการข้อมูล' });
    m.push({ path: 'stalls', label: 'ร้านค้า', icon: '🏪', desc: 'จัดการแผงร้านค้า' });
    m.push({ path: 'contracts', label: 'สัญญาเช่า', icon: '📋', desc: 'สัญญาผู้เช่าทั้งหมด' });
    m.push({ path: 'users', label: 'ผู้ใช้งาน', icon: '👥', desc: 'สมาชิกและสิทธิ์' });
    m.push({ path: 'documents', label: 'เอกสาร', icon: '📁', desc: 'ไฟล์และเอกสาร' });
    m.push({ section: 'ประมูล' });
    m.push({ path: 'biddings', label: 'จัดการประมูล', icon: '🔨', desc: 'เปิด/ปิดประมูลแผง' });
    m.push({ section: 'การเงิน' });
    m.push({ path: 'billing-periods', label: 'รอบบิล', icon: '📅', desc: 'สร้างและจัดการรอบบิล' });
    m.push({ path: 'record-water', label: 'บันทึกค่าน้ำ', icon: '💧', desc: 'จดมิเตอร์น้ำรายเดือน' });
    m.push({ path: 'record-electric', label: 'บันทึกค่าไฟ', icon: '⚡', desc: 'จดมิเตอร์ไฟรายเดือน' });
    m.push({ path: 'notify-bills', label: 'แจ้งยอดชำระ', icon: '📢', desc: 'ส่งใบแจ้งหนี้ให้ผู้เช่า' });
    m.push({ path: 'check-slips', label: 'ตรวจสลิป', icon: '🔍', desc: 'ตรวจสอบสลิปการชำระ' });
    m.push({ path: 'receipts', label: 'ใบเสร็จ', icon: '🧾', desc: 'ออกใบเสร็จรับเงิน' });
    m.push({ path: 'bills', label: 'ใบแจ้งหนี้', icon: '💰', desc: 'รายการบิลทั้งหมด' });
    m.push({ path: 'payments', label: 'การชำระเงิน', icon: '💳', desc: 'ประวัติชำระทั้งหมด' });
    m.push({ section: 'คุณภาพ' });
    m.push({ path: 'inspections', label: 'ตรวจสุขอนามัย', icon: '🔍', desc: 'ตรวจร้านตามเกณฑ์' });
    m.push({ path: 'penalties', label: 'เตือน/ลงโทษ', icon: '⚠️', desc: 'ออกหนังสือเตือน' });
    m.push({ path: 'menus-admin', label: 'เมนู/ราคา', icon: '🍜', desc: 'ตรวจสอบเมนูและราคา' });
    m.push({ path: 'complaints-admin', label: 'ข้อร้องเรียน', icon: '📢', desc: 'จัดการข้อร้องเรียน' });
    m.push({ section: 'ระบบ' });
    m.push({ path: 'reports', label: 'รายงาน', icon: '📈', desc: 'สรุปรายงานรายเดือน' });
    m.push({ path: 'activity-log', label: 'ประวัติการใช้งาน', icon: '📝', desc: 'ดูกิจกรรมผู้ใช้' });
    m.push({ path: 'settings', label: 'ตั้งค่า', icon: '⚙️', desc: 'ตั้งค่าระบบ' });
  }

  if (role === 'staff') {
    m.push({ section: 'การเงิน' });
    m.push({ path: 'billing-periods', label: 'รอบบิล', icon: '📅', desc: 'สร้างและจัดการรอบบิล' });
    m.push({ path: 'record-water', label: 'บันทึกค่าน้ำ', icon: '💧', desc: 'จดมิเตอร์น้ำรายเดือน' });
    m.push({ path: 'record-electric', label: 'บันทึกค่าไฟ', icon: '⚡', desc: 'จดมิเตอร์ไฟรายเดือน' });
    m.push({ path: 'bills', label: 'ใบแจ้งหนี้', icon: '💰', desc: 'รายการบิลทั้งหมด' });
    m.push({ path: 'notify-bills', label: 'แจ้งยอดชำระ', icon: '📢', desc: 'ส่งใบแจ้งหนี้ให้ผู้เช่า' });
    m.push({ path: 'check-slips', label: 'ตรวจสลิป', icon: '🔍', desc: 'ตรวจสอบสลิปการชำระ' });
    m.push({ path: 'payments', label: 'การชำระเงิน', icon: '💳', desc: 'ประวัติชำระทั้งหมด' });
    m.push({ path: 'receipts', label: 'ใบเสร็จ', icon: '🧾', desc: 'ออกใบเสร็จรับเงิน' });
  }

  if (role === 'inspector') {
    m.push({ section: 'ตรวจสุขอนามัย' });
    m.push({ path: 'inspections', label: 'ตรวจร้าน', icon: '🔍', desc: 'ตรวจตามเกณฑ์' });
    m.push({ path: 'penalties', label: 'เตือน/ลงโทษ', icon: '⚠️', desc: 'ออกหนังสือเตือน' });
  }

  if (role === 'executive') {
    m.push({ section: 'รายงาน' });
    m.push({ path: 'reports', label: 'รายงาน', icon: '📈', desc: 'สรุปรายงาน' });
    m.push({ path: 'inspections', label: 'ผลตรวจ', icon: '🔍', desc: 'ผลตรวจสุขอนามัย' });
    m.push({ path: 'complaints-admin', label: 'ข้อร้องเรียน', icon: '📢', desc: 'จัดการข้อร้องเรียน' });
  }

  if (role === 'stall_owner') {
    m.push({ section: 'ร้านของฉัน' });
    m.push({ path: 'my-bills', label: 'ใบแจ้งหนี้', icon: '💰', desc: 'ดูยอดแจ้งชำระ' });
    m.push({ path: 'upload-slip', label: 'ส่งสลิป', icon: '📤', desc: 'ส่งหลักฐานการชำระ' });
    m.push({ path: 'my-payments', label: 'ประวัติชำระ', icon: '💳', desc: 'ดูการชำระย้อนหลัง' });
    m.push({ path: 'my-contract', label: 'สัญญาเช่า', icon: '📋', desc: 'รายละเอียดสัญญา' });
    m.push({ path: 'my-menus', label: 'จัดการเมนู', icon: '🍜', desc: 'แก้ไขเมนูอาหาร' });
    m.push({ path: 'my-inspections', label: 'ผลตรวจ', icon: '🔍', desc: 'ดูผลตรวจสุขอนามัย' });
  }

  m.push({ section: '' });
  m.push({ path: 'notifications', label: 'การแจ้งเตือน', icon: '🔔', desc: 'ข้อความแจ้งเตือน' });
  m.push({ path: 'profile', label: 'โปรไฟล์', icon: '👤', desc: 'แก้ไขข้อมูลส่วนตัว' });

  return m;
}

function updateActiveNav() {
  const hash = location.hash.slice(2) || 'dashboard';
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === hash);
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('show', isOpen);
  if (hamburger) hamburger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) hamburger.classList.remove('open');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });
