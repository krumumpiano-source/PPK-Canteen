/* PPK-Canteen — Payments API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listPayments(DB, context.request, user);
  if (path.length === 0 && method === 'POST') return createPayment(DB, context, user);
  if (path.length === 2 && path[1] === 'verify' && method === 'PUT') return verifyPayment(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listPayments(DB, request, user) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const billId = url.searchParams.get('bill_id');
  const stallId = url.searchParams.get('stall_id');
  const limit = url.searchParams.get('limit') || 100;

  let sql = `SELECT p.*, s.name as stall_name, u.name as recorder_name, v.name as verifier_name
    FROM payments p LEFT JOIN stalls s ON p.stall_id = s.id
    LEFT JOIN users u ON p.recorded_by = u.id LEFT JOIN users v ON p.verified_by = v.id WHERE 1=1`;
  const params = [];

  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (billId) { sql += ' AND p.bill_id = ?'; params.push(billId); }
  if (stallId) { sql += ' AND p.stall_id = ?'; params.push(stallId); }
  // stall_owner can only see own
  if (user.role === 'stall_owner' && user.stall_id) {
    sql += ' AND p.stall_id = ?'; params.push(user.stall_id);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function createPayment(DB, context, user) {
  const contentType = context.request.headers.get('Content-Type') || '';
  let body;
  if (contentType.includes('multipart/form-data')) {
    const fd = await context.request.formData();
    body = Object.fromEntries(fd.entries());
    const slip = fd.get('slip');
    if (slip && slip.size > 0) {
      const fileId = 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      const buf = await slip.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await DB.prepare("INSERT INTO files (id, data, content_type) VALUES (?, ?, ?)").bind(fileId, base64, slip.type || 'image/jpeg').run();
      body.slip_photo_key = fileId;
    }
  } else {
    body = await context.request.json();
  }

  if (!body.bill_id || !body.amount || !body.method) {
    return Response.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  }

  // Get bill to verify stall_id
  const bill = await DB.prepare('SELECT * FROM bills WHERE id = ?').bind(body.bill_id).first();
  if (!bill) return Response.json({ error: 'ไม่พบใบแจ้งหนี้' }, { status: 404 });

  // stall_owner can only pay own bills
  if (user.role === 'stall_owner' && user.stall_id !== bill.stall_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = 'PAY-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    `INSERT INTO payments (id, bill_id, stall_id, amount, method, slip_photo_key, reference_no, paid_at, recorded_by, status, notes)
     VALUES (?,?,?,?,?,?,?,datetime('now'),?,?,?)`
  ).bind(id, body.bill_id, bill.stall_id, body.amount, body.method, body.slip_photo_key || null,
    body.reference_no || null, user.id, 'pending', body.notes || null).run();

  await auditLog(DB, user.id, 'create', 'payments', id, { bill_id: body.bill_id, amount: body.amount });
  return Response.json({ data: { id } }, { status: 201 });
}

async function verifyPayment(DB, request, id, user) {
  if (!['admin', 'billing_officer', 'payment_verifier'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  if (!['verified', 'rejected'].includes(body.status)) {
    return Response.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  }

  await DB.prepare(
    "UPDATE payments SET status = ?, verified_by = ?, verified_at = datetime('now'), notes = COALESCE(?, notes) WHERE id = ?"
  ).bind(body.status, user.id, body.notes || null, id).run();

  // If verified, update bill status + create receipt
  if (body.status === 'verified') {
    const payment = await DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    if (payment) {
      // Check total paid for this bill
      const { total } = await DB.prepare(
        "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE bill_id = ? AND status = 'verified'"
      ).bind(payment.bill_id).first();

      const bill = await DB.prepare('SELECT total_amount FROM bills WHERE id = ?').bind(payment.bill_id).first();
      const newStatus = total >= bill.total_amount ? 'paid' : 'partial';
      await DB.prepare('UPDATE bills SET status = ? WHERE id = ?').bind(newStatus, payment.bill_id).run();

      // Create receipt
      const fiscalYear = getFiscalYear();
      const lastReceipt = await DB.prepare(
        'SELECT receipt_no FROM receipts WHERE fiscal_year = ? ORDER BY receipt_no DESC LIMIT 1'
      ).bind(fiscalYear).first();
      const nextNum = lastReceipt ? parseInt(lastReceipt.receipt_no.split('/')[0]) + 1 : 1;
      const receiptNo = `${String(nextNum).padStart(3, '0')}/${fiscalYear}`;
      const receiptId = 'RCP-' + Date.now().toString(36).toUpperCase();

      await DB.prepare(
        "INSERT INTO receipts (id, payment_id, receipt_no, fiscal_year, issued_by, issued_at) VALUES (?,?,?,?,?,datetime('now'))"
      ).bind(receiptId, id, receiptNo, fiscalYear, user.id).run();

      // Notify stall owner
      const owner = await DB.prepare("SELECT id FROM users WHERE stall_id = ? AND role = 'stall_owner'").bind(payment.stall_id).first();
      if (owner) {
        const nid = 'NTF-' + Date.now().toString(36).toUpperCase();
        await DB.prepare(
          "INSERT INTO notifications (id, stall_id, user_id, type, title, message, created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
        ).bind(nid, payment.stall_id, owner.id, 'payment_verified', 'ชำระเงินอนุมัติ',
          `การชำระเงิน ${payment.amount} บาท ได้รับการอนุมัติ ใบเสร็จ ${receiptNo}`).run();
      }
    }
  }

  await auditLog(DB, user.id, 'verify_payment', 'payments', id, { status: body.status });
  return Response.json({ ok: true });
}

function getFiscalYear() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear() + 543;
  return m >= 10 ? y + 1 : y;
}
