export const CRON = {
  MORNING_RUN: '30 3 * * *',   // 9:00 AM IST (UTC+5:30 → 3:30 AM UTC)
  EVENING_RUN: '30 12 * * *',  // 6:00 PM IST (UTC+5:30 → 12:30 PM UTC)
  TIMEZONE: 'Asia/Kolkata',
} as const;
