

# Plan: Three Fixes

## Issue 1: "View Last Results" not working with HITL / Secure Flow

**Root Cause**: The case uses the **secure storage flow** (`result_files` table) — `result_zip_url` is always `null`. The preservation code in `CaseUpload.tsx` checks `if (isAddFilesMode && case_.result_zip_url)` which never triggers. Similarly, `CaseDetail.tsx` checks `case_.previous_result_zip_url` which is never set.

**Fix**: In `CaseDetail.tsx`, the "View Last Results" CTA should also appear when `hasSecureResultFile` is true (meaning there's a result in `result_files`). For failed cases with secure results, the previous result is still available in `result_files` (the old result file records still exist). In `CaseAnalysisResults.tsx`, the `enabled` condition should also allow failed cases with `hasSecureResultFile`.

Changes:
- **`CaseDetail.tsx` (line 560-561)**: Change condition from `case_.previous_result_zip_url` to `(case_.previous_result_zip_url || hasSecureResultFile)` for the "View Last Results" button
- **`CaseAnalysisResults.tsx` (line 306)**: Update `enabled` condition to also allow `Failed`/`Timeout` cases when `hasSecureResultFile` is true (not just `previous_result_zip_url`)

## Issue 2: Back button should go to Dashboard

Changes:
- **`CaseDetail.tsx` (line 332)**: Change `navigate('/app/cases')` → `navigate('/app/dashboard')`
- **`CaseAnalysisResults.tsx` (lines 987, 1040, 1071)**: Change `navigate(\`/app/cases/${id}\`)` → `navigate('/app/dashboard')`
- **`CaseUpload.tsx` (line 682)**: Change `navigate(-1)` → `navigate('/app/dashboard')`

## Issue 3: Minimize HITL toggle

Move the HITL toggle from a prominent card-section to a small inline toggle in the top-right of the "Upload Files for Analysis" CardHeader. Replace the current block (lines 756-771) with a compact toggle next to the CardTitle, with an info icon tooltip.

Changes:
- **`CaseUpload.tsx` (lines 744-747)**: Update CardHeader to include the HITL toggle inline with the title using flex layout
- **`CaseUpload.tsx` (lines 756-771)**: Remove the standalone HITL block

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/app/CaseDetail.tsx` | Fix "View Last Results" condition to include secure flow; back button → dashboard |
| `src/pages/app/CaseAnalysisResults.tsx` | Fix enabled condition for secure flow; back buttons → dashboard |
| `src/pages/app/CaseUpload.tsx` | Back button → dashboard; move HITL toggle to compact inline position |

