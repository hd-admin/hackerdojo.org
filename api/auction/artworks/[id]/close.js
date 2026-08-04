/**
 * POST /api/auction/artworks/:id/close — admin close lot + set winner
 */

import { closeArtwork } from '../../../../lib/auction/admin-artworks.js';
import { requireAdmin } from '../../../../lib/auction/auth.js';
import { json, withHandler } from '../../../../lib/auction/http.js';
import { apiError, ErrorCodes } from '../../../../lib/auction/errors.js';

function artworkId(req) {
  // Vercel: /api/auction/artworks/:id/close
  const fromQuery = req.query?.id;
  if (fromQuery) return decodeURIComponent(String(fromQuery));
  const m = (req.url || '').match(/\/artworks\/([^/?#]+)\/close/);
  if (m) return decodeURIComponent(m[1]);
  throw apiError(ErrorCodes.VALIDATION_ERROR, 'Missing artwork id');
}

export default withHandler(async function closeHandler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }

  const admin = await requireAdmin(req);
  const id = artworkId(req);
  const artwork = await closeArtwork(id, {
    id: admin.id,
    email: admin.email,
  });
  return json(res, 200, { artwork });
}, { methods: ['POST', 'OPTIONS'] });
