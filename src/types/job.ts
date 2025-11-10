export type JobTask = 'initial-parse' | 'final-analysis' | 'parse-statements';

export type JobStatus = 'STARTED' | 'SUCCEEDED' | 'FAILED';

export interface JobResp {
  job_id: string;
  status: 'STARTED';
}

export interface JobRow {
  id: string;
  task: JobTask;
  status: JobStatus;
  url: string | null;
  error: string | null;
  user_id?: string | null;
  session_id?: string | null;
  input_url: string;
  created_at: string;
  updated_at: string;
}
