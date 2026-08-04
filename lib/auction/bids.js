/**
 * Place bid with transactional row lock.
 */

import { withTransaction } from './db.js';
import {
  parseMoney,
  formatMoney,
  assertBidMeetsMinimum,
  roundMoney,
} from './money.js';
import { apiError, ErrorCodes } from './errors.js';
import { serializeArtworkDetail } from './artworks.js';
import { notifyBidReceived, notifyOutbid } from './email.js';

/**
 * @param {{ artworkId: string, userId: string, amount: unknown, userEmail: string, userName?: string | null }} input
 */
export async function placeBid(input) {
  const amount = parseMoney(input.amount);
  const artworkId = input.artworkId;
  if (!artworkId || !/^[0-9a-f-]{36}$/i.test(artworkId)) {
    throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
  }

  const result = await withTransaction(async (client) => {
    const locked = await client.query(
      `SELECT id, title, artist, description, images,
              starting_bid, current_bid, minimum_increment,
              ends_at, status, winner_user_id, created_by,
              created_at, updated_at
       FROM auction_artworks
       WHERE id = $1
       FOR UPDATE`,
      [artworkId]
    );
    const art = locked.rows[0];
    if (!art) {
      throw apiError(ErrorCodes.NOT_FOUND, 'Artwork not found');
    }
    if (art.status !== 'active') {
      throw apiError(ErrorCodes.AUCTION_NOT_ACTIVE, 'Auction is not open for bidding');
    }
    const endsAt = new Date(art.ends_at).getTime();
    if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
      throw apiError(ErrorCodes.AUCTION_CLOSED, 'Auction has ended');
    }

    const minNext = minimumNextBid({
      starting_bid: art.starting_bid,
      current_bid: art.current_bid,
      minimum_increment: art.minimum_increment,
    });
    assertBidMeetsMinimum(amount, minNext);

    // Previous high bidder (for outbid email) — before insert
    const prev = await client.query(
      `SELECT b.id, b.user_id, b.amount, u.email, u.name
       FROM auction_bids b
       JOIN auction_users u ON u.id = b.user_id
       WHERE b.artwork_id = $1
       ORDER BY b.amount DESC, b.created_at DESC
       LIMIT 1`,
      [artworkId]
    );
    const previousHigh = prev.rows[0] || null;

    const inserted = await client.query(
      `INSERT INTO auction_bids (artwork_id, user_id, amount)
       VALUES ($1, $2, $3)
       RETURNING id, artwork_id, user_id, amount, created_at`,
      [artworkId, input.userId, amount]
    );
    const bid = inserted.rows[0];

    const updated = await client.query(
      `UPDATE auction_artworks
       SET current_bid = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, title, artist, description, images,
                 starting_bid, current_bid, minimum_increment,
                 ends_at, status, winner_user_id, created_by,
                 created_at, updated_at`,
      [artworkId, amount]
    );

    return {
      bid,
      artwork: updated.rows[0],
      previousHigh,
    };
  });

  // Emails after commit (do not fail the bid if mail fails)
  try {
    await notifyBidReceived({
      userId: input.userId,
      to: input.userEmail,
      name: input.userName,
      art: result.artwork,
      bid: result.bid,
    });
  } catch (err) {
    console.error('[auction/bids] bid_received email error', err);
  }

  if (
    result.previousHigh &&
    result.previousHigh.user_id !== input.userId &&
    result.previousHigh.email
  ) {
    try {
      await notifyOutbid({
        userId: result.previousHigh.user_id,
        to: result.previousHigh.email,
        name: result.previousHigh.name,
        art: result.artwork,
        yourAmount: result.previousHigh.amount,
        bidId: result.bid.id,
      });
    } catch (err) {
      console.error('[auction/bids] outbid email error', err);
    }
  }

  console.info('[auction/bids] accepted', {
    artwork_id: result.artwork.id,
    bid_id: result.bid.id,
    user_id: input.userId,
    amount: roundMoney(amount),
  });

  return {
    bid: {
      id: result.bid.id,
      artwork_id: result.bid.artwork_id,
      amount: formatMoney(result.bid.amount),
      created_at:
        result.bid.created_at instanceof Date
          ? result.bid.created_at.toISOString()
          : result.bid.created_at,
    },
    artwork: serializeArtworkDetail(result.artwork),
  };
}
