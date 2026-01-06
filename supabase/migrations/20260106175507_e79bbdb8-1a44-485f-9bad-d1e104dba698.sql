-- Fix search_path for apply_job_update function
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
SET search_path TO 'public'
AS $function$
declare 
  v_row public.jobs;
begin
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