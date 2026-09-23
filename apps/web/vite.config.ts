import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

// Read only these two public settings from the workspace env files. Do not pass the
// backend NODE_ENV or other secrets to Vite's client environment.
function publicBuildSettings(mode: string) {
  const workspace = new URL('../../', import.meta.url);
  let values: Record<string, string> = {};
  for (const file of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const location = new URL(file, workspace);
    if (existsSync(location)) {
      const parsed = parseEnv(readFileSync(location, 'utf8'));
      values = { ...values, VITE_SITE_URL: parsed.VITE_SITE_URL ?? values.VITE_SITE_URL, VITE_ALLOW_INDEXING: parsed.VITE_ALLOW_INDEXING ?? values.VITE_ALLOW_INDEXING };
    }
  }
  return {
    'import.meta.env.VITE_SITE_URL': JSON.stringify(process.env.VITE_SITE_URL ?? values.VITE_SITE_URL ?? ''),
    'import.meta.env.VITE_ALLOW_INDEXING': JSON.stringify(process.env.VITE_ALLOW_INDEXING ?? values.VITE_ALLOW_INDEXING ?? 'false'),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'safe-seo-preview',
    configurePreviewServer(server) {
      // Preview is never a production hosting service. It uses the same HTML
      // separation as production, but every response remains explicitly noindex.
      server.middlewares.use((request, response, next) => {
        response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        const publicFiles: Record<string, string> = { '/': 'index.html', '/privacy': 'privacy/index.html', '/consent': 'consent/index.html', '/limitations': 'limitations/index.html' };
        const privateRoute = /^\/(app(?:\/|$)|admin(?:\/|$)|login\/?$|register\/?$|forgot-password\/?$|reset-password\/?$)/.test(pathname);
        const key = pathname.replace(/\/+$/, '') || '/';
        let file = publicFiles[key] ?? (privateRoute ? 'app-shell.html' : null);
        if (!file && (request.headers.accept?.includes('text/html') ?? false) && !pathname.startsWith('/api/')) {
          response.statusCode = 404;
          file = '404.html';
        }
        if (!file) return next();
        const location = fileURLToPath(new URL(`./dist/${file}`, import.meta.url));
        if (!existsSync(location)) return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(location));
      });
    },
  }],
  define: publicBuildSettings(mode),
  server: { port: 5173, strictPort: true, headers: { 'X-Robots-Tag': 'noindex, nofollow' }, proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } } },
  build: { sourcemap: false },
}));
