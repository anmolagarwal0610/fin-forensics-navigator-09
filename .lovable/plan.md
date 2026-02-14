

# Plan: Fix Beneficiary Count Showing 0 on Chrome

## Root Cause

The `beneficiaries_by_file.xlsx` ArrayBuffer is parsed **twice** using two different libraries:

1. **Line 251:** ExcelJS via `parseExcelFile(content)` -- this internally calls `workbook.xlsx.load(arrayBuffer)` which can **detach/transfer** the ArrayBuffer in Chrome's V8 engine
2. **Line 257:** SheetJS via `XLSX.read(content, { type: "array" })` -- receives a detached (empty) ArrayBuffer, producing 0 rows

Safari's JavaScriptCore engine does not detach the buffer, so it works correctly there.

```
content (ArrayBuffer, 25300 rows)
   |
   v
parseExcelFile(content)  <-- ExcelJS consumes/detaches buffer on Chrome
   |
   v
XLSX.read(content, ...)  <-- SheetJS sees empty buffer -> 0 rows -> KPI = 0
```

## Solution

**Copy the ArrayBuffer before the first parse** so each library gets its own independent copy. This is a one-line fix.

## File to Modify

`src/pages/app/CaseAnalysisResults.tsx`

## Change

At line 223 where `content` is obtained, create a copy for the second parser:

```typescript
const content = await beneficiariesFile.async("arraybuffer");

// Create a copy so both parsers get independent buffers
const contentForSheetJS = content.slice(0);
```

Then on line 257, use the copy:

```typescript
const workbook = XLSX.read(contentForSheetJS, { type: "array", cellStyles: true });
```

This ensures ExcelJS gets the original buffer and SheetJS gets an independent copy, preventing detachment issues across all browsers.

## What Stays the Same

- KPI display logic (unchanged)
- Top N Beneficiaries section (unchanged)  
- ExcelViewer rendering (unchanged)
- All other parsing and matching logic (unchanged)

## Why Not Remove Duplicate Parsing?

The SheetJS parse (lines 257-302) extracts per-cell styling (`backgroundColor`, `color`) for the Top 25 beneficiaries table, which ExcelJS already provides via `beneficiariesExcelData`. However, removing the SheetJS path would require refactoring the beneficiary rendering to use ExcelJS data instead -- a larger change. The `content.slice(0)` fix is safe, minimal, and solves the Chrome issue immediately.

