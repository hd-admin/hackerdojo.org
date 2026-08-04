/**
 * GET  /api/auction/auth/session  — current user (or null)
 * DELETE /api/auction/auth/session — log out
 *
 * Also supports GET /api/auction/me via alias path if needed later.
 */

import {
  getSessionUser,
  clearSessionCookie,
} from '../../../lib/auction/auth.js';
import { json, withHandler } from '../../../lib/auction/http.js';

export default withHandler(async function session(req, res) {
  if (req.method === 'GET') {
    const user = await getSessionUser(req);
    if (!user) {
      return json(res, 200, { user: null });
    }
    return json(res, 200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    res.statusCode = 204;
    return res.end();
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET, DELETE, OPTIONS');
  return res.end();
}, { methods: ['GET', 'DELETE', 'OPTIONS'] });
