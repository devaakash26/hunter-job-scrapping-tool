import 'dotenv/config';
import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';
import { initializeDatabase } from '../src/config/database';
import { ScraperService } from '../src/services/scraper.service';

// Vercel must not pre-parse the body — we need the raw bytes to verify QStash's HMAC signature
export const config = { api: { bodyParser: false } };

let dbReady = false;
const scraperService = new ScraperService();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Read raw body for signature verification
  const rawBody = await readRawBody(req);

  // Verify QStash signature — rejects spoofed requests
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  });

  const signature = req.headers['upstash-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(401).json({ error: 'Missing upstash-signature header' });
    return;
  }

  let isValid = false;
  try {
    isValid = await receiver.verify({ signature, body: rawBody, clockTolerance: 5 });
  } catch {
    isValid = false;
  }

  if (!isValid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Acknowledge immediately — QStash retries if we don't respond within its timeout
  res.status(200).json({ triggered: true, timestamp: new Date().toISOString() });

  try {
    if (!dbReady) {
      await initializeDatabase();
      dbReady = true;
    }
    await scraperService.runPipeline();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] [CRON] Pipeline error: ${message}`);
  }
}

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}
