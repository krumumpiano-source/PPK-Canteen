/* PPK-Canteen — Stalls API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listStalls(DB, context.request);
  if (path.length === 0 && method === 'POST') return createStall(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getStall(DB, path[0]);
  if (path.length === 1 && method === 'PUT') return updateStall(DB, context.request, path[0], user);
  if (path.length === 1 && method === 'DELETE') return deleteStall(DB, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listStalls(DB, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let sql = 'SELECT * FROM stalls';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY name';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getStall(DB, id) {
  const row = await DB.prepare('SELECT * FROM stalls WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบร้านค้า' }, { status: 404 });
  return Response.json({ data: row });
}

async function createStall(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const id = 'STL-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    'INSERT INTO stalls (id, name, zone, location_desc, area_sqm, water_meter_no, electric_meter_no, status) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, body.name, body.zone || null, body.location_desc || null, body.area_sqm || null,
    body.water_meter_no || null, body.electric_meter_no || null, body.status || 'vacant').run();
  await auditLog(DB, user.id, 'create', 'stalls', id, body);
  return Response.json({ data: { id } }, { status: 201 });
}

async function updateStall(DB, request, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['name','zone','location_desc','area_sqm','water_meter_no','electric_meter_no','status']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูลที่ต้องแก้ไข' }, { status: 400 });
  vals.push(id);
  await DB.prepare(`UPDATE stalls SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  await auditLog(DB, user.id, 'update', 'stalls', id, body);
  return Response.json({ ok: true });
}

async function deleteStall(DB, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const contracts = await DB.prepare('SELECT COUNT(*) as c FROM contracts WHERE stall_id = ? AND status = \'active\'').bind(id).first();
  if (contracts.c > 0) return Response.json({ error: 'ไม่สามารถลบได้ มีสัญญาเช่าที่ใช้งานอยู่' }, { status: 400 });
  await DB.prepare('DELETE FROM stalls WHERE id = ?').bind(id).run();
  await auditLog(DB, user.id, 'delete', 'stalls', id, null);
  return Response.json({ ok: true });
}
