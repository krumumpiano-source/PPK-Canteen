/* PPK-Canteen — Inspections API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listInspections(DB, context.request, user);
  if (path.length === 0 && method === 'POST') return createInspection(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getInspection(DB, path[0]);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listInspections(DB, request, user) {
  const url = new URL(request.url);
  const stallId = url.searchParams.get('stall_id');
  let sql = `SELECT i.*, s.name as stall_name, u.name as inspector_name
    FROM inspections i LEFT JOIN stalls s ON i.stall_id = s.id LEFT JOIN users u ON i.inspected_by = u.id WHERE 1=1`;
  const params = [];
  if (stallId) { sql += ' AND i.stall_id = ?'; params.push(stallId); }
  if (user.role === 'stall_owner' && user.stall_id) { sql += ' AND i.stall_id = ?'; params.push(user.stall_id); }
  sql += ' ORDER BY i.inspection_date DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function createInspection(DB, request, user) {
  if (!['admin', 'inspector'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const id = 'INS-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    `INSERT INTO inspections (id, stall_id, inspected_by, inspection_date, score, checklist_json, result, notes)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(id, body.stall_id, user.id, body.inspection_date, body.score || 0, body.checklist_json || null, body.result || 'pass', body.notes || null).run();

  // Auto-create penalty if failed
  if (body.result === 'fail') {
    const penId = 'PEN-' + Date.now().toString(36).toUpperCase();
    await DB.prepare(
      "INSERT INTO penalties (id, stall_id, type, reason, issued_by, status) VALUES (?,?,?,?,?,?)"
    ).bind(penId, body.stall_id, 'warning', `ไม่ผ่านการตรวจสุขอนามัย (คะแนน ${body.score}/100)`, user.id, 'active').run();
  }

  // Notify stall owner
  const owner = await DB.prepare("SELECT id FROM users WHERE stall_id = ? AND role = 'stall_owner'").bind(body.stall_id).first();
  if (owner) {
    const nid = 'NTF-' + Date.now().toString(36).toUpperCase();
    await DB.prepare(
      "INSERT INTO notifications (id, stall_id, user_id, type, title, message, created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
    ).bind(nid, body.stall_id, owner.id, 'inspection', 'ผลตรวจสุขอนามัย',
      `คะแนน ${body.score}/100 — ${body.result === 'pass' ? 'ผ่าน' : body.result === 'warning' ? 'เตือน' : 'ไม่ผ่าน'}`).run();
  }

  await auditLog(DB, user.id, 'create', 'inspections', id, { stall: body.stall_id, score: body.score });
  return Response.json({ data: { id } }, { status: 201 });
}

async function getInspection(DB, id) {
  const row = await DB.prepare(
    'SELECT i.*, s.name as stall_name, u.name as inspector_name FROM inspections i LEFT JOIN stalls s ON i.stall_id = s.id LEFT JOIN users u ON i.inspected_by = u.id WHERE i.id = ?'
  ).bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
  return Response.json({ data: row });
}
