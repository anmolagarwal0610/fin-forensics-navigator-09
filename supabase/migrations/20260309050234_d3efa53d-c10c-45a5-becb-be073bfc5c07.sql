-- Remove both duplicate cron jobs
SELECT cron.unschedule(2);
SELECT cron.unschedule(3);

-- Create single corrected nightly cleanup job using custom domain
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