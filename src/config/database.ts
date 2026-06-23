import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Job } from '../entities/job.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [Job],
  synchronize: !process.env.VERCEL,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 5,
    statement_cache_size: 0,
    connectionTimeoutMillis: 8000,
  },
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log(`[${new Date().toISOString()}] [DATABASE] Connected to Supabase PostgreSQL`);
  }
}
