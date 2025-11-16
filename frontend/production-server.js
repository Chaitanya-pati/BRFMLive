const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const BACKEND_URL = 'http://localhost:8000';
const DIST_DIR = path.join(__dirname, 'dist');

console.log('🚀 Starting Production-Ready Server...');

// Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist directory not found!');
  console.error('Please run: cd frontend && npx expo export --platform web');
  process.exit(1);
}

console.log('✅ Found pre-built files in dist/');
console.log('🌐 Starting Express server...');

// CORS middleware to allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API proxy middleware - proxy all /api/* requests to backend
// Note: Express strips '/api' from req.path, so we prepend it back
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    return '/api' + path;
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 Proxying: ${req.method} ${req.originalUrl} -> ${BACKEND_URL}/api${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({ error: 'Backend service unavailable' });
  }
}));

// Serve static files from dist directory
app.use(express.static(DIST_DIR, {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Fallback to index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Production server started successfully!');
  console.log(`🌐 Server running at http://0.0.0.0:${PORT}`);
  console.log(`🔗 API proxy: /api/* -> ${BACKEND_URL}/api/*`);
  console.log(`📁 Serving static files from: ${DIST_DIR}`);
  console.log('🎉 No CORS issues - serving pre-built static files!');
  console.log('');
  console.log('💡 To rebuild the app, run: cd frontend && npx expo export --platform web');
});
