The user approved the 3-step mitigation. Let me confirm what I'm executing:

1. **Reset updated_at for 9 corrupted rows** — UPDATE cases SET updated_at = created_at WHERE these 9 stuck-since-Nov rows.
2. **Re-attach missing trigger** — CREATE TRIGGER on cases BEFORE UPDATE calling update_cases_updated_at(). Also re-attach reset_stale_alert_on_status_change trigger which is also missing.
3. **Lock down Edge Function** — change config.toml `verify_jwt = true` for check-stale-processing.

Step 1 is a data UPDATE → use insert/data tool.
Step 2 is a SCHEMA change (CREATE TRIGGER) → use migration tool.
Step 3 is a file edit on supabase/config.toml.

I should also identify the 9 cases precisely. From prior RCA, they share `updated_at = 2026-04-16 11:56:09` (the timestamp of the ad-hoc invocation) and were originally created in Nov 2025. The safest filter:
`WHERE status = 'Processing' AND stale_alert_sent = true AND created_at < '2025-12-01'`

# Mitigation Plan: Restore Trigger + Reset Timestamps + Lock Edge Function

## Step 1 — Reset corrupted `updated_at` (data update)

```sql
UPDATE public.cases
SET updated_at = created_at
WHERE status = 'Processing'
  AND stale_alert_sent = true
  AND created_at < '2025-12-01';
```

This restores the 9 Nov-2025 cases to their true last-meaningful-update time so they fall back down the dashboard.

## Step 2 — Re-create the missing triggers (schema migration)

Both `update_cases_updated_at()` and `reset_stale_alert_on_status_change()` functions exist but no trigger is attached. Re-attach both:

```sql
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
```

After this, future `stale_alert_sent` toggles will NOT bump `updated_at`, and reverting a case from Processing will reset the alert flag.

## Step 3 — Lock down the public Edge Function

Update `supabase/config.toml`: change `check-stale-processing` from `verify_jwt = false` to `verify_jwt = true`. This prevents anonymous ad-hoc invocations like the one that caused this incident. When pg_cron is eventually scheduled, it will pass the service-role bearer.

## Files / Tools


| Step | Tool               | Target                     |
| ---- | ------------------ | -------------------------- |
| 1    | data insert/update | `cases` table — 9 rows     |
| 2    | migration          | `cases` table — 2 triggers |
| 3    | file edit          | `supabase/config.toml`     |


No application code changes. No edge function code changes. Top 1000 table changes are unrelated and remain untouched.  
Okay, make sure nothing is broken in this and the system should run fine as it was running before.  
Do a recheck from your end as well.