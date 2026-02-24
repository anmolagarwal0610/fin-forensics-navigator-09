

# Plan: Three Bug Fixes for Edit Grouped Names Feature

## Bug 1: Change "Cross-File Changes" heading to "Merged Name Changes"

**File:** `src/components/app/ApplyChangesDialog.tsx`

**Change at line 128:** Replace the text "Cross-File Changes" with "Merged Name Changes".

Additionally, the ScrollArea on line 121 already has `max-h-[55vh]`, but the outer `DialogContent` does not allow proper scrolling when content overflows. The fix is to ensure the content area properly scrolls by keeping the current ScrollArea but making sure the container layout is correct. The current implementation actually already uses ScrollArea -- the issue is likely that the content div inside the ScrollArea needs to not constrain height. Will verify the ScrollArea wraps all change entries (both cross-file and individual) and ensure the max-h allows scrolling.

---

## Bug 2: Search results dropdown not scrollable (only shows ~4 items)

**File:** `src/components/app/EditGroupedNamesDialog.tsx`

**Root Cause:** Line 128 limits results to 20 with `.slice(0, 20)`, but the dropdown container at line 249 has `max-h-48` (192px) which only fits about 4 items. The ScrollArea inside it also has `max-h-48`. The issue is that ScrollArea needs a fixed height to enable scrolling, and the inner content needs to overflow.

**Fix:**
- Remove the `.slice(0, 20)` limit on line 128 (or increase it significantly, e.g., 50)
- Increase `max-h-48` to `max-h-64` (256px, ~6-7 items visible) on both the container div (line 249) and ScrollArea (line 250)
- The ScrollArea will handle scrolling for the full list

---

## Bug 3: Individual file pending overrides not showing when re-opening Edit Grouped Names

**File:** `src/pages/app/CaseAnalysisResults.tsx`

**Root Cause:** Key mismatch between save and lookup:
- **Save path** (in `SummaryTableViewer.tsx` line 593): calls `onSaveGroupingOverride("individual", ..., derivedFileName)` where `derivedFileName` strips both `summary_` prefix AND `.xlsx` extension (e.g., `"SHAUKUSHYA_7467248362-2"`)
- **Lookup path** (in `CaseAnalysisResults.tsx` line 1479): uses `summary.summaryFile.replace('summary_', '')` which only strips the prefix but keeps `.xlsx` (e.g., `"SHAUKUSHYA_7467248362-2.xlsx"`)

So the lookup key never matches the saved key.

**Fix at line 1479:** Change:
```
groupingOverrides.individual[summary.summaryFile.replace('summary_', '')] || {}
```
to:
```
groupingOverrides.individual[summary.summaryFile.replace(/^summary_/i, '').replace(/\.xlsx$/i, '')] || {}
```

This makes the lookup key match `derivedFileName`'s logic exactly.

---

## JSON Rules Verification

Reviewing the current implementation against the 5 rules:

1. **Demerge** -- Correctly implemented. `removedNames` from `EditGroupedNamesDialog` become `demerged` in the override, and are written as `{ action: "demerge", ... }` entries.

2. **Merge into** -- Correctly implemented. Newly added names become `merged` in the override, written as `{ action: "merge_into", ... }` entries.

3. **Merge with exclusion** -- NOT automatically handled. When a user adds "Amit Gupta" (with members Amit Gupta, A Gupta, Amit G) into "Amit Kumar"'s group but removes "A Gupta" via X: the current code correctly adds ["Amit Gupta", "Amit G"] as `merge_into` on "Amit Kumar". However, it does NOT auto-create a `demerge` on "Amit Gupta"'s cluster for ["A Gupta"]. The user would need to separately open "Amit Gupta"'s group and demerge "A Gupta" there. This is a missing feature but is NOT in scope for these 3 bug fixes -- flagging it for awareness.

4. **Cumulative** -- Correctly implemented. The `handleApplyChanges` function loads existing `grouping_logic.json` from the ZIP and appends new overrides.

5. **Exact name matching** -- Correctly implemented. Names are stored exactly as displayed in the UI. The `target_cluster` key uses `.toLowerCase()` for internal state lookup only; actual names in the JSON entries preserve original casing.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/app/ApplyChangesDialog.tsx` | Rename "Cross-File Changes" to "Merged Name Changes" |
| `src/components/app/EditGroupedNamesDialog.tsx` | Increase search dropdown max-height and result limit for scrollability |
| `src/pages/app/CaseAnalysisResults.tsx` | Fix key mismatch: strip `.xlsx` extension in pendingOverrides lookup |

