

# Virtualized Top 1000 Beneficiaries + Full-Data Search + Sorting + KPI Tooltip

## Overview

Transform the ExcelViewer beneficiary table from a DOM-heavy 100-row render to a virtualized 1000-row scrollable table, add full-dataset search using FlexSearch, implement Credit/Debit column sorting, and add a tooltip breakdown on the Total Beneficiaries KPI card.

---

## Technical Approach

### Task 1: Virtualization with @tanstack/react-virtual

**Your proposed stack is the right choice.** `@tanstack/react-virtual` is lightweight (~2KB), framework-agnostic, and integrates cleanly with our existing table markup. No need for an alternative.

**Changes:**
- Install `@tanstack/react-virtual` v3
- In `ExcelViewer.tsx`, replace the current `<tbody>` loop with a virtualized renderer:
  - Wrap table body in a scrollable container with fixed height (reuse existing `h-[400px] sm:h-[600px]`)
  - Use `useVirtualizer` with `count = filteredDataRows.length`, `estimateSize = () => 36` (current row height)
  - Render only `virtualizer.getVirtualItems()` with `position: absolute` + `transform: translateY()`
  - Keep sticky header rows (first 2) outside the virtualizer, rendered normally
- Change `maxRows` from `102` to `1002` in `CaseAnalysisResults.tsx`
- DOM will stay at ~30-40 nodes regardless of scroll position

### Task 2: Full-Dataset Search with FlexSearch

**FlexSearch is a good fit** for this use case — it's fast for prefix/substring matching on 100k+ records. However, since our data is tabular `CellData[][]` (not objects), we'll use `FlexSearch.Index` (simpler) rather than `FlexSearch.Document`.

**Changes:**
- Install `flexsearch` v0.7.x + `@types/flexsearch`
- In `ExcelViewer.tsx`:
  - On `processedData` change, build a FlexSearch index over ALL rows (not just top 1000), indexing column 1 (beneficiary name) and the alias column
  - On search input change (with 200ms debounce via `setTimeout`), query the index for matching row indices
  - The `filteredDisplayData` memo switches between: no query → show first 1000 rows; query present → show matched rows from entire dataset (no row limit)
  - Virtualizer count updates to match filtered results

### Task 3: Credit/Debit Column Sorting

**Replicate the SummaryTableViewer pattern** (3-state cycle: default → desc → asc → default).

**Changes in `ExcelViewer.tsx`:**
- Add `sortConfig` state: `{ column: 'credit' | 'debit' | null, direction: 'desc' | 'asc' | null }`
- Find Total Credit and Total Debit column indices from Row 2 headers (already partially done in `columnIndices`)
- Add clickable sort icons (ChevronUp/ChevronDown) on the Total Credit and Total Debit header cells in Row 2
- Sort logic applied in `filteredDisplayData` memo before slicing, cycling through: default order → descending → ascending → default
- Sorting works on the full dataset (all rows), then virtualizer renders the visible window

### Task 4: Rename "Top 100" → "Top 1000"

**Changes in `CaseAnalysisResults.tsx`:**
- Line 1326: Change `Math.min(100, ...)` to `Math.min(1000, ...)`
- Update i18n key `analysisResults.topBeneficiaries` in `en.json` and `hi.json` to say "Top {{count}} Beneficiaries"

### Task 5: KPI Tooltip on Total Beneficiaries Card

**Data source:** The beneficiaries Excel data (`beneficiariesExcelData`) already has all rows. We can compute Credit Only / Debit Only / Both from the Total Credit and Total Debit columns.

**Changes in `CaseAnalysisResults.tsx`:**
- Add a `useMemo` that iterates all data rows (beyond row 2), checking Total Credit and Total Debit column values:
  - Credit Only: rows where credit > 0 and debit = 0
  - Debit Only: rows where debit > 0 and credit = 0
  - Both: rows where credit > 0 and debit > 0
- Wrap the Total Beneficiaries `<Card>` with a `<Tooltip>` showing the breakdown in a simple 3-line format

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `@tanstack/react-virtual`, `flexsearch`, `@types/flexsearch` |
| `src/components/app/ExcelViewer.tsx` | Virtualization, FlexSearch index, sorting, debounced search |
| `src/pages/app/CaseAnalysisResults.tsx` | maxRows=1002, Math.min(1000,...), KPI tooltip with credit/debit breakdown |
| `src/i18n/locales/en.json` | Update topBeneficiaries label |
| `src/i18n/locales/hi.json` | Update topBeneficiaries label |

---

## Risk Mitigation

- **Sticky columns (col 0, col 1):** Virtualized rows use `position: absolute` — sticky left columns still work because they use `position: sticky` within each row. No conflict.
- **Beneficiary click:** The `handleBeneficiaryClick` receives the full `row` data object, which remains unchanged since we pass the actual data row, not a DOM-derived value.
- **Preview JSON / cell styling:** `getCellStyle` uses row/column indices which we'll map correctly from the virtualizer's `virtualRow.index`.
- **Existing search UX:** The search input UI in the header stays identical; only the backing logic changes from `.filter().includes()` to FlexSearch.

