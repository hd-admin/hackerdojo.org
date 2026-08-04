# Start Here

## Reading order

1. [README.md](./README.md) — overview and index  
2. [CURRENT_STATE.md](./CURRENT_STATE.md) — what the repo actually is today  
3. [REQUIREMENTS.md](./REQUIREMENTS.md) — what the MVP must do  
4. [SLICES.md](./SLICES.md) — **how to build** (easy vertical slices → minimal fully functional auction)  
5. [DECISIONS.md](./DECISIONS.md) — **fill before coding** (DB, auth, email, API host)  
6. [ARCHITECTURE.md](./ARCHITECTURE.md) — how it fits this repo  
7. [DATA_MODEL.md](./DATA_MODEL.md) — tables and relationships  
8. [API.md](./API.md) — REST surface  
9. [UI.md](./UI.md) — page wireframes  
10. [EMAILS.md](./EMAILS.md) — notification catalog  
11. [SECURITY.md](./SECURITY.md) — threats and controls  
12. [ACCEPTANCE.md](./ACCEPTANCE.md) — how we know it works  
13. [ROADMAP.md](./ROADMAP.md) — phases 0–4  
14. [TODO.md](./TODO.md) — task checklist by slice  

## How to implement (after Phase 0 decisions)

1. Record DB / auth / email / API host in [DECISIONS.md](./DECISIONS.md) (closes T00d).  
2. Build **only** [SLICES.md](./SLICES.md) **0 → 5**, in order.  
3. After Slice 5, stop — that is the **minimal fully functional** Auction Space.  
5. [ARCHITECTURE.md](./ARCHITECTURE.md) — how it fits this repo  
6. [DATA_MODEL.md](./DATA_MODEL.md) — tables and relationships  
7. [API.md](./API.md) — REST surface  
8. [UI.md](./UI.md) — page wireframes  
9. [EMAILS.md](./EMAILS.md) — notification catalog  
10. [SECURITY.md](./SECURITY.md) — threats and controls  
11. [ACCEPTANCE.md](./ACCEPTANCE.md) — how we know it works  
12. [ROADMAP.md](./ROADMAP.md) — phases 0–4  
13. [TODO.md](./TODO.md) — task checklist by slice  

## How to implement (after this PR is approved)

1. Finish Phase 0 decisions (DB, auth, email, API host).  
2. Build **only** [SLICES.md](./SLICES.md) **0 → 5**, in order.  
3. After Slice 5, stop — that is the **minimal fully functional** auction.  
4. Later: Phase 2 payments → Phase 3 transparency → Phase 4 Impact Relay.

```text
Browse → Bid → Admin → Emails → Ship  =  usable fundraiser
```

## Assumptions

- Reviewers accept that MVP introduces a small backend surface (DB + auth + email) because none exist in this repository today. See CURRENT_STATE.md.  
- Auction UI is added as Jekyll pages under the existing site, reusing `_layouts/default.html`, header/footer, and existing CSS/fonts where practical.  
- Bid API handlers follow the existing `api/*.js` serverless style used by `api/waitlist.js`.  
- No WebSockets, Redis, message queues, or microservices.  
- Countdown and “current bid” refresh via normal page load / lightweight client fetch — not live sockets.  
- Payments are out of scope for MVP (settle offline or Phase 2).  

## Scope

**Minimal fully functional (Slices 0–5):** artwork listing, artwork detail, authenticated bid, countdown, admin management, core emails.

**Later:** payments, donor transparency, Impact Relay.

**Out of scope always (for now):** marketplace features, live bidding, site redesign.

Keep every PR about the size of one slice (or one task inside a slice).
