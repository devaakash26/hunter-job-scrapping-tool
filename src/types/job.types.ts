export interface RawJob {
  title: string;
  company: string;
  location: string;
  salary: string;       // 'Not mentioned' if missing — NEVER null
  url: string;
  source: string;
  tags: string;
  postedAt: string;
  easyApply: boolean;
  ycBatch?: string;
}

export type JobStatus = 'new' | 'saved' | 'applied' | 'interview' | 'rejected' | 'offer';

export interface JobUpdatePayload {
  jobId: number;
  status: JobStatus;
}

export interface JobFilters {
  status?: JobStatus | 'all';
  search?: string;
  source?: string;
  page?: number;
}
