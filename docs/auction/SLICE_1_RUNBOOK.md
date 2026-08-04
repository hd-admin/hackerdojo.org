# Slice 1 — Browse runbook

Depends on [Slice 0](./SLICE_0_RUNBOOK.md).

## What shipped

| Piece | Path |
|-------|------|
| List API | `GET /api/auction/artworks` |
| Detail API | `GET /api/auction/artworks/:id` |
| Serialization | `lib/auction/artworks.js` |
| Demo seed | `npm run auction:seed-demo` |
| Gallery | `/auction/` → `auction/index.html` |
| Detail | `/auction/artwork/?id=<uuid>` → `auction/artwork.html` |
| Client JS/CSS | `static/js/auction.js`, `static/css/auction.css` |
| Nav link | header → Auction |

## Local demo

```bash
cp .env.example .env.local   # DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL
npm install
npm run auction:bootstrap    # migrate + admin + demo lot

# Terminal A — API
npx vercel dev
# Terminal B — site
bundle exec jekyll serve
```

Open `http://localhost:4000/auction/` (or Jekyll’s port).

If the API is on another origin, set before loading auction.js:

```html
<script>window.HD_AUCTION_API = 'http://localhost:3000';</script>
```

## Done when

- [x] Gallery loads lots from API  
- [x] Detail shows current/starting bid + ticking countdown  
- [x] Bid CTA disabled / “coming soon” (Slice 2 enables place-bid)  

**Next:** Slice 2 — login + place bid.
