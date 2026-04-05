/* PPK-Canteen — Biddings API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data?.user;

  // Public endpoints
  if (path[0] === 'public' && method === 'GET') return publicBiddings(DB, context.request);

  if (path.length === 0 && method === 'GET') return listBiddings(DB);
  if (path.length === 0 && method === 'POST') return createBidding(DB, context.request, user);
  if (path.length === 1 && method === 'GET') return getBidding(DB, path[0]);
  if (path.length === 1 && method === 'PUT') return updateBidding(DB, context.request, path[0], user);
  if (path[1] === 'applications' && method === 'GET') return listApplications(DB, path[0]);
  if (path[1] === 'applications' && method === 'POST') return submitApplication(DB, context, path[0]);
  if (path[1] === 'award' && method === 'POST') return awardBidding(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function publicBiddings(DB, request) {
  const { results } = await DB.prepare(
    "SELECT b.*, s.name as stall_name FROM biddings b LEFT JOIN stalls s ON b.stall_id = s.id WHERE b.status IN ('open','closed','awarded') ORDER BY b.open_date DESC"
  ).all();
  return Response.json({ data: results });
}

async function listBiddings(DB) {
  const { results } = await DB.prepare(
    `SELECT b.*, s.name as stall_name, (SELECT COUNT(*) FROM bid_applications WHERE bidding_id = b.id) as app_count
     FROM biddings b LEFT JOIN stalls s ON b.stall_id = s.id ORDER BY b.created_at DESC`
  ).all();
  return Response.json({ data: results });
}

async function getBidding(DB, id) {
  const row = await DB.prepare('SELECT b.*, s.name as stall_name FROM biddings b LEFT JOIN stalls s ON b.stall_id = s.id WHERE b.id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อมูลประมูล' }, { status: 404 });
  return Response.json({ data: row });
}

async function createBidding(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const id = 'BID-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    'INSERT INTO biddings (id, stall_id, title, description, min_price, open_date, close_date, status) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, body.stall_id, body.title, body.description || null, body.min_price || null, body.open_date, body.close_date, body.status || 'draft').run();
  await auditLog(DB, user.id, 'create', 'biddings', id, null);
  return Response.json({ data: { id } }, { status: 201 });
}

async function updateBidding(DB, request, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['title', 'description', 'min_price', 'open_date', 'close_date', 'status']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'ไม่มีข้อมูล' }, { status: 400 });
  vals.push(id);
  await DB.prepare(`UPDATE biddings SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return Response.json({ ok: true });
}

async function listApplications(DB, biddingId) {
  const { results } = await DB.prepare(
    'SELECT * FROM bid_applications WHERE bidding_id = ? ORDER BY submitted_at DESC'
  ).bind(biddingId).all();
  return Response.json({ data: results });
}

async function submitApplication(DB, context, biddingId) {
  const contentType = context.request.headers.get('Content-Type') || '';
  let body;
  if (contentType.includes('multipart/form-data')) {
    const fd = await context.request.formData();
    body = Object.fromEntries(fd.entries());
  } else {
    body = await context.request.json();
  }

  const bidding = await DB.prepare("SELECT * FROM biddings WHERE id = ? AND status = 'open'").bind(biddingId).first();
  if (!bidding) return Response.json({ error: 'การประมูลไม่เปิดรับสมัคร' }, { status: 400 });

  if (bidding.min_price && body.bid_price < bidding.min_price) {
    return Response.json({ error: `ราคาเสนอต้องไม่น้อยกว่า ${bidding.min_price} บาท` }, { status: 400 });
  }

  const id = 'APP-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    'INSERT INTO bid_applications (id, bidding_id, applicant_name, applicant_phone, bid_price, status) VALUES (?,?,?,?,?,?)'
  ).bind(id, biddingId, body.applicant_name, body.applicant_phone, body.bid_price, 'submitted').run();

  return Response.json({ data: { id } }, { status: 201 });
}

async function awardBidding(DB, request, biddingId, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const appId = body.application_id;

  // Update all apps to rejected, then set winner
  await DB.prepare("UPDATE bid_applications SET status = 'rejected' WHERE bidding_id = ?").bind(biddingId).run();
  await DB.prepare("UPDATE bid_applications SET status = 'awarded' WHERE id = ?").bind(appId).run();
  await DB.prepare("UPDATE biddings SET status = 'awarded' WHERE id = ?").bind(biddingId).run();

  await auditLog(DB, user.id, 'award', 'biddings', biddingId, { winner: appId });
  return Response.json({ ok: true });
}
