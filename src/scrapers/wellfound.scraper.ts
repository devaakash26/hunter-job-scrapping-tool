import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

export class WellfoundScraper extends BaseScraper {
  platform = PLATFORMS.WELLFOUND;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape');

    try {
      return await this.withBrowser(
        async (_browser, context) => {
          const page = await context.newPage();
          const jobs: RawJob[] = [];

          await page.goto(PLATFORM_URLS[PLATFORMS.WELLFOUND], {
            waitUntil: 'domcontentloaded',
            timeout: SCRAPER.NAVIGATION_TIMEOUT_MS,
          });

          await page.waitForTimeout(SCRAPER.PAGE_SETTLE_MS);

          await page
            .waitForSelector('div[data-test="StartupResult"]', {
              timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
            })
            .catch(() => this.log('Selector timeout — trying fallback'));

          const jobCards = await page.$$('div[data-test="StartupResult"]');
          this.log(`Found ${jobCards.length} job cards`);

          for (const card of jobCards.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM)) {
            try {
              const title = this.normalizeText(
                await card.$eval('a[data-test="job-title"]', (el) => el.textContent).catch(() => ''),
              );
              if (!title) continue;

              const company = this.normalizeText(
                await card
                  .$eval('a[data-test="startup-link"]', (el) => el.textContent)
                  .catch(() => ''),
              );

              const url = await card
                .$eval('a[data-test="job-title"]', (el) => (el as HTMLAnchorElement).href)
                .catch(() => '');

              const location = this.normalizeText(
                await card
                  .$eval('span[data-test="location"]', (el) => el.textContent)
                  .catch(() => 'Remote'),
              );

              const salary = this.normalizeSalary(
                await card
                  .$eval('span[data-test="compensation"]', (el) => el.textContent)
                  .catch(() => null),
              );

              const tags = await card
                .$$eval('a[data-test="job-tag"]', (els) =>
                  els.map((el) => el.textContent?.trim()).join(', '),
                )
                .catch(() => '');

              const postedAt = this.normalizeText(
                await card
                  .$eval('span[data-test="posted-date"]', (el) => el.textContent)
                  .catch(() => ''),
              );

              jobs.push({
                title,
                company: company || 'Unknown',
                location,
                salary,
                url: url || PLATFORM_URLS[PLATFORMS.WELLFOUND],
                source: PLATFORMS.WELLFOUND,
                tags,
                postedAt,
                easyApply: false,
              });
            } catch (err) {
              this.logError(err);
            }
          }

          this.log(`Scraped ${jobs.length} jobs`);
          return jobs;
        },
        this.buildCookiePath(PLATFORMS.WELLFOUND),
      );
    } catch (err) {
      this.logError(err);
      return [];
    }
  }
}
