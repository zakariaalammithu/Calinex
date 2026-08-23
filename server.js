const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleAdminApi } = require('./lib/api-admin');
const { handlePublicApi } = require('./lib/api-public');
const { validateSession, parseCookies } = require('./lib/auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = process.env.VERCEL ? process.cwd() : __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let reqPath = decodeURI(parsedUrl.pathname);

  // -------------------------------------------------------------
  // 1. PUBLIC API ROUTES (/api/public/*)
  // -------------------------------------------------------------
  if (reqPath.startsWith('/api/public/')) {
    handlePublicApi(req, res).catch(err => {
      console.error('Public API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Service temporarily unavailable' }));
    });
    return;
  }

  // -------------------------------------------------------------
  // 2. ADMIN API ROUTES (/api/admin/*)
  // -------------------------------------------------------------
  if (reqPath.startsWith('/api/admin/')) {
    handleAdminApi(req, res).catch(err => {
      console.error('Admin API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    });
    return;
  }

  // -------------------------------------------------------------
  // 3. ADMIN DASHBOARD & AUTH ROUTING
  // -------------------------------------------------------------
  if (reqPath === '/admin' || reqPath === '/admin/') {
    const cookies = parseCookies(req.headers['cookie']);
    const user = cookies.calinex_session ? validateSession(cookies.calinex_session) : null;
    res.writeHead(302, {
      'Location': user ? '/admin/dashboard' : '/admin/login',
      'Cache-Control': 'no-cache'
    });
    res.end();
    return;
  }

  if (reqPath === '/admin/login' || reqPath === '/admin/login.html') {
    const loginFile = path.join(PUBLIC_DIR, 'admin', 'login.html');
    serveStaticFile(res, loginFile, '.html');
    return;
  }

  if (reqPath === '/admin/dashboard' || reqPath === '/admin/dashboard.html') {
    const dashboardFile = path.join(PUBLIC_DIR, 'admin', 'index.html');
    serveStaticFile(res, dashboardFile, '.html');
    return;
  }

  // Admin static assets (/admin/css/..., /admin/js/...)
  if (reqPath.startsWith('/admin/')) {
    const relativeAdminPath = reqPath.replace(/^\/admin\//, '');
    const adminFilePath = path.join(PUBLIC_DIR, 'admin', relativeAdminPath);
    const ext = path.extname(adminFilePath).toLowerCase();
    serveStaticFile(res, adminFilePath, ext);
    return;
  }

  // -------------------------------------------------------------
  // 4. UPLOADS STATIC ROUTE (/uploads/*)
  // -------------------------------------------------------------
  if (reqPath.startsWith('/uploads/')) {
    const uploadFilePath = path.join(PUBLIC_DIR, reqPath);
    const ext = path.extname(uploadFilePath).toLowerCase();
    serveStaticFile(res, uploadFilePath, ext);
    return;
  }

  // -------------------------------------------------------------
  // 5. PUBLIC WEBSITE STATIC ROUTING (100% UNTOUCHED & PRESERVED)
  // -------------------------------------------------------------
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = resolveStaticPath(reqPath);
  const ext = path.extname(filePath).toLowerCase();
  serveStaticFile(res, filePath, ext);
});

function resolveStaticPath(reqPath) {
  let candidates = [
    path.join(PUBLIC_DIR, reqPath),
    path.join(__dirname, reqPath)
  ];

  if (!path.extname(reqPath)) {
    candidates.unshift(path.join(PUBLIC_DIR, reqPath + '.html'));
    candidates.unshift(path.join(__dirname, reqPath + '.html'));
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch(e) {}
  }

  return path.join(PUBLIC_DIR, reqPath);
}

function serveStaticFile(res, filePath, ext) {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(fileBuffer),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(fileBuffer);
      return;
    }
  } catch (err) {
    console.error('Error serving static file:', err);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

// Export request handler for Vercel Serverless Functions
module.exports = async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Serverless Execution Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
  }
};

// Run standalone server listeners ONLY in direct Node execution / local development
if (require.main === module && !process.env.VERCEL) {
  const ALT_PORT = 3001;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CALINEX server & Admin Dashboard running live at http://localhost:${PORT}`);
    console.log(`➔ Public Website (3000): http://localhost:${PORT}/`);
    console.log(`➔ Form Submission Endpoint: http://localhost:${PORT}/api/public/submit-form`);
    console.log(`➔ Admin Dashboard (3000): http://localhost:${PORT}/admin`);
  });

  const server3001 = http.createServer((req, res) => server.emit('request', req, res));
  server3001.listen(ALT_PORT, '0.0.0.0', () => {
    console.log(`CALINEX server (Dual Port) running live at http://localhost:${ALT_PORT}`);
    console.log(`➔ Public Website (3001): http://localhost:${ALT_PORT}/`);
    console.log(`➔ Admin Dashboard (3001): http://localhost:${ALT_PORT}/admin`);
  });
}
