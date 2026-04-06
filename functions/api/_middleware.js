/* PPK-Canteen — API Middleware: JWT Auth + RBAC */

const PUBLIC_PREFIXES = ['/api/auth/login', '/api/auth/set-password', '/api/biddings/public', '/api/menus/public', '/api/complaints/public'];

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  const jwtSecret = context.env.JWT_SECRET;

  // CORS for same-origin (Pages Functions are same origin, but just in case)
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Public endpoints — no auth required
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return addCors(await context.next());
  }

  // Get JWT from httpOnly cookie
  const cookie = context.request.headers.get('Cookie') || '';
  const token = parseCookie(cookie, 'ppk_token');

  if (!token) {
    return Response.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401, headers: corsHeaders() });
  }

  if (!jwtSecret) {
    return Response.json({ error: 'ระบบยังไม่พร้อมใช้งาน (JWT secret not configured)' }, { status: 500, headers: corsHeaders() });
  }

  // Verify JWT
  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return Response.json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' }, { status: 401, headers: corsHeaders() });
  }

  // Load user from DB
  const user = await context.env.DB.prepare(
    'SELECT id, phone, name, role, stall_id, email, is_active FROM users WHERE id = ? AND is_active = 1'
  ).bind(payload.sub).first();

  if (!user) {
    return Response.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 401, headers: corsHeaders() });
  }

  context.data = context.data || {};
  context.data.user = user;

  return addCors(await context.next());
}

// ── JWT Utilities (HS256 via Web Crypto) ──
function b64url(data) {
  if (data instanceof ArrayBuffer) data = new Uint8Array(data);
  if (data instanceof Uint8Array) {
    let s = ''; for (const b of data) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signJWT(payload, secret, expiresInSec = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  payload.iat = now;
  payload.exp = now + expiresInSec;

  const segments = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(segments));
  return segments + '.' + b64url(sig);
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const key = await getHmacKey(secret);
    const sigBytes = Uint8Array.from(b64urlDecode(parts[2]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!valid) return null;

    const payload = JSON.parse(b64urlDecode(parts[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password Hashing (PBKDF2-SHA256, 100K iterations — CF Workers max) ──
export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return b64url(bits);
}

export function generateSalt() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

// ── Cookie Parser ──
function parseCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}

export function setTokenCookie(token, maxAge = 7 * 24 * 3600) {
  return `ppk_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearTokenCookie() {
  return `ppk_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// ── Helpers ──
function corsHeaders() {
  return { 'Content-Type': 'application/json' };
}

function addCors(response) {
  const newResp = new Response(response.body, response);
  if (!newResp.headers.has('Content-Type')) {
    newResp.headers.set('Content-Type', 'application/json');
  }
  return newResp;
}

// ── Audit Logger ──
export async function auditLog(DB, userId, action, targetTable, targetId, details) {
  const id = 'LOG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  await DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, target_table, target_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
  ).bind(id, userId, action, targetTable, targetId, details ? JSON.stringify(details) : null).run();
}
