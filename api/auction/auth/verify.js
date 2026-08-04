/**
 * POST /api/auction/auth/verify
 * Body: { email, token }
 * Sets session cookie and returns user.
 */

import { verifyLoginToken } from '../../../lib/auction/login.js';
import { attachSessionCookie } from '../../../lib/auction/auth.js';
import { readJsonBody, json, withHandler } from '../../../lib/auction/http.js';

export default withHandler(async function verify(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }

  const body = await readJsonBody(req);
  const user = await verifyLoginToken({
    email: /** @type {string} */ (body.email),
    token: /** @type {string} */ (body.token),
  });

  attachSessionCookie(res, user.id);

  return json(res, 200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}, { methods: ['POST', 'OPTIONS'] });
