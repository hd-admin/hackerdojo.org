/**
 * Transactional email via Resend (optional until keys configured).
 * Failures are logged; callers should not roll back domain transactions.
 */

import { getEmailApiKey, getEmailFrom, getSiteUrl } from './config.js';
import { query } from './db.js';
import { formatMoney, minimumNextBid } from './money.js';

const SITE_NAME = 'Hacker Dojo';
const PICKUP_BLURB =
  process.env.AUCTION_PICKUP_BLURB ||
  'Hacker Dojo staff will contact you about payment and pickup. Thank you for supporting the Dojo.';

/**
 * @param {{
 *   userId: string,
 *   type: string,
 *   to: string,
 *   subject: string,
 *   text: string,
 *   html?: string,
 *   artworkId?: string | null,
 *   bidId?: string | null,
 *   meta?: Record<string, unknown>,
 *   skipIfDuplicateEndingSoon?: boolean
 * }} opts
 */
export async function sendAuctionEmail(opts) {
  if (opts.skipIfDuplicateEndingSoon && opts.type === 'auction_ending_soon' && opts.artworkId) {
    const existing = await query(
      `SELECT id FROM auction_notifications
       WHERE type = 'auction_ending_soon'
         AND user_id = $1
         AND artwork_id = $2
       LIMIT 1`,
      [opts.userId, opts.artworkId]
    );
    if (existing.rows[0]) {
      return {
        sent: false,
        notificationId: existing.rows[0].id,
        reason: 'already_sent',
      };
    }
  }

  const apiKey = getEmailApiKey();
  const from = getEmailFrom();

  let notificationId;
  try {
    const insert = await query(
      `INSERT INTO auction_notifications (user_id, type, artwork_id, bid_id, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        opts.userId,
        opts.type,
        opts.artworkId ?? null,
        opts.bidId ?? null,
        JSON.stringify(opts.meta || {}),
      ]
    );
    notificationId = insert.rows[0].id;
  } catch (err) {
    // Partial unique index race for ending_soon
    if (opts.type === 'auction_ending_soon' && err && err.code === '23505') {
      return { sent: false, notificationId: null, reason: 'already_sent' };
    }
    throw err;
  }

  if (!apiKey || !from) {
    console.warn(
      '[auction/email] skipped send (missing RESEND_API_KEY or EMAIL_FROM)',
      { type: opts.type, to: opts.to, notificationId }
    );
    return { sent: false, notificationId, reason: 'email_not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[auction/email] provider error', res.status, body);
      return { sent: false, notificationId, reason: 'provider_error' };
    }

    await query(
      `UPDATE auction_notifications SET sent_at = now() WHERE id = $1`,
      [notificationId]
    );
    return { sent: true, notificationId };
  } catch (err) {
    console.error('[auction/email] send failed', err);
    return { sent: false, notificationId, reason: 'send_failed' };
  }
}

/**
 * Dev-friendly: include OTP in response when email not configured or NODE_ENV=development.
 */
export function shouldExposeDevOtp() {
  if (process.env.AUCTION_DEV_OTP === '1') return true;
  if (!getEmailApiKey()) return true;
  return process.env.NODE_ENV !== 'production';
}

export function artworkUrl(artworkId) {
  return `${getSiteUrl()}/auction/artwork/?id=${encodeURIComponent(artworkId)}`;
}

function footerText() {
  return [
    '',
    '—',
    `${SITE_NAME} Silent Auction`,
    'You received this because you bid on or manage a Dojo auction lot.',
    getSiteUrl() + '/auction/',
  ].join('\n');
}

function footerHtml() {
  const site = getSiteUrl();
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
<p style="color:#6b7280;font-size:12px">${SITE_NAME} Silent Auction<br/>
You received this because you bid on or manage a Dojo auction lot.<br/>
<a href="${site}/auction/">View auction</a></p>`;
}

/**
 * @param {Record<string, unknown>} art
 */
function endsAtLabel(art) {
  try {
    return new Date(/** @type {string} */ (art.ends_at)).toUTCString();
  } catch {
    return String(art.ends_at || '');
  }
}

/**
 * @param {Record<string, unknown>} art
 */
function minNextLabel(art) {
  return formatMoney(
    minimumNextBid({
      starting_bid: art.starting_bid,
      current_bid: art.current_bid,
      minimum_increment: art.minimum_increment,
    })
  );
}

/** @param {Record<string, unknown>} art */
export async function notifyBidReceived({ userId, to, name, art, bid }) {
  const url = artworkUrl(String(art.id));
  const title = String(art.title);
  const amount = formatMoney(bid.amount);
  const current = formatMoney(art.current_bid);
  const minNext = minNextLabel(art);
  const subject = `Bid received: ${title}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `We received your bid of $${amount} on "${title}".`,
    `Current high bid: $${current}`,
    `Minimum next bid: $${minNext}`,
    `Ends: ${endsAtLabel(art)}`,
    '',
    url,
    footerText(),
  ].join('\n');
  const html = `<p>Hi ${name || 'there'},</p>
<p>We received your bid of <strong>$${amount}</strong> on <em>${title}</em>.</p>
<ul>
<li>Current high bid: $${current}</li>
<li>Minimum next bid: $${minNext}</li>
<li>Ends: ${endsAtLabel(art)}</li>
</ul>
<p><a href="${url}">View lot</a></p>${footerHtml()}`;

  return sendAuctionEmail({
    userId,
    type: 'bid_received',
    to,
    subject,
    text,
    html,
    artworkId: String(art.id),
    bidId: String(bid.id),
    meta: { amount, current_bid: current },
  });
}

/** @param {Record<string, unknown>} art */
export async function notifyOutbid({ userId, to, name, art, yourAmount, bidId }) {
  const url = artworkUrl(String(art.id));
  const title = String(art.title);
  const current = formatMoney(art.current_bid);
  const minNext = minNextLabel(art);
  const yours = formatMoney(yourAmount);
  const subject = `You've been outbid on ${title}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Someone placed a higher bid on "${title}".`,
    `Your bid was $${yours}.`,
    `Current high bid: $${current}`,
    `Minimum next bid: $${minNext}`,
    `Ends: ${endsAtLabel(art)}`,
    '',
    url,
    footerText(),
  ].join('\n');
  const html = `<p>Hi ${name || 'there'},</p>
<p>Someone placed a higher bid on <em>${title}</em>.</p>
<ul>
<li>Your bid: $${yours}</li>
<li>Current high bid: $${current}</li>
<li>Minimum next bid: $${minNext}</li>
<li>Ends: ${endsAtLabel(art)}</li>
</ul>
<p><a href="${url}">Bid again</a></p>${footerHtml()}`;

  return sendAuctionEmail({
    userId,
    type: 'outbid',
    to,
    subject,
    text,
    html,
    artworkId: String(art.id),
    bidId: bidId ? String(bidId) : null,
    meta: { your_amount: yours, current_bid: current },
  });
}

/** @param {Record<string, unknown>} art */
export async function notifyWinner({ userId, to, name, art, winningAmount, bidId }) {
  const url = artworkUrl(String(art.id));
  const title = String(art.title);
  const amount = formatMoney(winningAmount);
  const subject = `You won: ${title}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Congratulations — you won "${title}" with a bid of $${amount}.`,
    PICKUP_BLURB,
    '',
    url,
    footerText(),
  ].join('\n');
  const html = `<p>Hi ${name || 'there'},</p>
<p>Congratulations — you won <em>${title}</em> with a bid of <strong>$${amount}</strong>.</p>
<p>${PICKUP_BLURB}</p>
<p><a href="${url}">View lot</a></p>${footerHtml()}`;

  return sendAuctionEmail({
    userId,
    type: 'winner',
    to,
    subject,
    text,
    html,
    artworkId: String(art.id),
    bidId: bidId ? String(bidId) : null,
    meta: { winning_amount: amount },
  });
}

