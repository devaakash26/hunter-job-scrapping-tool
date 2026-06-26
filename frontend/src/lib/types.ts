import { JOB_STATUSES } from './constants';

export type JobStatus = (typeof JOB_STATUSES)[number];

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  source: string;
  tags: string;
  postedAt: string;
  easyApply: boolean;
  ycBatch: string;
  status: JobStatus;
  alerted: boolean;
  appliedAt: string | null;
  createdAt: string;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  thisWeek: number;
  lastWeek: number;
  responseRate: number;
}
