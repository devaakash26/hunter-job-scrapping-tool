import "reflect-metadata";
import { DataSource } from "typeorm";
import { Job } from "../entities/job.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [Job],
  synchronize: !process.env.VERCEL,
  logging: process.env.NODE_ENV === "development",
  extra: {
    // Serverless + Supabase transaction pooler (port 6543): each warm lambda
    // should hold at most ~1 server connection so the pgBouncer pool isn't
    // exhausted across concurrent invocations.
    max: 2,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000,
    // Fail fast instead of riding to Vercel's 30s wall. A stalled query now
    // surfaces as a real error in the route's catch block.
    statement_timeout: 10000,
    query_timeout: 10000,
  },
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log(
      `[${new Date().toISOString()}] [DATABASE] Connected to Supabase PostgreSQL`,
    );
  }
}
