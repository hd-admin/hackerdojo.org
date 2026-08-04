# Implementation slices — Auction Space (minimal fully functional)
# Implementation slices — minimal fully functional auction

Build Phase 1 as **thin vertical slices**.  
Each slice ships something you can demo. Do not start the next slice until the current one’s **Done when** passes.

**Gate:** [DECISIONS.md](./DECISIONS.md) D1–D4 must be filled before Slice 0 coding.

```text
Slice 0  Bootstrap
   ↓
Slice 1  Browse (gallery + detail + countdown)
   ↓
Slice 2  Bid (login + place bid)
   ↓
Slice 3  Admin (create / edit / close)
   ↓
Slice 4  Emails (notify bidders + admins)
   ↓
Slice 5  Ship (hardening + staging acceptance)
   ↓
 ★ MINIMAL FULLY FUNCTIONAL AUCTION ★
   ↓
Phase 2+  Payments → transparency → Impact Relay
```

## What “fully functional” means (MVP)

After **Slices 0–5**, staff can run a real fundraiser:

1. Admin creates an artwork lot and sets an end time  
2. Public browses gallery and lot page with countdown  
3. Bidder logs in and places a valid bid  
4. Outbid / bid-received emails send  
5. Admin closes (or end time passes + close); winner + closed emails send  

**Not required for MVP:** payments, live sockets, donor wall, Impact Relay.

Tasks: [TODO.md](./TODO.md). Acceptance: [ACCEPTANCE.md](./ACCEPTANCE.md).

---

## Slice 0 — Bootstrap

**User value:** Team can develop against a real schema and one admin account.

| Include | Skip until later |
|---------|------------------|
| Record DB / auth / email / host choices | Bid UI |
| Migrations: User, Artwork, Bid, Notification | Public pages |
| Seed one admin email | Email templates |
| Shared API helpers (JSON, errors, money, auth guards) | |

**Done when:** Migrations apply on staging/dev; admin user exists; a health or trivial authenticated admin ping works.

**Tasks:** T01–T05

---

## Slice 1 — Browse

**User value:** Anyone can see active lots and a countdown.

| Include | Skip until later |
|---------|------------------|
| `GET` artworks list + detail (+ bid history amounts) | Place bid |
| Seed **one** `active` artwork (SQL/admin script OK) | Login |
| Gallery page `/auction/` | Admin UI |
| Artwork page + client countdown from `ends_at` | Emails |

**Done when:** Opening `/auction/` shows the seeded lot; detail shows current/starting bid and a ticking countdown; refresh after `ends_at` still shows the lot as ended (bidding still disabled until Slice 2).

**Tasks:** T09–T11 (+ seed helper if needed)

---

## Slice 2 — Bid

**User value:** A logged-in person can raise the high bid safely.

| Include | Skip until later |
|---------|------------------|
| Magic-link / OTP login + session | Admin CRUD UI |
| `POST /bids` with row lock + validation | Payment |
| Bid modal on artwork page | Ending-soon cron |
| Reject too-low / after `ends_at` / inactive | Fancy history UI |

**Done when:** User requests login → verifies → submits minimum next bid → page shows new current bid; a second lower bid fails; bid after end fails.

**Tasks:** T06–T08, T12–T14

---

## Slice 3 — Admin

**User value:** Staff run the auction without touching the database.

| Include | Skip until later |
|---------|------------------|
| Admin list / create / patch / delete-draft / close APIs | Transparency export |
| Admin HTML page (table + form + bid list) | Payment status |
| Close sets winner from high bid | |

**Done when:** Admin creates a lot, activates it, sees bids, closes it; public gallery updates accordingly. Seed script no longer required for a second lot.

**Tasks:** T19–T21

---

## Slice 4 — Emails

**User value:** Bidders and admins learn about bid / win / close without watching the site.

| Include | Skip until later |
|---------|------------------|
| Email helper + `Notification` rows | Marketing digests |
| `bid_received` + `outbid` on successful bid | |
| `winner` + `auction_closed` on close | |
| `auction_ending_soon` via secured cron (once per user/lot) | |

**Done when:** Placing a bid sends received + outbid; closing sends winner + closed; ending-soon fires once inside the window ([EMAILS.md](./EMAILS.md)).

**Tasks:** T15–T18

---

## Slice 5 — Ship

**User value:** Safe enough to run a real event on staging/production.

| Include | Skip until later |
|---------|------------------|
| CORS lockdown + CSRF/origin on cookie POSTs | Phase 2 payments |
| Rate limits + basic audit logs | |
| Accessibility pass on gallery / detail / modal / admin | |
| Staging deploy config + F1–F6 smoke | |
| One-page operator runbook | |

**Done when:** [ACCEPTANCE.md](./ACCEPTANCE.md) F1–F6 and N1–N5 pass on staging.  
→ **Minimal fully functional auction complete.**

**Tasks:** T22–T26

---

## Slice demo script (end-to-end)

Use after Slice 5 (or after Slice 4 for a soft demo):

1. Admin logs in → creates “Test Lot” → status `active`, end time +1 day  
2. Incognito: gallery shows Test Lot + countdown  
3. Bidder A logs in → bids starting amount → gets bid-received email  
4. Bidder B logs in → bids minimum next → A gets outbid email  
5. Admin closes lot (or wait for end + close job) → B gets winner email; admins get closed email  
6. Public: lot no longer accepts bids  

---

## Later phases (not MVP)

Keep these **after** Slices 0–5. Do not pull them into the minimal cut.

| Phase | One-line slice goal |
|-------|---------------------|
| 2 Payments | Winner can pay; admin sees paid/unpaid |
| 3 Transparency | Public total raised (paid) + CSV export |
| 4 Impact Relay | Paid outcomes sync without double-count |

See [ROADMAP.md](./ROADMAP.md) and [TODO.md](./TODO.md) Phases 2–4.
