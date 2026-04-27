
-- Step 1: Create a cases-specific updated_at function that skips stale_alert_sent-only changes
CREATE OR REPLACE FUNCTION public.update_cases_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Skip updated_at bump if only stale_alert_sent changed
  IF (OLD.stale_alert_sent IS DISTINCT FROM NEW.stale_alert_sent) AND
     (ROW(OLD.name, OLD.status, OLD.description, OLD.tags, OLD.color_hex,
          OLD.result_zip_url, OLD.input_zip_url, OLD.csv_zip_url,
          OLD.analysis_mode, OLD.analysis_status, OLD.hitl_stage,
          OLD.previous_result_zip_url, OLD.org_id)
      IS NOT DISTINCT FROM
      ROW(NEW.name, NEW.status, NEW.description, NEW.tags, NEW.color_hex,
          NEW.result_zip_url, NEW.input_zip_url, NEW.csv_zip_url,
          NEW.analysis_mode, NEW.analysis_status, NEW.hitl_stage,
          NEW.previous_result_zip_url, NEW.org_id)) THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Drop the existing generic trigger on cases
DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;

-- Step 3: Create the new cases-specific trigger
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_cases_updated_at();

-- Step 4: Fix affected rows - reset updated_at for cases stuck in Processing
-- whose updated_at was bumped by the stale_alert_sent toggle
UPDATE public.cases
SET updated_at = created_at
WHERE status = 'Processing'
  AND stale_alert_sent = true
  AND updated_at > created_at + interval '1 day';
