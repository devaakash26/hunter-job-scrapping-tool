export const SCRAPER = {
  BROWSER_TIMEOUT_MS: 30000,
  NAVIGATION_TIMEOUT_MS: 30000,
  WAIT_FOR_SELECTOR_TIMEOUT_MS: 15000,
  COOKIE_SAVE_WAIT_MS: 60000,
  // Settle delay after a page load, before reading the DOM.
  PAGE_SETTLE_MS: 3000,
  // Single-site DOM scrapers cap per platform; multi-company ATS scrapers cap per company.
  MAX_JOBS_PER_PLATFORM: 50,
  MAX_JOBS_PER_COMPANY: 15,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  HEADLESS: true,
  SLOW_MO_MS: 0,
} as const;

// Per-host budgets for bot-protected sites. Every request to a host goes
// through one shared queue (see utils/request-queue.ts), so scrapers can't
// stampede a site even when they run in parallel.
export const RATE_LIMIT = {
  // LinkedIn guest API bans aggressively — 1 request every 3s, strictly serial.
  LINKEDIN: { interval: 3000, intervalCap: 1, concurrency: 1 },
  DEFAULT: { interval: 1000, intervalCap: 2, concurrency: 2 },
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 2000,
} as const;

// LinkedIn guest jobs API (no login/cookies needed) — same approach as the
// acciojob-cloud-run-jobs companyLeadEvaluationPipeline LinkedIn collector.
export const LINKEDIN = {
  SEARCH_URL: 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search',
  DETAIL_URL: 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting',
  ROLES: ['Software Engineer', 'SDE', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer'],
  LOCATION: 'India',
  // f_E: 1=Internship 2=Entry 3=Associate — we want 0-2 yrs so entry+associate.
  EXPERIENCE_LEVELS: '2,3',
  // f_TPR=r172800 → posted in the last 48 hours.
  POSTED_WITHIN: 'r172800',
  ITEMS_PER_PAGE: 10,
  // Detail pages are fetched one-by-one through the LinkedIn queue; cap how
  // many we hydrate per run to keep the pipeline under a few minutes.
  MAX_DETAIL_FETCHES: 40,
  // Rotated per request so the guest API sees varied clients.
  USER_AGENTS: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ],
} as const;

export const FALLBACK_DIR = 'fallback';
export const COOKIES_DIR = 'cookies';
