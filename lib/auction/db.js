/**
 * Postgres client pool for auction API + scripts.
 * Uses DATABASE_URL (Neon / Supabase / any Postgres).
 */

import pg from 'pg';
import { getDatabaseUrl } from './config.js';

const { Pool } = pg;

/** @type {import('pg').Pool | null} */
let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      // Neon / cloud Postgres usually need SSL
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/**
 * Run a callback inside a transaction.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {string} text
 * @param {unknown[]} [params]
 */
export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
