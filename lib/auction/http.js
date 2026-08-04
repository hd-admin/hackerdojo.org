/**
 * HTTP helpers for Vercel-style auction handlers.
 */

import { ApiError, ErrorCodes } from './errors.js';
import { getCorsOrigins } from './config.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ methods?: string[] }} [opts]
 */
export function setCors(req, res, opts = {}) {
  const methods = (opts.methods || ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']).join(', ');
  const origins = getCorsOrigins();
  const origin = req.headers.origin;

  if (origin && origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (origins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origins.length === 1) {
    // Allow single configured origin even without Origin header echo
    res.setHeader('Access-Control-Allow-Origin', origins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * @param {import('http').ServerResponse} res
 * @param {unknown} err
 */
export function sendError(res, err) {
  if (err instanceof ApiError) {
    return json(res, err.status, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  console.error('[auction] unhandled error', err);
  return json(res, 500, {
    error: {
      code: ErrorCodes.SERVER_ERROR,
      message: 'Unexpected server error',
    },
  });
}

/**
 * Parse JSON body from Vercel/Node request.
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return /** @type {Record<string, unknown>} */ (req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body');
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
export function parseCookies(req) {
  const header = req.headers.cookie || '';
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge?: number, httpOnly?: boolean, secure?: boolean, sameSite?: string, path?: string }} [opts]
 */
export function setCookie(res, name, value, opts = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path || '/'}`,
    `SameSite=${opts.sameSite || 'Lax'}`,
  ];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false && process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  } else if (opts.secure) {
    parts.push('Secure');
  }
  const prev = res.getHeader('Set-Cookie');
  if (!prev) {
    res.setHeader('Set-Cookie', parts.join('; '));
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev, parts.join('; ')]);
  } else {
    res.setHeader('Set-Cookie', [String(prev), parts.join('; ')]);
  }
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} name
 */
export function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

/**
 * Wrap a handler with CORS + error mapping.
 * @param {(req: any, res: any) => Promise<void>} fn
 * @param {{ methods?: string[] }} [opts]
 */
export function withHandler(fn, opts = {}) {
  return async function handler(req, res) {
    setCors(req, res, opts);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    try {
      await fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}
