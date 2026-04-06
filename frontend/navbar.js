/* =============================================
   PPK-Canteen — Navbar (Sidebar + Topbar)
   Dynamic menu based on user role
   ============================================= */
'use strict';

function renderNavbar(user) {
  const role = user.role;
  const menus = getMenusForRole(role);
  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div style="font-size:2rem">🍽️</div>
        <h2>โรงอาหาร PPK</h2>
        <small>ระบบจัดการโรงอาหาร</small>
      </div>
      <nav class="sidebar-nav">
        ${menus.map(item => {
          if ('section' in item) return item.section ? `<div class="sidebar-section">${item.section}</div>` : '<div style="margin:0.5rem 0"></div>';
          return `<a href="#/${item.path}" data-page="${item.path}" onclick="closeSidebar()">${item.icon} ${item.label}</a>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">${escapeHtml(user.name)}</div>
        <div class="user-role">${ROLE_NAMES[role] || role}</div>
        <button onclick="logout()" class="btn btn-sm btn-outline" style="margin-top:8px;width:100%;border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.7)">
          🚪 ออกจากระบบ
        </button>
      </div>
    </aside>`;

  const topbarHTML = `
    <header class="topbar" id="topbar">
      <button class="hamburger" onclick="toggleSidebar()">☰</button>
      <span class="topbar-title">โรงอาหาร PPK</span>
      <button class="hamburger" onclick="location.hash='#/notifications'" style="font-size:1.2rem">🔔</button>
    </header>
    <div class="overlay" id="overlay" onclick="closeSidebar()"></div>`;

  return topbarHTML + sidebarHTML;
}

function getMenusForRole(role) {
  const m = [];

  // Dashboard — ทุก role
  m.push({ section: 'หน้าหลัก' });
  m.push({ path: 'dashboard', label: 'แดชบอร์ด', icon: '📊' });

  if (role === 'admin') {
    m.push({ section: 'จัดการข้อมูล' });
    m.push({ path: 'stalls', label: 'ร้านค้า', icon: '🏪' });
    m.push({ path: 'contracts', label: 'สัญญาเช่า', icon: '📋' });
    m.push({ path: 'users', label: 'ผู้ใช้งาน', icon: '👥' });
    m.push({ path: 'documents', label: 'เอกสาร', icon: '📁' });
    m.push({ section: 'ประมูล' });
    m.push({ path: 'biddings', label: 'จัดการประมูล', icon: '🔨' });
    m.push({ section: 'การเงิน' });
    m.push({ path: 'billing-periods', label: 'รอบบิล', icon: '📅' });
    m.push({ path: 'bills', label: 'ใบแจ้งหนี้', icon: '💰' });
    m.push({ path: 'payments', label: 'การชำระเงิน', icon: '💳' });
    m.push({ path: 'receipts', label: 'ใบเสร็จ', icon: '🧾' });
    m.push({ section: 'คุณภาพ' });
    m.push({ path: 'inspections', label: 'ตรวจสุขอนามัย', icon: '🔍' });
    m.push({ path: 'penalties', label: 'เตือน/ลงโทษ', icon: '⚠️' });
    m.push({ path: 'menus-admin', label: 'เมนู/ราคา', icon: '🍜' });
    m.push({ path: 'complaints-admin', label: 'ข้อร้องเรียน', icon: '📢' });
    m.push({ section: 'ระบบ' });
    m.push({ path: 'reports', label: 'รายงาน', icon: '📈' });
    m.push({ path: 'activity-log', label: 'ประวัติการใช้งาน', icon: '📝' });
    m.push({ path: 'settings', label: 'ตั้งค่า', icon: '⚙️' });
  }

  if (role === 'meter_reader') {
    m.push({ section: 'จดมิเตอร์' });
    m.push({ path: 'meter-read', label: 'จดมิเตอร์', icon: '📷' });
    m.push({ path: 'meter-history', label: 'ประวัติจดมิเตอร์', icon: '📋' });
  }

  if (role === 'billing_officer') {
    m.push({ section: 'การเงิน' });
    m.push({ path: 'billing-periods', label: 'รอบบิล', icon: '📅' });
    m.push({ path: 'meter-read', label: 'จดมิเตอร์', icon: '📷' });
    m.push({ path: 'bills', label: 'ใบแจ้งหนี้', icon: '💰' });
    m.push({ path: 'payments', label: 'บันทึกชำระ', icon: '💳' });
    m.push({ path: 'receipts', label: 'ใบเสร็จ', icon: '🧾' });
  }

  if (role === 'payment_verifier') {
    m.push({ section: 'ตรวจสอบ' });
    m.push({ path: 'payments', label: 'ตรวจสอบชำระ', icon: '✅' });
    m.push({ path: 'receipts', label: 'ใบเสร็จ', icon: '🧾' });
  }

  if (role === 'inspector') {
    m.push({ section: 'ตรวจสุขอนามัย' });
    m.push({ path: 'inspections', label: 'ตรวจร้าน', icon: '🔍' });
    m.push({ path: 'penalties', label: 'เตือน/ลงโทษ', icon: '⚠️' });
  }

  if (role === 'executive') {
    m.push({ section: 'รายงาน' });
    m.push({ path: 'reports', label: 'รายงาน', icon: '📈' });
    m.push({ path: 'inspections', label: 'ผลตรวจ', icon: '🔍' });
    m.push({ path: 'complaints-admin', label: 'ข้อร้องเรียน', icon: '📢' });
  }

  if (role === 'stall_owner') {
    m.push({ section: 'ร้านของฉัน' });
    m.push({ path: 'my-bills', label: 'ใบแจ้งหนี้', icon: '💰' });
    m.push({ path: 'my-payments', label: 'ชำระเงิน', icon: '💳' });
    m.push({ path: 'my-contract', label: 'สัญญาเช่า', icon: '📋' });
    m.push({ path: 'my-menus', label: 'จัดการเมนู', icon: '🍜' });
    m.push({ path: 'my-inspections', label: 'ผลตรวจ', icon: '🔍' });
  }

  // Notifications + Profile — ทุก role
  m.push({ section: '' });
  m.push({ path: 'notifications', label: 'การแจ้งเตือน', icon: '🔔' });
  m.push({ path: 'profile', label: 'โปรไฟล์', icon: '👤' });

  return m;
}

function updateActiveNav() {
  const hash = location.hash.slice(2) || 'dashboard';
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === hash);
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
