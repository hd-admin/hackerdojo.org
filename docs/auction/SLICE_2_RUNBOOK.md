# Slice 2 — Bid runbook

Depends on [Slice 0](./SLICE_0_RUNBOOK.md) + [Slice 1](./SLICE_1_RUNBOOK.md).

## What shipped

| Piece | Path |
|-------|------|
| Request OTP | `POST /api/auction/auth/request-link` |
| Verify + session cookie | `POST /api/auction/auth/verify` |
| Session / logout | `GET` / `DELETE /api/auction/auth/session` |
| Me | `GET /api/auction/me` |
| Place bid | `POST /api/auction/bids` (row lock + validation) |
| Email helper | `lib/auction/email.js` (Resend; optional) |
| Login + bid modal | `static/js/auction.js` |

## Auth flow

1. User opens **Place bid** on an active lot.  
2. If not signed in → email (+ optional name) → 6-digit OTP emailed (or `dev_otp` when Resend is unset).  
3. Verify → HTTP-only `hd_auction_session` cookie.  
4. Submit amount ≥ minimum next bid → 201 + refreshed lot.

## Dev without Resend

Leave `RESEND_API_KEY` empty. The request-link response includes `dev_otp` so you can complete login locally.

## Smoke checklist

- [ ] Request code for a real email (or use `dev_otp`)  
- [ ] Verify → session shows “Signed in as …”  
- [ ] Place minimum bid → current bid updates  
- [ ] Lower bid → `BID_TOO_LOW`  
- [ ] Second user outbids → previous high (if email configured) gets outbid mail  
- [ ] Log out clears session  

## Done when

- [x] Logged-in user can place a valid bid  
- [x] Invalid / late bids fail cleanly  
- [x] Bid CTA wired on artwork page  

**Next:** Slice 3 — admin create / edit / close.
