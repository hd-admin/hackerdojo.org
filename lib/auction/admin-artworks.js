/**
 * Admin artwork CRUD + close (sets winner).
 */

import { query, withTransaction } from './db.js';
import { parseMoney, roundMoney } from './money.js';
import { apiError, ErrorCodes } from './errors.js';
import {
  serializeArtworkDetail,
  getArtworkById,
  bidderDisplay,
} from './artworks.js';
import {
  notifyWinner,
  notifyAuctionClosed,
  listAdminRecipients,
} from './email.js';

const STATUSES = new Set(['draft', 'preview', 'active', 'closed']);

/**
 * @param {unknown} images
 * @returns {string[]}
 */
function parseImages(images) {
  if (images == null) return [];
  let list = images;
  if (typeof images === 'string') {
    list = images
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(list)) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'images must be an array or newline-separated URLs');
  }
  return list.map(String).map((u) => u.trim()).filter(Boolean).map((url) => {
    if (!/^https:\/\//i.test(url)) {
      throw apiError(ErrorCodes.VALIDATION_ERROR, 'Image URLs must use https://');
    }
    return url;
  });
}

/**
 * @param {unknown} value
 * @param {string} field
 */
function requireText(value, field, max = 500) {
  const s = String(value ?? '').trim();
  if (!s) throw apiError(ErrorCodes.VALIDATION_ERROR, `${field} is required`);
  if (s.length > max) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, `${field} is too long`);
  }
  return s;
}

/**
 * Parse money that allows zero (starting bid).
 * @param {unknown} value
 * @param {string} field
 */
function parseMoneyAllowZero(value, field) {
  if (value == null || value === '') {
    throw apiError(ErrorCodes.INVALID_AMOUNT, `${field} is required`);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw apiError(ErrorCodes.INVALID_AMOUNT, `${field} must be >= 0`);
    }
    return roundMoney(value);
  }
  const raw = String(value).trim().replace(/[$,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw apiError(ErrorCodes.INVALID_AMOUNT, `${field} must be a valid money amount`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw apiError(ErrorCodes.INVALID_AMOUNT, `${field} must be >= 0`);
  }
  return roundMoney(n);
}

/**
 * @param {unknown} value
 */
function parseEndsAt(value) {
  if (!value) throw apiError(ErrorCodes.VALIDATION_ERROR, 'ends_at is required');
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'ends_at must be a valid ISO datetime');
  }
  return d;
}

/**
 * Admin list — all statuses.
 */
export async function listAdminArtworks() {
  const { rows } = await query(
    `SELECT id, title, artist, description, images,
            starting_bid, current_bid, minimum_increment,
            ends_at, status, winner_user_id, created_by,
            created_at, updated_at
     FROM auction_artworks
     ORDER BY updated_at DESC
     LIMIT 200`
  );
  return rows.map(serializeArtworkDetail);
}

/**
 * @param {string} artworkId
 */
export async function listAdminBids(artworkId) {
  const { rows } = await query(
    `SELECT b.id, b.amount, b.created_at, u.id AS user_id, u.email, u.name
     FROM auction_bids b
     JOIN auction_users u ON u.id = b.user_id
     WHERE b.artwork_id = $1
     ORDER BY b.amount DESC, b.created_at DESC
     LIMIT 200`,
    [artworkId]
  );
  return rows.map((b) => ({
    id: b.id,
    amount: formatMoney(b.amount),
    created_at: b.created_at instanceof Date ? b.created_at.toISOString() : b.created_at,
    user_id: b.user_id,
    email: b.email,
    name: b.name,
    bidder_display: bidderDisplay(b),
  }));
}

/**
 * @param {Record<string, unknown>} body
 * @param {string} adminUserId
 */
