import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, SCRAPER } from '../constants';

interface StartupConfig {
  platform: string;
  company: string;
  url: string;
  selectors: {
    card: string;
    title: string;
    location?: string;
    tags?: string;
    link: string;
  };
}

const STARTUP_CONFIGS: StartupConfig[] = [
  {
    platform: PLATFORMS.ZOMATO,
    company: 'Zomato',
    url: 'https://www.zomato.com/careers#openings',
    selectors: {
      card: '[class*="job"], [class*="opening"], [class*="position"], .career-listing li',
      title: 'h3, h4, [class*="title"], [class*="role"]',
      location: '[class*="location"], [class*="city"]',
      tags: '[class*="department"], [class*="team"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.BLINKIT,
    company: 'Blinkit',
    url: 'https://blinkit.com/rn/blinkit/cid/blank',
    selectors: {
      card: '[class*="job"], [class*="position"], [class*="opening"], li[class*="role"]',
      title: 'h3, h2, [class*="title"]',
      location: '[class*="location"]',
      tags: '[class*="department"], [class*="team"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.PHONEPE,
    company: 'PhonePe',
    url: 'https://www.phonepe.com/en/careers/',
    selectors: {
      card: '[class*="job"], [class*="position"], [class*="opening"], .job-listing',
      title: 'h3, h4, [class*="title"]',
      location: '[class*="location"]',
      tags: '[class*="department"], [class*="category"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.FLIPKART,
    company: 'Flipkart',
    url: 'https://www.flipkartcareers.com/#!/joblist',
    selectors: {
      card: '[class*="job"], [class*="card"], [class*="listing"], .job-item',
      title: 'h3, h4, [class*="title"], [class*="job-name"]',
      location: '[class*="location"], [class*="city"]',
      tags: '[class*="department"], [class*="category"], [class*="function"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.PAYTM,
    company: 'Paytm',
    url: 'https://paytmjobs.com/jobs/',
    selectors: {
      card: '.job-listing, [class*="job-card"], article, .position',
      title: 'h2, h3, [class*="title"], [class*="position"]',
      location: '[class*="location"], [class*="city"]',
      tags: '[class*="department"], [class*="team"], [class*="category"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.MYNTRA,
    company: 'Myntra',
    url: 'https://careers.myntra.com/',
    selectors: {
      card: '[class*="job"], [class*="position"], [class*="card"], li.opening',
      title: 'h3, h4, [class*="title"], [class*="role"]',
      location: '[class*="location"]',
      tags: '[class*="department"], [class*="function"]',
      link: 'a',
    },
  },
  {
    platform: PLATFORMS.WALMART_TECH,
    company: 'Walmart Global Tech India',
    url: 'https://careers.walmart.com/results?q=software+engineer&locationCountry=IN&jobDepartmentCodeList=1110',
    selectors: {
      card: '[class*="job"], [class*="result"], article[class*="posting"], li[class*="job"]',
      title: 'h2, h3, [class*="title"], [class*="job-title"]',
      location: '[class*="location"], [class*="city"]',
      tags: '[class*="department"], [class*="category"]',
      link: 'a[href*="/job/"]',
    },
  },
];

export class StartupsScraper extends BaseScraper {
  platform = 'startups';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting Playwright scrape for Indian startups');
    const all: RawJob[] = [];

    for (const cfg of STARTUP_CONFIGS) {
      try {
        const jobs = await this.scrapeStartup(cfg);
        all.push(...jobs);
        this.log(`${cfg.company}: ${jobs.length} jobs`);
      } catch (err) {
        this.logError(new Error(`${cfg.company}: ${err instanceof Error ? err.message : String(err)}`));
      }
    }

    this.log(`Total startup jobs: ${all.length}`);
    return all;
  }

  private async scrapeStartup(cfg: StartupConfig): Promise<RawJob[]> {
    return this.withBrowser(async (_browser, context) => {
      const page = await context.newPage();
      const jobs: RawJob[] = [];

      await page.goto(cfg.url, { waitUntil: 'networkidle', timeout: SCRAPER.NAVIGATION_TIMEOUT_MS });
      await page.waitForTimeout(2500);

      // Try multiple selector strategies
      await page.waitForSelector(cfg.selectors.card, {
        timeout: SCRAPER.WAIT_FOR_SELECTOR_TIMEOUT_MS,
      }).catch(() => null);

      const cards = await page.$$(cfg.selectors.card);

      for (const card of cards.slice(0, 15)) {
        try {
          const title = this.normalizeText(
            await card.$eval(cfg.selectors.title, (el) => el.textContent).catch(() => ''),
          );
          if (!title || title.length < 3) continue;

          const url = await card
            .$eval(cfg.selectors.link, (el) => (el as HTMLAnchorElement).href)
            .catch(() => cfg.url);

          const location = cfg.selectors.location
            ? this.normalizeText(
                await card.$eval(cfg.selectors.location, (el) => el.textContent).catch(() => 'India'),
              )
            : 'India';

          const tags = cfg.selectors.tags
            ? this.normalizeText(
                await card.$eval(cfg.selectors.tags, (el) => el.textContent).catch(() => ''),
              )
            : '';

          jobs.push({
            title,
            company: cfg.company,
            location: location || 'India',
            salary: 'Not mentioned',
            url: url.startsWith('http') ? url : cfg.url,
            source: cfg.platform,
            tags,
            postedAt: '',
            easyApply: false,
          });
        } catch (err) {
          this.logError(err);
        }
      }

      return jobs;
    });
  }
}
