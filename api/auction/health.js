/**
 * GET /api/auction/health
 * Public: DB connectivity + schema presence.
 * With session + admin role: returns admin ping details.
 */

import { query } from '../../lib/auction/db.js';
import { getSessionUser } from '../../lib/auction/auth.js';
import { json, withHandler } from '../../lib/auction/http.js';

export default withHandler(async function health(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.end();
  }

  let dbOk = false;
  /** @type {string | null} */
  let schemaVersion = null;
  /** @type {string | null} */
  let dbError = null;

  try {
    await query('SELECT 1');
    dbOk = true;
    const mig = await query(
      `SELECT id FROM auction_schema_migrations ORDER BY applied_at DESC LIMIT 1`
    );
    schemaVersion = mig.rows[0]?.id ?? null;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db_error';
  }

  const user = await getSessionUser(req).catch(() => null);
  const isAdmin = user?.role === 'admin';

  return json(res, dbOk ? 200 : 503, {
    ok: dbOk,
    service: 'auction',
    slice: 0,
    database: dbOk ? 'up' : 'down',
    schema_version: schemaVersion,
    ...(dbError && !dbOk ? { error: dbError } : {}),
    ...(isAdmin
      ? {
          admin: {
            email: user.email,
            user_id: user.id,
            role: user.role,
          },
        }
      : {}),
    time: new Date().toISOString(),
  });
}, { methods: ['GET', 'OPTIONS'] });