export async function createArtwork(body, adminUserId) {
  const title = requireText(body.title, 'title', 200);
  const artist = requireText(body.artist, 'artist', 200);
  const description = String(body.description ?? '').trim().slice(0, 5000);
  const images = parseImages(body.images);
  const starting = parseMoneyAllowZero(body.starting_bid, 'starting_bid');
  const increment = parseMoney(body.minimum_increment ?? '5.00');
  const endsAt = parseEndsAt(body.ends_at);
  const status = String(body.status || 'draft').toLowerCase();
  if (!STATUSES.has(status)) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid status');
  }
  if (status === 'active' && endsAt.getTime() <= Date.now()) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Active lots need ends_at in the future');
  }
  if (status === 'closed') {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Create as draft/preview/active; use close endpoint to close');
  }

  const { rows } = await query(
    `INSERT INTO auction_artworks (
       title, artist, description, images,
       starting_bid, current_bid, minimum_increment,
       ends_at, status, created_by, updated_at
     ) VALUES (
       $1, $2, $3, $4::jsonb,
       $5, NULL, $6,
       $7, $8, $9, now()
     )
     RETURNING id, title, artist, description, images,
               starting_bid, current_bid, minimum_increment,
               ends_at, status, winner_user_id, created_by,
               created_at, updated_at`,
    [
      title,
      artist,
      description,
      JSON.stringify(images),
      starting,
      increment,
      endsAt.toISOString(),
      status,
      adminUserId,
    ]
  );

  console.info('[auction/admin] created', { artwork_id: rows[0].id, admin: adminUserId });
  return serializeArtworkDetail(rows[0]);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 * @param {string} adminUserId
 */
export async function patchArtwork(id, body, adminUserId) {
  const existing = await getArtworkById(id);

  const title =
    body.title !== undefined ? requireText(body.title, 'title', 200) : existing.title;
  const artist =
    body.artist !== undefined ? requireText(body.artist, 'artist', 200) : existing.artist;
  const description =
    body.description !== undefined
      ? String(body.description ?? '').trim().slice(0, 5000)
      : existing.description;
  /** @type {string[]} */
  let images;
  if (body.images !== undefined) {
    images = parseImages(body.images);
  } else if (Array.isArray(existing.images)) {
    images = existing.images.map(String);
  } else if (typeof existing.images === 'string') {
    try {
      images = JSON.parse(existing.images);
    } catch {
      images = [];
    }
  } else {
    images = [];
  }

  let starting =
    body.starting_bid !== undefined
      ? parseMoneyAllowZero(body.starting_bid, 'starting_bid')
      : Number(existing.starting_bid);
  const increment =
    body.minimum_increment !== undefined
      ? parseMoney(body.minimum_increment)
      : Number(existing.minimum_increment);
  const endsAt =
    body.ends_at !== undefined ? parseEndsAt(body.ends_at) : new Date(existing.ends_at);
  const status =
    body.status !== undefined
      ? String(body.status).toLowerCase()
      : existing.status;

  if (!STATUSES.has(status)) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid status');
  }
  if (status === 'closed' && existing.status !== 'closed') {
    throw apiError(
      ErrorCodes.VALIDATION_ERROR,
      'Use POST .../close to close a lot and set the winner'
    );
  }

  const currentBid =
    existing.current_bid == null || existing.current_bid === ''
      ? null
      : Number(existing.current_bid);
  if (currentBid != null && starting < currentBid) {
    throw apiError(
      ErrorCodes.VALIDATION_ERROR,
      'starting_bid cannot be below current_bid after bids exist'
    );
  }
  if (status === 'active' && endsAt.getTime() <= Date.now()) {
    throw apiError(ErrorCodes.VALIDATION_ERROR, 'Active lots need ends_at in the future');
  }

  const { rows } = await query(
    `UPDATE auction_artworks SET
       title = $2,
       artist = $3,
       description = $4,
       images = $5::jsonb,
       starting_bid = $6,
       minimum_increment = $7,
       ends_at = $8,
       status = $9,
       updated_at = now()
     WHERE id = $1
     RETURNING id, title, artist, description, images,
               starting_bid, current_bid, minimum_increment,
               ends_at, status, winner_user_id, created_by,
               created_at, updated_at`,
    [
      id,
      title,
      artist,
      description,
      JSON.stringify(images),
      starting,
      increment,
      endsAt.toISOString(),
      status,
    ]
  );

  console.info('[auction/admin] patched', { artwork_id: id, admin: adminUserId, status });
  return serializeArtworkDetail(rows[0]);
}

