import { Router, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ScraperService } from '../services/scraper.service';
import { DASHBOARD } from '../constants';
import { JobStatus, JobFilters, JobUpdatePayload } from '../types';
import { requireAuth, handleLogin } from '../middleware/auth';

const router = Router();
const dashboardService = new DashboardService();
const scraperService = new ScraperService();

router.post('/api/auth/login', handleLogin);

router.use(requireAuth);

router.get('/api/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: JobFilters = {
      status:    (req.query.status as JobStatus | 'all') || 'all',
      search:    (req.query.search as string) || '',
      source:    (req.query.source as string) || '',
      location:  (req.query.location as string) || '',
      sortBy:    (req.query.sortBy as JobFilters['sortBy']) || 'newest',
      page:      parseInt((req.query.page as string) || '1'),
      easyApply: req.query.easyApply === '1',
      ycOnly:    req.query.ycOnly === '1',
      hasSalary: req.query.hasSalary === '1',
    };
    const { jobs, total } = await dashboardService.getJobs(filters);
    res.json({ jobs, total, page: filters.page, totalPages: Math.ceil(total / DASHBOARD.ITEMS_PER_PAGE) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.post('/update-status', async (req: Request, res: Response): Promise<void> => {
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
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await dashboardService.getStats());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.post('/run-scraper', (_req: Request, res: Response): void => {
  res.json({ started: true, timestamp: new Date().toISOString() });
  setImmediate(async () => {
    try {
      await scraperService.runPipeline();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [RUN-SCRAPER] Pipeline error:`, err);
    }
  });
});

export { router as dashboardRouter };
