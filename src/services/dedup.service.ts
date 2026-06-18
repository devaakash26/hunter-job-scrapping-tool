import { AppDataSource } from '../config/database';
import { Job } from '../entities/job.entity';
import { RawJob } from '../types';

export class DedupService {
  async getNewJobs(jobs: RawJob[]): Promise<RawJob[]> {
    if (jobs.length === 0) return [];

    try {
      const repo = AppDataSource.getRepository(Job);

      const existingJobs = await repo
        .createQueryBuilder('job')
        .select(['job.company', 'job.title', 'job.source'])
        .getMany();

      const existingKeys = new Set(
        existingJobs.map((j) => this.buildKey(j.company, j.title, j.source)),
      );

      return jobs.filter(
        (job) => !existingKeys.has(this.buildKey(job.company, job.title, job.source)),
      );
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [DEDUP] ERROR: Failed to check duplicates`, err);
      return jobs;
    }
  }

  async saveJobs(jobs: RawJob[]): Promise<Job[]> {
    if (jobs.length === 0) return [];

    const repo = AppDataSource.getRepository(Job);
    const entities = jobs.map((job) => {
      const entity = new Job();
      entity.title = job.title;
      entity.company = job.company;
      entity.location = job.location;
      entity.salary = job.salary;
      entity.url = job.url;
      entity.source = job.source;
      entity.tags = job.tags;
      entity.postedAt = job.postedAt;
      entity.easyApply = job.easyApply;
      entity.ycBatch = job.ycBatch ?? '';
      entity.status = 'new';
      entity.alerted = false;
      return entity;
    });

    try {
      // Use insert with ignore on conflict to avoid duplicate errors
      const saved = await repo.save(entities, { chunk: 50 });
      console.log(`[${new Date().toISOString()}] [DEDUP] Saved ${saved.length} jobs to DB`);
      return saved;
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [DEDUP] ERROR: Failed to save jobs`, err);
      return [];
    }
  }

  async markAsAlerted(jobIds: number[]): Promise<void> {
    if (jobIds.length === 0) return;

    try {
      const repo = AppDataSource.getRepository(Job);
      await repo
        .createQueryBuilder()
        .update(Job)
        .set({ alerted: true })
        .where('id IN (:...ids)', { ids: jobIds })
        .execute();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [DEDUP] ERROR: Failed to mark jobs as alerted`, err);
    }
  }

  async getUnaletedJobs(limit: number): Promise<Job[]> {
    try {
      const repo = AppDataSource.getRepository(Job);
      return repo.find({
        where: { alerted: false },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [DEDUP] ERROR: Failed to fetch unalerted jobs`, err);
      return [];
    }
  }

  private buildKey(company: string, title: string, source: string): string {
    return `${company.toLowerCase()}|${title.toLowerCase()}|${source.toLowerCase()}`;
  }
}