/**
 * @param {string} id
 * @param {string} adminUserId
 */
export async function deleteDraftArtwork(id, adminUserId) {
  const existing = await getArtworkById(id);
  if (existing.status !== 'draft') {
    throw apiError(ErrorCodes.ARTWORK_NOT_DELETABLE, 'Only draft artworks can be deleted');
  }
  const bids = await query(
    `SELECT count(*)::int AS c FROM auction_bids WHERE artwork_id = $1`,
    [id]
  );
  if ((bids.rows[0]?.c || 0) > 0) {
    throw apiError(ErrorCodes.ARTWORK_NOT_DELETABLE, 'Artwork has bids and cannot be deleted');
  }
  await query(`DELETE FROM auction_artworks WHERE id = $1`, [id]);
  console.info('[auction/admin] deleted draft', { artwork_id: id, admin: adminUserId });
  return { ok: true };
}

/**
 * Close lot; set winner from high bid; send winner + closed emails.
 * @param {string} id
 * @param {{ id: string, email: string }} admin
 */
export async function closeArtwork(id, admin) {
  const result = await withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT * FROM auction_artworks WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const art = locked.rows[0];
    if (!art) throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
    if (art.status === 'closed') {
      return { artwork: art, winner: null, highBid: null, alreadyClosed: true };
    }

    const high = await client.query(
      `SELECT b.id, b.amount, b.user_id, u.email, u.name
       FROM auction_bids b
       JOIN auction_users u ON u.id = b.user_id
       WHERE b.artwork_id = $1
       ORDER BY b.amount DESC, b.created_at ASC
       LIMIT 1`,
      [id]
    );
    const highBid = high.rows[0] || null;
    const winnerId = highBid ? highBid.user_id : null;

    const updated = await client.query(
      `UPDATE auction_artworks
       SET status = 'closed',
           winner_user_id = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, winnerId]
    );

    return {
      artwork: updated.rows[0],
      winner: highBid,
      highBid,
      alreadyClosed: false,
    };
  });

  const serialized = serializeArtworkDetail(result.artwork);

  if (!result.alreadyClosed) {
    const bidCountRes = await query(
      `SELECT count(*)::int AS c FROM auction_bids WHERE artwork_id = $1`,
      [id]
    );
    const bidCount = bidCountRes.rows[0]?.c ?? 0;

    if (result.winner?.email) {
      try {
        await notifyWinner({
          userId: result.winner.user_id,
          to: result.winner.email,
          name: result.winner.name,
          art: result.artwork,
          winningAmount: result.winner.amount,
          bidId: result.winner.id,
        });
      } catch (err) {
        console.error('[auction/admin] winner email error', err);
      }
    }

    try {
      const admins = await listAdminRecipients();
      const recipients =
        admins.length > 0
          ? admins
          : [{ id: admin.id, email: admin.email, name: null }];
      for (const a of recipients) {
        await notifyAuctionClosed({
          userId: a.id,
          to: a.email,
          art: result.artwork,
          winnerEmail: result.winner?.email || null,
          winningAmount: result.winner?.amount ?? null,
          bidCount,
        });
      }
    } catch (err) {
      console.error('[auction/admin] closed email error', err);
    }

    console.info('[auction/admin] closed', {
      artwork_id: id,
      admin: admin.id,
      winner_user_id: result.artwork.winner_user_id,
    });
  }

  return serialized;
}
