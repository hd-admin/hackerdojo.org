# Slice 4 — Emails runbook

Depends on Slices 0–3.

## What shipped

| Type | Trigger |
|------|---------|
| `bid_received` | Successful bid |
| `outbid` | New high bid displaces previous bidder |
| `winner` | Lot closed with bids |
| `auction_closed` | Lot closed → all admins |
| `auction_ending_soon` | Cron: active lot ends within window (default 24h), once per high bidder |
| `login_otp` | Auth request-link |

| Piece | Path |
|-------|------|
| Templates / send | `lib/auction/email.js` |
| Cron logic | `lib/auction/cron.js` |
| Cron HTTP | `GET|POST /api/auction/cron/ending-soon` |
| Schedule | `vercel.json` crons — hourly |

Cron also **auto-closes** active lots with `ends_at <= now()` (winner emails included).

## Secrets

```bash
AUCTION_CRON_SECRET=$(openssl rand -hex 24)
RESEND_API_KEY=re_…
EMAIL_FROM="Hacker Dojo Auction <auction@hackerdojo.org>"
```

Vercel Cron may send without your secret header on some plans — if so, call the route from an external scheduler:

```bash
curl -X POST "https://<host>/api/auction/cron/ending-soon" \
  -H "Authorization: Bearer $AUCTION_CRON_SECRET"
```

If `AUCTION_CRON_SECRET` is unset, the route returns a config error (fail closed).

## Idempotency

`auction_ending_soon` uses a partial unique index on `(type, user_id, artwork_id)` plus pre-check so re-runs do not spam.

## Manual test

```bash
# With DB + secrets loaded
curl -sS -X POST "http://localhost:3000/api/auction/cron/ending-soon" \
  -H "Authorization: Bearer $AUCTION_CRON_SECRET" | jq .
```

Expect `ending_soon` and `auto_close` summary objects.

## Done when

- [x] bid_received + outbid from bid handler  
- [x] winner + auction_closed on close (all admins)  
- [x] ending-soon cron + auto-close past end  
- [x] Notification rows written; failures do not roll back bids  

**Next:** Slice 5 — CORS/CSRF hardening, rate limits, staging acceptance, operator runbook.
