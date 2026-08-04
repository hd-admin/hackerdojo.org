/**
 * Auction cron jobs: ending-soon notices + auto-close expired lots.
 */

import { query } from './db.js';
import { notifyEndingSoon } from './email.js';
import { closeArtwork } from './admin-artworks.js';
import { listAdminRecipients } from './email.js';

/** Default: lots ending within 24 hours */
const ENDING_SOON_HOURS = Number(process.env.AUCTION_ENDING_SOON_HOURS || 24);

/**
 * Send auction_ending_soon once per high bidder (idempotent).
 * @param {{ notifyAllBidders?: boolean }} [opts]
 */
export async function runEndingSoon(opts = {}) {
  const hours =
    Number.isFinite(ENDING_SOON_HOURS) && ENDING_SOON_HOURS > 0
      ? ENDING_SOON_HOURS
      : 24;

  const { rows: lots } = await query(
    `SELECT id, title, artist, description, images,
            starting_bid, current_bid, minimum_increment,
            ends_at, status, winner_user_id
     FROM auction_artworks
     WHERE status = 'active'
       AND ends_at > now()
       AND ends_at <= now() + ($1::text || ' hours')::interval`,
    [String(hours)]
  );

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const art of lots) {
    /** @type {{ user_id: string, email: string, name: string | null }[]} */
    let recipients = [];

    if (opts.notifyAllBidders) {
      const r = await query(
        `SELECT DISTINCT ON (u.id) u.id AS user_id, u.email, u.name
         FROM auction_bids b
         JOIN auction_users u ON u.id = b.user_id
         WHERE b.artwork_id = $1
         ORDER BY u.id, b.created_at DESC`,
        [art.id]
      );
      recipients = r.rows;
    } else {
      const r = await query(
        `SELECT u.id AS user_id, u.email, u.name
         FROM auction_bids b
         JOIN auction_users u ON u.id = b.user_id
         WHERE b.artwork_id = $1
         ORDER BY b.amount DESC, b.created_at ASC
         LIMIT 1`,
        [art.id]
      );
      recipients = r.rows;
    }

    for (const user of recipients) {
      try {
        const result = await notifyEndingSoon({
          userId: user.user_id,
          to: user.email,
          name: user.name,
          art,
        });
        if (result.sent) sent += 1;
        else skipped += 1;
      } catch (err) {
        errors += 1;
        console.error('[auction/cron] ending_soon error', art.id, err);
      }
    }
  }

  return {
    lots_scanned: lots.length,
    window_hours: hours,
    emails_sent: sent,
    skipped,
    errors,
  };
}

/**
 * Auto-close active lots past ends_at (sets winner + emails via closeArtwork).
 */
export async function runAutoCloseExpired() {
  const { rows: lots } = await query(
    `SELECT id FROM auction_artworks
     WHERE status = 'active'
       AND ends_at <= now()
     ORDER BY ends_at ASC
     LIMIT 50`
  );

  const admins = await listAdminRecipients();
  if (admins.length === 0) {
    console.warn('[auction/cron] auto-close skipped: no admin users seeded');
    return { closed: 0, errors: 0, candidates: lots.length, skipped: 'no_admin' };
  }

  const actingAdmin = admins[0];
  let closed = 0;
  let errors = 0;

  for (const lot of lots) {
    try {
      await closeArtwork(lot.id, {
        id: actingAdmin.id,
        email: actingAdmin.email,
      });
      closed += 1;
    } catch (err) {
      errors += 1;
      console.error('[auction/cron] auto-close error', lot.id, err);
    }
  }

  return { closed, errors, candidates: lots.length };
}

/**
 * Full cron tick.
 */
export async function runAuctionCron() {
  const ending_soon = await runEndingSoon({ notifyAllBidders: false });
  const auto_close = await runAutoCloseExpired();
  console.info('[auction/cron] complete', { ending_soon, auto_close });
  return { ending_soon, auto_close, ran_at: new Date().toISOString() };
}
