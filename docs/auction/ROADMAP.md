# Roadmap — Auction Space (Silent Auction)

Full delivery roadmap for Hacker Dojo **Auction Space**.  
# Roadmap — Silent Auction

Full delivery roadmap for the Hacker Dojo Silent Auction fundraising feature.  
Stay aligned with “simple fundraising,” not marketplace scope.

```text
Phase 0 docs → Phase 1 MVP → Phase 2 payments → Phase 3 transparency → Phase 4 Impact Relay
```

| Phase | Name | Goal |
|-------|------|------|
| 0 | Documentation | Plan reviewed before code |
| 1 | MVP | List, bid, countdown, admin, emails |
| 2 | Payments | Collect / track winner payment |
| 3 | Donor transparency | Public totals + board reporting |
| 4 | Impact Relay | Feed outcomes into Dojo impact systems |

Phase 1 build order (slices): **[SLICES.md](./SLICES.md)**  
Task checklist: [TODO.md](./TODO.md)

---

## Phase 0 — Documentation
## Phase 0 — Documentation (this PR)

**Goal:** Design and document the MVP so reviewers can approve scope and infrastructure before implementation.

### In scope

- Repository audit ([CURRENT_STATE.md](./CURRENT_STATE.md))
- Requirements, architecture, data model, API, UI wireframes, emails, security, acceptance, tasks
- Decision log ([DECISIONS.md](./DECISIONS.md))
- Root README pointer to `docs/auction`
- **No production behavior change**

### Out of scope

- Application code, schema migrations, deploy config for auction runtime

### Deliverables

