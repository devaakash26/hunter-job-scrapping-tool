export const SLACK = {
  API_URL: 'https://slack.com/api/chat.postMessage',
  MAX_ALERTS_PER_RUN: 15,
  RETRY_DELAY_MS: 5000,
  REQUEST_TIMEOUT_MS: 10000,
  EMOJIS: {
    EASY_APPLY: '⚡',
    YC_JOB: '🚀',
    NEW_JOB: '🔥',
    SUMMARY: '📊',
    NO_JOBS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
  },
  MESSAGES: {
    NO_JOBS_FOUND: 'Checked all sources — no new jobs found.',
    SUMMARY_TITLE: 'Job Hunt Update',
    APPLY_BUTTON_TEXT: 'Apply Now 🚀',
    JOB_HEADER_PREFIX: 'New Job',
  },
} as const;
