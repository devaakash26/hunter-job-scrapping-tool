import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  slack: {
    botToken: requireEnv('SLACK_BOT_TOKEN'),
    channelId: requireEnv('SLACK_CHANNEL_ID'),
  },
  db: {
    url: requireEnv('DATABASE_URL'),
  },
  auth: {
    secret: requireEnv('AUTH_SECRET'),
    username: requireEnv('AUTH_USERNAME'),
    password: requireEnv('AUTH_PASSWORD'),
  },
  qstash: {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  },
  app: {
    env: nodeEnv,
    isDev: nodeEnv === 'development',
    isVercel: !!process.env.VERCEL,
    port: parseInt(process.env.PORT ?? '4000'),
    frontendUrls: (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
  },
} as const;
