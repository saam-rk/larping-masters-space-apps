/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { handleEphemerisRequest } from './server/ephemeris/handler.js';
import { handleSkySearchRequest } from './server/skySearch/handler.js';

/** Local routes and the handlers of their Vercel functions (`api/*.ts`). */
const LOCAL_ROUTES: ReadonlyArray<readonly [string, (request: Request) => Promise<Response>]> = [
  ['/api/ephemeris', handleEphemerisRequest],
  ['/api/sky-search', handleSkySearchRequest],
];

/**
 * Serves the same handlers as the Vercel functions (`api/*.ts`) during
 * `vite dev` and `vite preview`, so the app works locally without `vercel dev`.
 */
function localApiPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url?.split('?')[0];
    const handler = LOCAL_ROUTES.find(([route]) => path === route)?.[1];
    if (!handler) {
      next();
      return;
    }
    forward(req, res, handler).catch(next);
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

async function forward(
  req: IncomingMessage,
  res: ServerResponse,
  handler: (request: Request) => Promise<Response>,
): Promise<void> {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method,
    signal: controller.signal,
  });
  const response = await handler(request);
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
