-- =============================================
-- PPK-Canteen Database Schema v1.0
-- ระบบจัดการโรงอาหาร โรงเรียนพะเยาพิทยาคม
-- Cloudflare D1 (SQLite)
-- =============================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  salt TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','meter_reader','billing_officer','payment_verifier','inspector','executive','stall_owner')),
  stall_id TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  setup_token TEXT,
  consent_accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. stalls
CREATE TABLE IF NOT EXISTS stalls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT,
  location_desc TEXT,
  area_sqm REAL,
  water_meter_no TEXT,
  electric_meter_no TEXT,
  status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant','occupied','reserved','maintenance')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3. settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. contracts
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  tenant_id_card_last4 TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  monthly_rent REAL NOT NULL,
  deposit_amount REAL DEFAULT 0,
  deposit_status TEXT DEFAULT 'held' CHECK(deposit_status IN ('held','returned','forfeited')),
  common_fee REAL DEFAULT 0,
  committee_approval_ref TEXT,
  committee_approval_date TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','expired','terminated')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5. biddings
CREATE TABLE IF NOT EXISTS biddings (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  title TEXT NOT NULL,
  description TEXT,
  min_price REAL,
  open_date TEXT NOT NULL,
  close_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','open','closed','awarded','cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 6. bid_criteria
CREATE TABLE IF NOT EXISTS bid_criteria (
  id TEXT PRIMARY KEY,
  bidding_id TEXT NOT NULL REFERENCES biddings(id),
  name TEXT NOT NULL,
  weight_percent REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 7. bid_applications
CREATE TABLE IF NOT EXISTS bid_applications (
  id TEXT PRIMARY KEY,
  bidding_id TEXT NOT NULL REFERENCES biddings(id),
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_id_card_last4 TEXT,
  bid_price REAL NOT NULL,
  documents_json TEXT,
  scores_json TEXT,
  total_score REAL,
  status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','shortlisted','awarded','rejected')),
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_by TEXT,
  review_note TEXT
);

-- 8. documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id),
  stall_id TEXT REFERENCES stalls(id),
  type TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_name TEXT,
  expires_at TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- 9. billing_periods
CREATE TABLE IF NOT EXISTS billing_periods (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  water_rate REAL NOT NULL,
  electric_rate REAL NOT NULL,
  common_fee_rate REAL DEFAULT 0,
  source_water_bill_no TEXT,
  source_electric_bill_no TEXT,
  source_water_rate REAL,
  source_electric_rate REAL,
  source_bill_photo_key TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(year, month)
);

-- 10. meter_readings
CREATE TABLE IF NOT EXISTS meter_readings (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  billing_period_id TEXT NOT NULL REFERENCES billing_periods(id),
  type TEXT NOT NULL CHECK(type IN ('water','electric')),
  prev_reading REAL,
  curr_reading REAL,
  photo_key TEXT,
  ocr_raw_value TEXT,
  read_by TEXT,
  read_at TEXT DEFAULT (datetime('now')),
  is_confirmed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(stall_id, billing_period_id, type)
);

-- 11. bills
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  contract_id TEXT REFERENCES contracts(id),
  billing_period_id TEXT NOT NULL REFERENCES billing_periods(id),
  rent_amount REAL DEFAULT 0,
  water_units REAL DEFAULT 0,
  water_amount REAL DEFAULT 0,
  electric_units REAL DEFAULT 0,
  electric_amount REAL DEFAULT 0,
  common_fee REAL DEFAULT 0,
  other_fee REAL DEFAULT 0,
  other_fee_desc TEXT,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','issued','paid','overdue','partial')),
  due_date TEXT,
  issued_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12. payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id),
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('cash','transfer','promptpay')),
  slip_photo_key TEXT,
  reference_no TEXT,
  qr_scan_data_json TEXT,
  paid_at TEXT DEFAULT (datetime('now')),
  recorded_by TEXT,
  verified_by TEXT,
  verified_at TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 13. receipts
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  receipt_no TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  issued_by TEXT,
  issued_at TEXT DEFAULT (datetime('now')),
  cancelled INTEGER DEFAULT 0,
  cancel_reason TEXT
);

-- 14. inspections
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  inspected_by TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  score REAL,
  checklist_json TEXT,
  photos_json TEXT,
  result TEXT CHECK(result IN ('pass','warning','fail')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 15. penalties
CREATE TABLE IF NOT EXISTS penalties (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  contract_id TEXT REFERENCES contracts(id),
  type TEXT NOT NULL CHECK(type IN ('warning','fine','suspension','termination')),
  reason TEXT NOT NULL,
  amount REAL,
  issued_by TEXT,
  issued_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','resolved')),
  notes TEXT
);

-- 16. menus
CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT,
  is_available INTEGER DEFAULT 1,
  photo_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 17. price_change_logs
CREATE TABLE IF NOT EXISTS price_change_logs (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id),
  old_price REAL NOT NULL,
  new_price REAL NOT NULL,
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now')),
  approved_by TEXT,
  approved_at TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','auto_rejected')),
  reject_reason TEXT
);

