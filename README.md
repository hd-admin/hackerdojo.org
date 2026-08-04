# HackerDojo.org

This is the website for Hacker Dojo. It is a collaborative hackerspace where tech enthusiasts gather to build, experiment and improve.

# Setup

This project uses [Jekyll](https://jekyllrb.com/) which relies on [Ruby](https://www.ruby-lang.org/)
to build the website's codebase.

## Installation

- [Install Ruby 3+](https://www.ruby-lang.org/en/documentation/installation/)
- `gem install jekyll bundler`

### Usage

Once all pre-requisites are installed, you can preview the website using:

```sh
jekyll serve
```

## Auction Space (Silent Auction)

Fundraising silent auction for art (and donated lots), planned and implemented in slices on top of this site.

| Doc | Purpose |
|-----|---------|
| [docs/auction/START_HERE.md](./docs/auction/START_HERE.md) | Reading order |
| [docs/auction/DECISIONS.md](./docs/auction/DECISIONS.md) | Infrastructure choices (Postgres, magic-link, Resend, Vercel) |
| [docs/auction/SLICES.md](./docs/auction/SLICES.md) | Build order |
| [docs/auction/SLICE_0_RUNBOOK.md](./docs/auction/SLICE_0_RUNBOOK.md) | Bootstrap (DB migrate + admin seed) |
| [docs/auction/SLICE_1_RUNBOOK.md](./docs/auction/SLICE_1_RUNBOOK.md) | Browse (gallery + detail + countdown) |
| [docs/auction/SLICE_2_RUNBOOK.md](./docs/auction/SLICE_2_RUNBOOK.md) | Bid (OTP login + place bid) |
| [docs/auction/SLICE_3_RUNBOOK.md](./docs/auction/SLICE_3_RUNBOOK.md) | Admin (create / edit / close) |
| [docs/auction/SLICE_4_RUNBOOK.md](./docs/auction/SLICE_4_RUNBOOK.md) | Emails + ending-soon / auto-close cron |

### Auction bootstrap (Slices 0–1)

Requires Node 20+ and a Postgres `DATABASE_URL`.

```sh
cp .env.example .env.local   # set DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL
npm install
npm run auction:bootstrap    # migrate + seed admin + demo lot
```

- Health: `GET /api/auction/health`
- Gallery: `/auction/`
- Lot detail: `/auction/artwork/?id=<uuid>`
## Silent Auction MVP (Planning)

See [docs/auction](./docs/auction).
