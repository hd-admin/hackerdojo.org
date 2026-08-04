/**
 * GET /api/auction/me
 * Authenticated current user.
 */

import { requireUser } from '../../lib/auction/auth.js';
import { json, withHandler } from '../../lib/auction/http.js';

export default withHandler(async function me(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.end();
  }

  const user = await requireUser(req);
  return json(res, 200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}, { methods: ['GET', 'OPTIONS'] });
