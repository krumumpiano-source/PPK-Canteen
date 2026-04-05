/* PPK-Canteen — Menus + Price Changes API */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data?.user;

  // Public
  if (path[0] === 'public' && method === 'GET') return publicMenus(DB);

  if (path.length === 0 && method === 'GET') return listMenus(DB, context.request, user);
  if (path.length === 0 && method === 'POST') return createMenu(DB, context.request, user);
  if (path.length === 1 && path[0] === 'price-changes' && method === 'GET') return listPriceChanges(DB, context.request);
  if (path.length === 1 && path[0] === 'price-changes' && method === 'POST') return createPriceChange(DB, context.request, user);
  if (path.length === 2 && path[0] === 'price-changes' && method === 'PUT') return updatePriceChange(DB, context.request, path[1], user);
  if (path.length === 1 && method === 'GET') return getMenu(DB, path[0]);
  if (path.length === 1 && method === 'PUT') return updateMenu(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function publicMenus(DB) {
  const { results } = await DB.prepare(
    "SELECT m.*, s.name as stall_name FROM menus m LEFT JOIN stalls s ON m.stall_id = s.id WHERE m.is_available = 1 ORDER BY s.name, m.category, m.name"
  ).all();
  return Response.json({ data: results });
}

async function listMenus(DB, request, user) {
  const url = new URL(request.url);
  const stallId = url.searchParams.get('stall_id');
  let sql = 'SELECT m.*, s.name as stall_name FROM menus m LEFT JOIN stalls s ON m.stall_id = s.id WHERE 1=1';
  const params = [];
  if (stallId) { sql += ' AND m.stall_id = ?'; params.push(stallId); }
  if (user.role === 'stall_owner' && user.stall_id) { sql += ' AND m.stall_id = ?'; params.push(user.stall_id); }
  sql += ' ORDER BY m.stall_id, m.category, m.name';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function getMenu(DB, id) {
  const row = await DB.prepare('SELECT * FROM menus WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบเมนู' }, { status: 404 });
  return Response.json({ data: row });
}

async function createMenu(DB, request, user) {
  const body = await request.json();
  if (!body.name || !body.price) return Response.json({ error: 'กรุณากรอกชื่อและราคา' }, { status: 400 });

  // Check max price
  const maxPrice = await DB.prepare("SELECT value FROM settings WHERE key = 'max_food_price'").first();
  if (maxPrice && Number(body.price) > Number(maxPrice.value)) {
    return Response.json({ error: `ราคาเกินเพดานสูงสุด (${maxPrice.value} บาท)` }, { status: 400 });
  }

  // Check blacklisted items
  const blacklist = await DB.prepare("SELECT value FROM settings WHERE key = 'blacklisted_items'").first();
  if (blacklist) {
    try {
      const items = JSON.parse(blacklist.value);
      const nameLower = body.name.toLowerCase();
      for (const item of items) {
        if (nameLower.includes(item.toLowerCase())) {
          return Response.json({ error: `"${item}" อยู่ในรายการห้ามจำหน่าย` }, { status: 400 });
        }
      }
    } catch {}
  }

  const id = 'MNU-' + Date.now().toString(36).toUpperCase();
  const stallId = body.stall_id || (user.role === 'stall_owner' ? user.stall_id : null);
  await DB.prepare(
    "INSERT INTO menus (id, stall_id, name, price, category, is_available) VALUES (?,?,?,?,?,?)"
  ).bind(id, stallId, body.name, body.price, body.category || null, body.is_available !== undefined ? body.is_available : 1).run();
  return Response.json({ data: { id } }, { status: 201 });
}

async function updateMenu(DB, request, id, user) {
  const body = await request.json();
  const fields = []; const vals = [];
  for (const key of ['name', 'price', 'category', 'is_available']) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
  }
  fields.push("updated_at = datetime('now')");
  vals.push(id);
  await DB.prepare(`UPDATE menus SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return Response.json({ ok: true });
}

async function listPriceChanges(DB, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  let sql = `SELECT pc.*, m.name as menu_name, s.name as stall_name
    FROM price_change_logs pc LEFT JOIN menus m ON pc.menu_id = m.id LEFT JOIN stalls s ON m.stall_id = s.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND pc.status = ?'; params.push(status); }
  sql += ' ORDER BY pc.changed_at DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function createPriceChange(DB, request, user) {
  const body = await request.json();

  // Check max price
  const maxPrice = await DB.prepare("SELECT value FROM settings WHERE key = 'max_food_price'").first();
  let status = 'pending';
  if (maxPrice && Number(body.new_price) > Number(maxPrice.value)) {
    status = 'auto_rejected';
  }

  const id = 'PRC-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    'INSERT INTO price_change_logs (id, menu_id, old_price, new_price, changed_by, status) VALUES (?,?,?,?,?,?)'
  ).bind(id, body.menu_id, body.old_price, body.new_price, user.id, status).run();

  if (status === 'auto_rejected') {
    return Response.json({ error: `ราคาเกินเพดานสูงสุด (${maxPrice.value} บาท) คำขอถูกปฏิเสธอัตโนมัติ` }, { status: 400 });
  }
  return Response.json({ data: { id } }, { status: 201 });
}

async function updatePriceChange(DB, request, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  await DB.prepare(
    "UPDATE price_change_logs SET status = ?, approved_by = ?, approved_at = datetime('now'), reject_reason = ? WHERE id = ?"
  ).bind(body.status, user.id, body.reject_reason || null, id).run();

  // If approved, update menu price
  if (body.status === 'approved') {
    const pc = await DB.prepare('SELECT * FROM price_change_logs WHERE id = ?').bind(id).first();
    if (pc) {
      await DB.prepare("UPDATE menus SET price = ?, updated_at = datetime('now') WHERE id = ?").bind(pc.new_price, pc.menu_id).run();
    }
  }
  return Response.json({ ok: true });
}
