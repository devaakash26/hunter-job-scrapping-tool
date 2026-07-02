import { AppDataSource } from '../config/database';
import { Job } from '../entities/job.entity';
import { RawJob } from '../types';

export class DedupService {
  async getNewJobs(jobs: RawJob[]): Promise<RawJob[]> {
    if (jobs.length === 0) return [];

    // Self-dedupe first: one scrape can carry the same (company, title, source)
    // several times — e.g. a LinkedIn posting listed per city — and the DB's
    // unique constraint would reject the whole batch. First occurrence wins.
    const seen = new Set<string>();
    const uniqueJobs = jobs.filter((job) => {
      const key = this.buildKey(job.company, job.title, job.source);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    try {
      const repo = AppDataSource.getRepository(Job);

      const existingJobs = await repo
        .createQueryBuilder('job')
        .select(['job.company', 'job.title', 'job.source'])
        .getMany();

      const existingKeys = new Set(
        existingJobs.map((j) => this.buildKey(j.company, j.title, j.source)),
      );

      return uniqueJobs.filter(
        (job) => !existingKeys.has(this.buildKey(job.company, job.title, job.source)),
      );
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [DEDUP] ERROR: Failed to check duplicates`, err);
      return uniqueJobs;
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
      // ON CONFLICT DO NOTHING: a duplicate that slipped past getNewJobs (e.g.
      // two pipeline runs overlapping) skips that row instead of rolling back
      // the whole batch. RETURNING * yields only the rows actually inserted.
      const saved: Job[] = [];
      for (let i = 0; i < entities.length; i += 50) {
        const result = await repo
          .createQueryBuilder()
          .insert()
          .into(Job)
          .values(entities.slice(i, i + 50))
          .orIgnore()
          .returning('*')
          .execute();
        saved.push(...(result.raw as Job[]));
      }
      console.log(
        `[${new Date().toISOString()}] [DEDUP] Saved ${saved.length} jobs to DB` +
          (saved.length < entities.length ? ` (${entities.length - saved.length} conflicts skipped)` : ''),
      );
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

  private buildKey(company: string, title: string, source: string): string {
    return `${company.toLowerCase()}|${title.toLowerCase()}|${source.toLowerCase()}`;
  }
}
