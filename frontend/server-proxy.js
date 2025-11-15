const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 5000;

// Proxy all /api requests to the backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:8000${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Proxy root / for health check
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Only proxy specific paths, let others through
    if (path === '/' || path.startsWith('/api')) {
      return path;
    }
    return path;
  }
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Proxying /api requests to http://localhost:8000`);
});
