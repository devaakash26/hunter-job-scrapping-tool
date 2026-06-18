import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import path from 'path';
import { config } from './config/env';
import { initializeDatabase } from './config/database';
import { dashboardRouter } from './dashboard/dashboard.router';
import { startScheduler, runPipelineOnce } from './cron/scheduler';

async function bootstrap(): Promise<void> {
  // Connect to DB
  await initializeDatabase();

  // Express app
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  // Routes
  app.use('/', dashboardRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const { port } = config.dashboard;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [SERVER] Dashboard running at http://localhost:${port}`);
  });

  // Register cron jobs
  startScheduler();

  // Run pipeline immediately on startup
  await runPipelineOnce();
}

bootstrap().catch((err) => {
  console.error(`[${new Date().toISOString()}] [BOOTSTRAP] Fatal error:`, err);
  process.exit(1);
});
