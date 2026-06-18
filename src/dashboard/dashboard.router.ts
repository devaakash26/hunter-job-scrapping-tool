import { Router, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ScraperService } from '../services/scraper.service';
import { DASHBOARD, VIEWS, PLATFORMS, PLATFORM_COLORS } from '../constants';
import { JobStatus, JobFilters, JobUpdatePayload } from '../types';
import { requireAuth, handleLogin, handleLogout } from '../middleware/auth';

const router = Router();
const dashboardService = new DashboardService();
const scraperService = new ScraperService();

// ── Auth routes (no requireAuth guard) ──────────────────────────
router.get('/login', (req: Request, res: Response): void => {
  // Already logged in → go home
  const sc = (req as Request & { signedCookies: Record<string, string> }).signedCookies;
  if (sc['jh_auth'] === '1') {
    res.redirect('/');
    return;
  }
  res.render('login', {
    error: null,
    next: (req.query.next as string) || '',
  });
});

router.post('/login', handleLogin);
router.get('/logout', handleLogout);

// ── Protected routes (requireAuth on all) ───────────────────────
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: JobFilters = {
      status: (req.query.status as JobStatus | 'all') || 'all',
      search: (req.query.search as string) || '',
      source: (req.query.source as string) || '',
      page: parseInt((req.query.page as string) || '1'),
    };

    const [{ jobs, total }, statusCounts] = await Promise.all([
      dashboardService.getJobs(filters),
      dashboardService.getStatusCounts(),
    ]);
    const sources = Object.values(PLATFORMS);

    res.render(VIEWS.INDEX, {
      jobs,
      total,
      filters,
      sources,
      statusCounts,
      platformColors: PLATFORM_COLORS,
      currentPage: filters.page ?? 1,
      totalPages: Math.ceil(total / DASHBOARD.ITEMS_PER_PAGE),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).send(`<pre>Error: ${message}</pre>`);
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
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

router.get('/api/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: JobFilters = {
      status: (req.query.status as JobStatus | 'all') || 'all',
      search: (req.query.search as string) || '',
      source: (req.query.source as string) || '',
      page: parseInt((req.query.page as string) || '1'),
    };
    const { jobs, total } = await dashboardService.getJobs(filters);
    res.json({
      jobs,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / DASHBOARD.ITEMS_PER_PAGE),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: message });
  }
});

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dashboardService.getStats();
    res.render(VIEWS.STATS, {
      stats,
      platformColors: PLATFORM_COLORS,
      statusColors: DASHBOARD.STATUS_COLORS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).send(`<pre>Error: ${message}</pre>`);
  }
});

router.post('/run-scraper', (_req: Request, res: Response): void => {
  res.json({ message: '🔄 Scraper started in background' });
  setImmediate(async () => {
    try {
      await scraperService.runPipeline();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [RUN-SCRAPER] Error:`, err);
    }
  });
});

export { router as dashboardRouter };
