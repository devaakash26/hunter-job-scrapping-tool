import type { Page } from 'playwright-core';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

export class YCombinatorScraper extends BaseScraper {
  platform = PLATFORMS.YC;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape');

    try {
      return await this.withBrowser(async (_browser, context) => {
        const page = await context.newPage();
        const jobs: RawJob[] = [];

        await page.goto(PLATFORM_URLS[PLATFORMS.YC], { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        const jobCards = await page.$$('div.mb-4.w-full');

        this.log(`Found ${jobCards.length} job cards`);

        for (const card of jobCards.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM)) {
          try {
            const job = await this.extractJobFromCard(card);
            if (job) jobs.push(job);
          } catch (err) {
            this.logError(err);
          }
        }

        this.log(`Scraped ${jobs.length} jobs`);
        return jobs;
      });
    } catch (err) {
      this.logError(err);
      return [];
    }
  }

  private async extractJobFromCard(
    card: Awaited<ReturnType<Page['$']>>,
  ): Promise<RawJob | null> {
    if (!card) return null;

    const title = this.normalizeText(
      await card.$eval('a.font-bold', (el) => el.textContent).catch(() => ''),
    );
    if (!title) return null;

    const company = this.normalizeText(
      await card.$eval('div.company-name, h2.company', (el) => el.textContent).catch(() => ''),
    );

    const url = await card
      .$eval('a.font-bold', (el) => (el as HTMLAnchorElement).href)
      .catch(() => '');

    const location = this.normalizeText(
      await card.$eval('span.location, div.location', (el) => el.textContent).catch(() => 'Remote'),
    );

    const salary = this.normalizeSalary(
      await card.$eval('span.salary, div.salary', (el) => el.textContent).catch(() => null),
    );

    const ycBatch = this.normalizeText(
      await card.$eval('span.batch, a[href*="batch"]', (el) => el.textContent).catch(() => ''),
    );

    const tags = await card
      .$$eval('span.tag, a.tag', (els) => els.map((el) => el.textContent?.trim()).join(', '))
      .catch(() => '');

    const postedAt = this.normalizeText(
      await card
        .$eval('span.posted, time', (el) => el.getAttribute('datetime') ?? el.textContent)
        .catch(() => ''),
    );

    return {
      title,
      company: company || 'Unknown Company',
      location: location || 'Remote',
      salary,
      url: url || PLATFORM_URLS[PLATFORMS.YC],
      source: PLATFORMS.YC,
      tags,
      postedAt,
      easyApply: false,
      ycBatch: ycBatch || undefined,
    };
  }
}
