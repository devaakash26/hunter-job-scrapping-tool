import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './base.scraper';
import { RawJob } from '../types';
import { LINKEDIN, RATE_LIMIT, SCRAPER } from '../constants';
import { getRequestQueue, enqueueWithRetry } from '../utils/request-queue';
import { extractExperience, formatExperience } from '../utils/experience.util';

// LinkedIn guest jobs API scraper — ported from the acciojob-cloud-run-jobs
// companyLeadEvaluationPipeline LinkedIn collector. No login or cookies: the
// jobs-guest endpoints are public. All requests flow through one serial,
// rate-limited queue because LinkedIn blocks bursty clients.

interface SearchResult {
  jobId: string;
  title: string;
  company: string;
  location: string;
  postedAt: string;
  url: string;
}

const axiosInstance = axios.create({
  timeout: SCRAPER.BROWSER_TIMEOUT_MS,
  headers: {
    Connection: 'keep-alive',
    'Accept-Language': 'en-US,en;q=0.5',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
});

function randomUserAgent(): string {
  return LINKEDIN.USER_AGENTS[Math.floor(Math.random() * LINKEDIN.USER_AGENTS.length)];
}

function stripSearchParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export class LinkedInScraper extends BaseScraper {
  platform = 'linkedin';

  private queue = getRequestQueue('linkedin.com', RATE_LIMIT.LINKEDIN);

  async scrape(): Promise<RawJob[]> {
    this.log('Starting scrape via guest jobs API');

    try {
      const results = await this.searchJobs();
      this.log(`Search returned ${results.length} jobs`);

      const jobs = await this.hydrateJobs(results.slice(0, LINKEDIN.MAX_DETAIL_FETCHES));
      this.log(`Scraped ${jobs.length} jobs with details`);
      return jobs;
    } catch (err) {
      this.logError(err);
      return [];
    }
  }

  // Page through the guest search API (10 results/page) until the platform
  // cap is hit or LinkedIn runs out of results.
  private async searchJobs(): Promise<SearchResult[]> {
    const keywords = LINKEDIN.ROLES.map((r) => `"${r}"`).join(' OR ');
    const all: SearchResult[] = [];
    const seen = new Set<string>();
    let start = 0;

    while (all.length < SCRAPER.MAX_JOBS_PER_PLATFORM) {
      let html: string;
      try {
        const response = await enqueueWithRetry(
          this.queue,
          () =>
            axiosInstance.get<string>(LINKEDIN.SEARCH_URL, {
              headers: { 'User-Agent': randomUserAgent() },
              params: {
                keywords,
                location: LINKEDIN.LOCATION,
                f_E: LINKEDIN.EXPERIENCE_LEVELS,
                f_TPR: LINKEDIN.POSTED_WITHIN,
                sortBy: 'DD',
                start,
              },
            }),
          `linkedin search start=${start}`,
        );
        html = response.data;
      } catch (err) {
        this.logError(err);
        break;
      }

      const page = this.parseSearchPage(html);
      const fresh = page.filter((j) => !seen.has(j.jobId));
      fresh.forEach((j) => seen.add(j.jobId));

      if (fresh.length === 0) {
        this.log(`No more results at start=${start}`);
        break;
      }

      all.push(...fresh);
      start += LINKEDIN.ITEMS_PER_PAGE;
      this.log(`Page start=${start - LINKEDIN.ITEMS_PER_PAGE}: +${fresh.length} (total ${all.length})`);
    }

    return all.slice(0, SCRAPER.MAX_JOBS_PER_PLATFORM);
  }

  private parseSearchPage(html: string): SearchResult[] {
    const $ = cheerio.load(html);
    const jobs: SearchResult[] = [];

    $('li').each((_, element) => {
      const $el = $(element);
      const entityUrn = $el.find('div[data-entity-urn]').attr('data-entity-urn');
      if (!entityUrn || !entityUrn.includes('jobPosting:')) return;

      const jobId = entityUrn.split('jobPosting:')[1];
      const title = this.normalizeText($el.find('h3.base-search-card__title').text());
      const company = this.normalizeText($el.find('h4.base-search-card__subtitle').text());
      const location = this.normalizeText($el.find('span.job-search-card__location').text());
      const postedAt = this.normalizeText($el.find('time').text());
      const href = $el.find('a.base-card__full-link').attr('href') ?? '';

      if (jobId && title && company) {
        jobs.push({
          jobId,
          title,
          company,
          location: location || 'India',
          postedAt,
          url: href ? stripSearchParams(href) : `https://in.linkedin.com/jobs/view/${jobId}`,
        });
      }
    });

    return jobs;
  }

  // Fetch each job's detail page for description/salary/apply-url so the
  // 0-2 yrs experience filter has real text to work with. Failures fall back
  // to the search-card data instead of dropping the job.
  private async hydrateJobs(results: SearchResult[]): Promise<RawJob[]> {
    const jobs = await Promise.all(
      results.map(async (result) => {
        try {
          const response = await enqueueWithRetry(
            this.queue,
            () =>
              axiosInstance.get<string>(`${LINKEDIN.DETAIL_URL}/${result.jobId}`, {
                headers: { 'User-Agent': randomUserAgent() },
              }),
            `linkedin detail ${result.jobId}`,
          );
          return this.buildJob(result, response.data);
        } catch (err) {
          this.logError(new Error(`Detail fetch failed for ${result.jobId} — using search card`));
          return this.buildJob(result, null);
        }
      }),
    );

    return jobs;
  }

  private buildJob(result: SearchResult, detailHtml: string | null): RawJob {
    let description = '';
    let salaryText = '';
    let applyUrl = '';
    let criteria: string[] = [];

    if (detailHtml) {
      const $ = cheerio.load(detailHtml);
      description = this.normalizeText($('.show-more-less-html__markup').text());
      salaryText = this.normalizeText($('.compensation__salary, .salary').first().text());

      const applyCode = $('#applyUrl').html();
      const applyMatch = applyCode?.match(/"(https?:\/\/[^"]+)"/);
      if (applyMatch?.[1]) applyUrl = stripSearchParams(applyMatch[1]);

      criteria = $('.description__job-criteria-text')
        .map((_, el) => this.normalizeText($(el).text()))
        .get()
        .filter(Boolean);
    }

    const experience = formatExperience(
      extractExperience(`${result.title} ${description}`),
    );

    return {
      title: result.title,
      company: result.company,
      location: result.location,
      salary: this.normalizeSalary(salaryText || this.salaryFromDescription(description)),
      url: result.url,
      source: this.platform,
      tags: [experience, ...criteria].filter(Boolean).join(', '),
      postedAt: result.postedAt,
      // No external apply URL on the detail page usually means an on-LinkedIn
      // (Easy Apply) flow.
      easyApply: detailHtml !== null && !applyUrl,
      experience: experience || undefined,
      description: description || undefined,
    };
  }

  // LinkedIn India postings rarely fill the salary widget; packages usually
  // hide in the description ("CTC 12-15 LPA", "₹10 lakhs" …).
  private salaryFromDescription(description: string): string {
    if (!description) return '';
    const match = description.match(
      /(?:₹|rs\.?|inr|ctc[:\s]*)\s*\d+(?:\.\d+)?\s*(?:-|–|to)?\s*(?:\d+(?:\.\d+)?)?\s*(?:lpa|lakhs?|lacs?|l\b)/i,
    );
    return match ? match[0].trim() : '';
  }
}
