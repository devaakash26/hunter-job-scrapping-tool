import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';

interface LeverPosting {
  id?: string;
  text?: string;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
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
}

const LEVER_COMPANIES: LeverCompanyConfig[] = [
  { slug: 'razorpay', displayName: 'Razorpay', platform: 'razorpay' },
  { slug: 'swiggy', displayName: 'Swiggy', platform: 'swiggy' },
  { slug: 'zepto', displayName: 'Zepto', platform: 'zepto' },
  { slug: 'meesho', displayName: 'Meesho', platform: 'meesho' },
  { slug: 'scaler-academy', displayName: 'Scaler', platform: 'scaler' },
  { slug: 'dream11', displayName: 'Dream11', platform: 'dream11' },
  { slug: 'urbancompany', displayName: 'Urban Company', platform: 'urbancompany' },
  { slug: 'nykaatech', displayName: 'Nykaa', platform: 'nykaa' },
  { slug: 'dunzo', displayName: 'Dunzo', platform: 'dunzo' },
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

// Single scraper that hits all Lever companies in one run
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
            .slice(0, 15)
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
              postedAt: p.createdAt
                ? new Date(p.createdAt).toLocaleDateString('en-IN')
                : '',
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
