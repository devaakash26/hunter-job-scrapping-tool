import { Router, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { DASHBOARD, PLATFORMS, PLATFORM_COLORS } from '../constants';
import { JobStatus, JobFilters, JobUpdatePayload } from '../types';
import { requireAuth, handleLogin, handleLogout } from '../middleware/auth';

const router = Router();
const dashboardService = new DashboardService();

// ── Auth (no requireAuth guard) ─────────────────────────────────
router.post('/api/auth/login', handleLogin);
router.post('/api/auth/logout', handleLogout);

// Legacy login routes — used by local EJS dev server
router.get('/login', (req: Request, res: Response): void => {
  const sc = (req as Request & { signedCookies: Record<string, string> }).signedCookies;
  if (sc['jh_auth'] === '1') { res.redirect('/'); return; }
  res.render('login', { error: null, next: (req.query.next as string) || '' });
});
router.post('/login', handleLogin);
router.get('/logout', handleLogout);

// ── Protected routes ─────────────────────────────────────────────
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
    if (!jobId || !status) { res.status(400).json({ error: 'jobId and status are required' }); return; }
    if (!(DASHBOARD.JOB_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${DASHBOARD.JOB_STATUSES.join(', ')}` });
      return;
    }
    const updated = await dashboardService.updateJobStatus(jobId, status);
    if (!updated) { res.status(404).json({ error: `Job ${jobId} not found` }); return; }
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.get('/api/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

router.get('/api/sources', (_req: Request, res: Response): void => {
  res.json({ sources: Object.values(PLATFORMS), colors: PLATFORM_COLORS });
});

// Legacy EJS dashboard routes — used by local dev server only
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
    res.render('index', {
      jobs, total, filters,
      sources: Object.values(PLATFORMS),
      statusCounts,
      platformColors: PLATFORM_COLORS,
      currentPage: filters.page ?? 1,
      totalPages: Math.ceil(total / DASHBOARD.ITEMS_PER_PAGE),
    });
  } catch (err) {
    res.status(500).send(`<pre>Error: ${err instanceof Error ? err.message : err}</pre>`);
  }
});

router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dashboardService.getStats();
    res.render('stats', {
      stats, statusCounts: stats.byStatus, total: stats.total,
      platformColors: PLATFORM_COLORS,
      statusColors: DASHBOARD.STATUS_COLORS,
    });
  } catch (err) {
    res.status(500).send(`<pre>Error: ${err instanceof Error ? err.message : err}</pre>`);
  }
});

router.post('/run-scraper', (_req: Request, res: Response): void => {
  res.status(501).json({ error: 'Use the QStash /trigger endpoint to run the scraper.' });
});

export { router as dashboardRouter };
