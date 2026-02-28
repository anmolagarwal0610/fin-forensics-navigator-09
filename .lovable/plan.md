

# Plan: Fix 5 Issues

## Issue 1: Duplicate Job Submissions

**Root cause**: No guard against double-clicks on "Start Analysis". The `submitting` state is set to `true` at line 377 but there's no early-exit check or button disabling that accounts for rapid clicks before the async flow sets state.

**Fix** (in `src/pages/app/CaseUpload.tsx`):
- Add a `useRef` flag (`submittingRef`) that is set synchronously before any async work, and checked at the top of `handleStartAnalysis`. This prevents double invocations even if React state hasn't re-rendered yet.
- Add a pre-flight check in `startJob()` (`src/lib/startJob.ts`) that queries `jobs` table for any active (PENDING/RUNNING/STARTED) job with the same `session_id` before inserting a new one. If found, throw an error to prevent duplicate.

**Files changed**: `src/pages/app/CaseUpload.tsx`, `src/lib/startJob.ts`

---

## Issue 2: Add/Remove Files — Same Name Re-Upload Blocked

**Root cause**: In `handleStartAnalysis` (line 486-527), file deletions and additions both happen *after* the job starts, and the `addFiles` function (line 168-176 in `api/cases.ts`) checks for existing filenames and skips duplicates. When a user removes `anmol.xlsx` (pre-existing) and re-adds `anmol.pdf`, the deletion and addition happen concurrently — the addition's duplicate check finds the old record before deletion runs.

**Fix** (in `src/pages/app/CaseUpload.tsx`):
- Reorder the add-files flow: perform file **deletions first**, then **additions second**, both **before** starting the job.
- Move the deletion logic (lines 501-527) before the `startJobFlow` call (line 448).
- Move the addition logic (lines 486-499) after deletions but before `startJobFlow`.

**Files changed**: `src/pages/app/CaseUpload.tsx`

---

## Issue 3: Case Deletion Failing

**Root cause**: The `delete_case_storage_files` BEFORE DELETE trigger on `cases` table tries to `DELETE FROM storage.objects` directly. A newer Supabase system trigger `protect_delete` on `storage.objects` blocks direct SQL deletions with error: *"Direct deletion from storage tables is not allowed. Use the Storage API instead."*

**Fix**: Remove the direct `DELETE FROM storage.objects` statements from the trigger. Instead, only delete the *table records* (result_files, shared_fund_trails, fund_trail_views) in the trigger — which cascades handle anyway. For storage cleanup, either:
- Option A: Simplify the trigger to only handle table records that don't have CASCADE (but they all do — so the trigger can be simplified to a no-op or removed).
- Option B: Set the `storage.allow_delete_query` setting before deletion.

**Recommended**: Use `SET LOCAL storage.allow_delete_query = 'true'` at the start of the trigger function, since it's already `SECURITY DEFINER`. This allows the trigger to work as intended.

**Fix via DB migration**: Update the `delete_case_storage_files` function to add `PERFORM set_config('storage.allow_delete_query', 'true', true);` at the beginning.

---

## Issue 4: HTML-Disguised Files Still Showing Anomaly

**Root cause**: The current `hasEmbeddedHtml` check in the worker (line 36-46) only checks for `<img`, `<html`, and `style=`. But some bank files have the HTML spread across multiple columns where individual cells contain fragments like `images/indian-bank-logo`, `watermark`, `position : fixed`, `opacity`, `z-index`, `pointer-events` without the full `<img` tag in a single cell.

**Fix** (in `src/workers/headerDetection.worker.ts`):
- Expand `hasEmbeddedHtml` to also check for patterns: `watermark`, `indian-bank-logo`, `position : fixed`, `pointer-events`, `opacity:`, `z-index:`, `<meta`, `<head`, `content-type`, `text/html`. These are clear indicators of HTML/image-based bank statement files.
- Also check concatenated row content (join all cells in a row) for these patterns, since the HTML may be split across columns.

**Files changed**: `src/workers/headerDetection.worker.ts`

---

## Issue 5: Warning Message for Missing Headers in Map Header Columns

**Root cause**: No warning message exists in Step 2 of `MapColumnsDialog`.

**Fix** (in `src/components/app/MapColumnsDialog.tsx`):
- In Step 2, below the `DialogDescription`, add an `Alert` box showing which headers were not auto-detected.
- Use `partialMatch.unmatched` to build the message:
  - 1 missing: "Could not detect **Date** header. Please add this field from the dropdown."
  - 2 missing: "Could not detect **Date & Balance** header. Please add these fields from the dropdown."
  - 3+ missing: "Could not detect **Date, Description & Balance** header. Please add these fields from the dropdown."
- Format: Join with commas, last one with "&". Use singular "field" for 1, "fields" for 2+.

**Files changed**: `src/components/app/MapColumnsDialog.tsx`

---

## Summary

| # | Issue | File(s) | Type |
|---|-------|---------|------|
| 1 | Duplicate job submissions | `CaseUpload.tsx`, `startJob.ts` | FE guard + DB check |
| 2 | Same-name re-upload blocked | `CaseUpload.tsx` | Reorder delete→add→job |
| 3 | Case deletion failing | DB migration (trigger fix) | `SET storage.allow_delete_query` |
| 4 | HTML files showing anomaly | `headerDetection.worker.ts` | Expand detection patterns |
| 5 | Missing header warning | `MapColumnsDialog.tsx` | Add Alert in Step 2 |

