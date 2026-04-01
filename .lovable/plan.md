

# RCA: `header_mapping.json` appearing in Analysis Results

## Root Cause

In `CaseUpload.tsx` (line 433), `header_mapping.json` is pushed into the `uploadFiles` array alongside the actual user files. This array is then passed to `uploadInput()`, which:

1. **Uploads every file individually to Supabase Storage** (line 51-66) — so `header_mapping.json` gets its own storage object
2. **Inserts a record into `case_files` table for every file** (line 72-81) — so `header_mapping.json` appears as a case file
3. **Adds every file to the ZIP** (line 113-116) — this is the only place where the JSON *should* be

The same issue applies to `grouping_logic.json` (line 411-415).

These JSON config files are meant only for the backend (inside the ZIP). They should NOT be uploaded individually to storage or inserted into `case_files`.

## Fix

**`src/pages/app/CaseUpload.tsx`**: Separate the config files from user files. Keep two arrays:
- `uploadFiles` — only actual user data files (go through full upload + DB insertion + ZIP)
- `configFiles` — JSON config files (`header_mapping.json`, `grouping_logic.json`) that only go into the ZIP

**`src/lib/uploadInput.ts`**: Accept an optional `configFiles` parameter. These files get added to the ZIP but are excluded from individual storage uploads and `case_files` insertion.

### Changes in `uploadInput.ts`
- Add `configFiles?: File[]` parameter
- In Step 2 (individual uploads): only upload `files`, not `configFiles`
- In Step 3 (DB insertion): only insert records for `files`, not `configFiles`
- In Step 5 (ZIP creation): add both `files` and `configFiles` buffers to the ZIP

### Changes in `CaseUpload.tsx`
- Remove `header_mapping.json` and `grouping_logic.json` from `uploadFiles`
- Create a separate `configFiles: File[]` array for these
- Pass `configFiles` to `uploadInput()` / `startJobFlow()`

### Changes in `useStartJob.ts`
- Pass through `configFiles` parameter to `uploadInput()`

## Files to modify

| File | Change |
|------|--------|
| `src/lib/uploadInput.ts` | Add `configFiles` param; include in ZIP only, exclude from storage upload and DB insertion |
| `src/pages/app/CaseUpload.tsx` | Separate config files into their own array, pass as `configFiles` |
| `src/hooks/useStartJob.ts` | Pass through `configFiles` to `uploadInput()` |

