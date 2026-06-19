import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';

interface GhJob {
  id?: number;
  title?: string;
  location?: { name?: string };
  departments?: { name: string }[];
  offices?: { name: string }[];
  absolute_url?: string;
  updated_at?: string;
  metadata?: { name: string; value: string | null }[];
}

interface GhApiResponse {
  jobs?: GhJob[];
}

interface GreenhouseCompanyConfig {
  slug: string;
  displayName: string;
  platform: string;
}

const GREENHOUSE_COMPANIES: GreenhouseCompanyConfig[] = [
  { slug: 'groww', displayName: 'Groww', platform: 'groww' },
  { slug: 'cred-1', displayName: 'CRED', platform: 'cred' },
  { slug: 'freshworks', displayName: 'Freshworks', platform: 'freshworks' },
  { slug: 'browserstack', displayName: 'BrowserStack', platform: 'browserstack' },
  { slug: 'chargebee', displayName: 'Chargebee', platform: 'chargebee' },
  { slug: 'hasura', displayName: 'Hasura', platform: 'hasura' },
  { slug: 'postmanlabs', displayName: 'Postman', platform: 'postman' },
  { slug: 'getslice', displayName: 'Slice', platform: 'slice' },
  { slug: 'juspay', displayName: 'Juspay', platform: 'juspay' },
  { slug: 'sharechat', displayName: 'ShareChat', platform: 'sharechat' },
];

const ENGINEERING_DEPTS = ['engineering', 'technology', 'software', 'product', 'data', 'backend', 'frontend', 'platform'];

function isEngineeringJob(job: GhJob): boolean {
  const dept = (job.departments?.[0]?.name || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  return ENGINEERING_DEPTS.some((d) => dept.includes(d) || title.includes(d));
}

export class GreenhouseScraper extends BaseScraper {
  platform = 'greenhouse';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all Greenhouse ATS companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      GREENHOUSE_COMPANIES.map(async (company) => {
        try {
          const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`;
          const res = await axios.get<GhApiResponse>(url, {
            timeout: SCRAPER.BROWSER_TIMEOUT_MS,
            headers: { 'User-Agent': SCRAPER.USER_AGENT },
          });

          const jobs = (res.data?.jobs ?? [])
            .filter(isEngineeringJob)
            .slice(0, 15)
            .map((j): RawJob => ({
              title: j.title || 'Unknown',
              company: company.displayName,
              location: j.location?.name || j.offices?.[0]?.name || 'India',
              salary: 'Not mentioned',
              url: j.absolute_url || `https://boards.greenhouse.io/${company.slug}`,
              source: company.platform,
              tags: j.departments?.map((d) => d.name).join(', ') || '',
              postedAt: j.updated_at ? new Date(j.updated_at).toLocaleDateString('en-IN') : '',
              easyApply: true,
            }));

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total Greenhouse jobs: ${all.length}`);
    return all;
  }
}
