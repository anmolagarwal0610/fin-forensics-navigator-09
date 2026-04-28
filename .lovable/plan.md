## Issues found

### Issue 1 — `grouping_logic.json` is dropped on "Apply Changes" rerun

In `CaseAnalysisResults.handleApplyChanges` (`src/pages/app/CaseAnalysisResults.tsx`, lines ~416–487), the previous `grouping_logic.json` is read from the result ZIP into `existingVersions`, but then it is **only written back to the new ZIP if the user made new grouping changes** (`if (hasGroupingChanges) { newZip.file("grouping_logic.json", ...) }`).

That means a rerun where the user only changes the master timeline silently drops the entire grouping history — exactly the case the user reported.

### Issue 2 — `merge_config.json` is never forwarded on "Apply Changes" rerun

In the same function, the rerun ZIP only contains `raw_transactions_*` + (sometimes) `grouping_logic.json` + (sometimes) `timeline_config.json`. **`merge_config.json` from the previous result ZIP is never copied forward**, so if the backend's re-run regenerates outputs, the merged file relationships for previously merged files can be lost downstream (matches the user's "merged hover info disappears after rerun" observation).

### Issue 3 — Per-file timeline preservation when adding a new file with its own range

In `CaseUpload.handleStartAnalysis` (lines ~576–602), `per_file` is restricted to *currently uploaded files*: `sanitizedNames.has(name)`. That's correct for the case the user described (existing per-file kept, new per-file added). The bug is one level up: `loadPreExistingFiles` correctly seeds `perFileTimeline` from the previous `timeline_config.json` (lines 423–447), and the master-change reconciliation effect (lines 100–121) does not destroy entries that lie inside the master. So this path looks intact — but a partial issue exists when `buildTimelineConfigFile` returns `null` because both master and per_file are empty after filtering, falling back to `existingTimelineConfig`. That fallback already works. **No change needed here other than verifying.**

### Issue 4 — Apply Changes also drops the `previousPerFile`'s extra entries when user changes master

When the user changes only the master, line 497 builds `per_file: analysisData.previousPerFile ?? {}` — that's correct. But when the user does NOT change the master, line 500–501 re-emits the previous JSON verbatim — also correct. So timeline path is OK on Apply Changes.

### Issue 5 — Case Detail / Analysis Results merge tooltips after rerun

`CaseDetail.tsx` and `CaseAnalysisResults.tsx` both read `case_.merge_config` from the DB row. `CaseUpload.handleStartAnalysis` already persists this on every analysis (line 607–614). The reason merges visually disappear after a rerun is that `merge_config` is set to `null` whenever `primaryToSubs.size === 0`. In Apply Changes rerun (Results page), `primaryToSubs` is never rebuilt at all and the DB row is **not updated**, so the existing value is preserved — that side is fine. However, after a backend rerun completes, if the new result ZIP no longer contains `merge_config.json`, subsequent "Add or Remove Files" loads can no longer reconstruct the sub→parent relationships. Forwarding `merge_config.json` on every rerun (Issue 2) fixes this end-to-end.

---

## Required changes

### `src/pages/app/CaseAnalysisResults.tsx` — `handleApplyChanges`

1. **Always forward `grouping_logic.json` if it existed previously.**
   - Remove the `if (hasGroupingChanges)` gate around `newZip.file("grouping_logic.json", ...)`.
   - Logic:
     - If `hasGroupingChanges` → write the merged `overridesPayload` (existing versions + new version), as today.
     - Else if `existingVersions.length > 0` (or the original `grouping_logic.json` file exists in the ZIP) → write `{ versions: existingVersions }` verbatim.
     - Else → skip (nothing to forward).

2. **Always forward `merge_config.json` if it exists in the previous result ZIP.**
   - Read `analysisData.zipData.file("merge_config.json")` near the raw-files copy step.
   - If present, copy its bytes verbatim into the new ZIP under the same name.
   - Skip if absent (backward compat for older cases without merges).

3. (No timeline change required — already correct.)

### `src/pages/app/CaseUpload.tsx` — `handleStartAnalysis`

Already forwards `grouping_logic.json` (line 524–529), `merge_config.json` (line 569–574), and `timeline_config.json` (line 578–602) for the Add Files flow. **No change needed**, except: extend the per-file timeline retention so existing `per_file` ranges for *previously uploaded files* survive even when the user does nothing — they already do, via the seeding in `loadPreExistingFiles` + the per-file filter that allows pre-existing sanitized names. **Verify** this with a regression test in code review.

### `src/pages/app/CaseAnalysisResults.tsx` — analysis-data parsing

No changes; `previousMaster`, `previousPerFile`, and `previousTimelineConfigText` are already extracted (lines 682–706).

### Files to modify

- `src/pages/app/CaseAnalysisResults.tsx` — adjust `handleApplyChanges` to always forward `grouping_logic.json` (when prior exists) and `merge_config.json` (when prior exists).

### Backward compatibility

- Old result ZIPs without `grouping_logic.json` / `merge_config.json` / `timeline_config.json` → each file is conditionally skipped, no behavior change.
- New cases with no merges and no grouping → no spurious empty configs added.
- Re-running a case where only the timeline changed will now correctly forward grouping + merges.

### Summary of behavior after fix

| Trigger | timeline_config.json | grouping_logic.json | merge_config.json |
|---|---|---|---|
| Add/Remove Files rerun (new files, no other changes) | re-emit previous (already works) | re-emit previous (already works) | rebuilt from `mergeParentName` (already works) |
| Apply Changes — only timeline changed | new master + previous per_file (already works) | **re-emit previous (FIX)** | **copy previous bytes (FIX)** |
| Apply Changes — only grouping changed | re-emit previous (already works) | new merged versions (already works) | **copy previous bytes (FIX)** |
| Apply Changes — both changed | new master + previous per_file | new merged versions | **copy previous bytes (FIX)** |

This ensures: any config the user has ever set is preserved across every rerun from every entry point.