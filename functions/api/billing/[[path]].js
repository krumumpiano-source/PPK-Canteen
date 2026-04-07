/* PPK-Canteen — Billing API (Periods + Readings + Bills + Generate) */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  // /api/billing/periods
  if (path[0] === 'periods' && !path[1] && method === 'GET') return listPeriods(DB, context.request);
  if (path[0] === 'periods' && !path[1] && method === 'POST') return createPeriod(DB, context.request, user);
  if (path[0] === 'periods' && path[1] && method === 'GET') return getPeriod(DB, path[1]);
  if (path[0] === 'periods' && path[1] && method === 'PUT') return updatePeriod(DB, context.request, path[1], user);

  // /api/billing/readings
  if (path[0] === 'readings' && !path[1] && method === 'GET') return listReadings(DB, context.request);
  if (path[0] === 'readings' && !path[1] && method === 'POST') return createReading(DB, context, user);
  if (path[0] === 'readings' && path[1] && method === 'GET') return getReading(DB, path[1]);
  if (path[0] === 'readings' && path[1] && method === 'PUT') return updateReading(DB, context, path[1], user);

  // /api/billing/bills
  if (path[0] === 'bills' && !path[1] && method === 'GET') return listBills(DB, context.request);
  if (path[0] === 'bills' && path[1] === 'generate' && method === 'POST') return null; // handled below
  if (path[0] === 'bills' && path[1] && path[2] === 'issue' && method === 'POST') return issueBill(DB, path[1], user);
  if (path[0] === 'bills' && path[1] && method === 'GET') return getBill(DB, path[1]);

  // /api/billing/generate
  if (path[0] === 'generate' && method === 'POST') return generateBills(DB, context.request, user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

// ── Periods ──
async function listPeriods(DB, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let sql = 'SELECT * FROM billing_periods';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY year DESC, month DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getPeriod(DB, id) {
  const row = await DB.prepare('SELECT * FROM billing_periods WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบรอบบิล' }, { status: 404 });
  return Response.json({ data: row });
}

async function createPeriod(DB, request, user) {
  if (!['admin', 'staff'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const year = parseInt(body.year);
  const month = parseInt(body.month);
  const id = `BP-${year}-${String(month).padStart(2, '0')}`;

  const exists = await DB.prepare('SELECT id FROM billing_periods WHERE year = ? AND month = ?').bind(year, month).first();
  if (exists) return Response.json({ error: 'รอบบิลนี้มีอยู่แล้ว' }, { status: 400 });

  await DB.prepare(
    `INSERT INTO billing_periods (id, year, month, water_rate, electric_rate, source_water_bill_no, source_electric_bill_no, status)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(id, year, month, body.water_rate || 18, body.electric_rate || 8,
    body.source_water_bill_no || null, body.source_electric_bill_no || null, 'open').run();
  await auditLog(DB, user.id, 'create', 'billing_periods', id, null);
  return Response.json({ data: { id } }, { status: 201 });
}

async function updatePeriod(DB, request, id, user) {
  if (!['admin', 'staff'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['water_rate', 'electric_rate', 'source_water_bill_no', 'source_electric_bill_no', 'status']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูล' }, { status: 400 });
  vals.push(id);
  await DB.prepare(`UPDATE billing_periods SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return Response.json({ ok: true });
}

// ── Readings ──
async function listReadings(DB, request) {
  const url = new URL(request.url);
  const periodId = url.searchParams.get('period_id');
  const stallId = url.searchParams.get('stall_id');
  const type = url.searchParams.get('type');
  const limit = url.searchParams.get('limit') || 100;

  let sql = `SELECT mr.*, s.name as stall_name, u.name as reader_name
    FROM meter_readings mr LEFT JOIN stalls s ON mr.stall_id = s.id LEFT JOIN users u ON mr.read_by = u.id WHERE 1=1`;
  const params = [];
  if (periodId) { sql += ' AND mr.billing_period_id = ?'; params.push(periodId); }
  if (stallId) { sql += ' AND mr.stall_id = ?'; params.push(stallId); }
  if (type) { sql += ' AND mr.type = ?'; params.push(type); }
  sql += ' ORDER BY mr.read_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getReading(DB, id) {
  const row = await DB.prepare('SELECT * FROM meter_readings WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
  return Response.json({ data: row });
}

async function createReading(DB, context, user) {
  const contentType = context.request.headers.get('Content-Type') || '';
  let body;
  if (contentType.includes('multipart/form-data')) {
    const fd = await context.request.formData();
    body = Object.fromEntries(fd.entries());
    // Handle photo upload to D1 files table
    const photo = fd.get('photo');
    if (photo && photo.size > 0) {
      const fileId = 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      const buf = await photo.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await DB.prepare("INSERT INTO files (id, data, content_type) VALUES (?, ?, ?)").bind(fileId, base64, photo.type || 'image/jpeg').run();
      body.photo_key = fileId;
    }
  } else {
    body = await context.request.json();
  }

  const id = 'MR-' + Date.now().toString(36).toUpperCase();

  // Get previous reading for this stall+type
  const prev = await DB.prepare(
    `SELECT curr_reading FROM meter_readings WHERE stall_id = ? AND type = ? ORDER BY read_at DESC LIMIT 1`
  ).bind(body.stall_id, body.type).first();
  const prevReading = body.prev_reading ?? prev?.curr_reading ?? 0;

  await DB.prepare(
    `INSERT INTO meter_readings (id, stall_id, billing_period_id, type, prev_reading, curr_reading, photo_key, read_by, read_at, is_confirmed)
     VALUES (?,?,?,?,?,?,?,?,datetime('now'),0)`
  ).bind(id, body.stall_id, body.billing_period_id, body.type, prevReading, body.curr_reading, body.photo_key || null, user.id).run();

  await auditLog(context.env.DB, user.id, 'create', 'meter_readings', id, { stall: body.stall_id, type: body.type });
  return Response.json({ data: { id } }, { status: 201 });
}

async function updateReading(DB, context, id, user) {
  const contentType = context.request.headers.get('Content-Type') || '';
  let body;
  if (contentType.includes('multipart/form-data')) {
    const fd = await context.request.formData();
    body = Object.fromEntries(fd.entries());
    const photo = fd.get('photo');
    if (photo && photo.size > 0) {
      const fileId = 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      const buf = await photo.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await DB.prepare("INSERT INTO files (id, data, content_type) VALUES (?, ?, ?)").bind(fileId, base64, photo.type || 'image/jpeg').run();
      body.photo_key = fileId;
    }
  } else {
    body = await context.request.json();
  }

  const fields = []; const vals = [];
  for (const key of ['prev_reading', 'curr_reading', 'photo_key', 'is_confirmed']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูล' }, { status: 400 });
  vals.push(id);
  await DB.prepare(`UPDATE meter_readings SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return Response.json({ ok: true });
}

// ── Bills ──
async function listBills(DB, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const stallId = url.searchParams.get('stall_id');
  const periodId = url.searchParams.get('period_id');
  const limit = url.searchParams.get('limit') || 100;

  let sql = `SELECT b.*, s.name as stall_name,
    bp.year || '/' || bp.month as period_label
    FROM bills b LEFT JOIN stalls s ON b.stall_id = s.id
    LEFT JOIN billing_periods bp ON b.billing_period_id = bp.id WHERE 1=1`;
  const params = [];
  if (periodId) { sql += ' AND b.billing_period_id = ?'; params.push(periodId); }
  if (status) {
    const statuses = status.split(',');
    sql += ` AND b.status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  if (stallId) { sql += ' AND b.stall_id = ?'; params.push(stallId); }
  sql += ' ORDER BY b.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getBill(DB, id) {
  const row = await DB.prepare(
    `SELECT b.*, s.name as stall_name, bp.year || '/' || bp.month as period_label
     FROM bills b LEFT JOIN stalls s ON b.stall_id = s.id LEFT JOIN billing_periods bp ON b.billing_period_id = bp.id
     WHERE b.id = ?`
  ).bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบบิล' }, { status: 404 });
  return Response.json({ data: row });
}

async function issueBill(DB, id, user) {
  if (!['admin', 'staff'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  await DB.prepare("UPDATE bills SET status = 'issued', issued_at = datetime('now') WHERE id = ? AND status = 'draft'").bind(id).run();
  await auditLog(DB, user.id, 'issue', 'bills', id, null);

  // Create notification for stall owner
  const bill = await DB.prepare('SELECT * FROM bills WHERE id = ?').bind(id).first();
  if (bill) {
    const owner = await DB.prepare("SELECT id FROM users WHERE stall_id = ? AND role = 'stall_owner'").bind(bill.stall_id).first();
    if (owner) {
      const nid = 'NTF-' + Date.now().toString(36).toUpperCase();
      await DB.prepare(
        "INSERT INTO notifications (id, stall_id, user_id, type, title, message, created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
      ).bind(nid, bill.stall_id, owner.id, 'bill_issued', 'ใบแจ้งหนี้ใหม่',
        `มีใบแจ้งหนี้ ${id} ยอด ${bill.total_amount} บาท`).run();
    }
  }
  return Response.json({ ok: true });
}

// ── Generate Bills ──
async function generateBills(DB, request, user) {
  if (!['admin', 'staff'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const periodId = body.period_id;

  const period = await DB.prepare('SELECT * FROM billing_periods WHERE id = ?').bind(periodId).first();
  if (!period) return Response.json({ error: 'ไม่พบรอบบิล' }, { status: 404 });

  // Get active contracts
  const { results: contracts } = await DB.prepare(
    "SELECT c.*, s.name as stall_name FROM contracts c JOIN stalls s ON c.stall_id = s.id WHERE c.status = 'active'"
  ).all();

  let count = 0;
  for (const contract of contracts) {
    // Check if bill already exists
    const existing = await DB.prepare('SELECT id FROM bills WHERE stall_id = ? AND billing_period_id = ?')
      .bind(contract.stall_id, periodId).first();
    if (existing) continue;

    // Get meter readings
    const waterReading = await DB.prepare(
      "SELECT * FROM meter_readings WHERE stall_id = ? AND billing_period_id = ? AND type = 'water'"
    ).bind(contract.stall_id, periodId).first();

    const electricReading = await DB.prepare(
      "SELECT * FROM meter_readings WHERE stall_id = ? AND billing_period_id = ? AND type = 'electric'"
    ).bind(contract.stall_id, periodId).first();

    const waterUnits = waterReading ? Math.max(0, waterReading.curr_reading - waterReading.prev_reading) : 0;
    const electricUnits = electricReading ? Math.max(0, electricReading.curr_reading - electricReading.prev_reading) : 0;

    const waterAmount = waterUnits * period.water_rate;
    const electricAmount = electricUnits * period.electric_rate;
    const rentAmount = contract.monthly_rent || 0;
    const commonFee = contract.common_fee || 0;
    const totalAmount = rentAmount + waterAmount + electricAmount + commonFee;

    const billId = `BILL-${period.year}-${String(period.month).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;

    // Due date: 15th of next month
    const dueMonth = period.month === 12 ? 1 : period.month + 1;
    const dueYear = period.month === 12 ? (period.year - 543 + 1) : (period.year - 543);
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-15`;

    await DB.prepare(
      `INSERT INTO bills (id, stall_id, contract_id, billing_period_id, rent_amount, water_units, water_amount, electric_units, electric_amount, common_fee, total_amount, status, due_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(billId, contract.stall_id, contract.id, periodId, rentAmount, waterUnits, waterAmount, electricUnits, electricAmount, commonFee, totalAmount, 'draft', dueDate).run();

    count++;
  }

  await auditLog(DB, user.id, 'generate_bills', 'bills', periodId, { count });
  return Response.json({ data: { count } });
}
