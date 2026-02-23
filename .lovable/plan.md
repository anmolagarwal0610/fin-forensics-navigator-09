

# Plan: Bug Fixes + Edit Grouped Names Feature

## Phase 1: Bug Fixes

### Issue 1: Wrong beneficiary data after search in Top 100 table

**Root Cause:** In `ExcelViewer.tsx`, `handleBeneficiaryClick(rowIndex)` receives the visual row index from `displayData` (which is the filtered list), but internally at line 161 it accesses `processedData[rowIndex]` (the unfiltered list). So clicking row 0 in filtered results fetches data for row 0 in the original order.

**Fix (ExcelViewer.tsx):**
- Change `handleBeneficiaryClick` to accept the actual row data (`CellData[]`) instead of a row index
- Update the click handler in the tbody render to pass `row` directly: `handleBeneficiaryClick(row)` instead of `handleBeneficiaryClick(rowIndex)`
- Inside the function, use the passed row data directly instead of looking it up from `processedData`

### Issue 2: Alias column tooltip not showing on hover for truncated text

**Root Cause:** The `truncateText` function only triggers tooltips when text exceeds 200 characters. But CSS constraints (`max-w-[300px]`) visually truncate text much earlier. The alias/similar names column often has moderate-length text (50-150 chars) that gets CSS-truncated but never gets a tooltip.

**Fix (ExcelViewer.tsx):**
- For the alias/similar names column specifically, always render a tooltip wrapper when the cell has content (regardless of text length)
- This ensures any cell whose text is visually clipped by the CSS `max-w` constraint will show full content on hover
- Apply the same logic to all body cells: detect if the column is the alias column and force tooltip display

---

## Phase 2: Edit Grouped Names UI

### New Component: `EditGroupedNamesDialog.tsx`

A dialog that allows users to manage name groupings (merge/demerge beneficiary names).

**Props:**
```text
- open: boolean
- onClose: () => void
- targetCluster: string (the primary beneficiary name)
- currentMembers: string[] (names currently in the group, from Similar Names / Alias Members column)
- allBeneficiaries: Array<{name: string, aliases: string[]}> (all beneficiary names + their alias lists for search)
- context: 'cross_file' | 'individual'
- fileName?: string (for individual context, the summary file name)
- existingOverrides?: object (pending unsaved overrides for this cluster)
- onSave: (overrides: {demerged: string[], merged: string[]}) => void
```

**UI Layout:**
```text
+-----------------------------------------------+
| Edit Grouped Names - "Amit Agarwal"        [X] |
+-----------------------------------------------+
| [Search bar to add names]                       |
| +-------------------+  +---------------------+ |
| | Grouped Names     |  | Removed Names       | |
| | (green bg)        |  | (red bg)            | |
| |                   |  |                     | |
| | 1. Amit Agarwal   |  | 1. A Gupta     [<-] | |
| | 2. Amit A      [X]|  |                     | |
| | 3. Amit Gupta  [X]|  |                     | |
| | 4. Amit AG     [X]|  |                     | |
| | 5. Amit        [X]|  |                     | |
| | 6. Ramesh    * [X]|  |                     | |
| | 7. Ramesh A  * [X]|  |                     | |
| |   (* = newly added) |                     | |
| +-------------------+  +---------------------+ |
|                                                 |
|                     [Cancel]  [Save]            |
+-------------------------------------------------+
```

**Behavior details:**
- The primary beneficiary name (target_cluster) is always shown first and cannot be removed
- Original members from Similar Names / Alias Members column shown with green background and X icon
- Clicking X on an original member: moves it to "Removed Names" on the right (light-red bg, with left-arrow to restore)
- Clicking X on a newly-added name: simply removes it from the list (does NOT move to Removed Names)
- Clicking left-arrow on a removed name: restores it to its original position in the Grouped Names list
- Search bar: searches all beneficiary names (column "Beneficiary Name" for cross-file, "Alias" for individual) using contains logic, also searches the alias column
- Search results: scrollable dropdown showing matching beneficiary names
- Clicking a search result: adds that name plus all its aliases to the Grouped Names list (highlighted green, with X to remove individually)
- Both columns have independent scroll areas
- Clear indexing (1, 2, 3...) for names in both columns
- X and left-arrow icons right-aligned in their sections
- Save button enabled only when there are changes; Cancel always enabled and discards all changes
- If re-opened before Apply Changes, shows the pending state (newly added highlighted, removed names shown in right column)

### Integration Points

**In ExcelViewer.tsx (Top 100 Beneficiaries):**
- Add "Edit Grouped Names" button in the `BeneficiaryTransactionsDialog` header (for POI dialog) and in `BeneficiaryTransactionsDialog` header (for raw transactions dialog)
- Button placed to the left of the "Type" filter button
- On click, opens `EditGroupedNamesDialog` with:
  - `context = 'cross_file'`
  - `currentMembers` from the "Similar Names" column of the clicked row
  - `allBeneficiaries` from all rows in the beneficiaries_by_file.xlsx (column 1 = name, last column = aliases)

**In SummaryTableViewer.tsx (View Summary dropdown):**
- Add "Edit Grouped Names" button in the `BeneficiaryTransactionsDialog` header
- Button placed to the left of the "Type" filter button
- On click, opens `EditGroupedNamesDialog` with:
  - `context = 'individual'`
  - `fileName` derived from summary file name (remove "summary_" prefix)
  - `currentMembers` from the "Alias Members" column of the clicked row
  - `allBeneficiaries` from all rows in that summary file (Alias column = name, Alias Members column = aliases)

