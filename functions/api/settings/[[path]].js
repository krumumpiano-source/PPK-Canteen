/* PPK-Canteen — Settings + Audit Log API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listSettings(DB, user);
  if (path.length === 0 && method === 'PUT') return updateSettings(DB, context.request, user);
  if (path.length === 1 && path[0] === 'audit-log' && method === 'GET') return getAuditLog(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getSetting(DB, path[0]);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listSettings(DB, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { results } = await DB.prepare('SELECT * FROM settings ORDER BY key').all();
  return Response.json({ data: results });
}

async function getSetting(DB, key) {
  const row = await DB.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first();
  return Response.json({ data: row || { key, value: null } });
}

async function updateSettings(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();

  const batch = [];
  for (const [key, value] of Object.entries(body)) {
    batch.push(
      DB.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))").bind(key, String(value))
    );
  }
  await DB.batch(batch);
  await auditLog(DB, user.id, 'update', 'settings', null, body);
  return Response.json({ ok: true });
}

async function getAuditLog(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || 100;
  const { results } = await DB.prepare(
    'SELECT a.*, u.name as user_name FROM audit_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?'
  ).bind(parseInt(limit)).all();
  return Response.json({ data: results });
}
