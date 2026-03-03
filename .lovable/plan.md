

# Plan: Fix Mobile View Overflow Issues

Four specific mobile overflow problems identified from the screenshots and code.

---

## 1. CaseDetail.tsx — Files Header CTAs Overflowing (lines 382-435)

The `CardTitle` uses `flex items-center justify-between` with all buttons in a single row. On mobile, "Download All Files" + "Add or Remove Files" overflow.

**Fix**: Wrap the buttons container to stack on mobile.
- Change the `div` at line 387 (`flex items-center gap-2`) to `flex flex-wrap items-center gap-2`
- The `CardTitle` at line 382 needs to allow wrapping: change `flex items-center justify-between` to `flex flex-wrap items-center justify-between gap-2`

## 2. CaseAnalysisResults.tsx — Transaction Flow Analysis Tabs + Toolbar Overflow (lines 1178-1198)

The `div` at line 1178 uses `flex items-center justify-between mb-4` putting TabsList and toolbar slot side-by-side. On mobile, this overflows.

**Fix**: Change to `flex flex-wrap items-center justify-between gap-2 mb-4`.

Also, the FundTrailViewer toolbar (line 244-267) renders all buttons in a row. On mobile, "Download" and "Share" text labels cause overflow.

**Fix in FundTrailViewer.tsx**: Hide text labels on mobile for Download/Share buttons — use `<span className="hidden sm:inline">Download</span>` pattern. Also make toolbar flex-wrap.

## 3. CaseAnalysisResults.tsx — File Analysis Summary Filename + View Summary Overflow (lines 1454-1546)

The `h4` at line 1456 puts filename, eye icon, and "View Summary" button all in a single `flex items-center justify-between` row. Long filenames cause overflow.

**Fix**: 
- Change the outer `div` at line 1455 (`flex items-center justify-between mb-3`) to `flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3`
- Make the `h4` at line 1456 allow text wrapping with `min-w-0` and truncation
- The download buttons row at line 1547 (`flex items-center gap-3 flex-wrap`) is already wrapping — no change needed.

## 4. SummaryTableViewer.tsx — Table Not Readable on Mobile (line 390-391)

The table already uses `overflow-auto` and `text-xs sm:text-sm` which should scroll. The issue is `table-fixed` forces equal column widths which may squish content.

**Fix**: Change `table-fixed` to `table-auto` and add `min-w-[600px]` to the table element so it becomes horizontally scrollable with readable column widths on mobile.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/app/CaseDetail.tsx` | Add flex-wrap to Files header buttons |
| `src/pages/app/CaseAnalysisResults.tsx` | Flex-wrap on tabs toolbar row; flex-col on mobile for file summary header |
| `src/components/app/FundTrailViewer.tsx` | Hide button text labels on mobile, flex-wrap toolbar |
| `src/components/app/SummaryTableViewer.tsx` | Change table-fixed to table-auto with min-width for scrollability |

