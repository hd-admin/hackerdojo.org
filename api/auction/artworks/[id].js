/**
 * GET    /api/auction/artworks/:id — public detail
 * PATCH  /api/auction/artworks/:id — admin update
 * DELETE /api/auction/artworks/:id — admin delete draft
 */

import { getPublicArtworkDetail } from '../../../lib/auction/artworks.js';
import {
  patchArtwork,
  deleteDraftArtwork,
} from '../../../lib/auction/admin-artworks.js';
import { requireAdmin } from '../../../lib/auction/auth.js';
import { readJsonBody, json, withHandler } from '../../../lib/auction/http.js';
import { apiError, ErrorCodes } from '../../../lib/auction/errors.js';

function artworkId(req) {
  const id =
    req.query?.id ||
    (req.url && req.url.match(/\/artworks\/([^/?#]+)/)?.[1]) ||
    null;
  if (!id) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Missing artwork id');
  }
  return decodeURIComponent(String(id));
}

export default withHandler(async function artworkById(req, res) {
  const id = artworkId(req);

  if (req.method === 'GET') {
    const payload = await getPublicArtworkDetail(id);
    return json(res, 200, payload);
  }

  if (req.method === 'PATCH') {
    const admin = await requireAdmin(req);
    const body = await readJsonBody(req);
    const artwork = await patchArtwork(id, body, admin.id);
    return json(res, 200, { artwork });
  }

  if (req.method === 'DELETE') {
    const admin = await requireAdmin(req);
    await deleteDraftArtwork(id, admin.id);
    res.statusCode = 204;
    return res.end();
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET, PATCH, DELETE, OPTIONS');
  return res.end();
}, { methods: ['GET', 'PATCH', 'DELETE', 'OPTIONS'] });
