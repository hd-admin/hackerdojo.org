# Acceptance Criteria — Silent Auction MVP

Every MVP feature maps to **Requirement → Implementation → Verification**.

## F1 — Artwork listing

| | |
|--|--|
| **Requirement** | Public gallery lists active lots with title, artist, image, bid, time remaining ([REQUIREMENTS.md](./REQUIREMENTS.md) F1) |
| **Implementation** | Jekyll `/auction/` page + `GET /api/auction/artworks` |
| **Verification** | Given ≥2 `active` artworks, gallery shows both; `draft` absent; mobile single-column usable |

## F2 — Artwork page

| | |
|--|--|
| **Requirement** | Detail page with images, copy, bids, countdown, bid CTA (F2) |
| **Implementation** | Artwork page + `GET /api/auction/artworks/:id` |
| **Verification** | Open lot by id; fields match DB; recent bids list amounts; CTA hidden/disabled when closed |

## F3 — Bid

| | |
|--|--|
| **Requirement** | Authenticated bid with increment rules (F3) |
| **Implementation** | Auth session + `POST /api/auction/bids` + transactional DB update |
| **Verification** | Bid at minimum next succeeds; lower amount returns `BID_TOO_LOW`; after `ends_at` returns `AUCTION_CLOSED`; concurrent two bids → only one highest wins, other gets conflict/too low |

## F4 — Countdown

| | |
|--|--|
| **Requirement** | Visible countdown; server authoritative (F4) |
| **Implementation** | Client timer from `ends_at`; server enforces on POST |
| **Verification** | Timer reaches zero on page; bid attempt afterward fails even if UI lag |

## F5 — Admin

| | |
|--|--|
| **Requirement** | Admin CRUD, bid view, close (F5) |
| **Implementation** | `/auction/admin/` + admin API routes |
| **Verification** | Non-admin gets 403; admin creates draft → activates → sees bids → closes → winner set |

## F6 — Email notifications

| | |
|--|--|
| **Requirement** | Emails per [EMAILS.md](./EMAILS.md) (F6) |
| **Implementation** | Provider helper + Notification rows + cron for ending soon |
| **Verification** | Place bid → bidder receives `bid_received`; previous leader receives `outbid`; close → `winner` + `auction_closed`; within ending window → single `auction_ending_soon` |

## Nonfunctional checks

| ID | Verification |
|----|--------------|
| N1 Accessibility | Keyboard can open bid modal and submit; inputs labeled; images have alt |
| N2 Maintainability | No new SPA framework; handlers live under `api/`; docs still accurate |
| N3 Simplicity | No WebSocket/Redis/queue dependencies added |
| N4 Responsive | Gallery/detail/admin usable at ~375px width |
| N5 Secure | Mutating routes require auth; admin gated; bid race test passes; secrets not in client |

## Documentation acceptance (Phase 0)
## Documentation acceptance (this PR)

| Check | Verification |
|-------|--------------|
| Links | All index links in README resolve under `docs/auction/` |
| Scope | Docs only; no application runtime behavior change |
| Honesty | CURRENT_STATE separates OBSERVED / INFERRED / UNKNOWN |
| Root README | Points to `docs/auction` under Auction Space / Silent Auction planning |
| Decisions | [DECISIONS.md](./DECISIONS.md) exists with D1–D4 log + env checklist |
| Root README | Points to `docs/auction` under Silent Auction MVP (Planning) |
| Roadmap | [ROADMAP.md](./ROADMAP.md) covers Phases 0–4; [SLICES.md](./SLICES.md) defines Phase 1 vertical slices to a minimal fully functional auction; [TODO.md](./TODO.md) lists tasks per slice |
