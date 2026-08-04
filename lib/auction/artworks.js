/**
 * Artwork query + serialization helpers.
 */

import { query } from './db.js';
import { formatMoney, minimumNextBid } from './money.js';
import { apiError, ErrorCodes } from './errors.js';

/**
 * @param {unknown} images
 * @returns {string[]}
 */
function normalizeImages(images) {
  if (Array.isArray(images)) {
    return images.map(String).filter(Boolean);
  }
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return [];
}

/**
 * Public list card shape.
 * @param {Record<string, unknown>} row
 */
export function serializeArtworkListItem(row) {
  const images = normalizeImages(row.images);
  const starting = Number(row.starting_bid);
  const current =
    row.current_bid == null || row.current_bid === '' ? null : Number(row.current_bid);
  const increment = Number(row.minimum_increment);
  const minNext = minimumNextBid({
    starting_bid: starting,
    current_bid: current,
    minimum_increment: increment,
  });

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    primary_image: images[0] || null,
    starting_bid: formatMoney(starting),
    current_bid: formatMoney(current),
    minimum_increment: formatMoney(increment),
    minimum_next_bid: formatMoney(minNext),
    ends_at: row.ends_at instanceof Date ? row.ends_at.toISOString() : row.ends_at,
    status: row.status,
  };
}

/**
 * Detail shape.
 * @param {Record<string, unknown>} row
 */
export function serializeArtworkDetail(row) {
  const base = serializeArtworkListItem(row);
  return {
    ...base,
    description: row.description ?? '',
    images: normalizeImages(row.images),
    winner_user_id: row.winner_user_id ?? null,
  };
}

/**
 * Privacy-safe bidder display (first name or masked email local-part).
 * @param {{ name?: string | null, email?: string | null }} user
 */
export function bidderDisplay(user) {
  if (user?.name && String(user.name).trim()) {
    const first = String(user.name).trim().split(/\s+/)[0];
    return first;
  }
  if (user?.email) {
    const local = String(user.email).split('@')[0] || 'bidder';
    if (local.length <= 2) return `${local[0] || 'b'}…`;
    return `${local.slice(0, 2)}…`;
  }
  return 'Bidder';
}

/**
 * @param {{ status?: string, limit?: number, offset?: number, includePreview?: boolean }} opts
 */
export async function listPublicArtworks(opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const status = (opts.status || 'active').toLowerCase();

  /** @type {string[]} */
  let statuses;
  if (status === 'all_public') {
    statuses = ['preview', 'active', 'closed'];
  } else if (['preview', 'active', 'closed'].includes(status)) {
    statuses = [status];
  } else {
    statuses = ['active'];
  }

  const { rows } = await query(
    `SELECT id, title, artist, description, images,
            starting_bid, current_bid, minimum_increment,
            ends_at, status, winner_user_id, created_at, updated_at
     FROM auction_artworks
     WHERE status = ANY($1::text[])
     ORDER BY
       CASE status
         WHEN 'active' THEN 0
         WHEN 'preview' THEN 1
         WHEN 'closed' THEN 2
         ELSE 3
       END,
       ends_at ASC
     LIMIT $2 OFFSET $3`,
    [statuses, limit, offset]
  );

  return rows.map(serializeArtworkListItem);
}

/**
 * @param {string} id
 */
export async function getArtworkById(id) {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
  }
  const { rows } = await query(
    `SELECT id, title, artist, description, images,
            starting_bid, current_bid, minimum_increment,
            ends_at, status, winner_user_id, created_by,
            created_at, updated_at
     FROM auction_artworks
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) {
    throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
  }
  return rows[0];
}

/**
 * Public detail: hide drafts.
 * @param {string} id
 */
export async function getPublicArtworkDetail(id) {
  const row = await getArtworkById(id);
  if (row.status === 'draft') {
    throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
  }
  const { rows: bidRows } = await query(
    `SELECT b.amount, b.created_at, u.name, u.email
     FROM auction_bids b
     JOIN auction_users u ON u.id = b.user_id
     WHERE b.artwork_id = $1
     ORDER BY b.amount DESC, b.created_at DESC
     LIMIT 50`,
    [id]
  );

  return {
    artwork: serializeArtworkDetail(row),
    bids: bidRows.map((b) => ({
      amount: formatMoney(b.amount),
      created_at: b.created_at instanceof Date ? b.created_at.toISOString() : b.created_at,
      bidder_display: bidderDisplay(b),
    })),
  };
}
