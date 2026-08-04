# Slice 3 — Admin runbook

Depends on Slices 0–2.

## What shipped

| Piece | Path |
|-------|------|
| Admin list / detail + bids | `GET /api/auction/admin/artworks` (+ `?id=`) |
| Create | `POST /api/auction/artworks` |
| Patch | `PATCH /api/auction/artworks/:id` |
| Delete draft | `DELETE /api/auction/artworks/:id` |
| Close + winner | `POST /api/auction/artworks/:id/close` |
| Admin UI | `/auction/admin/` → `auction/admin.html` + `static/js/auction-admin.js` |

## Operator flow

1. Open `/auction/admin/`  
2. Log in with **admin** email (`ADMIN_EMAIL` seeded via `npm run auction:seed-admin`)  
3. **New artwork** → fill title, artist, images (https URLs), starting bid, increment, ends at  
4. Set status `active` (or `preview` then activate later) → **Save**  
5. Public gallery `/auction/` shows the lot  
6. After bidding, **Close auction** → winner set from high bid; emails if Resend configured  

## Rules

- Only **draft** lots with zero bids can be deleted.  
- Closing is the only way to set `status=closed` + `winner_user_id`.  
- `starting_bid` cannot drop below `current_bid` once bids exist.  
- Active lots need `ends_at` in the future.

## Done when

- [x] Staff can create → activate → close without SQL  
- [x] Public gallery reflects status changes  
- [x] Bid list visible in admin editor  

**Next:** Slice 4 — polish emails + ending-soon cron (bid/outbid/winner already partially wired).
