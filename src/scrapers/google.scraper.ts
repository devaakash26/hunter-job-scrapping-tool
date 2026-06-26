import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

interface GoogleJob {
  title: string;
  company_name?: string;
  locations?: { display: string }[];
  description?: string;
  url?: string;
  apply_url?: string;
  date_posted?: string;
  categories?: { name: string }[];
  salary?: { currency: string; min?: number; max?: number; unit?: string };
}

interface GoogleApiResponse {
  jobs?: GoogleJob[];
  count?: number;
}

const SEARCH_QUERIES = [
  'software engineer full stack india',
  'SDE backend node.js india',
  'frontend engineer react india',
];

export class GoogleScraper extends BaseScraper {
  platform = PLATFORMS.GOOGLE;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape via Careers API');
    const jobs: RawJob[] = [];

    for (const query of SEARCH_QUERIES) {
      try {
        const url = `https://careers.google.com/api/v3/search/?q=${encodeURIComponent(query)}&employment_type=FULL_TIME&page_size=20`;
        const res = await axios.get<GoogleApiResponse>(url, {
          timeout: SCRAPER.BROWSER_TIMEOUT_MS,
          headers: {
            'Accept': 'application/json',
            'User-Agent': SCRAPER.USER_AGENT,
          },
        });

        for (const job of res.data?.jobs ?? []) {
          const mapped = this.mapJob(job);
          if (mapped) jobs.push(mapped);
        }
      } catch (err) {
        this.logError(err);
      }
    }

    const unique = this.deduplicateByUrl(jobs);
    this.log(`Scraped ${unique.length} jobs`);
    return unique.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM);
  }

  private mapJob(job: GoogleJob): RawJob | null {
    if (!job.title) return null;
    const location = job.locations?.[0]?.display || 'India';
    const tags = job.categories?.map((c) => c.name).join(', ') || '';
    const url = job.apply_url || job.url || PLATFORM_URLS[PLATFORMS.GOOGLE];

    let salary = 'Not mentioned';
    if (job.salary?.min && job.salary?.max) {
      salary = `${job.salary.currency} ${job.salary.min}–${job.salary.max} ${job.salary.unit ?? ''}`.trim();
    }

    return {
      title: job.title,
      company: 'Google',
      location,
      salary,
      url,
      source: PLATFORMS.GOOGLE,
      tags,
      postedAt: job.date_posted || '',
      easyApply: false,
    };
  }

  private deduplicateByUrl(jobs: RawJob[]): RawJob[] {
    const seen = new Set<string>();
    return jobs.filter((j) => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });
  }
}
