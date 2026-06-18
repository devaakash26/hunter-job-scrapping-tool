import { RawJob } from './job.types';

export interface ScraperResult {
  platform: string;
  jobs: RawJob[];
  error?: string;
}

export interface ScraperError {
  platform: string;
  message: string;
  timestamp: string;
}

export interface PipelineRunResult {
  scraped: number;
  filtered: number;
  newJobs: number;
  alerted: number;
  savedToDb: number;
  errors: ScraperError[];
  timestamp: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  thisWeek: number;
  lastWeek: number;
  responseRate: number;
}
