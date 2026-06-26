import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';
import { isIndiaLocation } from './location.util';

interface AshbyJob {
  id?: string;
  title?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  address?: { postalAddress?: { addressCountry?: string; addressLocality?: string } };
  jobUrl?: string;
  applyUrl?: string;
}

interface AshbyApiResponse {
  jobs?: AshbyJob[];
}

interface AshbyCompanyConfig {
  slug: string;
  displayName: string;
  platform: string;
  // Global employers post worldwide; keep only their India roles.
  global?: boolean;
}

// Slugs verified live against api.ashbyhq.com/posting-api/job-board (June 2026).
const ASHBY_COMPANIES: AshbyCompanyConfig[] = [
  { slug: 'openai', displayName: 'OpenAI', platform: 'openai', global: true },
  { slug: 'notion', displayName: 'Notion', platform: 'notion', global: true },
];

const ENGINEERING_KEYWORDS = ['engineer', 'developer', 'software', 'backend', 'frontend', 'full stack', 'fullstack', 'sde', 'data', 'platform', 'infrastructure'];

function isEngineeringJob(job: AshbyJob): boolean {
  const title = (job.title || '').toLowerCase();
  const dept = `${job.department || ''} ${job.team || ''}`.toLowerCase();
  return ENGINEERING_KEYWORDS.some((k) => title.includes(k) || dept.includes(k));
}

export class AshbyScraper extends BaseScraper {
  platform = 'ashby';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all Ashby ATS companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      ASHBY_COMPANIES.map(async (company) => {
        try {
          const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`;
          const res = await axios.get<AshbyApiResponse>(url, {
            timeout: SCRAPER.BROWSER_TIMEOUT_MS,
            headers: { 'User-Agent': SCRAPER.USER_AGENT, Accept: 'application/json' },
          });

          const jobs = (res.data?.jobs ?? [])
            .filter(isEngineeringJob)
            .filter((j) =>
              company.global
                ? isIndiaLocation(
                    j.location,
                    j.address?.postalAddress?.addressCountry,
                    (j.secondaryLocations ?? []).map((s) => s.location).join(' '),
                  )
                : true,
            )
            .slice(0, SCRAPER.MAX_JOBS_PER_COMPANY)
            .map((j): RawJob => ({
              title: j.title || 'Unknown',
              company: company.displayName,
              location: j.location || j.address?.postalAddress?.addressLocality || 'India',
              salary: 'Not mentioned',
              url: j.jobUrl || j.applyUrl || `https://jobs.ashbyhq.com/${company.slug}`,
              source: company.platform,
              tags: [j.department, j.team, j.employmentType].filter(Boolean).join(', '),
              postedAt: this.formatPostedAt(j.publishedAt),
              easyApply: true,
            }));

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total Ashby jobs: ${all.length}`);
    return all;
  }
}
