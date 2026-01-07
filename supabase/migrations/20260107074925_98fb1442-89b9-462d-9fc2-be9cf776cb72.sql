-- Fix jobs_status_check constraint to include PENDING and RUNNING statuses
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY['PENDING','RUNNING','STARTED','SUCCEEDED','FAILED']));