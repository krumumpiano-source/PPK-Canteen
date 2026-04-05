/* PPK-Canteen — Complaints API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data?.user;

  // Public endpoints (no auth)
  if (path[0] === 'public' && path[1] === 'submit' && method === 'POST') return publicSubmit(DB, context.request);
  if (path[0] === 'public' && path[1] === 'track' && method === 'GET') return publicTrack(DB, context.request);
  if (path[0] === 'public' && path[1] === 'stalls' && method === 'GET') return publicStalls(DB);

  if (path.length === 0 && method === 'GET') return listComplaints(DB);
  if (path.length === 1 && method === 'GET') return getComplaint(DB, path[0]);
  if (path.length === 1 && method === 'PUT') return updateComplaint(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function publicSubmit(DB, request) {
  const body = await request.json();
  if (!body.description) return Response.json({ error: 'กรุณากรอกรายละเอียด' }, { status: 400 });

  const id = 'CMP-' + Date.now().toString(36).toUpperCase();
  const trackingCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  await DB.prepare(
    `INSERT INTO complaints (id, stall_id, complainant_type, complainant_name, category, description, tracking_code, status)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(id, body.stall_id || null, body.complainant_type || 'anonymous', body.complainant_name || null,
    body.category || 'other', body.description, trackingCode, 'open').run();

  return Response.json({ data: { id, tracking_code: trackingCode } }, { status: 201 });
}

async function publicTrack(DB, request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return Response.json({ error: 'กรุณาระบุรหัสติดตาม' }, { status: 400 });

  const row = await DB.prepare(
    'SELECT tracking_code, category, description, status, response, responded_at, created_at FROM complaints WHERE tracking_code = ?'
  ).bind(code.toUpperCase()).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อร้องเรียน' }, { status: 404 });
  return Response.json({ data: row });
}

async function publicStalls(DB) {
  const { results } = await DB.prepare("SELECT id, name FROM stalls WHERE status = 'occupied' ORDER BY name").all();
  return Response.json({ data: results });
}

async function listComplaints(DB) {
  const { results } = await DB.prepare(
    `SELECT c.*, s.name as stall_name, u.name as responder_name
     FROM complaints c LEFT JOIN stalls s ON c.stall_id = s.id LEFT JOIN users u ON c.responded_by = u.id
     ORDER BY c.created_at DESC`
  ).all();
  return Response.json({ data: results });
}

async function getComplaint(DB, id) {
  const row = await DB.prepare(
    'SELECT c.*, s.name as stall_name, u.name as responder_name FROM complaints c LEFT JOIN stalls s ON c.stall_id = s.id LEFT JOIN users u ON c.responded_by = u.id WHERE c.id = ?'
  ).bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อร้องเรียน' }, { status: 404 });
  return Response.json({ data: row });
}

async function updateComplaint(DB, request, id, user) {
  if (!['admin', 'executive'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  await DB.prepare(
    "UPDATE complaints SET status = ?, response = ?, responded_by = ?, responded_at = datetime('now') WHERE id = ?"
  ).bind(body.status, body.response, user.id, id).run();
  await auditLog(DB, user.id, 'respond', 'complaints', id, { status: body.status });
  return Response.json({ ok: true });
}
