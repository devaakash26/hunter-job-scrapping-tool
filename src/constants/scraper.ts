export const SCRAPER = {
  BROWSER_TIMEOUT_MS: 30000,
  NAVIGATION_TIMEOUT_MS: 30000,
  WAIT_FOR_SELECTOR_TIMEOUT_MS: 15000,
  COOKIE_SAVE_WAIT_MS: 60000,
  MAX_JOBS_PER_PLATFORM: 50,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  HEADLESS: true,
  SLOW_MO_MS: 0,
} as const;

export const FALLBACK_DIR = 'fallback';
export const COOKIES_DIR = 'cookies';
