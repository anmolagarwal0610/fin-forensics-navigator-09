-- ============================================
-- DURABLE JOB QUEUE: Enhance jobs table
-- ============================================

-- Add new columns for durability and tracking
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS result_file_id uuid REFERENCES public.result_files(id),
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS locked_by text;

-- Create index for efficient pending job retrieval
CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
ON public.jobs(status, created_at) 
WHERE status IN ('PENDING', 'RUNNING', 'STARTED');

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_key 
ON public.jobs(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- ============================================
-- Update apply_job_update function
-- Supports PENDING, RUNNING, SUCCEEDED, FAILED
-- Stores result_file_id for secure storage
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_job_update(
  p_id uuid, 
  p_task text, 
  p_user_id uuid, 
  p_session_id text, 
  p_input_url text, 
  p_status text, 
  p_url text, 
  p_error text, 
  p_idempotency_key text, 
  p_updated_at timestamp with time zone,
  p_result_file_id uuid DEFAULT NULL,
  p_attempt_count integer DEFAULT NULL
)
RETURNS jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare 
  v_row public.jobs;
  v_status_order integer;
  v_existing_status_order integer;
begin
  -- Define status ordering for monotonic progression
  -- PENDING=1, RUNNING/STARTED=2, SUCCEEDED/FAILED=3
  v_status_order := CASE p_status
    WHEN 'PENDING' THEN 1
    WHEN 'RUNNING' THEN 2
    WHEN 'STARTED' THEN 2
    WHEN 'SUCCEEDED' THEN 3
    WHEN 'FAILED' THEN 3
    ELSE 0
  END;

  insert into public.jobs as j (
    id, task, user_id, session_id, input_url, status, url, error, 
    idempotency_key, updated_at, result_file_id, attempt_count
  )
  values (
    p_id, p_task, p_user_id, p_session_id, p_input_url, p_status, p_url, p_error, 
    p_idempotency_key, p_updated_at, p_result_file_id, COALESCE(p_attempt_count, 0)
  )
  on conflict (id) do update set
    task            = excluded.task,
    user_id         = excluded.user_id,
    session_id      = excluded.session_id,
    input_url       = excluded.input_url,
    status          = excluded.status,
    url             = excluded.url,
    error           = excluded.error,
    idempotency_key = excluded.idempotency_key,
    updated_at      = excluded.updated_at,
    result_file_id  = COALESCE(excluded.result_file_id, j.result_file_id),
    attempt_count   = CASE 
                        WHEN excluded.attempt_count IS NOT NULL THEN excluded.attempt_count
                        ELSE j.attempt_count
                      END
  where
    excluded.updated_at >= j.updated_at
    AND (
      -- Only allow forward progression or same status
      CASE excluded.status
        WHEN 'PENDING' THEN 1
        WHEN 'RUNNING' THEN 2
        WHEN 'STARTED' THEN 2
        WHEN 'SUCCEEDED' THEN 3
        WHEN 'FAILED' THEN 3
        ELSE 0
      END
    ) >= (
      CASE j.status
        WHEN 'PENDING' THEN 1
        WHEN 'RUNNING' THEN 2
        WHEN 'STARTED' THEN 2
        WHEN 'SUCCEEDED' THEN 3
        WHEN 'FAILED' THEN 3
        ELSE 0
      END
    );

  select * into v_row from public.jobs where id = p_id;
  return v_row;
end $function$;

-- ============================================
-- Function to get pending jobs for replay
-- Called when FastAPI server restarts
-- ============================================
CREATE OR REPLACE FUNCTION public.get_pending_jobs_for_replay(
  p_max_age_hours integer DEFAULT 24,
  p_lock_expiry_minutes integer DEFAULT 5
)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.jobs
  WHERE 
    -- Get PENDING jobs
    (status = 'PENDING')
    OR 
    -- Get stale RUNNING/STARTED jobs (possibly crashed workers)
    (
      status IN ('RUNNING', 'STARTED')
      AND (
        locked_at IS NULL 
        OR locked_at < NOW() - (p_lock_expiry_minutes || ' minutes')::interval
      )
    )
  -- Only consider recent jobs
  AND created_at > NOW() - (p_max_age_hours || ' hours')::interval
  ORDER BY created_at ASC;
END;
$function$;

-- ============================================
-- Function to lock a job for processing
-- Prevents duplicate processing in distributed systems
-- ============================================
CREATE OR REPLACE FUNCTION public.lock_job_for_processing(
  p_job_id uuid,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.jobs
  SET 
    locked_at = NOW(),
    locked_by = p_worker_id,
    status = 'RUNNING',
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  WHERE id = p_job_id
    AND status IN ('PENDING', 'STARTED')
    AND (
      locked_at IS NULL 
      OR locked_at < NOW() - INTERVAL '5 minutes'
    );
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;