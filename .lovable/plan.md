

# Fix: Save previous result URL before re-run starts

## Problem

When re-running a case via "Add or Remove Files" (`CaseUpload.tsx`), the current `result_zip_url` is never saved to `previous_result_zip_url` **before** the new job starts. The webhook only copies it on **success** (in `job-webhook/index.ts` line 348). So when the job **fails**, `previous_result_zip_url` remains `null`, and the "View Last Results" button never appears.

The "Apply Changes" flow in `CaseAnalysisResults.tsx` (line 412) correctly saves it before submitting. `CaseUpload.tsx` does not.

## Fix

**One change in `src/pages/app/CaseUpload.tsx`** — Before starting the job (around line 495, before STEP C), add:

```typescript
// ── STEP B2: Preserve current result for rollback on failure ──
if (isAddFilesMode && case_.result_zip_url) {
  await supabase
    .from('cases')
    .update({ previous_result_zip_url: case_.result_zip_url })
    .eq('id', case_.id);
}
```

This ensures that if the re-run fails, `previous_result_zip_url` is already set, and the "View Last Results" CTA will appear.

No other files need changes. The webhook's success path already handles moving `result_zip_url` → `previous_result_zip_url` when setting the new result.

## Files

| File | Change |
|------|--------|
| `src/pages/app/CaseUpload.tsx` | Add `previous_result_zip_url` save before job submission in Add Files mode |

