/**
 * POST /api/auction/auth/request-link
 * Body: { email, name? }
 * Always returns generic ok to reduce enumeration; may include dev_otp in non-prod.
 */

import { issueLoginToken } from '../../../lib/auction/login.js';
import { readJsonBody, json, withHandler } from '../../../lib/auction/http.js';

export default withHandler(async function requestLink(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }

  const body = await readJsonBody(req);
  const result = await issueLoginToken({
    email: /** @type {string} */ (body.email),
    name: body.name ? String(body.name) : null,
  });

  return json(res, 200, {
    ok: true,
    message: 'If the email is valid, a login code was sent.',
    ...(result.dev_otp ? { dev_otp: result.dev_otp } : {}),
  });
}, { methods: ['POST', 'OPTIONS'] });
