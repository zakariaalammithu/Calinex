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

  if (pathname.startsWith('/api/public/')) {
    const { handlePublicApi } = require('../lib/api-public');
    return handlePublicApi(req, res);
  }

  if (pathname.startsWith('/api/admin/')) {
    const { handleAdminApi } = require('../lib/api-admin');
    return handleAdminApi(req, res);
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, status: 'CALINEX API Serverless Endpoint Active' }));
};
