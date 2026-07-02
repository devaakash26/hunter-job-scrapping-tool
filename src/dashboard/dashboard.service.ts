import { AppDataSource } from '../config/database';
import { Job } from '../entities/job.entity';
import { JobFilters, JobStatus, DashboardStats } from '../types';
import { DASHBOARD, FILTER } from '../constants';

export class DashboardService {
  // getStats runs 5 queries; cache briefly so tab switches don't re-hit the DB.
  private statsCache: { data: DashboardStats; at: number } | null = null;
  private static readonly STATS_TTL_MS = 30_000;

  async getJobs(filters: JobFilters): Promise<{ jobs: Job[]; total: number; hasMore: boolean }> {
    const repo = AppDataSource.getRepository(Job);
    const qb = repo.createQueryBuilder('job');

    if (filters.status && filters.status !== 'all') {
      qb.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters.source) {
      qb.andWhere('job.source = :source', { source: filters.source });
    }
    if (filters.search) {
      qb.andWhere(
        '(LOWER(job.title) LIKE :search OR LOWER(job.company) LIKE :search OR LOWER(job.tags) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }
    if (filters.location) {
      qb.andWhere('LOWER(job.location) LIKE :loc', { loc: `%${filters.location.toLowerCase()}%` });
    }
    if (filters.easyApply) {
      qb.andWhere('job.easyApply = :ea', { ea: true });
    }
    if (filters.ycOnly) {
      qb.andWhere("job.ycBatch IS NOT NULL AND job.ycBatch != ''");
    }
    if (filters.hasSalary) {
      qb.andWhere('job.salary != :na AND job.salary IS NOT NULL AND job.salary != :empty', {
        na: FILTER.SALARY_NOT_MENTIONED,
        empty: '',
      });
    }

    const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
      oldest:  ['job.createdAt', 'ASC'],
      company: ['job.company', 'ASC'],
      newest:  ['job.createdAt', 'DESC'],
    };
    const [col, dir] = sortMap[filters.sortBy ?? 'newest'] ?? sortMap['newest'];
    qb.orderBy(col, dir);

    const page = filters.page ?? 1;
    const perPage = DASHBOARD.ITEMS_PER_PAGE;

    if (page === 1) {
      const [jobs, total] = await qb.take(perPage).getManyAndCount();
      return { jobs, total, hasMore: total > perPage };
    }

    // Deeper (infinite-scroll) pages skip the COUNT — the client already has
    // the total from page 1. Fetch one extra row to detect whether more exist.
    const rows = await qb
      .skip((page - 1) * perPage)
      .take(perPage + 1)
      .getMany();

    return { jobs: rows.slice(0, perPage), total: -1, hasMore: rows.length > perPage };
  }

  async updateJobStatus(jobId: number, status: JobStatus): Promise<Job | null> {
    const repo = AppDataSource.getRepository(Job);
    const job = await repo.findOneBy({ id: jobId });
    if (!job) return null;
    job.status = status;
    if (status === 'applied') job.appliedAt = new Date();
    this.statsCache = null; // status counts just changed
    return repo.save(job);
  }

  async getStats(): Promise<DashboardStats> {
    if (this.statsCache && Date.now() - this.statsCache.at < DashboardService.STATS_TTL_MS) {
      return this.statsCache.data;
    }

    const repo = AppDataSource.getRepository(Job);
    const total = await repo.count();

    const [byStatusRaw, bySourceRaw] = await Promise.all([
      repo.createQueryBuilder('job').select('job.status','status').addSelect('COUNT(*)','count').groupBy('job.status').getRawMany<{status:string;count:string}>(),
      repo.createQueryBuilder('job').select('job.source','source').addSelect('COUNT(*)','count').groupBy('job.source').getRawMany<{source:string;count:string}>(),
    ]);

    const now = new Date();
    const weekStart    = new Date(now.getTime() - 7  * 86400000);
    const twoWeeksStart = new Date(now.getTime() - 14 * 86400000);

    const [thisWeek, lastWeek] = await Promise.all([
      repo.createQueryBuilder('job').where('job.createdAt >= :s', { s: weekStart }).getCount(),
      repo.createQueryBuilder('job').where('job.createdAt >= :s AND job.createdAt < :e', { s: twoWeeksStart, e: weekStart }).getCount(),
    ]);

    const appliedCount   = parseInt(byStatusRaw.find(r => r.status === 'applied')?.count   ?? '0');
    const interviewCount = parseInt(byStatusRaw.find(r => r.status === 'interview')?.count ?? '0');

    const stats: DashboardStats = {
      total,
      byStatus: Object.fromEntries(byStatusRaw.map(r => [r.status, parseInt(r.count)])),
      bySource: Object.fromEntries(bySourceRaw.map(r => [r.source, parseInt(r.count)])),
      thisWeek,
      lastWeek,
      responseRate: appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0,
    };
    this.statsCache = { data: stats, at: Date.now() };
    return stats;
  }
}
