/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { handleEphemerisRequest } from './server/ephemeris/handler.js';

/**
 * Serves the same handler as the Vercel function (`api/ephemeris.ts`) during
 * `vite dev` and `vite preview`, so the app works locally without `vercel dev`.
 */
function localApiPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/ephemeris')) {
      next();
      return;
    }
    forward(req, res).catch(next);
  };
  return {
    name: 'clps-local-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method,
    signal: controller.signal,
  });
  const response = await handleEphemerisRequest(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(req.method === 'HEAD' ? undefined : await response.text());
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  test: {
    include: ['{src,server,shared,api}/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
