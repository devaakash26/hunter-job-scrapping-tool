import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, SCRAPER } from '../constants';

interface AmazonJob {
  title?: string;
  location?: string;
  team?: string;
  posted_date?: string;
  job_path?: string;
  description_short?: string;
  id_icims?: string;
  salary_min?: number | null;
  salary_max?: number | null;
}

interface AmazonApiResponse {
  jobs?: AmazonJob[];
  hits?: number;
}

const QUERIES = [
  { base_query: 'software development engineer', loc_query: 'India' },
  { base_query: 'full stack engineer', loc_query: 'India' },
  { base_query: 'frontend engineer', loc_query: 'India' },
];

export class AmazonScraper extends BaseScraper {
  platform = PLATFORMS.AMAZON;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape via Jobs API');
    const jobs: RawJob[] = [];
    const seen = new Set<string>();

    for (const q of QUERIES) {
      try {
        const url = `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q.base_query)}&loc_query=${encodeURIComponent(q.loc_query)}&result_limit=20&sort=relevant`;
        const res = await axios.get<AmazonApiResponse>(url, {
          timeout: SCRAPER.BROWSER_TIMEOUT_MS,
          headers: {
            'Accept': 'application/json',
            'User-Agent': SCRAPER.USER_AGENT,
          },
        });

        for (const job of res.data?.jobs ?? []) {
          const id = job.id_icims || job.job_path;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const mapped = this.mapJob(job);
          if (mapped) jobs.push(mapped);
        }
      } catch (err) {
        this.logError(err);
      }
    }

    this.log(`Scraped ${jobs.length} jobs`);
    return jobs.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM);
  }

  private mapJob(job: AmazonJob): RawJob | null {
    if (!job.title) return null;

    let salary = 'Not mentioned';
    if (job.salary_min && job.salary_max) {
      salary = `$${job.salary_min.toLocaleString()} – $${job.salary_max.toLocaleString()} / yr`;
    }

    const url = job.job_path
      ? `https://www.amazon.jobs${job.job_path}`
      : 'https://www.amazon.jobs/en/search?base_query=software+development+engineer&loc_query=India';

    return {
      title: job.title,
      company: 'Amazon',
      location: job.location || 'India',
      salary,
      url,
      source: PLATFORMS.AMAZON,
      tags: job.team || '',
      postedAt: job.posted_date || '',
      easyApply: false,
    };
  }
}
