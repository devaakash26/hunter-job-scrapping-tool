import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, SCRAPER } from '../constants';

const INSTAHYRE_SEARCH_URL =
  'https://www.instahyre.com/search-jobs/?designation=Full+Stack+Developer&location=Bangalore&experience=0-2+Years';

export class InstahyreScraper extends BaseScraper {
  platform = PLATFORMS.INSTAHYRE;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape');

    try {
      return await this.withBrowser(async (_browser, context) => {
        const page = await context.newPage();
        const jobs: RawJob[] = [];

        await page.goto(INSTAHYRE_SEARCH_URL, {
          waitUntil: 'domcontentloaded',
          timeout: SCRAPER.NAVIGATION_TIMEOUT_MS,
        });

        await page.waitForTimeout(3000);

        await page
          .waitForSelector('.job-result-card, [class*="job-card"], [class*="jobCard"]', {
            timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
          })
          .catch(() => this.log('Selector timeout — trying fallback'));

        const jobCards = await page.$$(
          '.job-result-card, [class*="job-card"], [class*="jobCard"]',
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
                .$eval('[class*="company"], [class*="employer"]', (el) => el.textContent)
                .catch(() => ''),
            );

            const url = await card
              .$eval('a', (el) => (el as HTMLAnchorElement).href)
              .catch(() => '');

            const location = this.normalizeText(
              await card
                .$eval('[class*="location"]', (el) => el.textContent)
                .catch(() => 'Bangalore'),
            );

            const salary = this.normalizeSalary(
              await card
                .$eval('[class*="salary"], [class*="ctc"]', (el) => el.textContent)
                .catch(() => null),
            );

            const tags = await card
              .$$eval('[class*="skill"], [class*="tag"]', (els) =>
                els.map((el) => el.textContent?.trim()).join(', '),
              )
              .catch(() => '');

            const postedAt = this.normalizeText(
              await card
                .$eval('[class*="date"], [class*="posted"], time', (el) => el.textContent)
                .catch(() => ''),
            );

            jobs.push({
              title,
              company: company || 'Unknown',
              location,
              salary,
              url: url || INSTAHYRE_SEARCH_URL,
              source: PLATFORMS.INSTAHYRE,
              tags,
              postedAt,
              easyApply: true,
            });
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
}
