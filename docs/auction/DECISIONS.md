# Decisions — Auction Space (Phase 0)

Record infrastructure choices **before** Phase 1 coding.  
Until the four decisions below are filled, Slice 0 (Bootstrap) stays blocked.

Related: [CURRENT_STATE.md](./CURRENT_STATE.md) unknowns · [ARCHITECTURE.md](./ARCHITECTURE.md) · [TODO.md](./TODO.md) T00d / T01

---

## Decision log

| ID | Topic | Choice | Decided by | Date | Notes |
|----|-------|--------|------------|------|-------|
| D1 | Database | Hosted Postgres via `DATABASE_URL` (Neon or Supabase-compatible) | Operator (defaults approved) | 2026-08-04 | Transactional row locks for bids (`SELECT … FOR UPDATE`) |
| D2 | Auth method | Email magic-link / OTP + HTTP-only signed session cookie | Operator (defaults approved) | 2026-08-04 | Same flow for bidder + admin; admin via `role=admin` / `ADMIN_EMAIL` seed |
| D3 | Email provider | Resend (`RESEND_API_KEY` + `EMAIL_FROM`) | Operator (defaults approved) | 2026-08-04 | Transactional only (bid / outbid / winner / closed / ending soon) |
| D4 | API host | Vercel serverless (`api/*.js` + `vercel.json`) | Operator (defaults approved) | 2026-08-04 | Same pattern as `api/waitlist.js`; static site remains GitHub Pages |

### Candidate shortlists (not prescriptions)

| Topic | Options to consider |
|-------|---------------------|
| D1 Database | Hosted Postgres (preferred for bid integrity); other durable SQL if already operated by Dojo |
| D2 Auth | Magic-link / OTP + session cookie (default in ARCHITECTURE); Nexudus SSO only if UNKNOWN is resolved |
| D3 Email | Resend, Postmark, SendGrid, or existing Dojo transactional account |
| D4 API host | Confirm active Vercel (or compatible) project; check in host config with Slice 5 |

**Do not** use Airtable as the system of record for bids unless reviewers explicitly accept concurrency/integrity tradeoffs (see CURRENT_STATE).

---

## Env var checklist (fill after D1–D4)

Copy into the Slice 0 / staging secrets store. Names are suggestions — rename to match the chosen providers.

| Variable | Purpose | Required from |
|----------|---------|---------------|
| `DATABASE_URL` | Postgres connection string | D1 |
| `SESSION_SECRET` | Sign/encrypt session cookies (≥32 chars) | D2 |
| `ADMIN_EMAIL` | Seed admin user | Slice 0 |
| `RESEND_API_KEY` | Resend API key (`EMAIL_API_KEY` alias also accepted) | D3 |
| `EMAIL_FROM` | From address for auction mail (verified in Resend) | D3 |
| `AUCTION_CRON_SECRET` | Authorize ending-soon cron | Slice 4 |
| `CORS_ORIGIN` | Allowed browser origin(s), e.g. `https://hackerdojo.org` | Slice 5 |
| `SITE_URL` | Absolute site origin for magic links (e.g. `https://hackerdojo.org`) | D2 / Slice 2 |

Add provider-specific vars when D3 is chosen; keep secrets out of the client and out of git.

---

## How to close T00d

1. Reviewers fill the Decision log table (D1–D4).  
2. Update this file’s “Choice / Decided by / Date” columns.  
3. Check off **T00d** in [TODO.md](./TODO.md).  
4. Copy confirmed choices + env list into Slice 0 task **T01**.  
5. Open the Slice 0 implementation PR.

**T00d status:** closed 2026-08-04 with operator-approved defaults above.

---

## History

| Date | Event |
|------|-------|
| 2026-08-03 | Planning docs package opened; upstream [PR #62](https://github.com/hd-admin/hackerdojo.org/pull/62) merged to `hd-admin/hackerdojo.org` |
| 2026-08-04 | Decision log + env checklist added so Phase 0 can finish without blocking on ad-hoc chat |
| 2026-08-04 | D1–D4 recorded (Postgres, magic-link/OTP, Resend, Vercel); Slice 0 unblocked |
