/* PPK-Canteen — Inspections API (Round-based Committee System) */
import { auditLog } from '../_middleware.js';

export async function onRequest(context) {
  const path = context.params.path || [];
  const method = context.request.method;
  const { DB } = context.env;
  const user = context.data.user;

  // GET / — list inspection rounds
  if (path.length === 0 && method === 'GET') return listRounds(DB, context.request, user);
  // POST / — create inspection round (admin)
  if (path.length === 0 && method === 'POST') return createRound(DB, context.request, user);
  // GET /:id — round detail (RND-) or old inspection (INS-)
  if (path.length === 1 && method === 'GET') {
    if (path[0].startsWith('RND-')) return getRound(DB, path[0], user);
    return getOldInspection(DB, path[0], user);
  }
  // POST /:roundId/submit — inspector submits checklist
  if (path.length === 2 && path[1] === 'submit' && method === 'POST') return submitInspection(DB, context.request, path[0], user);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

// ── List Rounds ──
async function listRounds(DB, request, user) {
  const url = new URL(request.url);
  const stallId = url.searchParams.get('stall_id');

  if (user.role === 'stall_owner' && user.stall_id) {
    // Stall owner: completed rounds + old inspections without round_id (no inspector names)
    const { results: rounds } = await DB.prepare(
      `SELECT r.id, r.stall_id, s.name as stall_name, r.inspection_date, r.inspector_count,
       r.avg_score as score, r.result, r.status, 'round' as type, r.created_at
       FROM inspection_rounds r LEFT JOIN stalls s ON r.stall_id = s.id
       WHERE r.stall_id = ? AND r.status = 'completed'
       ORDER BY r.inspection_date DESC`
    ).bind(user.stall_id).all();
    const { results: oldInsp } = await DB.prepare(
      `SELECT i.id, i.stall_id, s.name as stall_name, i.inspection_date, 0 as inspector_count,
       i.score, i.result, 'completed' as status, 'single' as type, i.created_at
       FROM inspections i LEFT JOIN stalls s ON i.stall_id = s.id
       WHERE i.stall_id = ? AND i.round_id IS NULL
       ORDER BY i.inspection_date DESC`
    ).bind(user.stall_id).all();
    const combined = [...rounds, ...oldInsp].sort((a, b) =>
      (b.inspection_date || b.created_at || '').localeCompare(a.inspection_date || a.created_at || '')
    );
    return Response.json({ data: combined });
  }

  if (user.role === 'inspector') {
    // Inspector: rounds assigned to them
    const { results } = await DB.prepare(
      `SELECT r.id, r.stall_id, s.name as stall_name, r.inspection_date, r.inspector_count,
       r.avg_score as score, r.result, r.status, r.inspectors_json, r.created_at,
       (SELECT COUNT(*) FROM inspections i WHERE i.round_id = r.id) as submitted_count,
       (SELECT COUNT(*) FROM inspections i WHERE i.round_id = r.id AND i.inspected_by = ?) as my_submitted
       FROM inspection_rounds r LEFT JOIN stalls s ON r.stall_id = s.id
       WHERE instr(r.inspectors_json, ?) > 0
       ORDER BY r.inspection_date DESC`
    ).bind(user.id, user.id).all();
    return Response.json({ data: results });
  }

  // Admin / executive: all rounds
  let sql = `SELECT r.id, r.stall_id, s.name as stall_name, r.inspection_date, r.inspector_count,
    r.avg_score as score, r.result, r.status, r.inspectors_json, r.created_at,
    (SELECT COUNT(*) FROM inspections i WHERE i.round_id = r.id) as submitted_count
    FROM inspection_rounds r LEFT JOIN stalls s ON r.stall_id = s.id WHERE 1=1`;
  const params = [];
  if (stallId) { sql += ' AND r.stall_id = ?'; params.push(stallId); }
  sql += ' ORDER BY r.inspection_date DESC';
  const { results } = await DB.prepare(sql).bind(...params).all();
  return Response.json({ data: results });
}

// ── Create Round (admin only) ──
async function createRound(DB, request, user) {
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  if (!body.stall_id || !body.inspection_date || !body.inspector_count || !body.inspector_ids) {
    return Response.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }
  const count = parseInt(body.inspector_count);
  if (![3, 5].includes(count)) return Response.json({ error: 'จำนวนผู้ตรวจต้องเป็น 3 หรือ 5 คน' }, { status: 400 });
  const inspectorIds = Array.isArray(body.inspector_ids) ? body.inspector_ids : JSON.parse(body.inspector_ids);
  if (inspectorIds.length !== count) {
    return Response.json({ error: `กรุณาเลือกผู้ตรวจ ${count} คน` }, { status: 400 });
  }

  const id = 'RND-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    `INSERT INTO inspection_rounds (id, stall_id, inspection_date, inspector_count, inspectors_json, status, created_by)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(id, body.stall_id, body.inspection_date, count, JSON.stringify(inspectorIds), 'pending', user.id).run();

  // Notify each inspector
  const stall = await DB.prepare("SELECT name FROM stalls WHERE id = ?").bind(body.stall_id).first();
  for (const inspId of inspectorIds) {
    const nid = 'NTF-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5);
    await DB.prepare(
      "INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES (?,?,?,?,?,datetime('now'))"
    ).bind(nid, inspId, 'inspection_assigned',
      'มอบหมายตรวจสุขอนามัย',
      `คุณได้รับมอบหมายให้ตรวจร้าน "${stall?.name || '-'}" วันที่ ${body.inspection_date}`
    ).run();
  }

  await auditLog(DB, user.id, 'create', 'inspection_rounds', id, { stall: body.stall_id, count });
  return Response.json({ data: { id } }, { status: 201 });
}

// ── Get Round Detail ──
async function getRound(DB, id, user) {
  const round = await DB.prepare(
    `SELECT r.*, s.name as stall_name FROM inspection_rounds r LEFT JOIN stalls s ON r.stall_id = s.id WHERE r.id = ?`
  ).bind(id).first();
  if (!round) return Response.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
  if (user.role === 'stall_owner' && user.stall_id !== round.stall_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get submissions — never reveal inspector names
  const { results: submissions } = await DB.prepare(
    `SELECT i.id, i.score, i.checklist_json, i.notes, i.created_at
     FROM inspections i WHERE i.round_id = ? ORDER BY i.created_at`
  ).bind(id).all();
  round.submissions = submissions;
  return Response.json({ data: round });
}

// ── Inspector Submits Checklist ──
async function submitInspection(DB, request, roundId, user) {
  if (!['admin', 'inspector'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const round = await DB.prepare("SELECT * FROM inspection_rounds WHERE id = ?").bind(roundId).first();
  if (!round) return Response.json({ error: 'ไม่พบรอบตรวจ' }, { status: 404 });
  if (round.status === 'completed') return Response.json({ error: 'รอบตรวจนี้เสร็จสิ้นแล้ว' }, { status: 400 });

  const inspectors = JSON.parse(round.inspectors_json || '[]');
  if (!inspectors.includes(user.id)) return Response.json({ error: 'คุณไม่ได้รับมอบหมายในรอบตรวจนี้' }, { status: 403 });

  const existing = await DB.prepare("SELECT id FROM inspections WHERE round_id = ? AND inspected_by = ?").bind(roundId, user.id).first();
  if (existing) return Response.json({ error: 'คุณได้ส่งผลตรวจรอบนี้แล้ว' }, { status: 400 });

  const body = await request.json();
  const id = 'INS-' + Date.now().toString(36).toUpperCase();
  await DB.prepare(
    `INSERT INTO inspections (id, stall_id, inspected_by, inspection_date, score, checklist_json, result, notes, round_id)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(id, round.stall_id, user.id, round.inspection_date, body.score || 0, body.checklist_json || null, body.result || 'pass', body.notes || null, roundId).run();

  // Update round status
  if (round.status === 'pending') {
    await DB.prepare("UPDATE inspection_rounds SET status = 'in_progress' WHERE id = ?").bind(roundId).run();
  }

  // Check if all inspectors have submitted
  const { count } = await DB.prepare("SELECT COUNT(*) as count FROM inspections WHERE round_id = ?").bind(roundId).first();
  if (count >= round.inspector_count) {
    // Calculate average score
    const { avgScore } = await DB.prepare("SELECT AVG(score) as avgScore FROM inspections WHERE round_id = ?").bind(roundId).first();
    const avg = Math.round(avgScore * 10) / 10;
    const result = avg >= 80 ? 'pass' : avg >= 50 ? 'warning' : 'fail';

    await DB.prepare(
      "UPDATE inspection_rounds SET status = 'completed', avg_score = ?, result = ? WHERE id = ?"
    ).bind(avg, result, roundId).run();

    // Auto-create penalty if failed
    if (result === 'fail') {
      const penId = 'PEN-' + Date.now().toString(36).toUpperCase();
      await DB.prepare(
        "INSERT INTO penalties (id, stall_id, type, reason, issued_by, status) VALUES (?,?,?,?,?,?)"
      ).bind(penId, round.stall_id, 'warning',
        `ไม่ผ่านการตรวจสุขอนามัย (คะแนนเฉลี่ย ${avg}/100 จากผู้ตรวจ ${round.inspector_count} คน)`,
        user.id, 'active'
      ).run();
    }

    // Notify stall owner
    const owner = await DB.prepare("SELECT id FROM users WHERE stall_id = ? AND role = 'stall_owner'").bind(round.stall_id).first();
    if (owner) {
      const nid = 'NTF-' + Date.now().toString(36).toUpperCase();
      const resultText = result === 'pass' ? 'ผ่าน ✅' : result === 'warning' ? 'ต้องปรับปรุง ⚠️' : 'ไม่ผ่าน ❌';
      await DB.prepare(
        "INSERT INTO notifications (id, stall_id, user_id, type, title, message, created_at) VALUES (?,?,?,?,?,?,datetime('now'))"
      ).bind(nid, round.stall_id, owner.id, 'inspection', 'ผลตรวจสุขอนามัย',
        `คะแนนเฉลี่ย ${avg}/100 (ผู้ตรวจ ${round.inspector_count} คน) — ${resultText}`
      ).run();
    }
  }

  await auditLog(DB, user.id, 'create', 'inspections', id, { round: roundId, score: body.score });
  return Response.json({ data: { id, round_completed: count >= round.inspector_count } }, { status: 201 });
}

// ── Backward compat: get old inspection without round ──
async function getOldInspection(DB, id, user) {
  const row = await DB.prepare(
    'SELECT i.*, s.name as stall_name FROM inspections i LEFT JOIN stalls s ON i.stall_id = s.id WHERE i.id = ?'
  ).bind(id).first();
  if (!row) return Response.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });
  if (user.role === 'stall_owner' && user.stall_id && row.stall_id !== user.stall_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return Response.json({ data: row });
}
