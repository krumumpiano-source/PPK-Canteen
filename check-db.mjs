import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const base = 'D:/AI CURSER';
const dirs = fs.readdirSync(base);
const proj = dirs.find(d => d.includes('canteen') || d.includes('\u0e42\u0e23\u0e07'));
const d1Dir = path.join(base, proj, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');

console.log('D1 directory:', d1Dir);
const files = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.startsWith('meta'));
console.log('SQLite files:', files);

for (const file of files) {
  const dbPath = path.join(d1Dir, file);
  const db = new DatabaseSync(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`\n[${file.substring(0,8)}...] Tables:`, tables.map(t => t.name).join(', ') || '(none)');
  db.close();
}
