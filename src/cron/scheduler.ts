import cron from 'node-cron';
import { ScraperService } from '../services/scraper.service';
import { CRON } from '../constants';

const scraperService = new ScraperService();

export function startScheduler(): void {
  console.log(`[${new Date().toISOString()}] [SCHEDULER] Registering cron jobs`);

  cron.schedule(
    CRON.MORNING_RUN,
    async () => {
      console.log(`[${new Date().toISOString()}] [SCHEDULER] Morning run triggered`);
      await runPipelineSafe();
    },
    { timezone: CRON.TIMEZONE },
  );

  cron.schedule(
    CRON.EVENING_RUN,
    async () => {
      console.log(`[${new Date().toISOString()}] [SCHEDULER] Evening run triggered`);
      await runPipelineSafe();
    },
    { timezone: CRON.TIMEZONE },
  );

  console.log(`[${new Date().toISOString()}] [SCHEDULER] Morning run: ${CRON.MORNING_RUN} (9 AM IST)`);
  console.log(`[${new Date().toISOString()}] [SCHEDULER] Evening run: ${CRON.EVENING_RUN} (6 PM IST)`);
}

export async function runPipelineOnce(): Promise<void> {
  console.log(`[${new Date().toISOString()}] [SCHEDULER] Running pipeline immediately`);
  await runPipelineSafe();
}

async function runPipelineSafe(): Promise<void> {
  try {
    await scraperService.runPipeline();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] [SCHEDULER] Pipeline crashed: ${message}`);
  }
}
