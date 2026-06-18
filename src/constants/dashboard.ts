export const DASHBOARD = {
  DEFAULT_PORT: 3000,
  API_KEY_HEADER: 'x-api-key',
  JOB_STATUSES: ['new', 'saved', 'applied', 'interview', 'rejected', 'offer'] as const,
  STATUS_COLORS: {
    new: '#3b82f6',
    saved: '#8b5cf6',
    applied: '#f59e0b',
    interview: '#10b981',
    rejected: '#ef4444',
    offer: '#22c55e',
  },
  ITEMS_PER_PAGE: 50,
} as const;

export const VIEWS = {
  INDEX: 'index',
  STATS: 'stats',
} as const;
