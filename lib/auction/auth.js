/**
 * Session cookie auth (HMAC-signed payload).
 * Magic-link issue/verify lands in Slice 2; guards are ready for Slice 0+.
 */

import crypto from 'node:crypto';
import { query } from './db.js';
import {
  getSessionSecret,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from './config.js';
import { apiError, ErrorCodes } from './errors.js';
import { parseCookies, setCookie, clearCookie } from './http.js';

/**
 * @typedef {{ id: string, email: string, name: string | null, role: 'bidder' | 'admin' }} AuctionUser
 */

/**
 * @param {string} payload
 * @param {string} secret
 */
function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Create a signed session token for a user id.
 * @param {string} userId
 * @param {number} [maxAgeSeconds]
 */
export function createSessionToken(userId, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${userId}.${exp}`;
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

/**
 * @param {string | undefined} token
 * @returns {{ userId: string, exp: number } | null}
 */
export function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;
  const secret = getSessionSecret();
  const payload = `${userId}.${expStr}`;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return { userId, exp };
}

/**
 * @param {string} userId
 * @returns {Promise<AuctionUser | null>}
 */
export async function getUserById(userId) {
  const { rows } = await query(
    `SELECT id, email, name, role
     FROM auction_users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    role: rows[0].role,
  };
}

/**
 * @param {string} email
 * @returns {Promise<AuctionUser | null>}
 */
export async function getUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, name, role
     FROM auction_users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    role: rows[0].role,
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<AuctionUser | null>}
 */
export async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  const verified = verifySessionToken(token);
  if (!verified) return null;
  return getUserById(verified.userId);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<AuctionUser>}
 */
export async function requireUser(req) {
  const user = await getSessionUser(req);
  if (!user) {
    throw apiError(ErrorCodes.UNAUTHENTICATED, 'Login required');
  }
  return user;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<AuctionUser>}
 */
export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') {
    throw apiError(ErrorCodes.FORBIDDEN, 'Admin access required');
  }
  return user;
}

/**
 * @param {import('http').ServerResponse} res
 * @param {string} userId
 */
export function attachSessionCookie(res, userId) {
  const token = createSessionToken(userId);
  setCookie(res, SESSION_COOKIE, token, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
}

/**
 * @param {import('http').ServerResponse} res
 */
export function clearSessionCookie(res) {
  clearCookie(res, SESSION_COOKIE);
}

/**
 * Hash a raw login token for storage.
 * @param {string} rawToken
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
