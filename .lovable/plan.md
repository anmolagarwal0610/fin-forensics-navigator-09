

# Fix Stale Processing Alert Side Effects + Deploy Properly

## Root Cause

The `update_cases_updated_at` trigger sets `updated_at = now()` on ANY update to the `cases` table. When `check-stale-processing` sets `stale_alert_sent = true`, the trigger fires and bumps `updated_at`, making old cases appear recent on the dashboard.

## Changes

### 1. SQL Migration: Fix the `updated_at` trigger

Modify `update_updated_at_column()` — or better, create a new cases-specific trigger — to skip updating `updated_at` when the only changed column is `stale_alert_sent`:

```sql
CREATE OR REPLACE FUNCTION public.update_cases_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Skip updated_at bump if only stale_alert_sent changed
  IF (OLD IS DISTINCT FROM NEW) AND
     (OLD.stale_alert_sent IS DISTINCT FROM NEW.stale_alert_sent) AND
     (ROW(OLD.name, OLD.status, OLD.description, OLD.tags, OLD.color_hex,
          OLD.result_zip_url, OLD.input_zip_url, OLD.analysis_mode, OLD.hitl_stage)
      IS NOT DISTINCT FROM
      ROW(NEW.name, NEW.status, NEW.description, NEW.tags, NEW.color_hex,
          NEW.result_zip_url, NEW.input_zip_url, NEW.analysis_mode, NEW.hitl_stage)) THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
```

Then replace the trigger to use this new function instead of the generic `update_updated_at_column()`.

### 2. SQL Migration: Fix affected rows

Reset the 9 affected cases' `updated_at` back to their `created_at` (since they've been stuck in Processing since November 2025, the last meaningful update was around creation time). This must run AFTER the trigger fix to avoid re-bumping.

### 3. Register function in config.toml

Add:
```toml
[functions.check-stale-processing]
verify_jwt = false
```

### 4. SQL Migration: Create pg_cron job

```sql
SELECT cron.schedule(
  'check-stale-processing',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://db.finnavigatorai.com/functions/v1/check-stale-processing',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `check-stale-processing` function config |
| Database (migration) | Replace `update_cases_updated_at` trigger, fix affected rows, create cron job |

