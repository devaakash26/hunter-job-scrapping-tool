import axios from 'axios';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { SCRAPER } from '../constants';
import { isIndiaLocation } from './location.util';

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
  // Global employers post worldwide; keep only their India roles. Indian-origin
  // companies (Groww, PhonePe, …) are India-only, so we take everything.
  global?: boolean;
}

// Slugs verified live against boards-api.greenhouse.io (June 2026).
// Companies that 404'd (cred, freshworks, browserstack, chargebee, hasura,
// juspay, sharechat) have left Greenhouse — moved to other scrapers or dropped.
const GREENHOUSE_COMPANIES: GreenhouseCompanyConfig[] = [
  // Indian-origin (all roles are in India)
  { slug: 'groww', displayName: 'Groww', platform: 'groww' },
  { slug: 'postman', displayName: 'Postman', platform: 'postman' },
  { slug: 'slice', displayName: 'Slice', platform: 'slice' },
  { slug: 'razorpaysoftwareprivatelimited', displayName: 'Razorpay', platform: 'razorpay' },
  { slug: 'phonepe', displayName: 'PhonePe', platform: 'phonepe' },
  // High-comp global product companies with strong India engineering offices —
  // India roles only. Job counts are live India-role counts (June 2026).
  { slug: 'databricks', displayName: 'Databricks', platform: 'databricks', global: true },
  { slug: 'hackerrank', displayName: 'HackerRank', platform: 'hackerrank', global: true },
  { slug: 'twilio', displayName: 'Twilio', platform: 'twilio', global: true },
  { slug: 'gitlab', displayName: 'GitLab', platform: 'gitlab', global: true },
  { slug: 'rubrik', displayName: 'Rubrik', platform: 'rubrik', global: true },
  { slug: 'airbnb', displayName: 'Airbnb', platform: 'airbnb', global: true },
  { slug: 'coinbase', displayName: 'Coinbase', platform: 'coinbase', global: true },
  { slug: 'mongodb', displayName: 'MongoDB', platform: 'mongodb', global: true },
  { slug: 'stripe', displayName: 'Stripe', platform: 'stripe', global: true },
  { slug: 'figma', displayName: 'Figma', platform: 'figma', global: true },
  { slug: 'cloudflare', displayName: 'Cloudflare', platform: 'cloudflare', global: true },
  { slug: 'scaleai', displayName: 'Scale AI', platform: 'scaleai', global: true },
  { slug: 'anthropic', displayName: 'Anthropic', platform: 'anthropic', global: true },
];

const ENGINEERING_DEPTS = ['engineering', 'technology', 'software', 'product', 'data', 'backend', 'frontend', 'platform'];

function isEngineeringJob(job: GhJob): boolean {
  const dept = (job.departments?.[0]?.name || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  return ENGINEERING_DEPTS.some((d) => dept.includes(d) || title.includes(d));
}

// For global companies, surface the actual India office (location.name is often
// just a workplace type like "In-Office"). Falls back to location.name otherwise.
function bestLocation(job: GhJob, global?: boolean): string {
  if (global) {
    const indiaOffice = job.offices?.find((o) => isIndiaLocation(o.name))?.name;
    if (indiaOffice) return indiaOffice;
    if (isIndiaLocation(job.location?.name)) return job.location!.name!;
    return 'India';
  }
  return job.location?.name || job.offices?.[0]?.name || 'India';
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
            .filter((j) =>
              company.global
                ? isIndiaLocation(j.location?.name, j.offices?.map((o) => o.name).join(' '))
                : true,
            )
            .slice(0, 15)
            .map((j): RawJob => ({
              title: j.title || 'Unknown',
              company: company.displayName,
              // Greenhouse often stores workplace-type junk ("In-Office", "N/A")
              // in location.name, so for global cos prefer the matched India office.
              location: bestLocation(j, company.global),
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
