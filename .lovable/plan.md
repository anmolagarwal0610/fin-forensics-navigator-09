

# Plan: Admin Retry Failed Cases

## Overview

Add a "Retry" button in the Admin Cases table for cases with status `Failed` or `Timeout`. The button re-uses the already-stored `input_zip_url` (storage path) to generate a fresh signed URL and starts a new job — no re-upload needed.

## Why No Re-upload Is Needed

The `input_zip_url` column already stores the **storage path** (e.g., `userId/zips/case_xxx_timestamp.zip`) for every case that was submitted. The original files are in that ZIP. We just need to:
1. Generate a fresh signed URL from the stored path
2. Call `startJob()` with that URL and the case's `creator_id`

## Data Changes

**`admin-get-all-cases` edge function** — currently returns `*` from cases but the `AdminCase` interface doesn't include `creator_id`, `analysis_mode`, or `hitl_stage`. Need to add these to the interface so the frontend knows:
- `creator_id` — the user who owns the case (passed as `userId` to `startJob`)
- `analysis_mode` — determines task type (`hitl` → `initial-parse`, `direct` → `parse-statements`)
- `hitl_stage` — if the case failed during `final_analysis`, retry with that task instead

**`useAdminCases.ts`** — Add `creator_id`, `analysis_mode`, `hitl_stage` to the `AdminCase` interface.

## Frontend Changes

**`src/pages/app/AdminCases.tsx`**:
- Add a new "Actions" column after "Results"
- For cases where `status === 'Failed' || status === 'Timeout'`:
  - Show a "Retry" button with a `RotateCcw` icon
  - On click: show confirmation dialog, then execute retry flow
  - While running: show spinner, disable button
- For other statuses: show disabled/hidden button or nothing

**Retry flow** (in AdminCases.tsx):
1. Validate `input_zip_url` exists — if not, show error toast "No input files available for retry"
2. Generate fresh signed URL: `supabase.storage.from('case-files').createSignedUrl(input_zip_url, 8 * 60 * 60)`
3. Determine task from `analysis_mode` + `hitl_stage`:
   - `hitl_stage === 'final_analysis'` → task = `'final-analysis'`
   - `analysis_mode === 'hitl'` or default → task = `'initial-parse'`
   - `analysis_mode === 'direct'` → task = `'parse-statements'`
4. Call `startJob(task, signedUrl, caseId, creatorId)` — reuses existing function
5. Subscribe to job updates via `subscribeJob()` — update case status in real-time
6. On success/failure: refetch admin cases list, show toast

## Edge Cases

- **No `input_zip_url`**: Button disabled with tooltip "No input files stored"
- **Active job already exists**: `startJob` pre-flight check will throw — caught and shown as toast
- **Signed URL generation fails** (file deleted from storage): Show error toast
- **Admin is not the case owner**: Fine — `startJob` inserts job with `creator_id` as `user_id`, and admin RLS policies allow this

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAdminCases.ts` | Add `creator_id`, `analysis_mode`, `hitl_stage` to `AdminCase` interface |
| `src/pages/app/AdminCases.tsx` | Add "Actions" column with Retry button + confirmation dialog + retry logic |

No edge function changes needed — `admin-get-all-cases` already returns `SELECT *` which includes all columns.

