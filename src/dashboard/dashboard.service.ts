import { AppDataSource } from '../config/database';
import { Job } from '../entities/job.entity';
import { JobFilters, JobStatus, DashboardStats } from '../types';
import { DASHBOARD } from '../constants';

export class DashboardService {
  async getJobs(filters: JobFilters): Promise<{ jobs: Job[]; total: number }> {
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
      qb.andWhere("job.salary != 'Not mentioned' AND job.salary IS NOT NULL AND job.salary != ''");
    }

    const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
      oldest:  ['job.createdAt', 'ASC'],
      company: ['job.company', 'ASC'],
      newest:  ['job.createdAt', 'DESC'],
    };
    const [col, dir] = sortMap[filters.sortBy ?? 'newest'] ?? sortMap['newest'];
    qb.orderBy(col, dir);

    const page = filters.page ?? 1;
    const [jobs, total] = await qb
      .skip((page - 1) * DASHBOARD.ITEMS_PER_PAGE)
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
    if (status === 'applied') job.appliedAt = new Date();
    return repo.save(job);
  }

  async getStats(): Promise<DashboardStats> {
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

    return {
      total,
      byStatus: Object.fromEntries(byStatusRaw.map(r => [r.status, parseInt(r.count)])),
      bySource: Object.fromEntries(bySourceRaw.map(r => [r.source, parseInt(r.count)])),
      thisWeek,
      lastWeek,
      responseRate: appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0,
    };
  }
}
