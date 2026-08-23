module.exports = async (req, res) => {
  try {
    const serverHandler = require('../server.js');
    return await serverHandler(req, res);
  } catch (err) {
    console.error('[VERCEL HANDLER ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message,
        stack: err.stack,
        notice: 'Vercel Serverless Exception Caught'
      }));
    }
  }
};
