# Plan: Five Bug Fixes for Name Grouping & Analysis Flow

## Issue 1: CaseDetail shows "results not ready" after Apply Changes re-run (needs hard refresh)

**Root Cause:** `CaseDetail.tsx` fetches case data with a one-time `useEffect` on `[id, navigate]`. After the re-analysis job completes and updates the case status to `Ready`, the CaseDetail page still holds stale data from the initial load. The `hasResults` check uses old `case_` state where `result_zip_url` may be outdated or `hasSecureResultFile` hasn't refreshed.

**Fix:** Convert CaseDetail to use Supabase Realtime subscription on the `cases` table for the current case ID. When the case row changes (status, result_zip_url), automatically update local state. This ensures the "View Results" button becomes enabled without a hard refresh.

**File:** `src/pages/app/CaseDetail.tsx`

- Add a Realtime subscription in a new `useEffect` that listens for `UPDATE` events on the `cases` table filtered by `id=eq.{caseId}`.
- When a change is detected, update the `case_` state with the new row data.
- Clean up the subscription on unmount.

```typescript
// Add after existing useEffect (line ~70)
useEffect(() => {
  if (!id) return;
  const channel = supabase
    .channel(`case-detail-${id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'cases',
      filter: `id=eq.${id}`
    }, (payload) => {
      setCase(payload.new as CaseRecord);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [id]);