- Complete `docs/auction/` package (this tree)
- Planning PR for CODEOWNERS review ([hd-admin#62](https://github.com/hd-admin/hackerdojo.org/pull/62) merged)
- Draft planning PR for CODEOWNERS review

### Exit criteria

- [x] Documentation package committed
- [x] Planning PR reviewed / merged upstream
- [ ] Infrastructure decisions recorded in [DECISIONS.md](./DECISIONS.md): database, auth method, email provider, API host
- [ ] Planning PR reviewed
- [ ] Infrastructure decisions recorded: database, auth method, email provider, API host
- [ ] Phase 1 kickoff approved

---

## Phase 1 — MVP (minimal fully functional auction)

**Goal:** Ship the smallest auction that staff can actually run end-to-end.

Build as six slices (details in [SLICES.md](./SLICES.md)):

| Slice | Name | Demo after slice |
|-------|------|------------------|
| 0 | Bootstrap | Schema + admin user |
| 1 | Browse | Gallery + detail + countdown |
| 2 | Bid | Login + valid bid sticks |
| 3 | Admin | Create / edit / close without DB |
| 4 | Emails | Bid / outbid / winner / closed / ending soon |
| 5 | Ship | Staging passes acceptance → **MVP done** |

One PR per slice when practical. Do not start slice *N+1* until slice *N* **Done when** passes.

### In scope

- Minimal User identity + session auth (new; none exists in-repo today)
- Artwork / Bid / Notification persistence
- Public gallery + artwork page + countdown
- Authenticated place-bid with increment / end-time integrity
- Admin create / edit / close
- Emails: bid received, outbid, ending soon, winner, auction closed

### Out of scope

- Payments, payouts, invoices beyond “contact winner offline”
- Live bidding / WebSockets / Redis / queues
- Site redesign, marketplace multi-seller flows
- Donor transparency UI, Impact Relay

### Deliverables

- Jekyll pages under `/auction/` (+ admin)
- `api/auction/*` handlers
- DB migrations for User, Artwork, Bid, Notification
- Operator runbook (create → activate → close)

### Exit criteria

- Slices 0–5 complete per [SLICES.md](./SLICES.md)
- [ACCEPTANCE.md](./ACCEPTANCE.md) F1–F6 pass on staging
- Nonfunctional checks N1–N5 pass
- Secrets in env (not hardcoded); CORS not open `*` on authenticated routes

### Depends on

- Phase 0 exit criteria (esp. infrastructure decisions)

---

## Phase 2 — Payments

**Goal:** Let winners pay (or be marked paid) without becoming a marketplace.

### In scope

- Winner payment collection (e.g. Stripe Checkout, payment link, or invoice URL)
- Payment state on Artwork or a small `Payment` table (`unpaid` / `pending` / `paid` / `waived`)
- Admin mark-paid / resend payment link
- Receipt email to winner; paid notice to admins
- Basic reconciliation list in admin (lot, winner, amount, status)

### Out of scope

- Escrow, split payouts to artists, tax forms automation
- Cart / multi-lot checkout (optional fast-follow only if needed)
- Subscriptions or membership billing
- Changing core bid rules from Phase 1

### Deliverables

- Payment provider integration (reviewer-chosen)
- Admin payment controls + winner payment CTA/email
- Data model extension documented in DATA_MODEL (or addendum)
- Acceptance cases for paid / failed / waived

### Exit criteria

- Closed lot with winner can collect payment end-to-end on staging
- Admin can see payment status per lot
- No card data stored in this app (provider-hosted checkout)

### Depends on

- Phase 1 MVP stable in production or staging
- Approved payment provider + nonprofit Stripe/account setup

---

## Phase 3 — Donor transparency

**Goal:** Show fundraising impact simply and support board reporting.

### In scope

- Public aggregate totals raised (sum of paid winning bids for closed lots in a campaign/window)
- Optional anonymized recognition wall (display name or “Anonymous”)
- Admin export (CSV) of lots, winners, amounts, payment status for board / impact report
- Simple “campaign” or date-range filter if multiple auctions run over time

### Out of scope

- Full CRM / donor management suite
- Tax receipt generation (unless trivial reuse of Phase 2 receipts)
- Complex analytics product
- Public exposure of bidder emails or exact identities without consent

### Deliverables

- Public transparency page (Jekyll + API aggregates)
- Opt-in display name for recognition
- Export endpoint or admin download
- Privacy notes in SECURITY / UI copy

### Exit criteria

- Public page shows correct aggregate for paid lots only
- Export matches admin totals
- No PII leaked on public surfaces

### Depends on

- Phase 2 payment status (so “raised” means money received, not just bid)

---

## Phase 4 — Impact Relay integration

**Goal:** Connect auction outcomes to Impact Relay (or successor) so fundraising results feed broader Dojo impact storytelling.

### In scope

- Map closed/paid auction outcomes to Impact Relay events or records
- Push or pull integration using Impact Relay’s documented API (when available)
- Idempotent sync (re-runs do not double-count)
- Admin visibility: last sync time / errors
- Align fields with Phase 3 aggregates (amount raised, lot counts, campaign)

### Out of scope

- Replacing Impact Relay itself
- Building a second impact warehouse inside this repo
- Real-time streaming unless Impact Relay requires it (prefer simple batch/webhook)

### Deliverables

- Integration design note (addendum under `docs/auction/` when API is known)
- Sync job or secured API route
- Config for Impact Relay credentials / endpoint
- Acceptance: sample lot → appears correctly in Impact Relay

### Exit criteria

- At least one staging auction campaign syncs paid totals successfully
- Failures are logged and retriable without duplicate totals
- Docs updated with actual API contract (replace TBD)

### Depends on

- Impact Relay API/docs availability
- Phase 2 (and ideally Phase 3) data to sync
- Ops ownership of Impact Relay credentials

---

## Cross-phase constraints (always)

| Keep | Avoid |
|------|--------|
| Jekyll + existing site chrome | Site redesign |
| `api/` serverless style | Microservices |
| Simple fundraising UX | Marketplace / multi-seller |
| Server-authoritative bids | WebSockets / live boards |
| Docs updated when behavior changes | Silent scope creep |

## Suggested sequencing notes

1. Do not start Phase 2 until Phase 1 acceptance passes.  
2. Phase 3 totals should prefer **paid** amounts (Phase 2) over bid amounts.  
3. Phase 4 should consume stable Phase 2/3 fields — avoid one-off Impact Relay schemas in Phase 1.  
4. If Impact Relay lands earlier than payments, sync **pledged** winning bids only with clear labeling; switch to paid when Phase 2 ships.
