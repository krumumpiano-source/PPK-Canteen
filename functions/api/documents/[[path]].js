/* PPK-Canteen — Documents API (R2 upload/download) */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB, BUCKET } = context.env;
  const user = context.data.user;

  if (path.length === 0 && method === 'GET') return listDocuments(DB, context.request);
  if (path.length === 0 && method === 'POST') return uploadDocument(DB, BUCKET, context.request, user);
  if (path.length === 1 && path[0] === 'download' && method === 'GET') return Response.json({ error: 'Use /api/upload/documents/{id}' }, { status: 400 });
  if (path.length === 1 && method === 'DELETE') return deleteDocument(DB, BUCKET, path[0], user);

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

async function uploadDocument(DB, BUCKET, request, user) {
  if (!['admin', 'finance'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file');
  const title = form.get('title') || '';
  const category = form.get('category') || 'general';

  if (!file) return Response.json({ error: 'ไม่พบไฟล์' }, { status: 400 });

  const id = 'DOC-' + Date.now().toString(36).toUpperCase();
  const ext = (file.name || '').split('.').pop() || 'bin';
  const r2Key = `documents/${id}.${ext}`;

  const buf = await file.arrayBuffer();
  await BUCKET.put(r2Key, buf, { httpMetadata: { contentType: file.type } });

  await DB.prepare(
    "INSERT INTO documents (id, title, category, file_name, file_type, file_size, r2_key, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  ).bind(id, title, category, file.name || 'file', file.type || 'application/octet-stream', buf.byteLength, r2Key, user.id).run();

  await auditLog(DB, user.id, 'create', 'documents', id, { title, category });
  return Response.json({ data: { id } }, { status: 201 });
}

async function deleteDocument(DB, BUCKET, id, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const doc = await DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

  if (doc.r2_key) { try { await BUCKET.delete(doc.r2_key); } catch(_){} }
  await DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
  await auditLog(DB, user.id, 'delete', 'documents', id, { title: doc.title });
  return Response.json({ ok: true });
}