-- 18. complaints
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  stall_id TEXT REFERENCES stalls(id),
  complainant_type TEXT DEFAULT 'anonymous' CHECK(complainant_type IN ('student','teacher','staff','anonymous')),
  complainant_name TEXT,
  category TEXT CHECK(category IN ('food_quality','hygiene','price','service','other')),
  description TEXT NOT NULL,
  photo_key TEXT,
  tracking_code TEXT UNIQUE,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','dismissed')),
  response TEXT,
  responded_by TEXT,
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 19. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 20. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  stall_id TEXT,
  user_id TEXT,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 21. consent_logs
CREATE TABLE IF NOT EXISTS consent_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  applicant_ref TEXT,
  consent_type TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  accepted_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_stall ON users(stall_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_contracts_stall ON contracts(stall_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_biddings_status ON biddings(status);
CREATE INDEX IF NOT EXISTS idx_bid_apps_bidding ON bid_applications(bidding_id);
CREATE INDEX IF NOT EXISTS idx_bid_criteria_bidding ON bid_criteria(bidding_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_stall ON documents(stall_id);
CREATE INDEX IF NOT EXISTS idx_documents_expires ON documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_bp_ym ON billing_periods(year, month);
CREATE INDEX IF NOT EXISTS idx_mr_stall_period ON meter_readings(stall_id, billing_period_id);
CREATE INDEX IF NOT EXISTS idx_bills_stall ON bills(stall_id);
CREATE INDEX IF NOT EXISTS idx_bills_period ON bills(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_receipts_fiscal ON receipts(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_receipts_no ON receipts(receipt_no, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_inspections_stall ON inspections(stall_id);
CREATE INDEX IF NOT EXISTS idx_penalties_stall ON penalties(stall_id);
CREATE INDEX IF NOT EXISTS idx_menus_stall ON menus(stall_id);
CREATE INDEX IF NOT EXISTS idx_pcl_menu ON price_change_logs(menu_id);
CREATE INDEX IF NOT EXISTS idx_complaints_stall ON complaints(stall_id);
CREATE INDEX IF NOT EXISTS idx_complaints_track ON complaints(tracking_code);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);

-- =============================================
-- SEED DATA
-- =============================================

-- Admin user (password: admin1234 — ต้องเปลี่ยนทันทีหลัง deploy)
-- hash/salt จะถูกสร้างตอน first login ผ่าน setup_token
INSERT OR IGNORE INTO users (id, phone, name, role, is_active, setup_token)
VALUES ('USR-001', '0000000000', 'ผู้ดูแลระบบ', 'admin', 1, 'SETUP-ADMIN-001');

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('school_name', 'โรงเรียนพะเยาพิทยาคม'),
  ('school_address', ''),
  ('water_rate', '18'),
  ('electric_rate', '8'),
  ('common_fee', '500'),
  ('promptpay_id', ''),
  ('promptpay_name', ''),
  ('max_food_price', '35'),
  ('blacklisted_items', '["เครื่องดื่มแอลกอฮอล์","บุหรี่","เบียร์","ไวน์","สุรา","น้ำอัดลม"]'),
  ('photo_retention_days', '90'),
  ('contract_warning_days', '30'),
  ('health_cert_warning_days', '30'),
  ('fiscal_year_start_month', '10'),
  ('receipt_prefix', 'RCP'),
  ('inspection_checklist', '[{"category":"สถานที่/โครงสร้าง","items":["พื้นสะอาด ไม่มีเศษอาหาร","โต๊ะ/เคาน์เตอร์สะอาด","แสงสว่างเพียงพอ","ระบายอากาศดี"]},{"category":"ภาชนะ/อุปกรณ์","items":["ภาชนะสะอาด","อุปกรณ์ปรุงอาหารสะอาด","มีตู้เก็บภาชนะ"]},{"category":"ผู้สัมผัสอาหาร","items":["สวมหมวก/ผ้าคลุมผม","สวมผ้ากันเปื้อน","เล็บสั้นสะอาด","ไม่สูบบุหรี่ขณะปรุง"]},{"category":"การเก็บรักษาอาหาร","items":["อาหารมีฝาครอบ","แยกอาหารสุก-ดิบ","เก็บสูงจากพื้น 60 ซม."]},{"category":"น้ำ/น้ำแข็ง","items":["น้ำดื่มสะอาด","น้ำแข็งสะอาด","ภาชนะน้ำแข็งสะอาด"]},{"category":"สัตว์/แมลง","items":["ไม่มีแมลงสาบ","ไม่มีหนู","มีมาตรการป้องกัน"]},{"category":"ขยะ/สิ่งปฏิกูล","items":["ถังขยะมีฝาปิด","ทิ้งขยะเป็นเวลา","ท่อระบายไม่อุดตัน"]}]');
