/* PPK-Canteen — Users API */
import { auditLog, generateSalt, hashPassword } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listUsers(DB, user);
  if (path.length === 0 && method === 'POST') return createUser(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getUser(DB, path[0], user);
  if (path.length === 1 && method === 'PUT') return updateUser(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listUsers(DB, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { results } = await DB.prepare(
    'SELECT u.id, u.phone, u.name, u.role, u.stall_id, u.email, u.is_active, u.setup_token, u.created_at, s.name as stall_name FROM users u LEFT JOIN stalls s ON u.stall_id = s.id ORDER BY u.created_at DESC'
  ).all();
  return Response.json({ data: results });
}

async function getUser(DB, id, user) {
  if (user.role !== 'admin' && user.id !== id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const row = await DB.prepare(
    'SELECT u.id, u.phone, u.name, u.role, u.stall_id, u.email, u.is_active, u.setup_token, u.created_at, s.name as stall_name FROM users u LEFT JOIN stalls s ON u.stall_id = s.id WHERE u.id = ?'
  ).bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
  return Response.json({ data: row });
}

async function createUser(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();

  if (!body.name || !body.phone || !body.role) {
    return Response.json({ error: 'กรุณากรอกชื่อ เบอร์โทร และบทบาท' }, { status: 400 });
  }

  const cleanPhone = String(body.phone).replace(/\D/g, '');
  const exists = await DB.prepare('SELECT id FROM users WHERE phone = ?').bind(cleanPhone).first();
  if (exists) return Response.json({ error: 'เบอร์โทรนี้ถูกใช้แล้ว' }, { status: 400 });

  const id = 'USR-' + Date.now().toString(36).toUpperCase();
  const arr = new Uint8Array(5);
  crypto.getRandomValues(arr);
  const setupToken = Array.from(arr, b => b.toString(36)).join('').toUpperCase().slice(0, 8);

  await DB.prepare(
    'INSERT INTO users (id, phone, name, role, stall_id, email, is_active, setup_token) VALUES (?,?,?,?,?,?,1,?)'
  ).bind(id, cleanPhone, body.name, body.role, body.stall_id || null, body.email || null, setupToken).run();

  await auditLog(DB, user.id, 'create', 'users', id, { name: body.name, role: body.role });
  return Response.json({ data: { id, setup_token: setupToken } }, { status: 201 });
}

async function updateUser(DB, request, id, user) {
  if (user.role !== 'admin' && user.id !== id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];

  // Only admin can change role, is_active
  const adminFields = ['role', 'is_active', 'stall_id'];
  const selfFields = ['name', 'email', 'phone'];
  const allowedFields = user.role === 'admin' ? [...adminFields, ...selfFields] : selfFields;

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      let val = body[key];
      if (key === 'phone') {
        val = String(val).replace(/\D/g, '');
        const dup = await DB.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').bind(val, id).first();
        if (dup) return Response.json({ error: 'เบอร์โทรนี้ถูกใช้แล้ว' }, { status: 400 });
      }
      fields.push(`${key} = ?`); vals.push(val);
    }
  }

  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูล' }, { status: 400 });
  fields.push("updated_at = datetime('now')");
  vals.push(id);

  await DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  await auditLog(DB, user.id, 'update', 'users', id, body);
  return Response.json({ ok: true });
}