```

Also invalidate the `useResultFileStatus` query by making it reactive — or simply re-check `hasSecureResultFile` when case status changes. The simplest approach: since `case_` is now kept in sync via Realtime, the existing `hasResults` computation (`case_?.result_zip_url || hasSecureResultFile`) will work once the case row updates.

Additionally, invalidate the analysis cache in `CaseAnalysisResults.tsx` by also removing stale analysis-data queries when handleApplyChanges runs (already partially done on line 338, but also need to remove `analysis-data` queries):

**File:** `src/pages/app/CaseAnalysisResults.tsx` (line ~338)

- Add: `queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'analysis-data' && q.queryKey[1] === id });`

---

## Issue 2: Timeline doesn't register "Analysis Start" event when Apply Changes is clicked

**Root Cause:** In `handleApplyChanges` (CaseAnalysisResults.tsx line 263-347), no event is inserted into the `events` table. Compare with `CaseUpload.tsx` line 425 which calls `addEvent(case_.id, "analysis_submitted", {...})`.

**Fix:** Add an `addEvent` call in `handleApplyChanges` after the job is submitted.

**File:** `src/pages/app/CaseAnalysisResults.tsx`

After line 333 (after `startJobFlow`), add:

```typescript
await addEvent(id, "analysis_submitted", {
  mode: "parse-statements",
  task: "parse-statements",
  stage: "grouping_reanalysis",
  file_count: rawFiles.length,
});
```

Also need to import `addEvent` from `@/api/cases` (check if already imported).

---

## Issue 3: Case-sensitive names treated as duplicates in Edit Grouped Names

**Root Cause:** In `EditGroupedNamesDialog.tsx`, all comparisons use `.toLowerCase()`. When `groupedNames` contains both "aditya r" and "ADITYA R", and one is removed via `handleRemove`, line 138 filters by `n.toLowerCase() !== name.toLowerCase()`, which removes BOTH because they share the same lowercase key. Similarly, `groupedLowerSet` (line 102-105) is a Set of lowercase values, so "aditya r" and "ADITYA R" map to the same key, causing the search filter on line 119 (`groupedLowerSet.has(b.name.toLowerCase())`) to hide both when only one is in the group.

Additionally, in `handleAddBeneficiary` (line 162-163), the filter uses `groupedLowerSet` which collapses case variants.

**Fix:** Track names by their exact casing. Use a Map or track by exact string instead of lowercase-only Sets:

1. Change `groupedLowerSet` to track exact names, and use a separate check for case-insensitive membership only where truly needed (e.g., preventing the primary name from being removed).
2. In `handleRemove` (line 138): filter by exact string match `n !== name` instead of lowercase comparison.
3. In `handleRestore` (line 156): filter by exact string match.
4. In `handleAddBeneficiary` (line 162-163): check exact membership, not lowercase.
5. In search filter (line 119): check exact name membership against the grouped list.

The key principle: each name variant ("aditya r", "ADITYA R") is a distinct entry. Only the primary name check (line 133) should use case-insensitive comparison.

**File:** `src/components/app/EditGroupedNamesDialog.tsx`

Specific changes:

- Line 102-105: Change `groupedLowerSet` to use exact names: `new Set(groupedNames)`
- Line 107-110: Change `removedLowerSet` to use exact names: `new Set(removedNames)`
- Line 119: `if (groupedSet.has(b.name)) return false;` (exact match)
- Line 121: `if (b.name === targetCluster) return false;` — no, keep case-insensitive here since targetCluster matching should be loose. Actually, the target cluster check can stay case-insensitive.
- Line 138: `prev.filter(n => n !== name)` (exact match removal)
- Line 156: `prev.filter(n => n !== name)` (exact match)
- Line 163: Check against exact `groupedSet` and `removedSet`
- Line 175: Exact match for removedNames cleanup

For the `newlyAdded` set and `originalMembersSet`, keep case-insensitive since those track logical identity (was this name originally in the group? was it newly added?). But for display/membership in lists, use exact matching.

Wait — let me reconsider. The `allBeneficiaries` list in ExcelViewer (line 142-154) already filters aliases where `a.toLowerCase() !== name.toLowerCase()`. So if primary is "Aditya R", aliases won't include "aditya r" if it exactly matches lowercased. But the data from the backend may have "aditya r" and "ADITYA R" as separate aliases. They appear as separate entries in the `allBeneficiaries` list.

The simplest correct approach:

- `groupedNames` and `removedNames` store exact-cased names (already do)
- Filtering/removing from these arrays must use exact string match, not lowercase
- The search exclusion (`groupedLowerSet`) should check exact membership
- `newlyAdded` tracking can remain case-insensitive for visual badge purposes
- `originalMembersSet` can remain case-insensitive for demerge logic

---

## Issue 4: Search dropdown scroll doesn't reach the end

**Root Cause:** The search dropdown uses `position: absolute` with `max-h-64 overflow-y-auto`. When there are many results, the dropdown extends beyond the dialog's visible area. Because the dialog content has `overflow-hidden` (line 224: `flex-1 overflow-hidden`), the dropdown gets clipped.

**Fix:** Change the content area from `overflow-hidden` to `overflow-visible` so the absolutely-positioned dropdown can extend. Alternatively, make the search dropdown use a fixed-position portal or change the layout so the dropdown is part of the scrollable content.

The cleanest fix: Remove `overflow-hidden` from the content div (line 224) and instead put `overflow-y-auto` on the two-columns area only. The search dropdown (absolutely positioned) will then not be clipped. Also ensure the dialog's `max-h-[90vh]` contains everything properly.

**File:** `src/components/app/EditGroupedNamesDialog.tsx`

- Line 224: Change `overflow-hidden` to `overflow-visible` on the content div
- The search dropdown's `z-50` will ensure it renders above other content
- The dialog's `max-h-[90vh]` on DialogContent (line 202) already constrains overall height

---

## Issue 5: Send grouping_logic.json in Add/Remove Files re-run flow

**Root Cause:** In `CaseUpload.tsx` `handleStartAnalysis`, when the user is in `isAddFilesMode`, the ZIP is built from raw transaction files but does NOT include the existing `grouping_logic.json` from the current result ZIP.

**Fix:** When in add-files mode, extract `grouping_logic.json` from the result ZIP (if it exists) and include it in the new ZIP sent to the backend. This is invisible to the user.

**File:** `src/pages/app/CaseUpload.tsx`

In `loadPreExistingFiles` (line 200-268), after extracting raw files, also check for and store `grouping_logic.json`:

- Add state: `const [existingGroupingLogic, setExistingGroupingLogic] = useState<string | null>(null);`
- In `loadPreExistingFiles`, check `zipData.file("grouping_logic.json")`, if exists, read as text and store in state.

In `handleStartAnalysis` (around lines 295-301 where uploadFiles are built), we can't easily inject into the ZIP at this level because `uploadInput` handles ZIP creation. Instead, we need to:

Actually, looking at the flow more carefully: `startJobFlow` calls `uploadInput` which creates a new ZIP from the `File[]` array. So we need to add the `grouping_logic.json` as a File in the `uploadFiles` array.

- In `loadPreExistingFiles`: Store the grouping logic JSON content in state
- In `handleStartAnalysis`: If `existingGroupingLogic` is not null, create a File from it and add to `uploadFiles`:
  ```typescript
  if (existingGroupingLogic) {
    const logicBlob = new Blob([existingGroupingLogic], { type: 'application/json' });
    const logicFile = new File([logicBlob], 'grouping_logic.json', { type: 'application/json' });
    uploadFiles.push(logicFile);
  }
  ```

---

## Merge-with-exclusion JSON rule

**Include this in the current scope now and execute it as well** — the auto-demerge on the source cluster when partially merging is a separate feature. Flagging again for awareness.

---

## Summary of Changes - (add Merge-with-exclusion JSON rule as well to this list)


| File                                            | Change                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/pages/app/CaseDetail.tsx`                  | Add Realtime subscription for case updates                                                                |
| `src/pages/app/CaseAnalysisResults.tsx`         | Add `addEvent` call + remove stale analysis cache                                                         |
| `src/components/app/EditGroupedNamesDialog.tsx` | Use exact string matching instead of lowercase for list operations; fix overflow-hidden clipping dropdown |
| `src/pages/app/CaseUpload.tsx`                  | Extract and forward `grouping_logic.json` in add-files mode                                               |
