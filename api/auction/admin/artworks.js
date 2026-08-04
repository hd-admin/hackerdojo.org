/**
 * GET /api/auction/admin/artworks — all statuses (admin)
 * Optional ?id= for single lot + bid list
 */

import {
  listAdminArtworks,
  listAdminBids,
} from '../../../lib/auction/admin-artworks.js';
import { getArtworkById, serializeArtworkDetail } from '../../../lib/auction/artworks.js';
import { requireAdmin } from '../../../lib/auction/auth.js';
import { json, withHandler } from '../../../lib/auction/http.js';

export default withHandler(async function adminArtworks(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.end();
  }

  await requireAdmin(req);

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const id = url.searchParams.get('id');

  if (id) {
    const row = await getArtworkById(id);
    const bids = await listAdminBids(id);
    return json(res, 200, {
      artwork: serializeArtworkDetail(row),
      bids,
    });
  }

  const artworks = await listAdminArtworks();
  return json(res, 200, { artworks });
}, { methods: ['GET', 'OPTIONS'] });
