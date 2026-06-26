export const SLACK = {
  API_URL: 'https://slack.com/api/chat.postMessage',
  MAX_ALERTS_PER_RUN: 15,
  RETRY_DELAY_MS: 5000,
  REQUEST_TIMEOUT_MS: 10000,
  EMOJIS: {
    EASY_APPLY: '⚡',
    YC_JOB: '🚀',
    NEW_JOB: '🔥',
  },
  MESSAGES: {
    APPLY_BUTTON_TEXT: 'Apply Now 🚀',
  },
} as const;
