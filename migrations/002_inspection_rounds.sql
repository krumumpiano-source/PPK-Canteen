-- =============================================
-- PPK-Canteen Migration 002: Inspection Rounds
-- ระบบตรวจสุขอนามัยแบบคณะกรรมการ (3 หรือ 5 คน)
-- =============================================

-- Inspection rounds (รอบตรวจ)
CREATE TABLE IF NOT EXISTS inspection_rounds (
  id TEXT PRIMARY KEY,
  stall_id TEXT NOT NULL REFERENCES stalls(id),
  inspection_date TEXT NOT NULL,
  inspector_count INTEGER NOT NULL DEFAULT 3,
  inspectors_json TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
  avg_score REAL,
  result TEXT CHECK(result IN ('pass','warning','fail')),
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Link inspections to rounds
ALTER TABLE inspections ADD COLUMN round_id TEXT REFERENCES inspection_rounds(id);
