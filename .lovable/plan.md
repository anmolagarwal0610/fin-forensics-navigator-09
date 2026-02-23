

# Plan: Extend Search to Multiple Columns in Summary and Beneficiaries Tables

## Task 1: SummaryTableViewer -- Search Alias + Alias Members

**File:** `src/components/app/SummaryTableViewer.tsx`

**Current behavior (lines 129-134):** Search only checks the `beneficiaryColumnIndex` (Alias column).

**Change:** Also check `aliasColumnIndex` (Alias Members column) in the same filter. If the search query matches either column, the row is shown.

```typescript
// Before (line 131-133):
dataRows = dataRows.filter((row) => {
  const cellValue = String(row[beneficiaryColumnIndex]?.value || "").toLowerCase();
  return cellValue.includes(query);
});

// After:
dataRows = dataRows.filter((row) => {
  const aliasValue = String(row[beneficiaryColumnIndex]?.value || "").toLowerCase();
  const aliasMemberValue = aliasColumnIndex !== -1
    ? String(row[aliasColumnIndex]?.value || "").toLowerCase()
    : "";
  return aliasValue.includes(query) || aliasMemberValue.includes(query);
});
```

No UI changes needed -- same search icon, same input, just broader matching.

---

## Task 2: ExcelViewer -- Add Search for Beneficiary Name + Alias

**File:** `src/components/app/ExcelViewer.tsx`

This table currently has NO search. We add search identical in UI/UX to SummaryTableViewer's pattern: a Search icon in the Beneficiary Name header (column index 1, row 2) that expands into an inline input.

### 2a. Add state and imports

Add `Search`, `X` imports from lucide-react and new state variables:
- `searchQuery` (string)
- `isSearchOpen` (boolean)
- `searchInputRef` (ref for auto-focus)

### 2b. Identify the "Alias" / "Similar Names" column index

Add a `useMemo` that scans Row 2 headers to find the last column whose header contains "alias" or "similar names". This will be the secondary search column.

### 2c. Filter displayData

Add a `useMemo` that filters `processedData` rows (index 2+) based on the search query matching either:
- Column 1 (Beneficiary Name), OR
- The identified Alias/Similar Names column

Header rows (0-1) are always kept. The filtered data replaces `displayData` in the render.

### 2d. Render search UI in the header

In the sticky header rendering (row index 1, column index 1), replace the plain header text with the same toggle pattern used in SummaryTableViewer:
- When closed: header text + Search icon button
- When open: Search icon + Input + X close button

### 2e. Auto-focus behavior

Same `useEffect` pattern as SummaryTableViewer to focus input when search opens.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/app/SummaryTableViewer.tsx` | Extend filter to check Alias Members column |
| `src/components/app/ExcelViewer.tsx` | Add search state, filter logic, and search UI in header |

## No Other Changes

- No i18n changes needed (reuse existing `analysis.searchBeneficiary` key or use a similar placeholder)
- No changes to `CaseAnalysisResults.tsx`

