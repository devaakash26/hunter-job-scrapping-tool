import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';

// Big MNCs on Workday, queried via the public CXS JSON API:
//   POST https://{tenant}.{host}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
// All tenant/site pairs verified live (July 2026) — the ones that 4xx'd
// (Qualcomm, AMD, Intuit, PayPal, Walmart) use different/gated setups.

interface WdJobPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WdApiResponse {
  total?: number;
  jobPostings?: WdJobPosting[];
}

interface WorkdayCompanyConfig {
  tenant: string;
  host: string; // wd1 / wd5 / wd12 …
  site: string;
  displayName: string;
  platform: string;
}

const WORKDAY_COMPANIES: WorkdayCompanyConfig[] = [
  { tenant: 'adobe', host: 'wd5', site: 'external_experienced', displayName: 'Adobe', platform: 'adobe' },
  { tenant: 'nvidia', host: 'wd5', site: 'NVIDIAExternalCareerSite', displayName: 'NVIDIA', platform: 'nvidia' },
  { tenant: 'salesforce', host: 'wd12', site: 'External_Career_Site', displayName: 'Salesforce', platform: 'salesforce' },
  { tenant: 'mastercard', host: 'wd1', site: 'CorporateCareers', displayName: 'Mastercard', platform: 'mastercard' },
  { tenant: 'micron', host: 'wd1', site: 'External', displayName: 'Micron', platform: 'micron' },
  { tenant: 'cadence', host: 'wd1', site: 'External_Careers', displayName: 'Cadence', platform: 'cadence' },
  { tenant: 'hpe', host: 'wd5', site: 'Jobsathpe', displayName: 'HPE', platform: 'hpe' },
  { tenant: 'target', host: 'wd5', site: 'targetcareers', displayName: 'Target Tech', platform: 'target' },
];

// Workday's country facet IDs are global across tenants; this is India.
const INDIA_COUNTRY_FACET = 'c4f78be1a8f14da0ab49ce1162348a5e';

const ENGINEERING_KEYWORDS = ['engineer', 'developer', 'software', 'sde', 'backend', 'frontend', 'full stack', 'fullstack'];

function isEngineeringTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return ENGINEERING_KEYWORDS.some((k) => lower.includes(k));
}

export class WorkdayScraper extends BaseScraper {
  platform = 'workday';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all Workday companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      WORKDAY_COMPANIES.map(async (company) => {
        try {
          const base = `https://${company.tenant}.${company.host}.myworkdayjobs.com`;
          const endpoint = `${base}/wday/cxs/${company.tenant}/${company.site}/jobs`;

          const res = await axios.post<WdApiResponse>(
            endpoint,
            {
              appliedFacets: { locationCountry: [INDIA_COUNTRY_FACET] },
              searchText: 'software engineer',
              // CXS API caps page size at 20.
              limit: 20,
              offset: 0,
            },
            {
              timeout: SCRAPER.BROWSER_TIMEOUT_MS,
              headers: {
                'User-Agent': SCRAPER.USER_AGENT,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            },
          );

          const jobs = (res.data?.jobPostings ?? [])
            .filter((j) => isEngineeringTitle(j.title ?? ''))
            .slice(0, SCRAPER.MAX_JOBS_PER_COMPANY)
            .map((j): RawJob => ({
              title: j.title || 'Unknown',
              company: company.displayName,
              location: j.locationsText || 'India',
              salary: 'Not mentioned',
              url: j.externalPath
                ? `${base}/en-US/${company.site}${j.externalPath}`
                : `${base}/en-US/${company.site}`,
              source: company.platform,
              tags: (j.bulletFields ?? []).join(', '),
              // postedOn is relative text ("Posted 3 Days Ago"), keep as-is.
              postedAt: j.postedOn || '',
              easyApply: false,
            }));

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs (India total: ${res.data?.total ?? '?'})`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total Workday jobs: ${all.length}`);
    return all;
  }
}
