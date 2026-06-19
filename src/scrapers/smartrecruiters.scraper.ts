import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';

interface SrJobAd {
  id?: string;
  name?: string;
  department?: { label?: string };
  location?: { city?: string; country?: string; region?: string };
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
}

const SR_COMPANIES: SmartRecruitersCompanyConfig[] = [
  { companyId: 'InMobi', displayName: 'InMobi', platform: 'inmobi' },
  { companyId: 'MakeMyTrip', displayName: 'MakeMyTrip', platform: 'makemytrip' },
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
          const url = `https://api.smartrecruiters.com/v1/companies/${company.companyId}/postings?keyword=engineer&limit=100`;
          const res = await axios.get<SrApiResponse>(url, {
            timeout: SCRAPER.BROWSER_TIMEOUT_MS,
            headers: {
              'User-Agent': SCRAPER.USER_AGENT,
              Accept: 'application/json',
            },
          });

          const postings = res.data?.content ?? [];
          const jobs = postings
            .filter(isEngineeringJob)
            .slice(0, 15)
            .map((j): RawJob => {
              const loc = [j.location?.city, j.location?.region, j.location?.country]
                .filter(Boolean)
                .join(', ') || 'India';
              return {
                title: j.name || 'Unknown',
                company: company.displayName,
                location: loc,
                salary: 'Not mentioned',
                url: j.ref || `https://jobs.smartrecruiters.com/${company.companyId}`,
                source: company.platform,
                tags: [j.department?.label, j.typeOfEmployment?.label, j.experienceLevel?.label]
                  .filter(Boolean)
                  .join(', '),
                postedAt: j.releasedDate ? new Date(j.releasedDate).toLocaleDateString('en-IN') : '',
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
