import { Browser, BrowserContext } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';

export abstract class BaseScraper {
  abstract platform: string;
  abstract scrape(): Promise<RawJob[]>;

  protected async withBrowser<T>(
    fn: (browser: Browser, context: BrowserContext) => Promise<T>,
    cookiePath?: string,
  ): Promise<T> {
    const browser = await this.launchBrowser();

    try {
      let context: BrowserContext;

      if (cookiePath && fs.existsSync(cookiePath)) {
        const storageState = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
        context = await browser.newContext({ storageState, userAgent: SCRAPER.USER_AGENT });
        this.log(`Loaded cookies from ${cookiePath}`);
      } else {
        context = await browser.newContext({ userAgent: SCRAPER.USER_AGENT });
      }

      context.setDefaultTimeout(SCRAPER.BROWSER_TIMEOUT_MS);
      context.setDefaultNavigationTimeout(SCRAPER.NAVIGATION_TIMEOUT_MS);

      return await fn(browser, context);
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser(): Promise<Browser> {
    if (process.env.VERCEL) {
      // Serverless: @sparticuz/chromium provides a Lambda-compatible binary
      const chromiumSparticuz = await import('@sparticuz/chromium');
      const { chromium } = await import('playwright-core');
      return chromium.launch({
        args: chromiumSparticuz.default.args,
        executablePath: await chromiumSparticuz.default.executablePath(),
        headless: true,
      });
    }

    // Local dev: use playwright's bundled Chromium
    const { chromium } = await import('playwright');
    return chromium.launch({
      headless: SCRAPER.HEADLESS,
      slowMo: SCRAPER.SLOW_MO_MS,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }

  protected buildCookiePath(fileName: string): string {
    return path.join(process.cwd(), 'cookies', `${fileName}.json`);
  }

  protected normalizeText(text: string | null | undefined): string {
    return (text ?? '').trim().replace(/\s+/g, ' ');
  }

  protected normalizeSalary(text: string | null | undefined): string {
    const cleaned = this.normalizeText(text);
    return cleaned.length > 0 ? cleaned : 'Not mentioned';
  }

  protected log(message: string): void {
    console.log(`[${new Date().toISOString()}] [${this.platform.toUpperCase()}] ${message}`);
  }

  protected logError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] [${this.platform.toUpperCase()}] ERROR: ${message}`);
  }
}
