import { Router, Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { ScraperService } from '../services/scraper.service';
import { DASHBOARD, VIEWS } from '../constants';
import { JobStatus, JobFilters, JobUpdatePayload } from '../types';
import { config } from '../config/env';

const router = Router();
const dashboardService = new DashboardService();
const scraperService = new ScraperService();

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers[DASHBOARD.API_KEY_HEADER];
  if (key !== config.dashboard.apiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: JobFilters = {
      status: (req.query.status as JobStatus | 'all') || 'all',
      search: (req.query.search as string) || '',
      source: (req.query.source as string) || '',
      page: parseInt((req.query.page as string) || '1'),
    };

    const { jobs, total } = await dashboardService.getJobs(filters);

    res.render(VIEWS.INDEX, {
      jobs,
      total,
      filters,
      statuses: DASHBOARD.JOB_STATUSES,
      statusColors: DASHBOARD.STATUS_COLORS,
      currentPage: filters.page ?? 1,
      totalPages: Math.ceil(total / DASHBOARD.ITEMS_PER_PAGE),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

router.post('/update-status', async (req: Request, res: Response) => {
  try {
    const { jobId, status } = req.body as JobUpdatePayload;

    if (!jobId || !status) {
      res.status(400).json({ error: 'jobId and status are required' });
      return;
    }

    if (!(DASHBOARD.JOB_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${DASHBOARD.JOB_STATUSES.join(', ')}` });
      return;
    }

    const updated = await dashboardService.updateJobStatus(jobId, status);
    if (!updated) {
      res.status(404).json({ error: `Job ${jobId} not found` });
      return;
    }

    res.json({ success: true, job: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getStats();
    res.render(VIEWS.STATS, { stats, statusColors: DASHBOARD.STATUS_COLORS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

router.get('/run-now', requireApiKey, async (_req: Request, res: Response) => {
  try {
    res.json({ triggered: true, timestamp: new Date().toISOString() });
    // Run after responding so the client isn't kept waiting
    setImmediate(async () => {
      try {
        await scraperService.runPipeline();
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [DASHBOARD] run-now pipeline error:`, err);
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export { router as dashboardRouter };
