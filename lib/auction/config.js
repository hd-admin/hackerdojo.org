/**
 * Auction Space env config (server-only).
 * Do not import this from client-side / Jekyll assets.
 */

function required(name, value) {
  if (!value || String(value).trim() === '') {
    const err = new Error(`Missing required env: ${name}`);
    err.code = 'CONFIG_ERROR';
    throw err;
  }
  return String(value).trim();
}

function optional(value, fallback = '') {
  if (value == null || String(value).trim() === '') return fallback;
  return String(value).trim();
}

export function getDatabaseUrl() {
  return required('DATABASE_URL', process.env.DATABASE_URL);
}

export function getSessionSecret() {
  const secret = required('SESSION_SECRET', process.env.SESSION_SECRET);
  if (secret.length < 32) {
    const err = new Error('SESSION_SECRET must be at least 32 characters');
    err.code = 'CONFIG_ERROR';
    throw err;
  }
  return secret;
}

export function getAdminEmail() {
  return required('ADMIN_EMAIL', process.env.ADMIN_EMAIL).toLowerCase();
}

export function getAdminName() {
  return optional(process.env.ADMIN_NAME, 'Auction Admin');
}

export function getEmailApiKey() {
  return optional(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY, '');
}

export function getEmailFrom() {
  return optional(process.env.EMAIL_FROM, '');
}

export function getSiteUrl() {
  return optional(process.env.SITE_URL, 'https://hackerdojo.org').replace(/\/$/, '');
}

export function getCorsOrigins() {
  const raw = optional(process.env.CORS_ORIGIN, 'https://hackerdojo.org');
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCronSecret() {
  return optional(process.env.AUCTION_CRON_SECRET, '');
}

/** Cookie name for auction session */
export const SESSION_COOKIE = 'hd_auction_session';

/** Session TTL: 14 days */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
