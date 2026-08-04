#!/usr/bin/env node
/**
 * Seed / promote ADMIN_EMAIL to role=admin.
 *
 * Usage:
 *   DATABASE_URL=... ADMIN_EMAIL=admin@hackerdojo.org node scripts/auction-seed-admin.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAdminUser } from '../lib/auction/users.js';
import { closePool } from '../lib/auction/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.error('ADMIN_EMAIL is required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const name = process.env.ADMIN_NAME || 'Auction Admin';
  const user = await ensureAdminUser(email, name);
  console.log('Admin ready:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
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
