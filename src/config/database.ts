import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Job } from '../entities/job.entity';

// Port 6543 = Supabase transaction pooler (PgBouncer).
// `statement_cache_size: 0` disables prepared statements which PgBouncer doesn't support.
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [Job],
  // Vercel: serverless cold starts hang on schema sync with PgBouncer — skip it.
  // Railway: sync on startup to auto-create/update the jobs table.
  synchronize: !process.env.VERCEL,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 5,
    statement_cache_size: 0,
  },
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log(`[${new Date().toISOString()}] [DATABASE] Connected to Supabase PostgreSQL`);
  }
}