/** @param {Record<string, unknown>} art */
export async function notifyAuctionClosed({ userId, to, art, winnerEmail, winningAmount, bidCount }) {
  const url = artworkUrl(String(art.id));
  const title = String(art.title);
  const winAmt = winningAmount != null ? formatMoney(winningAmount) : null;
  const subject = `Auction closed: ${title}`;
  const text = [
    `Lot closed: "${title}"`,
    winAmt && winnerEmail
      ? `Winner: ${winnerEmail} at $${winAmt}`
      : 'Winner: none (no bids)',
    `Bid count: ${bidCount ?? '—'}`,
    '',
    url,
    footerText(),
  ].join('\n');
  const html = `<p>Lot closed: <em>${title}</em></p>
<p>${
    winAmt && winnerEmail
      ? `Winner: ${winnerEmail} at <strong>$${winAmt}</strong>`
      : 'Winner: none (no bids)'
  }</p>
<p>Bid count: ${bidCount ?? '—'}</p>
<p><a href="${url}">View lot</a></p>${footerHtml()}`;

  return sendAuctionEmail({
    userId,
    type: 'auction_closed',
    to,
    subject,
    text,
    html,
    artworkId: String(art.id),
    meta: {
      winner_email: winnerEmail || null,
      winning_amount: winAmt,
      bid_count: bidCount ?? null,
    },
  });
}

/** @param {Record<string, unknown>} art */
export async function notifyEndingSoon({ userId, to, name, art }) {
  const url = artworkUrl(String(art.id));
  const title = String(art.title);
  const current = formatMoney(art.current_bid ?? art.starting_bid);
  const minNext = minNextLabel(art);
  const subject = `Ending soon: ${title}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `"${title}" ends soon.`,
    `Current high bid: $${current}`,
    `Minimum next bid: $${minNext}`,
    `Ends: ${endsAtLabel(art)}`,
    '',
    url,
    footerText(),
  ].join('\n');
  const html = `<p>Hi ${name || 'there'},</p>
<p><em>${title}</em> ends soon.</p>
<ul>
<li>Current high bid: $${current}</li>
<li>Minimum next bid: $${minNext}</li>
<li>Ends: ${endsAtLabel(art)}</li>
</ul>
<p><a href="${url}">View lot</a></p>${footerHtml()}`;

  return sendAuctionEmail({
    userId,
    type: 'auction_ending_soon',
    to,
    subject,
    text,
    html,
    artworkId: String(art.id),
    meta: { current_bid: current },
    skipIfDuplicateEndingSoon: true,
  });
}

/**
 * List all admin users for closed notices.
 */
export async function listAdminRecipients() {
  const { rows } = await query(
    `SELECT id, email, name FROM auction_users WHERE role = 'admin' ORDER BY created_at ASC`
  );
  return rows;
}
