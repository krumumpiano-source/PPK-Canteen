/* PPK-Canteen — Documents API (D1 file storage) */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listDocuments(DB, context.request);
  if (path.length === 0 && method === 'POST') return uploadDocument(DB, context.request, user);
  if (path.length === 1 && method === 'DELETE') return deleteDocument(DB, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

async function listDocuments(DB, request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  let sql = 'SELECT d.*, u.name as uploaded_by_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id';
  const params = [];
  if (category) { sql += ' WHERE d.category = ?'; params.push(category); }
  sql += ' ORDER BY d.created_at DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

async function uploadDocument(DB, request, user) {
  if (!['admin', 'finance'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file');
  const title = form.get('title') || '';
  const category = form.get('category') || 'general';

  if (!file) return Response.json({ error: 'ไม่พบไฟล์' }, { status: 400 });

  const id = 'DOC-' + Date.now().toString(36).toUpperCase();
  const buf = await file.arrayBuffer();

  // Store file in D1 files table as base64
  const fileId = 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  await DB.prepare("INSERT INTO files (id, data, content_type) VALUES (?, ?, ?)").bind(fileId, base64, file.type || 'application/octet-stream').run();

  await DB.prepare(
    "INSERT INTO documents (id, title, category, file_name, file_type, file_size, r2_key, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  ).bind(id, title, category, file.name || 'file', file.type || 'application/octet-stream', buf.byteLength, fileId, user.id).run();

  await auditLog(DB, user.id, 'create', 'documents', id, { title, category });
  return Response.json({ data: { id } }, { status: 201 });
}

async function deleteDocument(DB, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const doc = await DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

  if (doc.r2_key) { try { await DB.prepare('DELETE FROM files WHERE id = ?').bind(doc.r2_key).run(); } catch(_){} }
  await DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
  await auditLog(DB, user.id, 'delete', 'documents', id, { title: doc.title });
  return Response.json({ ok: true });
}
