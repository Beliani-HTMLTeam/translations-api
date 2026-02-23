import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { file } from 'bun';

import cors from '@elysiajs/cors';
import openapi from '@elysiajs/openapi';

import { prewarmStaticEndpoints } from './services/cache';
import { initDb, pruneOldRequests } from './utils/db';

import { getLocalLanIp } from './utils/network';
import { registerOther } from './utils/registerEndpoints';
import { registerDynamic } from './endpoints/dynamic/sheet_tab.endpoint';
import { registerAllAtOnce } from './endpoints/static/registerAllAtOnce';

import { resolve } from 'path';

const localIp = getLocalLanIp();

const frontendDist = resolve(process.cwd(), 'frontend/dist');
const indexHtml = resolve(frontendDist, 'index.html');

console.log('Serving frontend from:', frontendDist);

export const app = new Elysia({
  normalize: true,
})
  // automatic scalar documentation
  .use(
    openapi({
      path: 'docs',
    })
  )

  .use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['*'],
      maxAge: 86400,
      preflight: true,
    })
  )

  .get('/', () => file(indexHtml))
  // serve assets with /assets prefix (so /assets/index.js works)
  .use(
    staticPlugin({
      assets: resolve(frontendDist, 'assets'),
      prefix: '/assets'
    })
  )
  // serve other root files (like vite.svg, robots.txt) if needed, or just let them fall through if not critical
  .get('/vite.svg', () => file(resolve(frontendDist, 'vite.svg')))
  .get('/robots.txt', () => file(resolve(frontendDist, 'robots.txt')))

  .group('/dynamic/:year', (_dynamic) => {
    _dynamic.get(
      '/',
      () => {
        return {
          code: 200,
          message: 'Visit docs for API usage information @ /docs',
        };
      },
      {
        tags: ['Dynamic'],
        response: {
          200: t.Object({
            message: t.String(t.Literal('Visit docs for API usage information @ /docs')),
          }),
        },
      }
    );

    registerDynamic(_dynamic);

    return _dynamic;
  })

  .group('/static', (_static) => {
    _static.get(
      '/',
      () => {
        return {
          code: 200,
          message: 'Visit docs for API usage information @ /docs',
        };
      },
      {
        tags: ['Static'],
        response: {
          200: t.Object({
            message: t.String(t.Literal('Visit docs for API usage information @ /docs')),
          }),
        },
      }
    );

    registerAllAtOnce(_static);
    // register static groups from separate modules

    return _static;
  })

  .onError(({ code, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        code: 404,
        message: 'Endpoint not found',
        details: 'Please refer to /docs for the list of available endpoints.',
      };
    }
  });

registerOther(app);

// initialize sqlite persistence for metrics (if a sqlite driver is available)
// Note: initDb() is a no-op async function; DB initialization happens at module import time in db.ts
initDb();
// prune older than 30 days once a day
try {
  setInterval(() => pruneOldRequests(30), 24 * 60 * 60 * 1000);
} catch (e) {
  // ignore if timers not available
}

// Prewarm caches on startup (fire and forget, don't await at module level to avoid async module)
prewarmStaticEndpoints().catch((err) => {
  console.error('Error prewarming static endpoints:', err);
});

// Bind to all interfaces so the server is reachable from the LAN.
app.listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`-> Visit API docs @ http://${localIp}:3000/docs`);
