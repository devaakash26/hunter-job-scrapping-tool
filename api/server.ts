// Local development server — EJS dashboard on http://localhost:3000
// On Railway/production, src/index.ts is the entry point (see Procfile).
import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { initializeDatabase } from '../src/config/database';
import { dashboardRouter } from '../src/dashboard/dashboard.router';
import { config } from '../src/config/env';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.auth.secret));
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use('/', dashboardRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = config.dashboard.port;
initializeDatabase()
  .then(() => app.listen(PORT, () => console.log(`[DEV] Dashboard at http://localhost:${PORT}`)))
  .catch((err) => { console.error('[DEV] DB init failed:', err); process.exit(1); });

export default app;
