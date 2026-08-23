const crypto = require('node:crypto');
const { db } = require('./db');

/**
 * Hash password using native scrypt with a cryptographic salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Verify password against stored hash and salt
 */
function verifyPassword(password, storedHash, salt) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Create a new user session
 */
function createSession(userId, durationHours = 24, ipAddress = '', userAgent = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

  const insert = db.prepare(`
    INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(userId, token, expiresAt, ipAddress, userAgent);

  return { token, expiresAt };
}

/**
 * Destroy a session by token
 */
function destroySession(token) {
  const del = db.prepare('DELETE FROM sessions WHERE token = ?');
  del.run(token);
}

/**
 * Validate a session token and return user data
 */
function validateSession(token) {
  if (!token) return null;

  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.*, u.id as user_id, u.name, u.email, u.avatar, u.status as user_status,
           r.name as role_name, r.slug as role_slug, r.permissions
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'
  `).get(token, now);

  if (!session) return null;

  let permissions = [];
  try {
    permissions = JSON.parse(session.permissions || '[]');
  } catch (e) {
    permissions = [];
  }

  return {
    id: session.user_id,
    name: session.name,
    email: session.email,
    avatar: session.avatar,
    roleName: session.role_name,
    roleSlug: session.role_slug,
    permissions
  };
}

/**
 * Check if User has Required Permission
 * Supports wildcards: '*' (Super Admin), 'content.*', '*.view'
 */
function hasPermission(user, requiredPermission) {
  if (!user || !user.permissions) return false;
  const userPerms = user.permissions;

  if (userPerms.includes('*')) return true;
  if (userPerms.includes(requiredPermission)) return true;

  // Wildcard checks
  for (const p of userPerms) {
    if (p.endsWith('.*')) {
      const prefix = p.replace('.*', '');
      if (requiredPermission.startsWith(prefix + '.')) return true;
    }
    if (p.startsWith('*.') && requiredPermission.endsWith(p.replace('*.', ''))) {
      return true;
    }
  }

  return false;
}

/**
 * Log System & User Activity with Result
 */
function logActivity(userId, action, entityType = null, entityId = null, ipAddress = '', userAgent = '', details = '', result = 'success') {
  try {
    const insert = db.prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, details, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(userId || null, action, entityType, entityId, ipAddress, userAgent, details, result);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Parse cookies from request headers
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });

  return list;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  validateSession,
  hasPermission,
  logActivity,
  parseCookies
};
