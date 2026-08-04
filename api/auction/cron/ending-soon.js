/**
 * POST /api/auction/cron/ending-soon
 * Secured by AUCTION_CRON_SECRET (Authorization: Bearer … or x-cron-secret).
 *
 * Runs ending-soon notices + auto-close for lots past ends_at.
 */

import { getCronSecret } from '../../../lib/auction/config.js';
import { runAuctionCron } from '../../../lib/auction/cron.js';
import { apiError, ErrorCodes } from '../../../lib/auction/errors.js';
import { json, withHandler } from '../../../lib/auction/http.js';

function authorize(req) {
  // Prefer AUCTION_CRON_SECRET; also accept Vercel platform CRON_SECRET.
  const expected =
    getCronSecret() ||
    (process.env.CRON_SECRET ? String(process.env.CRON_SECRET).trim() : '');
  if (!expected) {
    throw apiError(
      ErrorCodes.CONFIG_ERROR,
      'AUCTION_CRON_SECRET (or CRON_SECRET) is not configured'
    );
  }
  const header =
    req.headers['x-cron-secret'] ||
    req.headers['authorization'] ||
    req.headers['Authorization'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) {
    throw apiError(ErrorCodes.UNAUTHENTICATED, 'Missing cron secret');
  }
  const token = String(raw).startsWith('Bearer ')
    ? String(raw).slice(7).trim()
    : String(raw).trim();
  if (token !== expected) {
    throw apiError(ErrorCodes.FORBIDDEN, 'Invalid cron secret');
  }
}

export default withHandler(async function endingSoonCron(req, res) {
  // Allow GET for Vercel Cron (sends GET by default)
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.end();
  }

  authorize(req);
  const result = await runAuctionCron();
  return json(res, 200, { ok: true, ...result });
}, { methods: ['GET', 'POST', 'OPTIONS'] });
