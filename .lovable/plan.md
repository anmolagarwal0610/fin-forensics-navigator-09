

# Fix: Cleanup Cron Job and Immediate Cleanup

## What Happened

**Immediate cleanup: DONE.** I ran the cleanup function manually just now. Results:
- 188 old result file duplicates deleted
- 12 orphaned result storage files deleted  
- 8 revoked/expired shared fund trails deleted
- **Total: 208 files deleted, 1.82 GB freed**
- Result files reduced from 473 (2.8 GB) to 285 (1.04 GB)
- All cases now have at most 2 result files

## Root Cause: Cron Jobs Failing

Every nightly cron run has failed with: **`ERROR: schema "net" does not exist`**

The `pg_net` extension is not enabled in your Supabase project. The cron jobs use `net.http_post()` to call the edge function, but that function doesn't exist without the extension.

Additionally, there are **2 duplicate cron jobs** (jobid 2 at 2:00 AM UTC, jobid 3 at midnight UTC).

## Fix Plan

### Step 1: Enable `pg_net` extension
You need to enable this in the Supabase Dashboard:
**Dashboard > Database > Extensions > search "pg_net" > Enable**

Alternatively, I can run this SQL migration:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### Step 2: Remove duplicate cron job and update the remaining one
Run via SQL Editor (since this contains project-specific secrets, not a migration):
```sql
-- Delete the duplicate job (jobid 2, 2 AM)
SELECT cron.unschedule(2);

-- Update the remaining job (jobid 3) to use the custom domain
SELECT cron.unschedule(3);

SELECT cron.schedule(
  'nightly-storage-cleanup',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://db.finnavigatorai.com/functions/v1/cleanup-storage',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enBmZnNhaXZnanV1dGh2a2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTU5NzMsImV4cCI6MjA3MTQzMTk3M30.6N8Iz52V5CtFv7USeuMBmc_Ar4XCMFHTY8tlarHidsk"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### Step 3: Clean up old cron run history
```sql
DELETE FROM cron.job_run_details WHERE status = 'failed';
```

## Summary

| Item | Status |
|------|--------|
| Manual cleanup | Done — 208 files, 1.82 GB freed |
| Root cause identified | `pg_net` extension missing |
| Duplicate cron jobs | 2 found, will consolidate to 1 |
| URL update | Will use `db.finnavigatorai.com` |

### What I Will Do (in implementation mode)
1. Create a migration to enable `pg_net` extension
2. Remove both old cron jobs and create a single corrected one (via SQL Editor — since it contains secrets)
3. Verify the new cron job is active

