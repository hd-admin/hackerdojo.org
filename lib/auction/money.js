/**
 * Money helpers for auction bids (USD cents-safe via string/number → fixed 2dp).
 */

import { apiError, ErrorCodes } from './errors.js';

/**
 * Parse a money input into a Number with 2 decimal places.
 * Accepts number or string ("35", "35.00", "35.5").
 * @param {unknown} value
 * @returns {number}
 */
export function parseMoney(value) {
  if (value == null || value === '') {
    throw apiError(ErrorCodes.INVALID_AMOUNT, 'Amount is required');
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw apiError(ErrorCodes.INVALID_AMOUNT, 'Amount must be a positive number');
    }
    return roundMoney(value);
  }
  const raw = String(value).trim().replace(/[$,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw apiError(ErrorCodes.INVALID_AMOUNT, 'Amount must be a positive money value (max 2 decimals)');
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw apiError(ErrorCodes.INVALID_AMOUNT, 'Amount must be a positive number');
  }
  return roundMoney(n);
}

/**
 * @param {number} n
 * @returns {number}
 */
export function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Format for API JSON (always two decimals as string).
 * @param {number | string | null | undefined} n
 * @returns {string | null}
 */
export function formatMoney(n) {
  if (n == null || n === '') return null;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return null;
  return roundMoney(num).toFixed(2);
}

/**
 * Minimum next bid: starting_bid if no current_bid, else current + increment.
 * @param {{ starting_bid: number|string, current_bid: number|string|null, minimum_increment: number|string }} artwork
 * @returns {number}
 */
export function minimumNextBid(artwork) {
  const starting = Number(artwork.starting_bid);
  const current =
    artwork.current_bid == null || artwork.current_bid === ''
      ? null
      : Number(artwork.current_bid);
  const inc = Number(artwork.minimum_increment);
  if (current == null || !Number.isFinite(current)) {
    return roundMoney(starting);
  }
  return roundMoney(current + inc);
}

/**
 * @param {number} amount
 * @param {number} minimum
 */
export function assertBidMeetsMinimum(amount, minimum) {
  if (roundMoney(amount) + 1e-9 < roundMoney(minimum)) {
    throw apiError(
      ErrorCodes.BID_TOO_LOW,
      `Bid must be at least ${formatMoney(minimum)}`,
      { minimum_next_bid: formatMoney(minimum) }
    );
  }
}
