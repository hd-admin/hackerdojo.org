# Current State — Repository Audit

Audit of [hd-admin/hackerdojo.org](https://github.com/hd-admin/hackerdojo.org) (`main` at documentation time).  
Findings are separated into **OBSERVED**, **INFERRED**, and **UNKNOWN**. No speculative architecture is treated as fact.

## Current repository (summary)

| Area | Finding |
|------|---------|
| Framework | **OBSERVED:** Jekyll `~> 4.3` (Ruby), `minima` theme gem, `jekyll-feed` plugin |
| Routing | **OBSERVED:** File-based static HTML pages with Jekyll front matter (`layout`, `title`); includes under `_includes/`, layouts under `_layouts/` |
| ORM / database | **OBSERVED:** None in repository |
| Auth | **OBSERVED:** No in-repo authentication or session system. Header/footer link to external Nexudus member portal (`hackerdojo.spaces.nexudus.com`) |
| Email system | **OBSERVED:** No outbound email sender, templates, or mailer library in repository |
| UI framework | **OBSERVED:** Custom HTML + `static/css/style.css`; Google Fonts (Rajdhani, Saira); Swiper; page-local Tailwind CDN on `priority-waitlist.html` |
| Testing framework | **OBSERVED:** No test directory, test runner, or CI test workflow |
| Deployment | **OBSERVED:** GitHub Pages deployments (`github-pages` environment); `CNAME` = `hackerdojo.org` |
| Serverless API | **OBSERVED:** `api/waitlist.js` — Vercel-style `export default async function handler(req, res)` proxying POST bodies to an Airtable webhook |
| Admin UI | **OBSERVED:** No in-repo admin application |
| Docs folder | **OBSERVED:** `docs/auction/` planning package (Auction Space / Silent Auction MVP); no other feature docs trees |
| Docs folder | **OBSERVED:** No prior `docs/` tree (this package introduces `docs/auction/`) |
| CI workflows | **OBSERVED:** `.github/CODEOWNERS` only; no `.github/workflows/` |

## OBSERVED

### Stack and structure

- Root `Gemfile` / `Gemfile.lock` pin Jekyll 4.3.x and related gems.
- Local preview scripts: `start.sh` (`bundle exec jekyll serve --livereload --trace`), `devstart.sh` (`bundle exec jekyll serve`).
- Site shell: `_layouts/default.html` wraps content with `_includes/header.html` and `_includes/footer.html`.
- Homepage composes sections via `{% include_relative pages/home/... %}`.
- Static assets under `static/` (CSS, JS, images, vendored Swiper).
- Languages (GitHub API): primarily HTML, then CSS, JavaScript, small Ruby/Shell.

### Integration points present today

1. **`api/waitlist.js`** — Serverless POST handler; CORS open (`*`); forwards JSON to Airtable workflow webhook; returns upstream JSON.  
2. **`priority-waitlist.html`** — Client form posts to `/api/waitlist`; comment in page source refers to a “Vercel rewrite”.  
3. **External membership** — Links to Nexudus login / public membership pages.  
4. **Fundraising** — Donate links to FundRazr (external).  
5. **Analytics** — Google gtag `AW-880343912` in header.  
6. **CODEOWNERS** — Requires review by listed owners for all changes.

### What is not present

- No User / Account model or schema files.  
- No database client, migrations, Prisma/ActiveRecord/SQL files.  
- No session cookies, JWT helpers, OAuth callbacks, or password flows in-repo.  
- No Resend/SendGrid/Postmark/SMTP/Nodemailer (or similar) integration.  
- No Redis, queue workers, WebSocket servers.  
- No `vercel.json`, `netlify.toml`, or `_config.yml` in the repository tree at audit time.  
- No automated tests.

## INFERRED

These are reasonable conclusions from observed code, not confirmed configuration.

| Inference | Basis |
|-----------|--------|
| Marketing site is primarily static and built/served via GitHub Pages | `CNAME`, repeated `github-pages` deployments, Jekyll structure |
| Waitlist API is intended to run as a Vercel (or Vercel-compatible) serverless function | Handler signature + page comment about “Vercel rewrite”; path `/api/waitlist` |
| Dual hosting may be in play (Pages for static, serverless host for `api/`) | Static Pages deployments + `api/*.js` pattern without Pages Functions config in-repo |
| Tailwind is optional/page-local, not a site-wide build dependency | CDN script only on waitlist page; main site uses custom CSS |
| Member identity lives in Nexudus, not this repo | Login links only; no Nexudus API usage found in-repo |

## UNKNOWN

| Question | Why it matters for auction MVP |
|----------|--------------------------------|
| Is there an active Vercel (or other) project wired to this repo for `api/`? | Determines where bid APIs should deploy |
| Can GitHub Pages alone serve `/api/*`, or must serverless hosting be confirmed? | Deployment architecture |
| Is Nexudus available as an auth provider for bidders (API/SSO)? | Whether “reuse existing auth” can mean Nexudus vs new light auth |
| Airtable base ownership / whether auction data should live in Airtable vs a real DB | Data store choice; waitlist already uses Airtable webhooks |
| Who operates production secrets (webhook URLs, future API keys)? | Security and ops |
| Preferred email provider for transactional mail | EMAILS.md implementation |
| Whether `dojo-earth.vercel.app` or other Dojo apps share auth/DB we should reuse | Avoid duplicate users if a shared User store exists elsewhere |

## Integration points for Silent Auction (planning)

| Existing piece | Reuse approach |
|----------------|----------------|
| Jekyll pages + default layout | Add auction gallery / artwork / admin pages as static (or lightly dynamic) pages |
| `static/css/style.css` + fonts | Match site look; avoid site redesign |
| `api/*.js` handler style | Add bid/admin API handlers beside `waitlist.js` |
| Airtable webhook pattern | Optional for ops notifications only — **not** assumed as system of record for bids unless approved |
| Nexudus | Do **not** assume reusable auth until UNKNOWN is resolved |
| CODEOWNERS | All auction PRs still require owner review |

## Risks

1. **Infrastructure gap:** MVP needs User identity, durable storage, and email — none exist in-repo. Implementation will introduce new dependencies; this must be an explicit, reviewed decision.  
2. **Hosting ambiguity:** Static Pages + serverless `api/` without checked-in host config risks “works locally / fails in prod”.  
3. **Auth gap vs prompt expectation:** Planning docs that say “reuse existing User model” cannot literally do so — there is no User model here. See DATA_MODEL.md.  
4. **Concurrency:** Silent auction bids need race-safe “highest bid wins” updates; a static site alone cannot provide this.  
5. **Public webhook pattern:** Current waitlist proxies to a hardcoded Airtable webhook URL in source — auction must not copy secrets into the client or commit durable credentials carelessly.

## Unknowns that block implementation (not documentation)

- Approved database  
- Approved auth mechanism  
- Approved email provider  
- Confirmed serverless host for `api/`  

Planning docs are in place. Coding should wait until those four are recorded in [DECISIONS.md](./DECISIONS.md).
Documentation can proceed; coding should wait until those four are decided in review of this PR.
