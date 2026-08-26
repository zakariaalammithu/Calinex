const crypto = require('crypto');

const SALT = 'calinex_salt_secure_2026';
const DEFAULT_HASH = crypto.scryptSync('Calinexusa123', SALT, 64).toString('hex');

function parseServerlessBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try { return resolve(JSON.parse(req.body)); } catch(e) { return resolve({}); }
    }
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { resolve(JSON.parse(data || '{}')); } catch(e) { resolve({}); }
    };

    req.on('data', chunk => { data += chunk; });
    req.on('end', finish);
    req.on('error', finish);

    if (req.readableEnded || req.complete) {
      finish();
    } else {
      setTimeout(finish, 100);
    }
  });
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Serve sitemap.xml and robots.txt
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    const fs = require('fs');
    const path = require('path');
    const file = pathname === '/sitemap.xml' ? 'sitemap.xml' : 'robots.txt';
    const type = pathname === '/sitemap.xml' ? 'application/xml' : 'text/plain';
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      res.setHeader('Content-Type', type);
      return res.status(200).send(content);
    } catch(e) {
      return res.status(404).send('Not Found');
    }
  }

  // 1. ADMIN AUTH LOGIN API (/api/admin/auth/login or /api/admin/login)
  if ((pathname === '/api/admin/auth/login' || pathname === '/api/admin/login') && req.method === 'POST') {
    const body = await parseServerlessBody(req);
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

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, status: 'CALINEX API Serverless Endpoint Active' }));
};
