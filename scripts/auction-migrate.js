#!/usr/bin/env node
/**
 * Apply SQL files in db/migrations/ in lexical order.
 * Tracks applied ids in auction_schema_migrations.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/auction-migrate.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'db', 'migrations');

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
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected.');

  // Ensure bookkeeping table exists even before first migration body.
  await client.query(`
    CREATE TABLE IF NOT EXISTS auction_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    await client.end();
    return;
  }

  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    const already = await client.query(
      `SELECT 1 FROM auction_schema_migrations WHERE id = $1`,
      [id]
    );
    if (already.rowCount > 0) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`apply ${file} …`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO auction_schema_migrations (id) VALUES ($1)
         ON CONFLICT (id) DO NOTHING`,
        [id]
      );
      await client.query('COMMIT');
      console.log(`ok    ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`fail  ${file}`);
      console.error(err);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
