
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = 5000;
const BACKEND_URL = 'http://localhost:8000';
const DIST_DIR = path.join(__dirname, 'dist');

console.log('🚀 Starting Production Server (Metro-Free)...');

// Aggressively kill Metro and Expo processes
const killMetroProcesses = () => {
  console.log('🔪 Killing all Metro/Expo/Node dev processes...');
  try {
    execSync('pkill -9 -f "metro" || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "expo" || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "expo-cli" || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "@expo/metro" || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "react-native" || true', { stdio: 'ignore' });
    console.log('✅ All dev processes terminated');
  } catch (err) {
    // Ignore errors - processes may not exist
  }
};

// Kill immediately on startup
killMetroProcesses();

// Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist directory not found!');
  console.error('📦 Building static files now...');
  console.error('Please wait, this may take 60-90 seconds...');
  try {
    execSync('npx expo export --platform web', { 
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('✅ Build complete!');
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

console.log('✅ Found pre-built files in dist/');
console.log('🌐 Starting Express server...');

// CORS middleware
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

// API proxy
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

// Serve static files
app.use(express.static(DIST_DIR, {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Production server started successfully!');
  console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`🔗 API proxy: /api/* -> ${BACKEND_URL}/api/*`);
  console.log(`📁 Static files: ${DIST_DIR}`);
  console.log('🚫 Metro bundler is DISABLED');
  console.log('');
});

// Kill Metro every 30 seconds as a safeguard
setInterval(() => {
  killMetroProcesses();
}, 30000);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  killMetroProcesses();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  killMetroProcesses();
  process.exit(0);
});
