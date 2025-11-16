# PERMANENT CORS SOLUTION

## Problem
Expo's development server has built-in CORS middleware (`CorsMiddleware.ts`) that blocks requests from certain origins, even with `EXPO_OFFLINE=1` and other flags. This causes login and API requests to fail with:
```
Error: Unauthorized request from https://...replit.dev:5000
```

## The Permanent Solution
We've implemented a **production-ready approach** that completely bypasses Expo's dev server:

### How It Works
1. **Build Once**: The Expo web app is compiled to static files using `npx expo export --platform web`
2. **Serve Static Files**: An Express server serves the pre-built static files from the `dist/` directory
3. **No Expo Dev Server**: Since we're not using Expo's dev server at runtime, there's no CORS middleware to block requests
4. **API Proxy**: The Express server proxies `/api/*` requests to the FastAPI backend on port 8000

### Architecture
```
┌─────────────────────────────────────────┐
│  User's Browser (via Replit iframe)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Express Server (Port 5000)             │
│  ┌──────────────────────────────────┐  │
│  │ Static Files from dist/          │  │ ◄── Pre-built Expo app
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ API Proxy (/api/* → :8000/api/*) │  │
│  └──────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  FastAPI Backend (Port 8000)            │
│  - Login endpoint                        │
│  - All API endpoints                     │
└─────────────────────────────────────────┘
```

## Files

### frontend/production-server.js
This is the Express server that:
- Serves pre-built static files from `dist/`
- Proxies API requests to the backend
- Sets proper CORS headers
- Disables caching for development

### Workflow Configuration
```
Name: Frontend
Command: cd frontend && node production-server.js
Port: 5000 (webview)
```

## Making Changes to the Frontend

When you modify the React Native/Expo code, you need to rebuild:

```bash
cd frontend
npx expo export --platform web
```

Then restart the Frontend workflow to see your changes.

## Why This Works

1. **No Expo Dev Server Middleware**: The production build doesn't include Expo's security middleware
2. **Direct Static File Serving**: Express serves the files directly without any origin checks
3. **Proper CORS Headers**: We control the CORS headers ourselves
4. **API Proxy**: Backend requests go through our Express proxy, avoiding cross-origin issues

## Benefits

✅ **No More CORS Errors**: Ever. The Expo dev server middleware is completely removed from the equation.
✅ **Production-Ready**: This setup is closer to how the app would run in production.
✅ **Fast Loading**: Static files are served efficiently by Express.
✅ **Full Control**: We control all headers and caching behavior.
✅ **Reliable**: No more mysterious "Unauthorized request" errors.

## Drawbacks

⚠️ **Manual Rebuild Required**: When you make frontend code changes, you must rebuild the app manually.
⚠️ **Slower Development**: Building takes ~15-20 seconds, compared to hot reload in dev mode.

## Alternative: Development Mode with Hot Reload

If you need hot reload during active development, you can temporarily use:
```bash
cd frontend
npx expo start --web --port 5000
```

But for **stable, production-like testing**, always use the production server approach.

## Summary

This solution permanently eliminates CORS issues by serving pre-built static files instead of using Expo's development server. The app is now stable and ready for testing with all 6 users across 5 branches.
