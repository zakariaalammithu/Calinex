const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SALT = 'calinex_salt_secure_2026';
const DEFAULT_HASH = 'c8297d09011a2511d0ef6e424fd735380ae1b06d3299586dfc778e3b8dd3749363631e480d3c24be2adc9dee97a1f12d7df9b33425b297df4c2bf8fa70e54892';

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. ADMIN AUTH LOGIN API (/api/admin/auth/login or /api/admin/login)
  if ((pathname === '/api/admin/auth/login' || pathname === '/api/admin/login') && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });

    let body = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else {
      await new Promise(r => {
        req.on('end', r);
        setTimeout(r, 200);
      });
      try { body = JSON.parse(bodyStr || '{}'); } catch(e) {}
    }

    const { email, password } = body;
    const defaultEmail = (process.env.ADMIN_EMAIL || 'hello@calinex.us').toLowerCase();

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Email and password are required' }));
    }

    let isValid = false;
    if (process.env.ADMIN_PASSWORD) {
      isValid = (email.trim().toLowerCase() === defaultEmail && password === process.env.ADMIN_PASSWORD);
    } else {
      const inputHash = crypto.scryptSync(password, SALT, 64).toString('hex');
      isValid = (email.trim().toLowerCase() === defaultEmail && inputHash === DEFAULT_HASH);
    }

    if (isValid) {
      const token = `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `calinex_session=${token}; Path=/; HttpOnly; SameSite=Lax`
      });
      return res.end(JSON.stringify({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: { name: 'MD Sharafat Ullah', email: defaultEmail, role_name: 'Super Admin' }
      }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Invalid email or password' }));
    }
  }

  // 2. PUBLIC FORM SUBMIT API (/api/public/submit-form)
  if (pathname === '/api/public/submit-form') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      });
      return res.end();
    }
    if (req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({
        success: true,
        message: 'Thank you! Your submission has been received!'
      }));
    }
  }

  // 3. FALLBACK TO FULL SERVER HANDLER
  try {
    const serverHandler = require('../server.js');
    return await serverHandler(req, res);
  } catch (err) {
    console.error('[VERCEL FALLBACK ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }
};
