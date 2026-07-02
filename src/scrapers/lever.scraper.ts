import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';
import { isIndiaLocation } from './location.util';

interface LeverPosting {
  id?: string;
  text?: string;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  description?: string;
  descriptionPlain?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  tags?: string[];
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
}

interface LeverCompanyConfig {
  slug: string;
  displayName: string;
  platform: string;
  // Global employers post worldwide; keep only their India roles.
  global?: boolean;
}

// Slugs verified live against api.lever.co (June 2026). Razorpay moved to
// Greenhouse; swiggy/zepto/scaler/urbancompany/nykaa/dunzo are no
// longer on Lever (404) and were dropped.
const LEVER_COMPANIES: LeverCompanyConfig[] = [
  { slug: 'meesho', displayName: 'Meesho', platform: 'meesho' },
  { slug: 'cred', displayName: 'CRED', platform: 'cred' },
  { slug: 'paytm', displayName: 'Paytm', platform: 'paytm' },
  // Verified live July 2026 — India job counts at verification time in parens.
  { slug: 'dreamsports', displayName: 'Dream11 (Dream Sports)', platform: 'dream11' }, // (22)
  { slug: 'hevodata', displayName: 'Hevo Data', platform: 'hevodata', global: true }, // (35)
  { slug: 'mindtickle', displayName: 'Mindtickle', platform: 'mindtickle', global: true }, // (21)
  { slug: 'zeta', displayName: 'Zeta', platform: 'zeta', global: true }, // (15)
  { slug: 'nium', displayName: 'Nium', platform: 'nium', global: true }, // (11)
];

const ENGINEERING_DEPARTMENTS = ['engineering', 'technology', 'software', 'product', 'data', 'backend', 'frontend'];

function isEngineeringRole(posting: LeverPosting): boolean {
  const dept = (posting.categories?.department || posting.categories?.team || '').toLowerCase();
  const title = (posting.text || '').toLowerCase();
  return ENGINEERING_DEPARTMENTS.some((d) => dept.includes(d) || title.includes(d));
}

function parseSalary(sr?: LeverPosting['salaryRange']): string {
  if (!sr?.min && !sr?.max) return 'Not mentioned';
  const cur = sr.currency || '₹';
  const interval = sr.interval ? `/${sr.interval}` : '';
  if (sr.min && sr.max) return `${cur}${sr.min.toLocaleString()} – ${cur}${sr.max.toLocaleString()}${interval}`;
  return `${cur}${(sr.min || sr.max)!.toLocaleString()}${interval}`;
}

export class LeverScraper extends BaseScraper {
  platform = 'lever';

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape for all Lever ATS companies');
    const all: RawJob[] = [];

    await Promise.allSettled(
      LEVER_COMPANIES.map(async (company) => {
        try {
          const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
          const res = await axios.get<LeverPosting[]>(url, {
            timeout: SCRAPER.BROWSER_TIMEOUT_MS,
            headers: { 'User-Agent': SCRAPER.USER_AGENT },
          });

          const postings = Array.isArray(res.data) ? res.data : [];
          const jobs = postings
            .filter(isEngineeringRole)
            .filter((p) =>
              company.global
                ? isIndiaLocation(
                    p.categories?.location,
                    (p.categories?.allLocations ?? []).join(' '),
                  )
                : true,
            )
            .slice(0, SCRAPER.MAX_JOBS_PER_COMPANY)
            .map((p): RawJob => ({
              title: p.text || 'Unknown',
              company: company.displayName,
              location: p.categories?.location || 'India',
              salary: parseSalary(p.salaryRange),
              url: p.hostedUrl || p.applyUrl || `https://jobs.lever.co/${company.slug}`,
              source: company.platform,
              tags: [p.categories?.team, p.categories?.commitment, ...(p.tags ?? [])]
                .filter(Boolean)
                .join(', '),
              postedAt: this.formatPostedAt(p.createdAt),
              easyApply: true,
            }));

          all.push(...jobs);
          this.log(`${company.displayName}: ${jobs.length} jobs`);
        } catch (err) {
          this.logError(new Error(`${company.displayName}: ${err instanceof Error ? err.message : String(err)}`));
        }
      }),
    );

    this.log(`Total Lever jobs: ${all.length}`);
    return all;
  }
}
