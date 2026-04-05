/* PPK-Canteen — Auth API
   POST /api/auth/login
   POST /api/auth/logout
   POST /api/auth/set-password  (first-time setup via token)
   POST /api/auth/change-password
   GET  /api/auth/me
*/
import { signJWT, hashPassword, generateSalt, setTokenCookie, clearTokenCookie, auditLog } from '../_middleware.js';

export async function onRequest(context) {
  try {
    const action = (context.params.action || [])[0];
    const method = context.request.method;

    if (action === 'login' && method === 'POST') return await handleLogin(context);
    if (action === 'logout' && method === 'POST') return await handleLogout(context);
    if (action === 'set-password' && method === 'POST') return await handleSetPassword(context);
    if (action === 'change-password' && method === 'POST') return await handleChangePassword(context);
    if (action === 'me' && method === 'GET') return await handleMe(context);

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

async function handleLogin(context) {
  const { DB } = context.env;
  const secret = context.env.JWT_SECRET || 'ppk-canteen-dev-secret-2025';

  let body;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { phone, password } = body || {};
  if (!phone || !password) return Response.json({ error: 'กรุณากรอกเบอร์โทรและรหัสผ่าน' }, { status: 400 });

  // Sanitize phone
  const cleanPhone = String(phone).replace(/\D/g, '');

  const user = await DB.prepare('SELECT * FROM users WHERE phone = ?').bind(cleanPhone).first();
  if (!user) return Response.json({ error: 'เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  if (!user.is_active) return Response.json({ error: 'บัญชีนี้ถูกระงับ' }, { status: 403 });

  // Account lockout check
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until).getTime();
    if (Date.now() < lockTime) {
      const mins = Math.ceil((lockTime - Date.now()) / 60000);
      return Response.json({ error: `บัญชีถูกล็อค กรุณารอ ${mins} นาที` }, { status: 429 });
    }
    // Lock expired — reset
    await DB.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').bind(user.id).run();
    user.failed_attempts = 0;
  }

  // Check if password is set
  if (!user.password_hash || !user.salt) {
    if (user.setup_token) {
      return Response.json({ error: 'กรุณาตั้งรหัสผ่านก่อนเข้าระบบ', needSetup: true }, { status: 403 });
    }
    return Response.json({ error: 'ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแล' }, { status: 403 });
  }

  // Verify password
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    const attempts = (user.failed_attempts || 0) + 1;
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await DB.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?').bind(attempts, lockUntil, user.id).run();
      return Response.json({ error: 'ป้อนรหัสผิดเกิน 5 ครั้ง บัญชีถูกล็อค 15 นาที' }, { status: 429 });
    }
    await DB.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').bind(attempts, user.id).run();
    return Response.json({ error: `เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง (เหลือ ${5 - attempts} ครั้ง)` }, { status: 401 });
  }

  // Success — reset lockout, sign JWT, set cookie
  await DB.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = datetime(\'now\') WHERE id = ?').bind(user.id).run();

  const token = await signJWT({ sub: user.id, role: user.role }, secret);
  await auditLog(DB, user.id, 'login', 'users', user.id, null);

  const userData = { id: user.id, name: user.name, phone: user.phone, role: user.role, stall_id: user.stall_id, email: user.email };

  return Response.json({ data: userData }, {
    headers: { 'Set-Cookie': setTokenCookie(token), 'Content-Type': 'application/json' }
  });
}

async function handleLogout(context) {
  const user = context.data?.user;
  if (user) {
    await auditLog(context.env.DB, user.id, 'logout', 'users', user.id, null);
  }
  return Response.json({ ok: true }, {
    headers: { 'Set-Cookie': clearTokenCookie(), 'Content-Type': 'application/json' }
  });
}

async function handleSetPassword(context) {
  const { DB } = context.env;
  const secret = context.env.JWT_SECRET || 'ppk-canteen-dev-secret-2025';

  let body;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { phone, setup_token, password } = body || {};
  if (!phone || !setup_token || !password) {
    return Response.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  const user = await DB.prepare('SELECT * FROM users WHERE phone = ? AND setup_token = ?').bind(cleanPhone, setup_token).first();
  if (!user) return Response.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  if (!user.is_active) return Response.json({ error: 'บัญชีนี้ถูกระงับ' }, { status: 403 });

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  await DB.prepare(
    'UPDATE users SET password_hash = ?, salt = ?, setup_token = NULL, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(hash, salt, user.id).run();

  const token = await signJWT({ sub: user.id, role: user.role }, secret);
  await auditLog(DB, user.id, 'set_password', 'users', user.id, null);

  const userData = { id: user.id, name: user.name, phone: user.phone, role: user.role, stall_id: user.stall_id, email: user.email };

  return Response.json({ data: userData }, {
    headers: { 'Set-Cookie': setTokenCookie(token), 'Content-Type': 'application/json' }
  });
}

async function handleChangePassword(context) {
  const { DB } = context.env;
  const user = context.data?.user;
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { current_password, new_password } = body || {};
  if (!current_password || !new_password) return Response.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  if (new_password.length < 8) return Response.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });

  const fullUser = await DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
  const currentHash = await hashPassword(current_password, fullUser.salt);
  if (currentHash !== fullUser.password_hash) {
    return Response.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(new_password, newSalt);
  await DB.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(newHash, newSalt, user.id).run();
  await auditLog(DB, user.id, 'change_password', 'users', user.id, null);

  return Response.json({ ok: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
}

async function handleMe(context) {
  const user = context.data?.user;
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ data: user });
}
