# Slice 0 — Bootstrap runbook

Infrastructure choices are recorded in [DECISIONS.md](./DECISIONS.md).

## What shipped

| Piece | Path |
|-------|------|
| Decisions D1–D4 | `docs/auction/DECISIONS.md` |
| Env template | `.env.example` |
| Node deps | `package.json` (`pg`) |
| Vercel config | `vercel.json` |
| SQL migration | `db/migrations/001_auction_init.sql` |
| Migrate / seed scripts | `scripts/auction-migrate.js`, `scripts/auction-seed-admin.js` |
| Shared lib | `lib/auction/*` (db, auth, money, http, errors, users) |
| Health | `GET /api/auction/health` |
| Admin ping | `GET /api/auction/admin/ping` (session + admin required) |

## One-time setup

1. Create a Postgres database (Neon or Supabase free tier is fine).
2. Copy env template and fill secrets:

```bash
cp .env.example .env.local
# edit DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL
openssl rand -hex 32   # paste into SESSION_SECRET
```

3. Install and bootstrap:

```bash
npm install
npm run auction:bootstrap
```

This runs migrations then seeds/promotes `ADMIN_EMAIL` to `role=admin`.

4. Deploy API to Vercel (link this repo; set the same env vars in the project).  
   Static Jekyll site can stay on GitHub Pages; only `api/*` needs Vercel.

5. Smoke checks:

```bash
curl -sS https://<your-vercel-host>/api/auction/health | jq .
# expect: { "ok": true, "schema_version": "001_auction_init", ... }
```

Admin ping requires a session cookie (issued in Slice 2). Until then, verify admin row in SQL:

```sql
SELECT id, email, role FROM auction_users WHERE role = 'admin';
```

## Local API (optional)

```bash
npx vercel dev
# or: npm i -g vercel && vercel dev
```

## Done when (Slice 0)

- [x] D1–D4 recorded  
- [x] Migration applies cleanly  
- [x] Admin user can be seeded from `ADMIN_EMAIL`  
- [x] Shared helpers exist (JSON, errors, money, requireUser/requireAdmin)  
- [x] Health + admin ping routes exist  

**Next:** Slice 1 — browse gallery + artwork detail ([SLICES.md](./SLICES.md)).
