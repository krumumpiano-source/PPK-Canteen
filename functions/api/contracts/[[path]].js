/* PPK-Canteen — Contracts API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listContracts(DB, context.request);
  if (path.length === 0 && method === 'POST') return createContract(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getContract(DB, path[0]);
  if (path.length === 1 && method === 'PUT') return updateContract(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listContracts(DB, request) {
  const url = new URL(request.url);
  const stallId = url.searchParams.get('stall_id');
  const status = url.searchParams.get('status');
  let sql = 'SELECT c.*, s.name as stall_name FROM contracts c LEFT JOIN stalls s ON c.stall_id = s.id WHERE 1=1';
  const params = [];
  if (stallId) { sql += ' AND c.stall_id = ?'; params.push(stallId); }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  sql += ' ORDER BY c.created_at DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getContract(DB, id) {
  const row = await DB.prepare('SELECT c.*, s.name as stall_name FROM contracts c LEFT JOIN stalls s ON c.stall_id = s.id WHERE c.id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบสัญญา' }, { status: 404 });
  return Response.json({ data: row });
}

async function createContract(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();

  // Check for existing active contract on this stall
  const existing = await DB.prepare("SELECT id FROM contracts WHERE stall_id = ? AND status = 'active' LIMIT 1").bind(body.stall_id).first();
  if (existing) return Response.json({ error: 'ร้านค้านี้มีสัญญาเช่าที่ใช้งานอยู่แล้ว' }, { status: 400 });

  const id = 'CTR-' + Date.now().toString(36).toUpperCase();

  await DB.prepare(
    `INSERT INTO contracts (id, stall_id, tenant_name, tenant_phone, start_date, end_date, monthly_rent, deposit_amount, common_fee, committee_approval_ref, committee_approval_date, status, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, body.stall_id, body.tenant_name, body.tenant_phone || null, body.start_date, body.end_date,
    body.monthly_rent, body.deposit_amount || 0, body.common_fee || 0,
    body.committee_approval_ref || null, body.committee_approval_date || null,
    body.status || 'active', body.notes || null).run();

  // Update stall status to occupied
  await DB.prepare("UPDATE stalls SET status = 'occupied' WHERE id = ?").bind(body.stall_id).run();
  await auditLog(DB, user.id, 'create', 'contracts', id, { stall_id: body.stall_id, tenant: body.tenant_name });
  return Response.json({ data: { id } }, { status: 201 });
}

async function updateContract(DB, request, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['stall_id','tenant_name','tenant_phone','start_date','end_date','monthly_rent','deposit_amount','deposit_status','common_fee','committee_approval_ref','committee_approval_date','status','notes']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูล' }, { status: 400 });
  vals.push(id);
  await DB.prepare(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();

  // If terminated, set stall to vacant
  if (body.status === 'terminated' || body.status === 'expired') {
    const contract = await DB.prepare('SELECT stall_id FROM contracts WHERE id = ?').bind(id).first();
    if (contract) await DB.prepare("UPDATE stalls SET status = 'vacant' WHERE id = ?").bind(contract.stall_id).run();
  }
  await auditLog(DB, user.id, 'update', 'contracts', id, body);
  return Response.json({ ok: true });
}
