# Job Hunter 🎯

Automated job scraping system that monitors Wellfound, Cutshort, Instahyre, LinkedIn, and Y Combinator for new listings, filters them by your profile, sends Slack alerts, and hosts a dashboard to track applications.

---

## Features

- Scrapes 5 platforms every day at **9 AM IST** and **6 PM IST**
- Filters by role keywords, salary (≥10 LPA or "Not mentioned"), location (Remote/Bangalore/India), and experience (0–2 years)
- Deduplicates against the database — only alerts for new jobs
- Sends Slack Block Kit notifications (up to 15 per run)
- Express dashboard with status tracking (new → saved → applied → interview → rejected → offer)
- Manual run endpoint (`GET /run-now`) with API key auth
- Fallback to JSON files when the database is unavailable

---

## Local Setup

### 1. Prerequisites

- Node.js v18+
- A Supabase project (free tier works)
- A Slack Incoming Webhook URL

### 2. Clone and install

```bash
git clone <repo-url>
cd job-hunter
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DASHBOARD_API_KEY=choose_a_strong_secret
PORT=3000
NODE_ENV=development
```

### 4. Run the database migration

The migration creates the `jobs` table with all required columns and indexes.

Option A — via TypeORM CLI:
```bash
npx typeorm migration:run -d src/config/database.ts
```

Option B — run the SQL directly in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  company VARCHAR NOT NULL,
  location VARCHAR,
  salary VARCHAR DEFAULT 'Not mentioned',
  url VARCHAR NOT NULL,
  source VARCHAR NOT NULL,
  tags VARCHAR,
  "postedAt" VARCHAR,
  "easyApply" BOOLEAN DEFAULT FALSE,
  "ycBatch" VARCHAR,
  status VARCHAR DEFAULT 'new',
  alerted BOOLEAN DEFAULT FALSE,
  "appliedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_company_title_source UNIQUE (company, title, source)
);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company);
```

### 5. Build and run

```bash
# Development (ts-node, no build step)
npm run dev

# Production
npm run build
npm start
```

Dashboard is at: `http://localhost:3000`

---

## Cookie Auth Setup

Some platforms (Wellfound, Cutshort, LinkedIn) require login. Use the cookie saver to authenticate once — the scraper reuses the saved session.

```bash
# Save cookies for LinkedIn
npx ts-node src/setup/saveCookies.ts linkedin

# Save cookies for Wellfound
npx ts-node src/setup/saveCookies.ts wellfound

# Save cookies for Cutshort
npx ts-node src/setup/saveCookies.ts cutshort
```

This opens a **visible browser** window. You have 60 seconds to complete the login. The session is saved to `cookies/{platform}.json` (gitignored).

**Cookie expiry:** If scraping returns 0 jobs for an auth-required platform, re-run the cookie saver for that platform.

---

## Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your project's database password and project ref
3. Go to **Settings → Database** → copy the **Connection string (URI)**
4. Paste it as `DATABASE_URL` in your `.env`
5. Run the migration above

---

## Railway Deployment

1. Push your code to GitHub (`.env`, `cookies/`, `fallback/` are gitignored — never commit them)
2. Go to [railway.app](https://railway.app) → New project → Deploy from GitHub
3. Add all environment variables from `.env.example` in the Railway dashboard
4. Railway auto-detects Node.js. The `Procfile` tells it to run `node dist/index.js`
5. The `postinstall` script installs Chromium automatically

### Railway env vars to set:
```
SLACK_WEBHOOK_URL
DATABASE_URL
DASHBOARD_API_KEY
NODE_ENV=production
PORT=3000
```

> **Note:** Cookie-based auth (LinkedIn, Wellfound, Cutshort) won't work on Railway because you can't run a visible browser remotely. For production, either use Instahyre + YC (no auth) or set up cookie files as base64 environment variables and decode them at startup.

---

## Testing the Pipeline

Insert a dummy job and run the pipeline end to end:

```bash
# 1. Start the server
npm run dev

# 2. In another terminal, trigger a manual run
curl -H "x-api-key: your_secret_key_here" http://localhost:3000/run-now
```

Or, insert directly into Supabase and check Slack:

```sql
INSERT INTO jobs (title, company, location, salary, url, source, tags, "postedAt", "easyApply", status, alerted)
VALUES (
  'Full Stack Engineer', 'Test Company', 'Remote', '12 LPA',
  'https://example.com/job/123', 'yc', 'Node.js, React', 'Today', FALSE, 'new', FALSE
);
```

Then call `/run-now` — the dedup service will skip re-inserting but Slack will receive an alert for the unalerted row.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Jobs dashboard |
| GET | `/stats` | None | Stats page |
| POST | `/update-status` | None | Update job status |
| GET | `/run-now` | `x-api-key` | Trigger pipeline immediately |
| GET | `/health` | None | Health check |

### POST /update-status

```json
{ "jobId": 42, "status": "applied" }
```

Valid statuses: `new`, `saved`, `applied`, `interview`, `rejected`, `offer`

---

## Project Structure

```
src/
├── config/          # DB + env config
├── constants/       # All hardcoded values (no strings in logic files)
├── types/           # TypeScript interfaces
├── entities/        # TypeORM Job entity
├── scrapers/        # One scraper per platform + base class
├── services/        # FilterService, DedupService, SlackService, ScraperService
├── cron/            # node-cron scheduler
├── dashboard/       # Express routes + DB queries
├── setup/           # Cookie saver script
└── migrations/      # TypeORM migration
```

---

## Cron Schedule

| Job | UTC | IST |
|-----|-----|-----|
| Morning | `30 3 * * *` | 9:00 AM |
| Evening | `30 12 * * *` | 6:00 PM |

Timezone: `Asia/Kolkata` (handled by node-cron)
