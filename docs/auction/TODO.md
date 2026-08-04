# TODO — Implementation tasks (~2 hours each)

Build guide: **[SLICES.md](./SLICES.md)** (read this first for Phase 1).  
Roadmap: [ROADMAP.md](./ROADMAP.md).

Do not start Phase 1 coding until [DECISIONS.md](./DECISIONS.md) records DB / auth / email / API host choices.
Do not start Phase 1 coding until Phase 0 review records DB / auth / email / API host choices.

---

## Phase 0 — Documentation

- [x] **T00a** Repository audit → CURRENT_STATE.md
- [x] **T00b** Planning docs package under `docs/auction/`
- [x] **T00c** Root README pointer + planning PR ([hd-admin#62](https://github.com/hd-admin/hackerdojo.org/pull/62))
- [x] **T00c2** Decision log + env checklist → [DECISIONS.md](./DECISIONS.md)
- [x] **T00d** Reviewer records DB / auth / email / API host decisions in DECISIONS.md (defaults 2026-08-04)
- [x] **T00e** Upstream Phase 0 docs merged; open Phase 1 PRs **one slice at a time** after T00d
- [x] **T00c** Root README pointer + draft planning PR
- [ ] **T00d** Reviewer records DB / auth / email / API host decisions
- [ ] **T00e** Merge Phase 0 docs; open Phase 1 implementation PRs **one slice at a time**

---

## Phase 1 — MVP (by slice)

Prefer **one PR per slice**. Each slice must meet its **Done when** in [SLICES.md](./SLICES.md) before the next starts.

### Slice 0 — Bootstrap

- [x] **T01** Copy approved choices from [DECISIONS.md](./DECISIONS.md) into Slice 0 PR; confirm env vars present in staging.
- [x] **T02** Add DB client + migration tooling; empty migration pipeline runs.
- [x] **T03** Migrate `User` + seed one admin email from env.
- [x] **T04** Migrate `Artwork`, `Bid`, `Notification` + indexes ([DATA_MODEL.md](./DATA_MODEL.md)).
- [x] **T05** Shared API helpers: JSON, error codes, money parse/validate, requireUser / requireAdmin.

**Slice 0 done when:** migrations apply; admin user exists. → see [SLICE_0_RUNBOOK.md](./SLICE_0_RUNBOOK.md)

### Slice 1 — Browse

- [x] **T09** `GET /api/auction/artworks` + `GET /api/auction/artworks/:id` (+ bid amounts).
- [x] **T09b** Seed one `active` artwork for local/staging demos.
- [x] **T10** Jekyll gallery page `/auction/` wired to list API.
- [x] **T11** Artwork detail page + countdown from `ends_at` (bid CTA disabled or “coming next”).
- [ ] **T01** Record approved choices: database, email provider, auth method, serverless host; env var checklist.
- [ ] **T02** Add DB client + migration tooling; empty migration pipeline runs.
- [ ] **T03** Migrate `User` + seed one admin email from env.
- [ ] **T04** Migrate `Artwork`, `Bid`, `Notification` + indexes ([DATA_MODEL.md](./DATA_MODEL.md)).
- [ ] **T05** Shared API helpers: JSON, error codes, money parse/validate, requireUser / requireAdmin.

**Slice 0 done when:** migrations apply; admin user exists.

### Slice 1 — Browse

- [ ] **T09** `GET /api/auction/artworks` + `GET /api/auction/artworks/:id` (+ bid amounts).
- [ ] **T09b** Seed one `active` artwork for local/staging demos.
- [ ] **T10** Jekyll gallery page `/auction/` wired to list API.
- [ ] **T11** Artwork detail page + countdown from `ends_at` (bid CTA disabled or “coming next”).

**Slice 1 done when:** visitor can browse lots and see a live countdown.

### Slice 2 — Bid

- [x] **T06** `POST /api/auction/auth/request-link` + token persistence + rate limit.
- [x] **T07** `POST /api/auction/auth/verify` + session cookie + `GET /me` + `DELETE` session.
- [x] **T08** Minimal login UI (reused by bid modal).
- [x] **T12** `POST /api/auction/bids` with transactional row lock + validation errors.
- [x] **T13** Bid modal UI + success/error + refresh current bid on page.
- [ ] **T14** Manual concurrency check (two near-simultaneous bids) — operator smoke on staging.

**Slice 2 done when:** logged-in user can place a valid bid; invalid/late bids fail cleanly. → [SLICE_2_RUNBOOK.md](./SLICE_2_RUNBOOK.md)

### Slice 3 — Admin

- [x] **T19** Admin list/create API (`GET`/`POST` artworks).
- [x] **T20** Admin patch + delete-draft + close (sets winner).
- [x] **T21** Admin HTML page: table, editor form, bid list.

**Slice 3 done when:** staff can create → activate → close a lot without DB access. → [SLICE_3_RUNBOOK.md](./SLICE_3_RUNBOOK.md)

### Slice 4 — Emails

- [x] **T15** Email send helper + `Notification` write on success/failure.
- [x] **T16** `bid_received` + `outbid` from bid handler.
- [x] **T17** `winner` + `auction_closed` on close.
- [x] **T18** Secured cron for `auction_ending_soon` + idempotency (+ auto-close expired).

**Slice 4 done when:** emails in [EMAILS.md](./EMAILS.md) send for the happy path. → [SLICE_4_RUNBOOK.md](./SLICE_4_RUNBOOK.md)
- [ ] **T06** `POST /api/auction/auth/request-link` + token persistence + rate limit.
- [ ] **T07** `POST /api/auction/auth/verify` + session cookie + `GET /me` + `DELETE` session.
- [ ] **T08** Minimal login UI (reused by bid modal).
- [ ] **T12** `POST /api/auction/bids` with transactional row lock + validation errors.
- [ ] **T13** Bid modal UI + success/error + refresh current bid on page.
- [ ] **T14** Manual concurrency check (two near-simultaneous bids).

**Slice 2 done when:** logged-in user can place a valid bid; invalid/late bids fail cleanly.

### Slice 3 — Admin

- [ ] **T19** Admin list/create API (`GET`/`POST` artworks).
- [ ] **T20** Admin patch + delete-draft + close (sets winner).
- [ ] **T21** Admin HTML page: table, editor form, bid list.

**Slice 3 done when:** staff can create → activate → close a lot without DB access.

### Slice 4 — Emails

- [ ] **T15** Email send helper + `Notification` write on success/failure.
- [ ] **T16** `bid_received` + `outbid` from bid handler.
- [ ] **T17** `winner` + `auction_closed` on close.
- [ ] **T18** Secured cron for `auction_ending_soon` + idempotency.

**Slice 4 done when:** emails in [EMAILS.md](./EMAILS.md) send for the happy path.

### Slice 5 — Ship → minimal fully functional

- [ ] **T22** CORS lockdown for auction APIs; CSRF/origin checks for cookie POSTs.
- [ ] **T23** Rate limits on auth + bid; audit log lines for bid/admin events.
- [ ] **T24** Accessibility pass on gallery, detail, modal, admin forms.
- [ ] **T25** Staging deploy config checked in; smoke [ACCEPTANCE.md](./ACCEPTANCE.md) F1–F6.
- [ ] **T26** Operator runbook: create lot → activate → close; email resend policy.

**Slice 5 done when:** staging passes F1–F6 + N1–N5.  
**★ Minimal fully functional auction is complete. Stop here for first production fundraiser.**

---

## Phase 2 — Payments (after MVP)

Depends on Slices 0–5 + approved payment provider.

- [ ] **T27** Choose provider + document env vars / webhook secrets.
- [ ] **T28** Add `Payment` table or Artwork payment columns (`unpaid` / `pending` / `paid` / `waived`).
- [ ] **T29** Create checkout / payment-link API for a closed winning lot.
- [ ] **T30** Webhook (or confirm endpoint) marks paid; idempotent.
- [ ] **T31** Admin: view status, mark waived, resend payment link.
- [ ] **T32** Winner pay-link + receipt emails; admin paid notice.
- [ ] **T33** Acceptance: unpaid → pay → paid; webhook retry; waived.
- [ ] **T34** Update DATA_MODEL / API / EMAILS / ACCEPTANCE for payments.

---

## Phase 3 — Donor transparency (after payments)

- [ ] **T35** Aggregate API: totals raised (paid only) for campaign / date range.
- [ ] **T36** Public transparency page (aggregate + optional lot count).
- [ ] **T37** Opt-in recognition display name; Anonymous default.
- [ ] **T38** Optional public recognition wall (no emails).
- [ ] **T39** Admin CSV export: lots, winners, amounts, payment status.
- [ ] **T40** Privacy copy; verify no PII on public page.
- [ ] **T41** Acceptance: aggregates match export; anonymous honored.

---

## Phase 4 — Impact Relay (when API exists)

- [ ] **T42** Integration addendum when Impact Relay API/docs exist.
- [ ] **T43** Map paid/closed fields to Impact Relay schema.
- [ ] **T44** Secured sync route or scheduled job + last sync cursor.
- [ ] **T45** Idempotent upsert (no double-count).
- [ ] **T46** Admin: last sync, errors, manual re-sync.
- [ ] **T47** Staging proof: sample campaign appears in Impact Relay.
- [ ] **T48** Update ROADMAP / runbook with real endpoints.

---

## Explicitly out of roadmap

- WebSockets / live bidding  
- Redis / message queues (unless repo gains them for other reasons)  
- Microservices / SPA rewrite  
- Marketplace multi-seller accounts  
- Nexudus SSO (until CURRENT_STATE UNKNOWN is resolved)  
