# Data Model — Silent Auction MVP

MVP-only schema. Prefer one relational database with transactions.

## Important gap: User

The product brief says “Reuse existing User model. Do not duplicate users.”

**OBSERVED:** This repository has **no User model** (see CURRENT_STATE.md).

**MVP decision:** Introduce a single minimal `User` table as the identity source for bidders and admins. Do not create a second parallel user store inside the auction feature. If a shared Dojo identity store is later approved, migrate to it rather than duplicating.

## Entity relationship

```text
User 1 --- * Bid
User 1 --- * Notification
Artwork 1 --- * Bid
Artwork * --- (admin managed by) User(role=admin)
```

Note: Bid field `auction_id` in the brief maps to **Artwork.id** (each artwork listing is an auction lot in MVP). Column name in DB: `artwork_id` (clearer). API may accept `auction_id` as an alias if needed for brief compatibility — prefer `artwork_id` in code.

## Physical table names (Slice 0)

Implementation uses an `auction_` prefix so the schema can share a Postgres database with other Dojo apps:

| Logical entity | Table |
|----------------|--------|
| User | `auction_users` |
| Artwork | `auction_artworks` |
| Bid | `auction_bids` |
| Notification | `auction_notifications` |
| Login token (magic-link / OTP) | `auction_login_tokens` |
| Migration bookkeeping | `auction_schema_migrations` |
## Tables

### User (**NEW** — required)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial PK | |
| email | citext/text unique not null | Login identifier |
| name | text null | Display name |
| role | text not null default `bidder` | `bidder` \| `admin` |
| created_at | timestamptz not null | |

Optional later (not MVP-required): `email_verified_at`, password hash (only if magic-link rejected).

### Artwork

| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial PK | |
| title | text not null | |
| artist | text not null | |
| description | text not null default `''` | |
| images | jsonb/text[] not null default `[]` | URLs or storage keys; first = primary |
| starting_bid | numeric(12,2) not null | >= 0 |
| current_bid | numeric(12,2) null | Null until first accepted bid; then max bid |
| minimum_increment | numeric(12,2) not null | > 0 |
| ends_at | timestamptz not null | |
| status | text not null | `draft` \| `preview` \| `active` \| `closed` |
| created_at | timestamptz not null | |
| updated_at | timestamptz not null | |
| winner_user_id | fk User null | Set when closed with bids |
| created_by | fk User null | Admin who created |

**Minimum next bid (derived, not stored):**

- If `current_bid` is null → `starting_bid`
- Else → `current_bid + minimum_increment`

### Bid

| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial PK | |
| artwork_id | fk Artwork not null | Brief name: `auction_id` |
| user_id | fk User not null | |
| amount | numeric(12,2) not null | |
| created_at | timestamptz not null | |

Indexes:

- `(artwork_id, amount DESC, created_at DESC)`
- `(user_id, created_at DESC)`

### Notification

| Column | Type | Notes |
|--------|------|-------|
| id | uuid / bigserial PK | |
| user_id | fk User not null | |
| type | text not null | See EMAILS.md type keys |
| artwork_id | fk Artwork null | Context when applicable |
| bid_id | fk Bid null | Context when applicable |
| sent_at | timestamptz null | Null = pending/failed; set on success |
| created_at | timestamptz not null | |
| meta | jsonb null | Optional template vars / provider id |

Unique-ish guard for idempotent “ending soon”: unique `(type, user_id, artwork_id)` where `type = auction_ending_soon` (partial unique index if supported).

## Status lifecycle (Artwork)

```text
draft → preview → active → closed
                 ↘_________↗
```

- `draft`: admin only  
- `preview`: public visible, bidding disabled  
- `active`: public + bidding until `ends_at`  
- `closed`: no bids; winner may be set  

## Integrity rules

1. Accepted bid `amount` must be ≥ minimum next bid at commit time.  
2. Reject if `status != active` or `now() >= ends_at`.  
3. Update `current_bid` in the **same transaction** as insert Bid.  
4. Prefer `SELECT … FOR UPDATE` on Artwork row (or equivalent) to prevent lost updates.  
5. Users are never duplicated per email.

## What we are not modeling in MVP

- Payment intents / invoices  
- Shipping addresses  
- Watchlists (optional later)  
- Soft-delete / archive beyond `status`  
- Multi-lot “Event” parent (each Artwork is the lot)
