import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';
import { formatExperience } from '../utils/experience.util';

// MyNextHire ATS (used by CoinDCX). The branded careers site
// (careers.coindcx.com) sits behind Cloudflare, but the underlying job board
// API on {slug}.mynexthire.com is public:
//   POST /employer/careers/reqlist/get  {"source":"careers","code":"","filterByBuId":-1}
// Postings carry structured expMin/expMax, which feeds the 0-2 yrs filter
// directly instead of regex-parsing the description.

interface MnhRequisition {
  reqId?: number;
  reqTitle?: string;
  buName?: string;
  expMin?: number;
  expMax?: number;
  fresher?: boolean;
  location?: string;
  locationList?: { office?: string }[];
  employmentType?: string;
  jobLevel?: string;
  approvedOn?: string;
  jdDisplay?: string;
  reqCurrency?: string;
  ctcBandLowEnd?: number;
  ctcBandHighEnd?: number;
}

interface MnhApiResponse {
  reqDetailsBOList?: MnhRequisition[];
}

interface MnhCompanyConfig {
  slug: string;
  displayName: string;
  platform: string;
}

// Verified live July 2026 (51 open reqs at verification time).
const MYNEXTHIRE_COMPANIES: MnhCompanyConfig[] = [
  { slug: 'coindcx', displayName: 'CoinDCX', platform: 'coindcx' },
];

const ENGINEERING_KEYWORDS = ['engineer', 'developer', 'software', 'sde', 'backend', 'frontend', 'full stack', 'fullstack', 'devops', 'data', 'platform'];

function isEngineeringReq(req: MnhRequisition): boolean {
  const haystack = `${req.reqTitle || ''} ${req.buName || ''}`.toLowerCase();
  return ENGINEERING_KEYWORDS.some((k) => haystack.includes(k));
}

function experienceOf(req: MnhRequisition): string {
  if (req.fresher) return '0 yrs';
  if (req.expMin === undefined && req.expMax === undefined) return '';
  return formatExperience({ min: req.expMin ?? 0, max: req.expMax ?? null });
}

function salaryOf(req: MnhRequisition): string {
  const low = req.ctcBandLowEnd ?? 0;
  const high = req.ctcBandHighEnd ?? 0;
  if (low <= 0 && high <= 0) return '';
  const cur = (req.reqCurrency || '').startsWith('INR') ? '₹' : '';
  if (low > 0 && high > 0) return `${cur}${low.toLocaleString()} – ${cur}${high.toLocaleString()}/yr`;
  return `${cur}${(low || high).toLocaleString()}/yr`;
}

export class MyNextHireScraper extends BaseScraper {
  platform = 'mynexthire';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all MyNextHire companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      MYNEXTHIRE_COMPANIES.map(async (company) => {
        try {
          const endpoint = `https://${company.slug}.mynexthire.com/employer/careers/reqlist/get`;
          const res = await axios.post<MnhApiResponse>(
            endpoint,
            { source: 'careers', code: '', filterByBuId: -1 },
            {
              timeout: SCRAPER.BROWSER_TIMEOUT_MS,
              headers: {
                'User-Agent': SCRAPER.USER_AGENT,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            },
          );

          const jobs = (res.data?.reqDetailsBOList ?? [])
            .filter(isEngineeringReq)
            .slice(0, SCRAPER.MAX_JOBS_PER_COMPANY)
            .map((req): RawJob => {
              const experience = experienceOf(req);
              return {
                title: req.reqTitle || 'Unknown',
                company: company.displayName,
                location: req.location || req.locationList?.[0]?.office || 'India',
                salary: this.normalizeSalary(salaryOf(req)),
                url: req.reqId
                  ? `https://${company.slug}.mynexthire.com/employer/jobs/careers/jd/${req.reqId}`
                  : `https://${company.slug}.mynexthire.com/employer/jobs/careers`,
                source: company.platform,
                tags: [experience, req.buName, req.employmentType, req.jobLevel]
                  .filter(Boolean)
                  .join(', '),
                postedAt: this.formatPostedAt(req.approvedOn),
                easyApply: true,
                experience: experience || undefined,
                description: req.jdDisplay?.slice(0, 4000) || undefined,
              };
            });

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total MyNextHire jobs: ${all.length}`);
    return all;
  }
}
