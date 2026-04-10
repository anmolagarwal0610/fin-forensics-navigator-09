# Remove Fallback Color Logic for Rows Beyond Preview

## Problem

1. The fallback color logic added for rows > 100 is unnecessary — the backend JSON already provides `cell_bg` for all rows.
2. The "Total Credit" and "Total Debit" columns are incorrectly getting green/red colors from the currency column fallback, even though these summary columns should not be colored.

## Changes

### File: `src/components/app/ExcelViewer.tsx`

**Remove the entire fallback block (lines 699-721)**

Delete the "Fallback for rows beyond preview coverage" section entirely — both the alternating row bands (3a) and the currency column color overrides (3b). The backend preview JSON handles all cell coloring.

**Keep the sticky column fix (lines 1045-1053)** — the `hasBgFromStyle` / `stickyBg` logic is still correct and useful for when preview JSON does set backgrounds.

## Files to Modify


| File                                 | Change                                      |
| ------------------------------------ | ------------------------------------------- |
| `src/components/app/ExcelViewer.tsx` | Remove lines 699-721 (fallback color block) |
