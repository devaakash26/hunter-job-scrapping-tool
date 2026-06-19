import 'dotenv/config';
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { initializeDatabase } from './config/database';
import { ScraperService } from './services/scraper.service';
import { config } from './config/env';

const app = express();
// Raw body required for QStash HMAC verification
app.use(express.raw({ type: '*/*' }));

const scraperService = new ScraperService();

const receiver = new Receiver({
  currentSigningKey: config.qstash.currentSigningKey,
  nextSigningKey: config.qstash.nextSigningKey,
});

app.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['upstash-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(401).json({ error: 'Missing upstash-signature header' });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : String(req.body ?? '');

  let isValid = false;
  try {
    isValid = await receiver.verify({ signature, body: rawBody, clockTolerance: 5 });
  } catch {
    isValid = false;
  }

  if (!isValid) {
    res.status(401).json({ error: 'Invalid QStash signature' });
    return;
  }

  // Respond before running — QStash retries if it doesn't get 2xx within its timeout
  res.status(200).json({ triggered: true, timestamp: new Date().toISOString() });

  setImmediate(async () => {
    try {
      await scraperService.runPipeline();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [TRIGGER] Pipeline error:`, err);
    }
  });
});

async function bootstrap(): Promise<void> {
  await initializeDatabase();
  const port = parseInt(process.env.PORT ?? process.env.SCRAPER_PORT ?? '4000');
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [SERVER] Scraper server running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error(`[${new Date().toISOString()}] [BOOTSTRAP] Fatal error:`, err);
  process.exit(1);
});
