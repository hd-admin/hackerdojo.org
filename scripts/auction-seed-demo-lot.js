#!/usr/bin/env node
/**
 * Seed one active demo artwork for local/staging gallery demos (Slice 1).
 * Idempotent: skips if a lot with the demo title already exists.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/auction-seed-demo-lot.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closePool } from '../lib/auction/db.js';
import { ensureAdminUser } from '../lib/auction/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEMO_TITLE = 'Torii at Dusk (Demo Lot)';

function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hackerdojo.org';
  const admin = await ensureAdminUser(adminEmail, process.env.ADMIN_NAME || 'Auction Admin');

  const existing = await query(
    `SELECT id, title, status, ends_at FROM auction_artworks WHERE title = $1 LIMIT 1`,
    [DEMO_TITLE]
  );
  if (existing.rows[0]) {
    console.log('Demo lot already present:', existing.rows[0]);
    await closePool();
    return;
  }

  const ends = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const images = [
    'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80',
  ];

  const { rows } = await query(
    `INSERT INTO auction_artworks (
       title, artist, description, images,
       starting_bid, current_bid, minimum_increment,
       ends_at, status, created_by, updated_at
     ) VALUES (
       $1, $2, $3, $4::jsonb,
       $5, NULL, $6,
       $7, 'active', $8, now()
     )
     RETURNING id, title, status, starting_bid, ends_at`,
    [
      DEMO_TITLE,
      'A. Maker',
      'Demo silent-auction lot for gallery and countdown smoke tests. Replace with real donated artwork in admin (Slice 3).',
      JSON.stringify(images),
      '20.00',
      '5.00',
      ends.toISOString(),
      admin.id,
    ]
  );

  console.log('Demo lot created:', rows[0]);
  await closePool();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closePool();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
