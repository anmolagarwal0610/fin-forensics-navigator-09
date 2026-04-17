-- Re-attach the missing BEFORE UPDATE triggers on public.cases
-- These functions exist but have no trigger bound, which caused stale_alert_sent
-- writes to bypass the "skip updated_at bump" guard.

DROP TRIGGER IF EXISTS trg_update_cases_updated_at ON public.cases;
CREATE TRIGGER trg_update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_cases_updated_at();

DROP TRIGGER IF EXISTS trg_reset_stale_alert_on_status_change ON public.cases;
CREATE TRIGGER trg_reset_stale_alert_on_status_change
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.reset_stale_alert_on_status_change();