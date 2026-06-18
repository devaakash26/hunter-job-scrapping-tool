import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../src/config/database';
import { dashboardRouter } from '../src/dashboard/dashboard.router';
import { config } from '../src/config/env';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.auth.secret));
app.set('view engine', 'ejs');
// views/ is included via vercel.json "includeFiles" — process.cwd() resolves to project root
app.set('views', path.join(process.cwd(), 'views'));

app.use('/', dashboardRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

let dbReady = false;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!dbReady) {
    await initializeDatabase();
    dbReady = true;
  }
  await new Promise<void>((resolve) => app(req as never, res as never, () => resolve()));
}

// Local dev: `npm run dev:dashboard`
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.DASHBOARD_PORT ?? '3000');
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () =>
        console.log(`[DEV] Dashboard running at http://localhost:${PORT}`),
      );
    })
    .catch((err) => {
      console.error('[DEV] DB init failed:', err);
      process.exit(1);
    });
}
