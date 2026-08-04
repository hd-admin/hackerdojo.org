#!/usr/bin/env node
/**
 * Local Auction API server for demos (no Vercel CLI required).
 * Loads .env.local / .env then routes /api/auction/* to handlers.
 *
 *   node scripts/auction-dev-server.js
 *   → http://127.0.0.1:3000
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  }
}

loadEnvFile();

/** @type {Array<{ match: (url: URL, method: string) => Record<string,string>|null, load: () => Promise<any> }>} */
const routes = [
  {
    match: (url, method) =>
      url.pathname === '/api/auction/health' && (method === 'GET' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/health.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/artworks' &&
      (method === 'GET' || method === 'POST' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/artworks.js')).href),
  },
  {
    match: (url, method) => {
      const m = url.pathname.match(/^\/api\/auction\/artworks\/([^/]+)\/close$/);
      if (m && (method === 'POST' || method === 'OPTIONS')) return { id: decodeURIComponent(m[1]) };
      return null;
    },
    load: () =>
      import(pathToFileURL(path.join(root, 'api/auction/artworks/[id]/close.js')).href),
  },
  {
    match: (url, method) => {
      const m = url.pathname.match(/^\/api\/auction\/artworks\/([^/]+)$/);
      if (
        m &&
        (method === 'GET' || method === 'PATCH' || method === 'DELETE' || method === 'OPTIONS')
      ) {
        return { id: decodeURIComponent(m[1]) };
      }
      return null;
    },
    load: () => import(pathToFileURL(path.join(root, 'api/auction/artworks/[id].js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/bids' && (method === 'POST' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/bids.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/me' && (method === 'GET' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/me.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/auth/request-link' &&
      (method === 'POST' || method === 'OPTIONS')
        ? {}
        : null,
    load: () =>
      import(pathToFileURL(path.join(root, 'api/auction/auth/request-link.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/auth/verify' && (method === 'POST' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/auth/verify.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/auth/session' &&
      (method === 'GET' || method === 'DELETE' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/auth/session.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/admin/artworks' &&
      (method === 'GET' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/admin/artworks.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/admin/ping' && (method === 'GET' || method === 'OPTIONS')
        ? {}
        : null,
    load: () => import(pathToFileURL(path.join(root, 'api/auction/admin/ping.js')).href),
  },
  {
    match: (url, method) =>
      url.pathname === '/api/auction/cron/ending-soon' &&
      (method === 'GET' || method === 'POST' || method === 'OPTIONS')
        ? {}
        : null,
    load: () =>
      import(pathToFileURL(path.join(root, 'api/auction/cron/ending-soon.js')).href),
  },
];

function wrapRes(res) {
  /** @type {Record<string, string|string[]>} */
  const headers = {};
  return {
    statusCode: 200,
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
      res.setHeader(k, v);
    },
    getHeader(k) {
      return headers[k.toLowerCase()] ?? res.getHeader(k);
    },
    end(body) {
      if (!res.headersSent) {
        res.statusCode = this.statusCode;
      }
      res.end(body);
    },
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const method = req.method || 'GET';

    for (const route of routes) {
      const params = route.match(url, method);
      if (params == null) continue;
      const mod = await route.load();
      const handler = mod.default;
      const fakeReq = Object.assign(req, {
        query: { ...Object.fromEntries(url.searchParams.entries()), ...params },
        url: url.pathname + url.search,
      });
      const fakeRes = wrapRes(res);
      await handler(fakeReq, fakeRes);
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No route' } }));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'SERVER_ERROR', message: err?.message || 'error' },
        })
      );
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Auction API listening on http://127.0.0.1:${PORT}`);
});
