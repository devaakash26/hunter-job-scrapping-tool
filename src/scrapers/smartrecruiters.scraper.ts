import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';
import { isIndiaLocation } from './location.util';

interface SrJobAd {
  id?: string;
  name?: string;
  department?: { label?: string };
  location?: { city?: string; country?: string; region?: string; fullLocation?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
  ref?: string;
  releasedDate?: string;
}

interface SrApiResponse {
  content?: SrJobAd[];
  totalFound?: number;
}

interface SmartRecruitersCompanyConfig {
  companyId: string;
  displayName: string;
  platform: string;
  // Global employers post worldwide; keep only their India roles.
  global?: boolean;
}

// companyId is case-sensitive and verified live against api.smartrecruiters.com
// (June 2026). Note Zomato's namespace is "Zomato1", not "Zomato".
const SR_COMPANIES: SmartRecruitersCompanyConfig[] = [
  { companyId: 'Freshworks', displayName: 'Freshworks', platform: 'freshworks' },
  { companyId: 'Zomato1', displayName: 'Zomato', platform: 'zomato' },
  { companyId: 'Cars24', displayName: 'Cars24', platform: 'cars24' },
  { companyId: 'Unacademy', displayName: 'Unacademy', platform: 'unacademy' },
  { companyId: 'InMobi', displayName: 'InMobi', platform: 'inmobi' },
  { companyId: 'MakeMyTrip', displayName: 'MakeMyTrip', platform: 'makemytrip' },
  // Verified live July 2026 — big India engineering org (Hyderabad/Bengaluru).
  { companyId: 'ServiceNow', displayName: 'ServiceNow', platform: 'servicenow', global: true },
];

const ENGINEERING_KEYWORDS = ['engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'data', 'devops', 'platform', 'sde', 'sre', 'tech'];

function isEngineeringJob(job: SrJobAd): boolean {
  const title = (job.name || '').toLowerCase();
  const dept = (job.department?.label || '').toLowerCase();
  return ENGINEERING_KEYWORDS.some((k) => title.includes(k) || dept.includes(k));
}

export class SmartRecruitersScraper extends BaseScraper {
  platform = 'smartrecruiters';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all SmartRecruiters companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      SR_COMPANIES.map(async (company) => {
        try {
          const endpoint = `https://api.smartrecruiters.com/v1/companies/${company.companyId}/postings?keyword=engineer&limit=100`;
          const res = await axios.get<SrApiResponse>(endpoint, {
            timeout: SCRAPER.BROWSER_TIMEOUT_MS,
            headers: {
              'User-Agent': SCRAPER.USER_AGENT,
              Accept: 'application/json',
            },
          });

          const postings = res.data?.content ?? [];
          const jobs = postings
            .filter(isEngineeringJob)
            .filter((j) =>
              company.global
                ? isIndiaLocation(
                    j.location?.city,
                    j.location?.region,
                    j.location?.country,
                    j.location?.fullLocation,
                  ) || (j.location?.country ?? '').toLowerCase() === 'in'
                : true,
            )
            .slice(0, SCRAPER.MAX_JOBS_PER_COMPANY)
            .map((j): RawJob => {
              const location =
                j.location?.fullLocation ||
                [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', ') ||
                'India';
              // The postings API has no apply URL; the public posting page is
              // jobs.smartrecruiters.com/{companyId}/{postingId}.
              const postingUrl = j.id
                ? `https://jobs.smartrecruiters.com/${company.companyId}/${j.id}`
                : `https://jobs.smartrecruiters.com/${company.companyId}`;
              return {
                title: j.name || 'Unknown',
                company: company.displayName,
                location,
                salary: 'Not mentioned',
                url: postingUrl,
                source: company.platform,
                tags: [j.department?.label, j.typeOfEmployment?.label, j.experienceLevel?.label]
                  .filter(Boolean)
                  .join(', '),
                postedAt: this.formatPostedAt(j.releasedDate),
                easyApply: true,
              };
            });

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total SmartRecruiters jobs: ${all.length}`);
    return all;
  }
}
