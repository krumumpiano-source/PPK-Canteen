/* PPK-Canteen — Penalties API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listPenalties(DB);
  if (path.length === 0 && method === 'POST') return createPenalty(DB, context.request, user);
  if (path.length === 1 && method === 'PUT') return updatePenalty(DB, context.request, path[0], user);
  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listPenalties(DB) {
  const { results } = await DB.prepare(
    'SELECT p.*, s.name as stall_name FROM penalties p LEFT JOIN stalls s ON p.stall_id = s.id ORDER BY p.issued_at DESC'
  ).all();
  return Response.json({ data: results });
}

async function createPenalty(DB, request, user) {
  if (!['admin','inspector'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const id = 'PEN-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    'INSERT INTO penalties (id, stall_id, type, reason, amount, issued_by, status) VALUES (?,?,?,?,?,?,?)'
  ).bind(id, body.stall_id, body.type, body.reason, body.amount || null, user.id, 'active').run();
  await auditLog(DB, user.id, 'create', 'penalties', id, body);
  return Response.json({ data: { id } }, { status: 201 });
}

async function updatePenalty(DB, request, id, user) {
  if (!['admin','inspector'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['status', 'resolved_at', 'notes']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  vals.push(id);
  await DB.prepare(`UPDATE penalties SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return Response.json({ ok: true });
}
