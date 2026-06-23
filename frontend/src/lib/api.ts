import type { Job, JobsResponse, Stats } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';

function getToken(): string | null {
  return localStorage.getItem('jh_token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('jh_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
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
    localStorage.removeItem('jh_token');
    window.location.href = '/login';
  },

  isLoggedIn: () => !!localStorage.getItem('jh_token'),

  getJobs: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<JobsResponse>(`/api/jobs?${qs}`);
  },

  updateStatus: (jobId: number, status: string) =>
    request<{ success: boolean; job: Job }>('/update-status', {
      method: 'POST',
      body: JSON.stringify({ jobId, status }),
    }),

  getStats: () => request<Stats>('/api/stats'),
};
