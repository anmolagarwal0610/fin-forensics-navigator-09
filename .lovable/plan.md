

# Fix: Trace Transaction CORS Error + Email Notifications

## Issue 1: CORS Error on `/trace-transaction`

**Root Cause**: The frontend in `src/lib/traceTransaction.ts` (line 100) calls the FastAPI backend directly from the browser:
```
fetch(`${backendUrl}/trace-transaction`, { method: "POST", ... })
```

The FastAPI CORS config only allows the production domain (`finnavigatorai.lovable.app`). The preview domain (`id-preview--*.lovable.app`) is blocked, causing the preflight OPTIONS request to fail with a CORS error. Even in production, this is fragile.

**Fix**: Route through a new Supabase Edge Function `trace-transaction` that proxies the request to the backend. This is the same pattern used by other backend calls (e.g., `final-analysis-files`).

### New Edge Function: `supabase/functions/trace-transaction/index.ts`
- Accept POST with `{ case_id, window_days, transactions }` from the authenticated frontend
- Verify the user is authenticated via JWT
- Forward the request to `BACKEND_API_URL/trace-transaction/`
- Return the backend response to the frontend

### Update: `src/lib/traceTransaction.ts`
- Replace direct `fetch(backendUrl/trace-transaction)` with `supabase.functions.invoke('trace-transaction', { body: {...} })`
- Remove dependency on `getBackendApiUrl` / `clearBackendUrlCache` (no longer needed here)

---

## Issue 2: Email for cases processing > 3 hours

**Approach**: Create a scheduled Edge Function `check-stale-processing` that runs periodically (every 30 minutes via pg_cron). It queries for cases with `status = 'Processing'` where `updated_at` is older than 3 hours, and sends an email alert for each.

### New Edge Function: `supabase/functions/check-stale-processing/index.ts`
- Query cases where `status = 'Processing'` AND `updated_at < NOW() - INTERVAL '3 hours'`
- For each stale case, fetch: case name, creator_id, file count (from `case_files`), and the time processing started (`updated_at` when status changed to Processing)
- Send email to `help@finnavigatorai.com` with: Case Name, User ID, Time analysis started, Number of files
- To prevent duplicate emails, track already-alerted cases (add a `stale_alert_sent` boolean column to cases, or use an events table entry)

### Database: Add `stale_alert_sent` column
- `ALTER TABLE cases ADD COLUMN stale_alert_sent BOOLEAN DEFAULT FALSE`
- Reset to `false` when case status changes away from Processing

### Cron Job (via SQL insert, not migration)
- Schedule `check-stale-processing` to run every 30 minutes

---

## Issue 3: Email for failed cases — enhanced info

**Current state**: The `job-webhook` already sends a failure email (lines 406-506) but it lacks "Time analysis started" and "Number of files".

### Update: `supabase/functions/job-webhook/index.ts`
- In the FAILED block, also fetch:
  - `case_files` count for the case: `SELECT COUNT(*) FROM case_files WHERE case_id = caseId`
  - Case `created_at` or the earliest Processing event timestamp as "Time analysis started"
- Add these fields to the email HTML template

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/trace-transaction/index.ts` | Create | Proxy edge function to forward trace requests to backend |
| `src/lib/traceTransaction.ts` | Modify | Use `supabase.functions.invoke` instead of direct fetch |
| `supabase/functions/check-stale-processing/index.ts` | Create | Scheduled function to detect cases stuck in Processing > 3h |
| `supabase/functions/job-webhook/index.ts` | Modify | Add file count and processing start time to failure email |
| Database migration | Create | Add `stale_alert_sent` column to cases table |

