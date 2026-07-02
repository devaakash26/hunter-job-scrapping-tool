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
  // Filter-only fields (not persisted): raw experience text ("0-2 yrs") and
  // the job description when a scraper fetched it — used to enforce the
  // 0-2 years experience rule.
  experience?: string;
  description?: string;
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
  easyApply?: boolean;
  location?: string;
  ycOnly?: boolean;
  hasSalary?: boolean;
  sortBy?: 'newest' | 'oldest' | 'company';
}
