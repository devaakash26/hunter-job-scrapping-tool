import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

export class CutshortScraper extends BaseScraper {
  platform = PLATFORMS.CUTSHORT;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape');

    try {
      return await this.withBrowser(
        async (_browser, context) => {
          const page = await context.newPage();
          const jobs: RawJob[] = [];

          await page.goto(`${PLATFORM_URLS[PLATFORMS.CUTSHORT]}?q=node+react&minExp=0&maxExp=2&minSalary=12`, {
            waitUntil: 'domcontentloaded',
            timeout: SCRAPER.NAVIGATION_TIMEOUT_MS,
          });

          await page.waitForTimeout(SCRAPER.PAGE_SETTLE_MS);

          await page
            .waitForSelector('.job-card, [class*="jobCard"], [class*="job-list-item"]', {
              timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
            })
            .catch(() => this.log('Selector timeout — trying fallback selectors'));

          const jobCards = await page.$$(
            '.job-card, [class*="jobCard"], [class*="job-list-item"]',
          );
          this.log(`Found ${jobCards.length} job cards`);

          for (const card of jobCards.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM)) {
            try {
              const title = this.normalizeText(
                await card
                  .$eval('h2, h3, [class*="title"], [class*="jobTitle"]', (el) => el.textContent)
                  .catch(() => ''),
              );
              if (!title) continue;

              const company = this.normalizeText(
                await card
                  .$eval(
                    '[class*="company"], [class*="companyName"], [class*="employer"]',
                    (el) => el.textContent,
                  )
                  .catch(() => ''),
              );

              const url = await card
                .$eval('a', (el) => (el as HTMLAnchorElement).href)
                .catch(() => '');

              const location = this.normalizeText(
                await card
                  .$eval('[class*="location"], [class*="place"]', (el) => el.textContent)
                  .catch(() => 'India'),
              );

              const salary = this.normalizeSalary(
                await card
                  .$eval('[class*="salary"], [class*="ctc"], [class*="pay"]', (el) => el.textContent)
                  .catch(() => null),
              );

              const tags = await card
                .$$eval('[class*="skill"], [class*="tag"], span.tech', (els) =>
                  els.map((el) => el.textContent?.trim()).join(', '),
                )
                .catch(() => '');

              const postedAt = this.normalizeText(
                await card
                  .$eval('[class*="posted"], [class*="date"], time', (el) => el.textContent)
                  .catch(() => ''),
              );

              jobs.push({
                title,
                company: company || 'Unknown',
                location,
                salary,
                url: url || PLATFORM_URLS[PLATFORMS.CUTSHORT],
                source: PLATFORMS.CUTSHORT,
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
        this.buildCookiePath(PLATFORMS.CUTSHORT),
      );
    } catch (err) {
      this.logError(err);
      return [];
    }
  }
}
