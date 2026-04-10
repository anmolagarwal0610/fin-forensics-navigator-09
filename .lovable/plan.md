# Fix S.No Column Width, Color Coding, and Rename Section

## Changes

### 1. Dynamic S.No Column Width (ExcelViewer.tsx)

The first column uses hardcoded `w-10 min-w-[40px] max-w-[60px]`, which clips numbers like "1023.0". Fix:

- Compute the max number of digits from `filteredDisplayData.dataRows.length` (e.g., 1000 rows = 4 digits)
- Set `min-w` dynamically: up to 99 rows = 40px, up to 999 = 50px, 1000+ = 64px
- Apply this dynamic width to both `<th>` (line 872) and `<td>` (line 1023) for column 0
- Also update the sticky `left` offset for column 1 to match the new column 0 width
- Also, remove the decimal please - we only want to show the numbers.

### 2. Color Coding for All Rows (ExcelViewer.tsx)

The preview JSON `cell_bg` only covers the first ~100 data rows. Rows beyond that lose their green highlighting on non-zero credit/debit cells.

Fix in `getCellStyle` (around line 698): After checking preview JSON colors, add a fallback for currency columns — if no background color was set and the cell has a numeric value > 0, apply a light green tint (`#d4edda` in light mode, `#1a3a2a` in dark mode). This matches the existing color pattern from the preview JSON.

### 3. Rename Section Title and Description

**ExcelViewer.tsx line 811**: Replace the hardcoded description text with the new copy:

> "This table provides a ranked analysis of all beneficiaries identified in the statement. Total Credit represents the aggregate amount received by the account owner from the beneficiary, while Total Debit represents the aggregate amount paid to the beneficiary."

**CaseAnalysisResults.tsx line 1378**: Change the title from `t("analysisResults.topBeneficiaries", { count: ... })` to a static `"Overall Beneficiaries"` string (or update the i18n key).

**en.json / hi.json**: Update the `topBeneficiaries` key to `"Overall Beneficiaries"` / `"समग्र लाभार्थी"` (remove `{{count}}`).

## Files to Modify


| File                                    | Change                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/app/ExcelViewer.tsx`    | Dynamic col 0 width, fallback color coding for currency cells, update description text |
| `src/pages/app/CaseAnalysisResults.tsx` | Update title prop (remove count interpolation)                                         |
| `src/i18n/locales/en.json`              | `"topBeneficiaries": "Overall Beneficiaries"`                                          |
| `src/i18n/locales/hi.json`              | `"topBeneficiaries": "समग्र लाभार्थी"`                                                 |
