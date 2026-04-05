/* PPK-Canteen — Receipts API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listReceipts(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getReceipt(DB, path[0], user);
  if (path.length === 1 && path[0] !== 'cancel' && method === 'PUT') return Response.json({ error: 'Not supported' }, { status: 405 });
  if (path.length === 2 && path[1] === 'cancel' && method === 'POST') return cancelReceipt(DB, path[0], context.request, user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listReceipts(DB, request, user) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period_id');
  const stall = url.searchParams.get('stall_id');

  let sql = `SELECT r.*, b.stall_id, s.name as stall_name, u.name as payer_name 
             FROM receipts r 
             LEFT JOIN bills b ON r.bill_id = b.id 
             LEFT JOIN stalls s ON b.stall_id = s.id 
             LEFT JOIN users u ON r.issued_to = u.id`;
  const where = [];
  const params = [];

  if (user.role === 'stall_owner') {
    where.push('r.issued_to = ?');
    params.push(user.id);
  }
  if (period) { where.push('b.period_id = ?'); params.push(period); }
  if (stall) { where.push('b.stall_id = ?'); params.push(stall); }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.created_at DESC';

  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getReceipt(DB, id, user) {
  const r = await DB.prepare(
    `SELECT r.*, b.stall_id, b.period_id, b.rent_amount, b.water_amount, b.electric_amount, b.common_fee, b.other_fee, b.total_amount,
            s.name as stall_name, s.zone, u.name as payer_name, u.phone as payer_phone,
            bp.name as period_name, bp.month, bp.year
     FROM receipts r 
     LEFT JOIN bills b ON r.bill_id = b.id 
     LEFT JOIN stalls s ON b.stall_id = s.id 
     LEFT JOIN users u ON r.issued_to = u.id 
     LEFT JOIN billing_periods bp ON b.period_id = bp.id 
     WHERE r.id = ?`
  ).bind(id).first();
  if (!r) return Response.json({ error: 'Not found' }, { status: 404 });
  if (user.role === 'stall_owner' && r.issued_to !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return Response.json({ data: r });
}

async function cancelReceipt(DB, id, request, user) {
  if (!['admin', 'finance'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const receipt = await DB.prepare('SELECT * FROM receipts WHERE id = ?').bind(id).first();
  if (!receipt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (receipt.status === 'cancelled') return Response.json({ error: 'ใบเสร็จนี้ถูกยกเลิกแล้ว' }, { status: 400 });

  const body = await request.json();
  await DB.prepare("UPDATE receipts SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, cancelled_at = datetime('now') WHERE id = ?")
    .bind(body.reason || '', user.id, id).run();

  // Revert bill status
  await DB.prepare("UPDATE bills SET status = 'issued' WHERE id = ?").bind(receipt.bill_id).run();
  // Revert payment status
  if (receipt.payment_id) {
    await DB.prepare("UPDATE payments SET status = 'pending' WHERE id = ?").bind(receipt.payment_id).run();
  }

  await auditLog(DB, user.id, 'cancel', 'receipts', id, { reason: body.reason });
  return Response.json({ ok: true });
}
