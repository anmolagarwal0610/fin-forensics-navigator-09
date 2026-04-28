# Plan

## 1. Master timeline constrains per-file timelines (Upload page)

Make the per-file `DateRangePicker` real-time bounded by `masterTimeline` so a user can never pick a per-file range that lies outside the master.

### `src/components/app/DateRangePicker.tsx`

- Add two new optional props: `minDate?: string` and `maxDate?: string` (ISO `YYYY-MM-DD`).
- Apply them to the `<Input type="date">` fields:
  - Start input: `min={minDate}`, `max={endStr || maxDate}` (intersect with chosen end).
  - End input: `min={startStr || minDate}`, `max={maxDate}`.
- Extend `canSave` validation: both dates must additionally satisfy `start >= minDate` and `end <= maxDate` when those bounds are set.
- If invalid against bounds, show a small inline message (same style as existing range-invalid warning) like `Must be within {minDate} → {maxDate}`.
- On open, if the previously stored per-file value falls outside the new master bounds, do NOT auto-clear — just disable Save until the user fixes it (so we don't silently destroy state). The display button (in caller) will visually mark it as out-of-range; see callers below.

### `src/pages/app/CaseUpload.tsx`

- Pass `minDate={masterTimeline?.start_date}` and `maxDate={masterTimeline?.end_date}` to the per-file `DateRangePicker` in `renderFileActions`.
- After `setMasterTimeline`, run a one-shot reconciliation effect:
  - For each entry in `perFileTimeline`, if it falls outside the new master, remove it from state and toast `Per-file timeline for {file} cleared — outside the new master range.`
  - Backward compatibility: if `masterTimeline` is null, no constraint is applied (existing behaviour, no change).
- The trigger button styling stays the same; no new "out of range" state needed because reconciliation removes invalid entries.

## 2. Hide Timeline CTA on merged sub-files (Upload + Add Files flows)

Per-file Timeline only makes sense for primaries. In `CaseUpload.tsx` `renderFileActions`:

- Return `null` when `file.mergeParentName` is set (sub-file), so only `Unmerge` and `X` show on sub-files.
- Pre-existing files already return `null` (unchanged).
- Also strip any per-file timeline entries for files that become sub-files (in the same merge-reconciliation pass), since merges promote sub-files into their parent's processing.

This automatically applies to both "new case" and "Add Files" flows (same page).

## 3. Add Files flow — display merged files but disable unmerge / X on sub-files

In `src/components/app/FileUploader.tsx`:

- Add a new optional prop `lockedFileNames?: Set<string>` (or a `isFileLocked?: (f) => boolean` predicate).
- When a file is locked:
  - Hide the `Unmerge` button on sub-files.
  - Hide the `X` (remove) button on locked files.
  - Disable drag start (`draggable={false}`) and drag-over visual cue for locked rows so users can't change merge relationships.
- Also disable inbound drops onto locked rows (skip in `handleDrop`).

In `CaseUpload.tsx`:

- When `isAddFilesMode`, pass the set of pre-existing file display names as `lockedFileNames`. Newly added files remain fully interactive (can be dragged onto a pre-existing primary, can be removed, etc.).
- Result: pre-existing merged hierarchy from the original case is rendered exactly as in the upload page but read-only.

The merged hierarchy for pre-existing files is reconstructed from the `merge_config.json` already stored in the result ZIP. Add to `loadPreExistingFiles` in `CaseUpload.tsx`:

- After extracting `raw_transactions_*.xlsx`, also read `merge_config.json` from the ZIP if present.
- Apply `mergeParentName` on the loaded `FileItem`s where applicable (matching by sanitized base name).
- Backward compat: missing `merge_config.json` ⇒ no merges applied (current behaviour).

## 4. Read previous master timeline from result ZIP (no DB column needed)

The backend writes `timeline_config.json` into the result ZIP. Use it as the source of truth for the "previous master" baseline.

### `CaseUpload.tsx` (Add Files flow)

- In `loadPreExistingFiles`, after opening the ZIP, attempt to read `timeline_config.json`. If present and valid, `setMasterTimeline(prevMaster)` and `setPerFileTimeline(prevPerFile || {})`.
- This becomes the baseline; the user can then change it.

### `CaseAnalysisResults.tsx`

- Already loads the result ZIP into `analysisData.zipData`. After parsing, also extract `timeline_config.json` and stash `previousMaster: TimelineRange | null` and `previousPerFile: Record<string, TimelineRange>` on the parsed analysis data (extend `ParsedAnalysisData`).
- Initialize `resultsMasterTimeline` from `previousMaster` once `analysisData` arrives (use a `useEffect` with a guard to only set on first load per case version).
- Backward compat: missing or unparseable `timeline_config.json` ⇒ `null` (no baseline); behaves as today.

## 5. Per-flow rules for which raw file to send + always include `timeline_config.json`

Today both flows pull `raw_transactions_*.xlsx` from the previous result ZIP. New rule:

> **For previous files**, prefer `raw_transactions_overall_*.xlsx`; fall back to `raw_transactions_*.xlsx` if the overall variant is missing. **For new files**, behaviour unchanged.
> Always include the latest `timeline_config.json` in the outgoing ZIP.

### Helper

Add a small helper (e.g. in `src/utils/timelineConfig.ts` or a new `src/utils/rawFiles.ts`):

```ts
// Given a JSZip and a sanitized base name (without prefix/.xlsx),
// return the preferred raw file entry: overall first, then plain.
function pickRawEntry(zip, baseName): { name: string; entry: JSZip.JSZipObject } | null
```

And `listPreviousRawEntries(zip)` that walks the ZIP once and returns one entry per base name, preferring `raw_transactions_overall_*.xlsx`, falling back to `raw_transactions_*.xlsx`.

### `CaseUpload.tsx` — `loadPreExistingFiles`

- Replace the current filter (`startsWith("raw_transactions_")`) with `listPreviousRawEntries(zipData)`.
- Display name strips both prefixes correctly:
  - `raw_transactions_overall_<base>.xlsx` → `<base>.xlsx`
  - `raw_transactions_<base>.xlsx` → `<base>.xlsx`
- The `FileItem.name` continues to be the user-facing base filename, matching how merges/timeline keys are sanitized.

### `CaseUpload.tsx` — `handleStartAnalysis` (Add Files mode)

- Today, pre-existing files are forwarded as-is (the loaded `File` objects, which we just sourced from `raw_transactions_*` or now `raw_transactions_overall_*`). With the new helper, each pre-existing `FileItem.file` is the overall variant when available — no further branching needed.
- Always build `timeline_config.json` (using current `masterTimeline` + `perFileTimeline`) and add it to `configFiles`. Today this is conditional on having any range; change it so:
  - If `masterTimeline` or any per-file is set → include populated config.
  - If none set AND `isAddFilesMode` AND a previous `timeline_config.json` existed → re-emit the previous one verbatim.
  - If none set and no previous → omit (backward compat).

### `CaseAnalysisResults.tsx` — `handleApplyChanges`

- Replace the current raw extraction loop:
  ```ts
  const rawFiles = Object.keys(...).filter(n => n.startsWith("raw_transactions_") && n.endsWith(".xlsx"));
  for (const rawFile of rawFiles) { newZip.file(rawFile.replace("raw_transactions_", ""), content); }
  ```
  with the helper that prefers `raw_transactions_overall_*.xlsx`. Filename written into the new ZIP is `<base>.xlsx` (strip the chosen prefix).
- `timeline_config.json`: always write it.
  - If `hasTimelineChanges` (master changed) → use the new `resultsMasterTimeline`.
  - Else → re-emit the previous `timeline_config.json` extracted from `analysisData` (so backend always receives the latest known config).
  - If neither current nor previous exists, skip (backward compat — no change for old cases that never had a timeline).
- `hasTimelineChanges` should compare `resultsMasterTimeline` against `previousMaster`, not just "any value set", so the Apply Changes button surfaces only on real diffs.

The FE used to  send the raw_transactions_ cut from the file name to BE whenever the case was re-run, make sure it does the same for raw_transactions_overall, and it should cut raw_transactions_ if raw_transactions_overall is not present.

## 6. i18n additions

Add Hindi + English strings used by reconciliation toasts and any new tooltip text:

- `timeline.outsideMasterCleared` — `"Per-file timeline for {{file}} cleared because it's outside the new master range."` / Hindi equivalent.
- `timeline.boundsHint` — `"Must be within {{start}} → {{end}}"` / Hindi equivalent (used inside `DateRangePicker` when bounds violated).

Existing `timeline.selectTimeline`, `timeline.short`, `timeline.tooltip`, `timeline.applyChanges` are reused as-is.

## 7. Backward compatibility checklist

- No `timeline_config.json` in old result ZIP → no baseline, picker starts empty (today's behaviour).
- No `merge_config.json` in old result ZIP → no merges shown for pre-existing files.
- No `raw_transactions_overall_*.xlsx` → fall back to `raw_transactions_*.xlsx`.
- `masterTimeline` not set → per-file pickers have no min/max bounds (no constraint).
- No conflicts (per-file already inside master) → reconciliation is a no-op, no toasts.

## Files to be modified

- `src/components/app/DateRangePicker.tsx` — add `minDate` / `maxDate` constraints.
- `src/components/app/FileUploader.tsx` — add `lockedFileNames` to disable unmerge / X / drag for locked rows.
- `src/pages/app/CaseUpload.tsx` — bound per-file picker by master, hide picker on sub-files, reconcile on master change, reconstruct merges from `merge_config.json`, prefer `raw_transactions_overall_*.xlsx`, always include `timeline_config.json`, lock pre-existing files in Add Files mode.
- `src/pages/app/CaseAnalysisResults.tsx` — extract previous `timeline_config.json` from result ZIP and use as baseline, prefer `raw_transactions_overall_*.xlsx` in Apply Changes ZIP, always include latest `timeline_config.json`.
- `src/utils/timelineConfig.ts` (or new `src/utils/rawFiles.ts`) — `listPreviousRawEntries(zip)` helper.
- `src/i18n/locales/en.json`, `src/i18n/locales/hi.json` — two new keys (`outsideMasterCleared`, `boundsHint`).