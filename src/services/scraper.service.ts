import * as fs from 'fs';
import * as path from 'path';
import { ALL_SCRAPERS } from '../scrapers';
import { FilterService } from './filter.service';
import { DedupService } from './dedup.service';
import { SlackService } from './slack.service';
import { RawJob, ScraperResult, PipelineRunResult } from '../types';
import { SLACK, FALLBACK_DIR } from '../constants';

export class ScraperService {
  private filterService = new FilterService();
  private dedupService = new DedupService();
  private slackService = new SlackService();

  async runPipeline(): Promise<PipelineRunResult> {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] [PIPELINE] Starting job hunt pipeline`);

    // 1. Scrape all platforms in parallel
    const scraperResults = await this.runAllScrapers();

    const allRawJobs: RawJob[] = scraperResults.flatMap((r) => r.jobs);
    console.log(`[${new Date().toISOString()}] [PIPELINE] Total scraped: ${allRawJobs.length}`);

    // 2. Filter
    const filteredJobs = this.filterService.filterJobs(allRawJobs);
    console.log(`[${new Date().toISOString()}] [PIPELINE] After filter: ${filteredJobs.length}`);

    // 3. Dedup — find jobs not in DB
    const newJobs = await this.dedupService.getNewJobs(filteredJobs);
    console.log(`[${new Date().toISOString()}] [PIPELINE] New jobs: ${newJobs.length}`);

    // 4. Save new jobs to DB (with fallback)
    const savedJobs = await this.saveWithFallback(newJobs, timestamp);
    console.log(`[${new Date().toISOString()}] [PIPELINE] Saved to DB: ${savedJobs.length}`);

    // 5. Send Slack summary
    await this.slackService.sendSummary(scraperResults, newJobs.length);

    // 6. Send individual job alerts (up to MAX_ALERTS_PER_RUN)
    const jobsToAlert = savedJobs.slice(0, SLACK.MAX_ALERTS_PER_RUN);
    let alertedCount = 0;

    for (const job of jobsToAlert) {
      try {
        const rawJob: RawJob = {
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          url: job.url,
          source: job.source,
          tags: job.tags,
          postedAt: job.postedAt,
          easyApply: job.easyApply,
          ycBatch: job.ycBatch || undefined,
        };
        await this.slackService.sendJobAlert(rawJob);
        alertedCount++;
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [PIPELINE] ERROR: Failed to alert for job ${job.id}`);
      }
    }

    // 7. Mark alerted jobs
    await this.dedupService.markAsAlerted(jobsToAlert.map((j) => j.id));

    const errors = scraperResults
      .filter((r) => r.error)
      .map((r) => ({
        platform: r.platform,
        message: r.error!,
        timestamp,
      }));

    console.log(`[${new Date().toISOString()}] [PIPELINE] Done — alerted ${alertedCount} jobs\n`);

    return {
      scraped: allRawJobs.length,
      filtered: filteredJobs.length,
      newJobs: newJobs.length,
      alerted: alertedCount,
      savedToDb: savedJobs.length,
      errors,
      timestamp,
    };
  }

  private async runAllScrapers(): Promise<ScraperResult[]> {
    const results = await Promise.allSettled(
      ALL_SCRAPERS.map(async (scraper): Promise<ScraperResult> => {
        try {
          const jobs = await scraper.scrape();
          return { platform: scraper.platform, jobs };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            `[${new Date().toISOString()}] [${scraper.platform.toUpperCase()}] ERROR: ${message}`,
          );
          return { platform: scraper.platform, jobs: [], error: message };
        }
      }),
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : { platform: 'unknown', jobs: [], error: 'Promise rejected' },
    );
  }

  private async saveWithFallback(
    jobs: RawJob[],
    timestamp: string,
  ): Promise<Awaited<ReturnType<DedupService['saveJobs']>>> {
    try {
      return await this.dedupService.saveJobs(jobs);
    } catch (err) {
      console.error(`[${timestamp}] [PIPELINE] DB save failed — writing to fallback file`);
      this.saveFallbackFile(jobs, timestamp);
      return [];
    }
  }

  private saveFallbackFile(jobs: RawJob[], timestamp: string): void {
    try {
      const dir = path.join(process.cwd(), FALLBACK_DIR);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const fileName = `jobs-${timestamp.replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(jobs, null, 2));
      console.log(`[${new Date().toISOString()}] [PIPELINE] Fallback saved to ${fileName}`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [PIPELINE] ERROR: Could not write fallback file`, err);
    }
  }
}
