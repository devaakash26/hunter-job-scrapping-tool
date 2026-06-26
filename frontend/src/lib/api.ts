import type { Job, JobsResponse, Stats } from './types';
import { TOKEN_KEY } from './constants';

const BASE = import.meta.env.VITE_API_URL ?? '';

// Dispatched when auth is lost (401 or explicit logout). App navigates to login.
export const UNAUTHORIZED_EVENT = 'jh:unauthorized';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value: string) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export function isLoggedIn(): boolean {
  return !!token.get();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authToken = token.get();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    token.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => {
    token.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  },

  getJobs: (params: Record<string, string>, signal?: AbortSignal) =>
    request<JobsResponse>(`/api/jobs?${new URLSearchParams(params).toString()}`, { signal }),

  updateStatus: (jobId: number, status: string) =>
    request<{ success: boolean; job: Job }>('/update-status', {
      method: 'POST',
      body: JSON.stringify({ jobId, status }),
    }),

  getStats: () => request<Stats>('/api/stats'),

  runScraper: () =>
    request<{ started: boolean; timestamp: string }>('/run-scraper', { method: 'POST' }),
};
