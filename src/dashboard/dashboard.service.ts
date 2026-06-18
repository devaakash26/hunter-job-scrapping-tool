import { AppDataSource } from '../config/database';
import { Job } from '../entities/job.entity';
import { JobFilters, JobStatus, DashboardStats } from '../types';
import { DASHBOARD } from '../constants';

export class DashboardService {
  async getJobs(filters: JobFilters): Promise<{ jobs: Job[]; total: number }> {
    const repo = AppDataSource.getRepository(Job);
    const qb = repo.createQueryBuilder('job').orderBy('job.createdAt', 'DESC');

    if (filters.status && filters.status !== 'all') {
      qb.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.source) {
      qb.andWhere('job.source = :source', { source: filters.source });
    }

    if (filters.search) {
      qb.andWhere(
        '(LOWER(job.title) LIKE :search OR LOWER(job.company) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }

    const page = filters.page ?? 1;
    const skip = (page - 1) * DASHBOARD.ITEMS_PER_PAGE;

    const [jobs, total] = await qb
      .skip(skip)
      .take(DASHBOARD.ITEMS_PER_PAGE)
      .getManyAndCount();

    return { jobs, total };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    const repo = AppDataSource.getRepository(Job);
    const raw = await repo
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();
    return Object.fromEntries(raw.map((r) => [r.status, parseInt(r.count)]));
  }

  async updateJobStatus(jobId: number, status: JobStatus): Promise<Job | null> {
    const repo = AppDataSource.getRepository(Job);
    const job = await repo.findOneBy({ id: jobId });
    if (!job) return null;

    job.status = status;
    if (status === 'applied') {
      job.appliedAt = new Date();
    }

    return repo.save(job);
  }

  async getStats(): Promise<DashboardStats> {
    const repo = AppDataSource.getRepository(Job);

    const total = await repo.count();

    const byStatusRaw = await repo
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();

    const bySourceRaw = await repo
      .createQueryBuilder('job')
      .select('job.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.source')
      .getRawMany<{ source: string; count: string }>();

    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = await repo
      .createQueryBuilder('job')
      .where('job.createdAt >= :start', { start: weekStart })
      .getCount();

    const lastWeek = await repo
      .createQueryBuilder('job')
      .where('job.createdAt >= :start AND job.createdAt < :end', {
        start: twoWeeksStart,
        end: weekStart,
      })
      .getCount();

    const applied = byStatusRaw.find((r) => r.status === 'applied');
    const interviews = byStatusRaw.find((r) => r.status === 'interview');
    const appliedCount = parseInt(applied?.count ?? '0');
    const interviewCount = parseInt(interviews?.count ?? '0');
    const responseRate =
      appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0;

    return {
      total,
      byStatus: Object.fromEntries(byStatusRaw.map((r) => [r.status, parseInt(r.count)])),
      bySource: Object.fromEntries(bySourceRaw.map((r) => [r.source, parseInt(r.count)])),
      thisWeek,
      lastWeek,
      responseRate,
    };
  }
}
