
ALTER TABLE public.cases ADD COLUMN stale_alert_sent BOOLEAN DEFAULT FALSE;

-- Create trigger to reset stale_alert_sent when status changes away from Processing
CREATE OR REPLACE FUNCTION public.reset_stale_alert_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'Processing' AND NEW.status != 'Processing' THEN
    NEW.stale_alert_sent := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reset_stale_alert_trigger
BEFORE UPDATE ON public.cases
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.reset_stale_alert_on_status_change();
