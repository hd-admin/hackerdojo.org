/**
 * POST /api/auction/bids
 * Body: { artwork_id | auction_id, amount }
 */

import { requireUser } from '../../lib/auction/auth.js';
import { placeBid } from '../../lib/auction/bids.js';
import { readJsonBody, json, withHandler } from '../../lib/auction/http.js';
import { apiError, ErrorCodes } from '../../lib/auction/errors.js';

export default withHandler(async function bids(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }

  const user = await requireUser(req);
  const body = await readJsonBody(req);
  const artworkId = body.artwork_id || body.auction_id;
  if (!artworkId) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'artwork_id is required');
  }

  const result = await placeBid({
    artworkId: String(artworkId),
    userId: user.id,
    amount: body.amount,
    userEmail: user.email,
    userName: user.name,
  });

  return json(res, 201, result);
}, { methods: ['POST', 'OPTIONS'] });
