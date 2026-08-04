/**
 * GET  /api/auction/artworks — public list
 * POST /api/auction/artworks — admin create
 */

import { listPublicArtworks } from '../../lib/auction/artworks.js';
import { createArtwork } from '../../lib/auction/admin-artworks.js';
import { requireAdmin } from '../../lib/auction/auth.js';
import { readJsonBody, json, withHandler } from '../../lib/auction/http.js';
import { apiError, ErrorCodes } from '../../lib/auction/errors.js';

export default withHandler(async function artworks(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const status = url.searchParams.get('status') || 'active';
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    if (status && !['active', 'preview', 'closed', 'all_public'].includes(status)) {
      throw apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid status filter');
    }

    const artworks = await listPublicArtworks({
      status,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return json(res, 200, { artworks });
  }

  if (req.method === 'POST') {
    const admin = await requireAdmin(req);
    const body = await readJsonBody(req);
    const artwork = await createArtwork(body, admin.id);
    return json(res, 201, { artwork });
  }

  res.statusCode = 405;
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.end();
}, { methods: ['GET', 'POST', 'OPTIONS'] });