### State Management for Pending Changes

**In CaseAnalysisResults.tsx:**
- Add state: `groupingOverrides` - stores all pending changes as a JSON structure matching the specified format
- Pass this state down to ExcelViewer and SummaryTableViewer/LazySummaryTableViewer
- Each save from `EditGroupedNamesDialog` updates `groupingOverrides` cumulatively
- The JSON structure:

```text
{
  "version": "1.0",
  "created_at": "...",
  "updated_at": "...",
  "overrides": {
    "individual": {
      "<filename>": [
        { "action": "demerge", "target_cluster": "...", "names": [...] },
        { "action": "merge_into", "target_cluster": "...", "names": [...] }
      ]
    },
    "cross_file": [
      { "action": "demerge", "target_cluster": "...", "names": [...] },
      { "action": "merge_into", "target_cluster": "...", "names": [...] }
    ]
  }
}
```

---

## Phase 3: Apply Changes + Re-analysis Flow

### "Apply Changes" CTA on Results Page

**In CaseAnalysisResults.tsx:**
- Add "Apply Changes" button near "Download Report" button in the header
- Button is only visible when `groupingOverrides` has any changes (hidden otherwise)
- On click, opens `ApplyChangesDialog`

### New Component: `ApplyChangesDialog.tsx`

**UI:**
```text
+--------------------------------------------------+
| Review Changes                                [X] |
+--------------------------------------------------+
| The following name grouping changes will be        |
| applied and re-analysis will be triggered:         |
|                                                    |
| Cross-File Changes:                                |
|  1. Merged "R K Gupta", "Rajesh G"         [X]    |
|     into group "Rajesh Kumar Gupta"                |
|  2. Separated "Sanjaykumarpatel", "Sanjaypal" [X]  |
|     from group "Sanjay Kumar"                      |
|                                                    |
| Individual File Changes:                           |
|  statement_axis_2024.xlsx:                         |
|  3. Separated "Amitesh", "Amitava Roy"     [X]    |
|     from group "Amit Kumar"                        |
|  4. Merged "Amit Gupta", "Amit G"          [X]    |
|     into group "Amit Kumar"                        |
|                                                    |
| [         Apply Changes          ]                 |
+--------------------------------------------------+
```

**Behavior:**
- Lists all changes in a readable summary format
- Each change has a red X to discard that specific change from the list
- "Apply Changes" button at the bottom (wide, prominent)
- On click: triggers re-analysis flow

### Re-analysis Flow (on Apply Changes click)

1. Build the `grouping_logic.json` file:
   - Check if the existing result ZIP already contains a `grouping_logic.json` (from previous runs)
   - If yes, load it and append/merge the new overrides cumulatively
   - If no, create a new one from the current `groupingOverrides` state
2. Extract all `raw_transactions_*.xlsx` files from the in-memory ZIP (already loaded on results page)
3. Remove the `raw_transactions_` prefix from each file name
4. Create a new ZIP containing:
   - All the renamed files (same as Add Files flow)
   - The `grouping_logic.json` file
5. Use the same `startJobFlow()` function to submit the ZIP
   - Task: `parse-statements` (same as regular analysis)
   - Session ID: current case ID
   - Skip file insertion: true (like Add Files mode)
6. Store `result_zip_url` in `previous_result_zip_url` before the new analysis
7. Navigate to dashboard
8. Clear `groupingOverrides` state
9. Invalidate query cache for this case

### Post Apply Changes behavior

After re-analysis completes and user returns to results:
- The new result ZIP will contain `grouping_logic.json` with all cumulative changes
- `EditGroupedNamesDialog` opens with default UI (no pending changes highlighted)
- If user makes more edits (v2), they are appended to the existing `grouping_logic.json` from the ZIP

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/app/EditGroupedNamesDialog.tsx` | Dialog for managing name groupings |
| `src/components/app/ApplyChangesDialog.tsx` | Dialog showing change summary before re-analysis |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/app/ExcelViewer.tsx` | Fix Issue 1 (row index bug), Fix Issue 2 (tooltip), pass overrides state, add Edit button trigger |
| `src/components/app/BeneficiaryTransactionsDialog.tsx` | Add "Edit Grouped Names" button in header |
| `src/components/app/POITransactionsDialog.tsx` | Add "Edit Grouped Names" button in header |
| `src/components/app/SummaryTableViewer.tsx` | Pass overrides state, add Edit button trigger |
| `src/components/app/LazySummaryTableViewer.tsx` | Pass through new props |
| `src/pages/app/CaseAnalysisResults.tsx` | Add groupingOverrides state, Apply Changes CTA, re-analysis logic, load existing grouping_logic.json from ZIP |
| `src/i18n/locales/en.json` | Add translation keys for new UI elements |
| `src/i18n/locales/hi.json` | Add Hindi translations |

## Implementation Order

1. Fix Issue 1 (ExcelViewer row index bug) and Issue 2 (tooltip for alias column)
2. Create `EditGroupedNamesDialog.tsx`
3. Add "Edit Grouped Names" button to `BeneficiaryTransactionsDialog` and `POITransactionsDialog`
4. Wire up state management in `CaseAnalysisResults.tsx`
5. Create `ApplyChangesDialog.tsx`
6. Implement re-analysis submission flow
7. Add all i18n translations

