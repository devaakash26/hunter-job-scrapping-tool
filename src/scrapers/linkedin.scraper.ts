import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

export class LinkedInScraper extends BaseScraper {
  platform = PLATFORMS.LINKEDIN;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape');

    try {
      return await this.withBrowser(
        async (_browser, context) => {
          const page = await context.newPage();
          const jobs: RawJob[] = [];

          await page.goto(PLATFORM_URLS[PLATFORMS.LINKEDIN], {
            waitUntil: 'domcontentloaded',
            timeout: SCRAPER.NAVIGATION_TIMEOUT_MS,
          });

          await page.waitForTimeout(SCRAPER.PAGE_SETTLE_MS);

          await page
            .waitForSelector('.jobs-search__results-list li, .job-card-container', {
              timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
            })
            .catch(() => this.log('Selector timeout — trying fallback'));

          const jobCards = await page.$$(
            '.jobs-search__results-list li, .job-card-container',
          );
          this.log(`Found ${jobCards.length} job cards`);

          for (const card of jobCards.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM)) {
            try {
              const title = this.normalizeText(
                await card
                  .$eval(
                    '.base-search-card__title, h3.base-search-card__title, a.job-card-list__title',
                    (el) => el.textContent,
                  )
                  .catch(() => ''),
              );
              if (!title) continue;

              const company = this.normalizeText(
                await card
                  .$eval(
                    '.base-search-card__subtitle, h4.base-search-card__subtitle, a.job-card-container__company-name',
                    (el) => el.textContent,
                  )
                  .catch(() => ''),
              );

              const url = await card
                .$eval(
                  'a.base-card__full-link, a.job-card-list__title',
                  (el) => (el as HTMLAnchorElement).href,
                )
                .catch(() => '');

              const location = this.normalizeText(
                await card
                  .$eval(
                    '.job-search-card__location, span.job-card-container__metadata-item',
                    (el) => el.textContent,
                  )
                  .catch(() => 'India'),
              );

              const salary = this.normalizeSalary(
                await card
                  .$eval(
                    '.job-search-card__salary-info, [class*="salary"]',
                    (el) => el.textContent,
                  )
                  .catch(() => null),
              );

              const postedAt = this.normalizeText(
                await card
                  .$eval(
                    'time, .job-search-card__listdate, [class*="date"]',
                    (el) => el.getAttribute('datetime') ?? el.textContent,
                  )
                  .catch(() => ''),
              );

              const easyApply = await card
                .$('.job-card-container__easy-apply-label, [aria-label*="Easy Apply"]')
                .then((el) => el !== null)
                .catch(() => false);

              jobs.push({
                title,
                company: company || 'Unknown',
                location,
                salary,
                url: url || PLATFORM_URLS[PLATFORMS.LINKEDIN],
                source: PLATFORMS.LINKEDIN,
                tags: '',
                postedAt,
                easyApply,
              });
            } catch (err) {
              this.logError(err);
            }
          }

          this.log(`Scraped ${jobs.length} jobs`);
          return jobs;
        },
        this.buildCookiePath(PLATFORMS.LINKEDIN),
      );
    } catch (err) {
      this.logError(err);
      return [];
    }
  }
}
