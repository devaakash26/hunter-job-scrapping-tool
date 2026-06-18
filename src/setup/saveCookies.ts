import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { PLATFORM_LOGIN_URLS, SCRAPER, COOKIES_DIR } from '../constants';

const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_LOGIN_URLS);

async function saveCookies(platform: string): Promise<void> {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    console.error(`Unknown platform: ${platform}`);
    console.error(`Supported: ${SUPPORTED_PLATFORMS.join(', ')}`);
    process.exit(1);
  }

  const loginUrl = PLATFORM_LOGIN_URLS[platform as keyof typeof PLATFORM_LOGIN_URLS];
  const cookiesDir = path.join(process.cwd(), COOKIES_DIR);
  const cookiePath = path.join(cookiesDir, `${platform}.json`);

  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir, { recursive: true });
  }

  console.log(`\n[SETUP] Opening browser for ${platform.toUpperCase()}...`);
  console.log(`[SETUP] Login URL: ${loginUrl}`);
  console.log(`[SETUP] You have 60 seconds to log in. The browser will close automatically.\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: SCRAPER.SLOW_MO_MS,
  });

  const context = await browser.newContext({ userAgent: SCRAPER.USER_AGENT });
  const page = await context.newPage();

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  console.log(`[SETUP] Browser opened. Please log in to ${platform.toUpperCase()} now.`);
  console.log(`[SETUP] Waiting ${SCRAPER.COOKIE_SAVE_WAIT_MS / 1000} seconds...`);

  await page.waitForTimeout(SCRAPER.COOKIE_SAVE_WAIT_MS);

  const storageState = await context.storageState();
  fs.writeFileSync(cookiePath, JSON.stringify(storageState, null, 2));

  await browser.close();

  console.log(`\n[SETUP] ✅ Cookies saved to ${cookiePath}`);
  console.log(`[SETUP] Cookie count: ${storageState.cookies.length}`);
}

const platform = process.argv[2];
if (!platform) {
  console.error('Usage: npx ts-node src/setup/saveCookies.ts <platform>');
  console.error(`Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}`);
  process.exit(1);
}

saveCookies(platform).catch((err) => {
  console.error('[SETUP] ERROR:', err);
  process.exit(1);
});
