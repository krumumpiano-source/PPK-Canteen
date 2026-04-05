/* PPK-Canteen — Notifications API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listNotifications(DB, context.request, user);
  if (path.length === 1 && path[0] === 'mark-all-read' && method === 'POST') return markAllRead(DB, user);
  if (path.length === 1 && method === 'PUT') return markRead(DB, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listNotifications(DB, request, user) {
  const url = new URL(request.url);
  const unread = url.searchParams.get('unread');
  let sql = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [user.id];
  if (unread === '1') { sql += ' AND is_read = 0'; }
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await DB.prepare(sql).bind(...params).all();

  const countRow = await DB.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').bind(user.id).first();
  return Response.json({ data: results, unread_count: countRow.c });
}

async function markRead(DB, id, user) {
  await DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return Response.json({ ok: true });
}

async function markAllRead(DB, user) {
  await DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').bind(user.id).run();
  return Response.json({ ok: true });
}
