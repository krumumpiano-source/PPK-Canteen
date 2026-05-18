// seed-local-db.mjs - Apply migrations directly to miniflare SQLite
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const d1Dir = path.join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

// Find all non-metadata sqlite files
const files = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.startsWith('meta'));
console.log('Found SQLite files:', files.map(f => f.substring(0,8) + '...'));

// We'll apply migrations to ALL of them so whichever one the dev server uses, it'll have tables
for (const file of files) {
  const dbPath = path.join(d1Dir, file);
  console.log(`\nProcessing ${file.substring(0,8)}...`);
  
  const db = new DatabaseSync(dbPath);
  
  // Check existing tables
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const existingNames = existing.map(t => t.name);

  if (existingNames.length > 0) {
    // Apply migration 002 if inspection_rounds table is missing
    if (!existingNames.includes('inspection_rounds')) {
      const sql002 = fs.readFileSync(path.join(__dirname, 'migrations/002_inspection_rounds.sql'), 'utf-8');
      try {
        db.exec(sql002);
        console.log('  Migration 002: applied (added inspection_rounds table)');
      } catch (e) {
        if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
          console.log('  Migration 002 error:', e.message.substring(0, 100));
        } else {
          console.log('  Migration 002: already up to date');
        }
      }
    } else {
      console.log('  Already has tables (incl. inspection_rounds): OK');
    }
    db.close();
    continue;
  }

  // Read and apply migration 001 - execute all SQL at once
  const sql001 = fs.readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf-8');
  
  try {
    db.exec(sql001);
    console.log('  Migration 001: OK');
  } catch (e) {
    if (!e.message.includes('already exists')) {
      console.log('  Migration 001 error:', e.message.substring(0, 100));
    }
  }

  // Seed test users
  try {
    db.exec(`
      INSERT OR IGNORE INTO users (id, phone, name, role, is_active, setup_token) VALUES
        ('USR-001', '0999999999', 'ผู้ดูแลระบบ', 'admin', 1, 'ADMIN-FIRST-LOGIN-2568'),
        ('USR-002', '0888888888', 'เจ้าหน้าที่ตรวจ', 'inspector', 1, 'INSPECT-TOKEN-001'),
        ('USR-003', '0877777777', 'ผู้บริหาร', 'executive', 1, 'EXEC-TOKEN-001'),
        ('USR-004', '0866666666', 'เจ้าหน้าที่การเงิน', 'staff', 1, 'STAFF-TOKEN-001');
    `);
    console.log('  Seeded 4 test users');
  } catch (e) {
    console.log('  User seed error:', e.message);
  }

  // Seed test stalls
  try {
    db.exec(`
      INSERT OR IGNORE INTO stalls (id, name, zone, location_desc, area_sqm, status) VALUES
        ('STL-001', 'ร้านส้มตำ', 'A', 'โซน A ร้านที่ 1', 12.5, 'vacant'),
        ('STL-002', 'ร้านข้าวแกง', 'A', 'โซน A ร้านที่ 2', 10.0, 'vacant'),
        ('STL-003', 'ร้านก๋วยเตี๋ยว', 'B', 'โซน B ร้านที่ 1', 8.5, 'vacant');
    `);
    console.log('  Seeded 3 test stalls');
  } catch (e) {
    console.log('  Stall seed error:', e.message);
  }

  // Seed settings
  try {
    db.exec(`
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('school_name', 'โรงเรียนพะเยาพิทยาคม'),
        ('water_rate', '8.50'),
        ('electric_rate', '4.50'),
        ('bank_name', 'ธนาคารกรุงไทย'),
        ('bank_account_no', '123-4-56789-0'),
        ('bank_account_name', 'โรงเรียนพะเยาพิทยาคม'),
        ('max_food_price', '100'),
        ('late_fee_rate', '1.5');
    `);
    console.log('  Seeded settings');
  } catch (e) {
    console.log('  Settings seed error:', e.message);
  }

  // Verify
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('  Tables now:', tables.map(t => t.name).join(', '));
  
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get();
  console.log('  Users:', userCount.c);

  db.close();
}

console.log('\nDone! Restart the dev server for changes to take effect.');
