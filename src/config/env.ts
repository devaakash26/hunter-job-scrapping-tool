import 'dotenv/config';
import { DASHBOARD } from '../constants';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

export const config = {
  slack: {
    botToken: requireEnv('SLACK_BOT_TOKEN'),
    channelId: requireEnv('SLACK_CHANNEL_ID'),
  },
  db: {
    url: requireEnv('DATABASE_URL'),
  },
  dashboard: {
    apiKey: requireEnv('DASHBOARD_API_KEY'),
    port: parseInt(process.env.PORT ?? String(DASHBOARD.DEFAULT_PORT)),
  },
  auth: {
    secret: process.env.AUTH_SECRET || 'jh-default-secret-change-in-prod',
  },
  qstash: {
    url: process.env.QSTASH_URL ?? '',
    token: process.env.QSTASH_TOKEN ?? '',
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  },
  app: {
    env: process.env.NODE_ENV ?? 'development',
    isDev: (process.env.NODE_ENV ?? 'development') === 'development',
    isVercel: !!process.env.VERCEL,
  },
} as const;
