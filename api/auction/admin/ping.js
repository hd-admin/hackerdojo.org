/**
 * GET /api/auction/admin/ping
 * Authenticated admin health check (Slice 0 Done when).
 */

import { requireAdmin } from '../../../lib/auction/auth.js';
import { query } from '../../../lib/auction/db.js';
import { json, withHandler } from '../../../lib/auction/http.js';

export default withHandler(async function adminPing(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.end();
  }

  const admin = await requireAdmin(req);
  const { rows } = await query(
    `SELECT
       (SELECT count(*)::int FROM auction_users) AS users,
       (SELECT count(*)::int FROM auction_artworks) AS artworks,
       (SELECT count(*)::int FROM auction_bids) AS bids`
  );

  return json(res, 200, {
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    counts: rows[0],
    time: new Date().toISOString(),
  });
}, { methods: ['GET', 'OPTIONS'] });
