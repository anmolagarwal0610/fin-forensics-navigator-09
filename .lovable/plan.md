# Persist Merge Info Across Re-runs (FE-only)

## Problem

Merge relationships disappear after a case is re-run via "Add or Remove Files" because:

1. The backend does not echo `merge_config.json` back into the result ZIP, so subsequent reads from the ZIP find nothing.
2. `CaseUpload.tsx` rebuilds `cases.merge_config` from whatever `mergeParentName` it managed to reconstruct from the (now-empty) ZIP. With nothing to reconstruct, it overwrites the DB row with `null`, wiping prior merges.
3. The Add Files page (`FileUploader`) never shows a "Merged" pill — it only nests sub-files visually. Users want the same `Merged` tag + tooltip they see on Case Preview / Analysis Results.

`cases.merge_config` already exists in the DB and is the right source of truth. We just need FE to read/write it consistently and never let it get wiped silently.

## Changes

### 1. `src/pages/app/CaseUpload.tsx` — Add Files mode

- In `loadPreExistingFiles`, after attempting to read `merge_config.json` from the result ZIP, **fall back to `cases.merge_config**` (already on the loaded `case_` row) when the ZIP entry is missing or empty. Use the same sub-to-primary reconstruction logic to set `mergeParentName` on the loaded `FileItem`s.
- In `handleStartAnalysis` (the persist-to-DB block around line 605), **never overwrite `cases.merge_config` with `null` when in Add Files mode and the user did not explicitly unmerge everything**. Specifically:
  - If `primaryToSubs.size > 0`, write the new computed `mergeConfigJson` (current behavior).
  - If `primaryToSubs.size === 0` AND `isAddFilesMode` AND we previously had a non-null `case_.merge_config` AND no pre-existing sub-files were unmerged by the user, skip the update entirely (preserve DB value).
  - We detect "user explicitly unmerged" by tracking whether any file that originally had a `mergeParentName` (after `loadPreExistingFiles`) lost it before submit. If yes, allow the overwrite.

### 2. `src/components/app/FileUploader.tsx` — Show "Merged" pill on Add Files page

- For each top-level row that has at least one child (`files.some(f => f.mergeParentName === file.name)`), render the same "Merged" pill we use on Case Preview / Analysis Results, next to the filename:
  - Pill text: `Merged`
  - Hover tooltip lists the numbered sub-file names (matching the existing format on `CaseDetail.tsx` lines 506–510 and `CaseAnalysisResults.tsx` lines 1974–1978).
- Reuse the existing `Tooltip` primitives already imported in `FileUploader.tsx`.

### 3. `src/pages/app/CaseAnalysisResults.tsx` — Apply Changes flow

- In `handleApplyChanges` (around line 497), when forwarding `merge_config.json`:
  - If the previous result ZIP contains it, forward verbatim (current behavior).
  - **Else, fall back to `case_.merge_config**` from the DB and serialize it into the new ZIP as `merge_config.json`.
- This guarantees the backend receives the merge hierarchy on every rerun, regardless of whether previous backend runs echoed the file.

### 4. No backend, schema, or RLS changes

`cases.merge_config jsonb` already exists. All work is FE-only.

even if it does not exists, make a way for the FE to capture it when it does and use that as a fallback.

## Files to edit

- `src/pages/app/CaseUpload.tsx` — fallback read from `cases.merge_config`; guard against null overwrite.
- `src/components/app/FileUploader.tsx` — add "Merged" pill + numbered tooltip on parent rows.
- `src/pages/app/CaseAnalysisResults.tsx` — fallback to `cases.merge_config` when forwarding into the rerun ZIP.

## Out of scope

- Backend changes (backend is not expected to persist or echo merge config).
- Changing how `CaseDetail` / `CaseAnalysisResults` *display* the Merged pill (already correct; they read from `cases.merge_config`, which this plan keeps populated).