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

  let sql = `SELECT r.*, p.amount, p.bill_id, p.stall_id, s.name as stall_name, u.name as payer_name 
             FROM receipts r 
             LEFT JOIN payments p ON r.payment_id = p.id 
             LEFT JOIN bills b ON p.bill_id = b.id 
             LEFT JOIN stalls s ON p.stall_id = s.id 
             LEFT JOIN users u ON p.recorded_by = u.id`;
  const where = [];
  const params = [];

  if (user.role === 'stall_owner' && user.stall_id) {
    where.push('p.stall_id = ?');
    params.push(user.stall_id);
  }
  if (period) { where.push('b.billing_period_id = ?'); params.push(period); }
  if (stall) { where.push('p.stall_id = ?'); params.push(stall); }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.issued_at DESC';

  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getReceipt(DB, id, user) {
  const r = await DB.prepare(
    `SELECT r.*, p.amount, p.bill_id, p.stall_id, p.method,
            b.billing_period_id, b.rent_amount, b.water_amount, b.electric_amount, b.common_fee, b.other_fee, b.total_amount,
            s.name as stall_name, s.zone, bp.month, bp.year
     FROM receipts r 
     LEFT JOIN payments p ON r.payment_id = p.id 
     LEFT JOIN bills b ON p.bill_id = b.id 
     LEFT JOIN stalls s ON p.stall_id = s.id 
     LEFT JOIN billing_periods bp ON b.billing_period_id = bp.id 
     WHERE r.id = ?`
  ).bind(id).first();
  if (!r) return Response.json({ error: 'Not found' }, { status: 404 });
  if (user.role === 'stall_owner' && user.stall_id !== r.stall_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return Response.json({ data: r });
}

async function cancelReceipt(DB, id, request, user) {
  if (!['admin', 'billing_officer'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const receipt = await DB.prepare('SELECT r.*, p.bill_id FROM receipts r LEFT JOIN payments p ON r.payment_id = p.id WHERE r.id = ?').bind(id).first();
  if (!receipt) return Response.json({ error: 'Not found' }, { status: 404 });
  if (receipt.cancelled) return Response.json({ error: 'ใบเสร็จนี้ถูกยกเลิกแล้ว' }, { status: 400 });

  let reason = '';
  try { const body = await request.json(); reason = body.reason || ''; } catch {}

  await DB.prepare("UPDATE receipts SET cancelled = 1, cancel_reason = ? WHERE id = ?")
    .bind(reason, id).run();

  // Revert bill status
  if (receipt.bill_id) {
    await DB.prepare("UPDATE bills SET status = 'issued' WHERE id = ?").bind(receipt.bill_id).run();
  }
  // Revert payment status
  if (receipt.payment_id) {
    await DB.prepare("UPDATE payments SET status = 'pending' WHERE id = ?").bind(receipt.payment_id).run();
  }

  await auditLog(DB, user.id, 'cancel', 'receipts', id, { reason });
  return Response.json({ ok: true });
}
