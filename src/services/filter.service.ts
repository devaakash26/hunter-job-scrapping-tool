import { RawJob } from '../types';
import { FILTER } from '../constants';

export class FilterService {
  filterJobs(jobs: RawJob[]): RawJob[] {
    return jobs.filter((job) => this.shouldInclude(job));
  }

  private shouldInclude(job: RawJob): boolean {
    if (this.hasExcludeKeyword(job)) return false;
    if (!this.hasIncludeKeyword(job)) return false;
    if (!this.isLocationAcceptable(job)) return false;
    if (!this.isSalaryAcceptable(job)) return false;
    return true;
  }

  private hasExcludeKeyword(job: RawJob): boolean {
    const searchText = `${job.title} ${job.tags}`.toLowerCase();
    return FILTER.EXCLUDE_KEYWORDS.some((kw) => searchText.includes(kw.toLowerCase()));
  }

  private hasIncludeKeyword(job: RawJob): boolean {
    const searchText = `${job.title} ${job.tags}`.toLowerCase();
    return FILTER.INCLUDE_KEYWORDS.some((kw) => searchText.includes(kw.toLowerCase()));
  }

  private isLocationAcceptable(job: RawJob): boolean {
    if (!job.location) return true;
    const loc = job.location.toLowerCase();
    return FILTER.PREFERRED_LOCATIONS.some((l) => loc.includes(l.toLowerCase()));
  }

  private isSalaryAcceptable(job: RawJob): boolean {
    const salary = job.salary;

    if (!salary || salary === FILTER.SALARY_NOT_MENTIONED) return true;

    const parsed = this.parseSalaryLPA(salary);
    if (parsed === null) return true;

    return parsed >= FILTER.MIN_SALARY_LPA;
  }

  private parseSalaryLPA(salaryStr: string): number | null {
    const lower = salaryStr.toLowerCase();

    // Handle ranges like "10-15 LPA", "₹10L - ₹15L", "10L to 15L"
    const rangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:l|lpa|lakh|lac)?(?:\s*[-–to]+\s*)(\d+(?:\.\d+)?)\s*(?:l|lpa|lakh|lac)?/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      // Return max to be generous in filtering
      return isNaN(max) ? (isNaN(min) ? null : min) : max;
    }

    // Handle single values like "12 LPA", "15L", "₹12 Lakhs"
    const singleMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:l|lpa|lakh|lac|lakhs)/);
    if (singleMatch) {
      const val = parseFloat(singleMatch[1]);
      return isNaN(val) ? null : val;
    }

    // Handle values in thousands (convert to LPA approx): "100k/yr"
    const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\s*(?:\/\s*(?:yr|year|pa))?/);
    if (kMatch) {
      const val = parseFloat(kMatch[1]);
      if (!isNaN(val)) return val / 100; // rough: 100k → 1L ... 1000k → 10L
    }

    return null;
  }
}
