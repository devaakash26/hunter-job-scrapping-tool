import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { PLATFORMS, PLATFORM_URLS, SCRAPER } from '../constants';

interface MsJob {
  title?: string;
  jobId?: string;
  properties?: {
    primaryLocation?: string;
    locations?: string[];
    jobPostedDate?: string;
    jobFunction?: string;
    experience?: string;
    description?: string;
  };
  descriptionTeaser?: string;
}

interface MsApiResponse {
  operationResult?: {
    result?: {
      jobs?: MsJob[];
    };
  };
}

export class MicrosoftScraper extends BaseScraper {
  platform = PLATFORMS.MICROSOFT;

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape via Jobs API');
    const jobs: RawJob[] = [];

    try {
      const url = 'https://gcsservices.careers.microsoft.com/search/api/v1/search?q=software+engineer+india&l=en_us&pg=1&pgSz=20&o=Relevance&flt=true';
      const res = await axios.get<MsApiResponse>(url, {
        timeout: SCRAPER.BROWSER_TIMEOUT_MS,
        headers: {
          'Accept': 'application/json',
          'User-Agent': SCRAPER.USER_AGENT,
        },
      });

      const rawJobs = res.data?.operationResult?.result?.jobs ?? [];
      for (const job of rawJobs) {
        const mapped = this.mapJob(job);
        if (mapped) jobs.push(mapped);
      }
    } catch (err) {
      this.logError(err);
    }

    this.log(`Scraped ${jobs.length} jobs`);
    return jobs.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM);
  }

  private mapJob(job: MsJob): RawJob | null {
    if (!job.title || !job.jobId) return null;

    const location = job.properties?.primaryLocation || 'India';
    const tags = [job.properties?.jobFunction, job.properties?.experience]
      .filter(Boolean)
      .join(', ');

    return {
      title: job.title,
      company: 'Microsoft',
      location,
      salary: 'Not mentioned',
      url: `https://jobs.careers.microsoft.com/global/en/job/${job.jobId}`,
      source: PLATFORMS.MICROSOFT,
      tags,
      postedAt: job.properties?.jobPostedDate || '',
      easyApply: false,
    };
  }
}
