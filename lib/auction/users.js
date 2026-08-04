/**
 * User persistence helpers.
 */

import { query } from './db.js';

/**
 * Upsert admin by email (seed / bootstrap).
 * @param {string} email
 * @param {string} [name]
 */
export async function ensureAdminUser(email, name = 'Auction Admin') {
  const normalized = email.trim().toLowerCase();
  const { rows } = await query(
    `INSERT INTO auction_users (email, name, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin',
           name = COALESCE(EXCLUDED.name, auction_users.name)
     RETURNING id, email, name, role, created_at`,
    [normalized, name]
  );
  return rows[0];
}

/**
 * Find or create a bidder.
 * @param {string} email
 * @param {string | null} [name]
 */
export async function findOrCreateBidder(email, name = null) {
  const normalized = email.trim().toLowerCase();
  const existing = await query(
    `SELECT id, email, name, role FROM auction_users WHERE lower(email) = $1 LIMIT 1`,
    [normalized]
  );
  if (existing.rows[0]) {
    if (name && !existing.rows[0].name) {
      const updated = await query(
        `UPDATE auction_users SET name = $2 WHERE id = $1
         RETURNING id, email, name, role`,
        [existing.rows[0].id, name]
      );
      return updated.rows[0];
    }
    return existing.rows[0];
  }
  const inserted = await query(
    `INSERT INTO auction_users (email, name, role)
     VALUES ($1, $2, 'bidder')
     RETURNING id, email, name, role`,
    [normalized, name]
  );
  return inserted.rows[0];
}
