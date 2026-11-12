import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Defense-in-depth: prevent any device-control writes via the development proxy.
function readOnlyBridge(): Plugin {
  const routes = new Set([
    '/bridge/wcs/api/crane/status',
    '/bridge/wcs/api/tasks',
    '/bridge/wms/api/wms/inventory',
  ]);
  return {
    name: 'wm-warehouse-read-only-bridge',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (path.startsWith('/bridge/')) {
          if (req.method !== 'GET' || !routes.has(path)) {
            res.statusCode = 403;
            res.end('WM Warehouse proxy permits three read-only GET endpoints only.');
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // GitHub project pages are served from /wm-warehouse/, not the domain root.
    base: mode === 'production' ? '/wm-warehouse/' : '/',
    plugins: [readOnlyBridge(), react()],
    server: {
      host: '127.0.0.1', port: 3000, strictPort: true,
      proxy: {
        '/bridge/wcs': {
          target: env.WCS_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/bridge\/wcs/, ''),
        },
        '/bridge/wms': {
          target: env.WMS_PROXY_TARGET || 'http://127.0.0.1:8081',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/bridge\/wms/, ''),
        },
      },
    },
    preview: { host: '127.0.0.1', port: 4173 },
  };
});
