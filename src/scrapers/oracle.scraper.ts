import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, SCRAPER } from '../constants';

const ORACLE_URL = 'https://careers.oracle.com/jobs/#en/sites/jobsearch/jobs?keyword=software+engineer&location=India&locationId=300000000149325&locationLevel=country';

export class OracleScraper extends BaseScraper {
  platform = PLATFORMS.ORACLE;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting Playwright scrape');

    try {
      return await this.withBrowser(async (_browser, context) => {
        const page = await context.newPage();
        const jobs: RawJob[] = [];

        await page.goto(ORACLE_URL, { waitUntil: 'networkidle', timeout: SCRAPER.NAVIGATION_TIMEOUT_MS });
        await page.waitForTimeout(SCRAPER.PAGE_SETTLE_MS);

        await page.waitForSelector('[class*="job"], [class*="Job"], .requisition-list li', {
          timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
        }).catch(() => this.log('Selector timeout — trying fallback'));

        const cards = await page.$$('[class*="requisition-list"] li, [data-ph-at-id="job-link"], .job-grid-item');

        for (const card of cards.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM)) {
          try {
            const title = this.normalizeText(
              await card.$eval('a, h3, [class*="title"]', (el) => el.textContent).catch(() => ''),
            );
            if (!title) continue;

            const url = await card
              .$eval('a', (el) => (el as HTMLAnchorElement).href)
              .catch(() => ORACLE_URL);

            const location = this.normalizeText(
              await card.$eval('[class*="location"], [class*="Location"]', (el) => el.textContent).catch(() => 'India'),
            );

            jobs.push({
              title,
              company: 'Oracle',
              location,
              salary: 'Not mentioned',
              url,
              source: PLATFORMS.ORACLE,
              tags: 'Enterprise, Cloud',
              postedAt: '',
              easyApply: false,
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
