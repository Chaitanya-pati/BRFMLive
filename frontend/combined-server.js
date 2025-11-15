#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 5000;

console.log('🚀 Starting Combined Frontend + API Proxy Server...');

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-Id']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frontend-proxy' });
});

// Proxy all /api requests to the backend at port 8000
app.use('/api', createProxyMiddleware({
  target: 'http://0.0.0.0:8000',
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Proxy] ${req.method} ${req.url} -> http://0.0.0.0:8000${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[API Proxy Error]', err.message);
    res.status(502).json({ 
      error: 'Backend API unavailable', 
      message: 'The backend server at port 8000 is not responding. Please ensure it is running.',
      details: err.message 
    });
  }
}));

// Proxy root / health check to backend
app.get('/', (req, res, next) => {
  // Check if this is an API health check (Accept: application/json)
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    const proxy = createProxyMiddleware({
      target: 'http://0.0.0.0:8000',
      changeOrigin: true
    });
    proxy(req, res, next);
  } else {
    next();
  }
});

// Start Expo Metro bundler as a child process
console.log('📦 Starting Expo Metro Bundler...');
console.log('⚙️  Security disabled with EXPO_NO_DEV_SERVER_SECURITY=1');
const expo = spawn('npx', ['expo', 'start', '--web', '--port', PORT.toString()], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { 
    ...process.env, 
    EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0',
    EXPO_NO_DEV_SERVER_SECURITY: '1',
    EXPO_NO_HTTPS: '1'
  }
});

expo.on('error', (error) => {
  console.error('❌ Failed to start Expo:', error);
  process.exit(1);
});

expo.on('exit', (code) => {
  console.log(`Expo process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  expo.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  expo.kill('SIGINT');
  process.exit(0);
});

console.log(`✅ Proxy server configured on port ${PORT}`);
console.log(`   - API requests (/api/*) will be proxied to http://localhost:8000`);
console.log(`   - Frontend will be served by Expo Metro`);
