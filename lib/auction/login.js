/**
 * Magic-link / OTP issuance and verification.
 */

import crypto from 'node:crypto';
import { query } from './db.js';
import { hashToken } from './auth.js';
import { findOrCreateBidder } from './users.js';
import { apiError, ErrorCodes } from './errors.js';
import { sendAuctionEmail, shouldExposeDevOtp } from './email.js';
import { getSiteUrl } from './config.js';

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL = 5;

/**
 * @param {string} email
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * @param {string} email
 */
export async function assertLoginRateLimit(email) {
  const normalized = normalizeEmail(email);
  const { rows } = await query(
    `SELECT count(*)::int AS c
     FROM auction_login_tokens
     WHERE lower(email) = $1
       AND created_at > now() - interval '1 hour'`,
    [normalized]
  );
  if ((rows[0]?.c || 0) >= MAX_REQUESTS_PER_EMAIL) {
    throw apiError(ErrorCodes.RATE_LIMITED, 'Too many login requests. Try again later.');
  }
}

/**
 * Issue a 6-digit OTP (stored hashed). Returns raw token for email/dev.
 * @param {{ email: string, name?: string | null }} input
 */
export async function issueLoginToken(input) {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Valid email is required');
  }

  await assertLoginRateLimit(email);

  const raw = String(crypto.randomInt(100000, 999999));
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const name = input.name ? String(input.name).trim().slice(0, 120) : null;

  await query(
    `INSERT INTO auction_login_tokens (email, token_hash, name, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email, tokenHash, name, expiresAt.toISOString()]
  );

  // Best-effort email; do not create user until verify (avoids junk accounts).
  // Still try to email if user exists for personalization — skip Notification user_id requirement by using a stub path.
  // Notification table requires user_id — create/find user early so we can audit.
  const user = await findOrCreateBidder(email, name);
  const site = getSiteUrl();
  await sendAuctionEmail({
    userId: user.id,
    type: 'login_otp',
    to: email,
    subject: 'Your Hacker Dojo auction login code',
    text: [
      `Your one-time login code is: ${raw}`,
      '',
      `It expires in 15 minutes.`,
      `If you did not request this, you can ignore this email.`,
      '',
      `Auction: ${site}/auction/`,
    ].join('\n'),
    html: `<p>Your one-time login code is: <strong>${raw}</strong></p>
<p>It expires in 15 minutes.</p>
<p><a href="${site}/auction/">Hacker Dojo Silent Auction</a></p>`,
    meta: { purpose: 'login' },
  });

  return {
    email,
    userId: user.id,
    expiresAt,
    // Only returned when email is not configured / dev mode
    dev_otp: shouldExposeDevOtp() ? raw : undefined,
  };
}

/**
 * Verify OTP and return user (marks token used).
 * @param {{ email: string, token: string }} input
 */
export async function verifyLoginToken(input) {
  const email = normalizeEmail(input.email);
  const raw = String(input.token || '').trim();
  if (!email || !raw) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Email and code are required');
  }

  const tokenHash = hashToken(raw);
  const { rows } = await query(
    `SELECT id, email, name, expires_at, used_at
     FROM auction_login_tokens
     WHERE token_hash = $1
       AND lower(email) = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash, email]
  );

  const row = rows[0];
  if (!row || row.used_at) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid or expired code');
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid or expired code');
  }

  await query(
    `UPDATE auction_login_tokens SET used_at = now() WHERE id = $1`,
    [row.id]
  );

  const user = await findOrCreateBidder(email, row.name);
  return user;
}
