# Job Hunter 🎯

Automated job scraping system that monitors **50+ companies** across 5 job boards and 4 ATS platforms twice daily. Filters by role, salary, and experience — deduplicates against the database, sends Slack alerts, and surfaces everything in a personal React dashboard.

**Stack:** Playwright · Express · TypeORM · Supabase PostgreSQL · QStash · React + Vite · Railway · Vercel

---

## Architecture

```
QStash (cron)
    ↓  HMAC-signed webhook  POST /trigger
Railway (Express + Playwright)
    ↓  scrape 50+ sources
    ↓  deduplicate against DB
Supabase PostgreSQL ← store new jobs
    ↓
Slack Bot ← alert up to 15 new jobs/run
Vercel (React) ← browse, filter, track
```

Runs at **9 AM IST** and **6 PM IST** daily. Manual trigger available in the dashboard.

---

## Platforms Covered

| Category | Platforms |
|---|---|
| **Job Boards** | Wellfound, Cutshort, Instahyre, LinkedIn, YC (Work at a Startup) |
| **Big 4** | Google, Microsoft, Amazon, Oracle |
| **Greenhouse ATS** | Groww, CRED, Freshworks, BrowserStack, Hasura, Postman, Databricks, MongoDB, Stripe, Figma, Cloudflare, Anthropic, OpenAI, Chargebee, ShareChat, GitLab, Rubrik, Coinbase, ScaleAI, HackerRank, Twilio, Notion |
| **Lever ATS** | Swiggy, Razorpay, Zepto, Meesho, Scaler, Dream11, Urban Company, Nykaa, Dunzo |
| **SmartRecruiters** | InMobi, MakeMyTrip, Cars24, Unacademy |
| **Playwright** | Zomato, Blinkit, PhonePe, Flipkart, Paytm, Myntra, Walmart Tech, Airbnb |

---

## Local Setup

### Prerequisites

- Node.js v18+
- Supabase project (free tier works)
- Slack App with Bot Token + Channel ID
- Upstash QStash account (for cron, free tier works)

### 1. Clone and install

```bash
git clone https://github.com/devaakash26/hunter-job-scrapping-tool
cd hunter-job-scrapping-tool
npm install

# Install frontend deps
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — see [Environment Variables](#environment-variables) below.

### 3. Create the database table

Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR NOT NULL,
  company     VARCHAR NOT NULL,
  location    VARCHAR,
  salary      VARCHAR DEFAULT 'Not mentioned',
  url         VARCHAR NOT NULL,
  source      VARCHAR NOT NULL,
  tags        VARCHAR,
  "postedAt"  VARCHAR,
  "easyApply" BOOLEAN DEFAULT FALSE,
  "ycBatch"   VARCHAR,
  status      VARCHAR DEFAULT 'new',
  alerted     BOOLEAN DEFAULT FALSE,
  "appliedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_company_title_source UNIQUE (company, title, source)
);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs (source);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
```

### 4. Save cookies for auth-required platforms

LinkedIn, Wellfound, and Cutshort require login. This opens a visible browser — you have 60 seconds to sign in.

```bash
npx ts-node src/setup/saveCookies.ts linkedin
npx ts-node src/setup/saveCookies.ts wellfound
npx ts-node src/setup/saveCookies.ts cutshort
```

Cookies are saved to `cookies/*.json` (gitignored). Re-run if a platform returns 0 jobs.

### 5. Start the servers

```bash
# Backend (port 4000)
npm run dev

# Frontend (port 5173) — in a new terminal
cd frontend && npm run dev
```

Dashboard: `http://localhost:5173`

---

## Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase Transaction Pooler URL (port 6543) |
| `NODE_ENV` | ✅ | Set to `production` on Railway |
| `AUTH_SECRET` | ✅ | Random 32-byte hex: `openssl rand -hex 32` |
| `FRONTEND_URL` | ✅ | Vercel URL (controls CORS). Comma-separated for multiple. |
| `QSTASH_CURRENT_SIGNING_KEY` | ✅ | From Upstash Console → QStash → Signing Keys |
| `QSTASH_NEXT_SIGNING_KEY` | ✅ | Rotation key — same place |
| `AUTH_USERNAME` | optional | Login username (default: `admin26`) |
| `AUTH_PASSWORD` | optional | Login password |
| `SLACK_BOT_TOKEN` | optional | Bot OAuth token (`xoxb-…`) |
| `SLACK_CHANNEL_ID` | optional | Channel ID for job alerts |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Your Railway backend URL |

---

## Deployment

### Railway (Backend)

1. Push to GitHub
2. Railway → New Project → Deploy from GitHub
3. Add all backend env vars in Railway Variables tab
4. `Procfile` runs: `node dist/index.js`
5. `postinstall` script installs Chromium automatically

### Vercel (Frontend)

1. Vercel → New Project → Import repo
2. Root directory: `./` (uses `vercel.json` at repo root)
3. Add env var: `VITE_API_URL = https://your-app.railway.app`
4. Deploy
5. Update Railway's `FRONTEND_URL` to the Vercel URL

### QStash (Cron)

1. [console.upstash.com](https://console.upstash.com) → QStash → Create Schedule
2. URL: `https://your-app.railway.app/trigger`
3. Schedule 1: `30 3 * * *` → 9:00 AM IST
4. Schedule 2: `30 12 * * *` → 6:00 PM IST
5. Copy both signing keys to Railway env vars

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Returns Bearer token |
| `POST` | `/api/auth/logout` | None | Clears session |
| `GET` | `/api/jobs` | Bearer | Paginated job list with filters |
| `POST` | `/update-status` | Bearer | Update job pipeline status |
| `GET` | `/api/stats` | Bearer | Aggregated stats |
| `POST` | `/run-scraper` | Bearer | Manually trigger scraping pipeline |
| `POST` | `/trigger` | QStash HMAC | QStash cron webhook |
| `GET` | `/health` | None | `{"status":"ok"}` |

### GET /api/jobs — query params

| Param | Values | Default |
|---|---|---|
| `status` | `all`, `new`, `saved`, `applied`, `interview`, `rejected`, `offer` | `all` |
| `sortBy` | `newest`, `oldest`, `company` | `newest` |
| `search` | string | — |
| `source` | platform name | — |
| `easyApply` | `1` | — |
| `hasSalary` | `1` | — |
| `page` | integer | `1` |

---

## Project Structure

```
src/
├── config/          # Database + env config
├── constants/       # Platforms, filters, dashboard, scraper, Slack config
├── entities/        # TypeORM Job entity
├── middleware/       # requireAuth, HMAC verification
├── scrapers/        # One scraper per platform + base class
├── services/        # ScraperService, FilterService, DedupService, SlackService
├── dashboard/       # Express router + DashboardService
├── setup/           # Cookie saver + exporter scripts
└── types/           # Shared TypeScript interfaces

frontend/
├── src/
│   ├── pages/       # LoginPage, DashboardPage, StatsPage
│   ├── components/  # Sidebar, ErrorBoundary
│   └── lib/         # api.ts, types.ts, constants.ts
└── vite.config.ts   # Dev proxy → localhost:4000
```

---

## Job Status Pipeline

```
new → saved → applied → interview → rejected
                                  ↘ offer
```

Change status directly from the job card dropdown. Stats page shows response rate and weekly trends.

---

## Cookie Auth Note

LinkedIn, Wellfound, and Cutshort require a logged-in browser session. Cookies expire — if a platform returns 0 results, re-run `saveCookies.ts` for that platform. Railway can't open a visible browser, so save cookies locally and export them:

```bash
npx ts-node src/setup/exportCookies.ts
# Sets WELLFOUND_COOKIES / LINKEDIN_COOKIES / CUTSHORT_COOKIES env vars (base64)
```

Then set those as Railway environment variables.
