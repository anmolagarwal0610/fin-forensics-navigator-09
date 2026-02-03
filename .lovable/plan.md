
# Plan: Fix Slow Results Page Loading + POI Count Issue

## Root Cause Analysis

### Issue 1: Page Takes Forever to Load (47MB ZIP)

**Three major bottlenecks identified:**

| Bottleneck | Location | Impact |
|------------|----------|--------|
| **Excessive console.log** | `excelParser.ts` lines 141-184 | Every cell with fill/font data triggers 2-5 console.log calls. For a file with ~98,000 rows, this means **hundreds of thousands of console.log statements** |
| **Upfront summary parsing** | `CaseAnalysisResults.tsx` lines 520-532 | ALL summary files are parsed during initial load, even if user never expands them |
| **No row limit on SummaryTableViewer** | `SummaryTableViewer.tsx` | Renders ALL rows in the DOM - no pagination for large datasets |

### Issue 2: POI Count Shows 150 Instead of 5381

The logic is correct, but there are two possible causes:

1. **Cache Issue**: The page was visited before the code change was deployed, and React Query is serving the cached result (showing 150 from old file-counting logic)
2. **File Path Issue**: The `poi_summary.json` might be in a subfolder within the ZIP rather than at the root

---

## Implementation Plan

### Fix 1: Remove Excessive Console Logging (Critical - Performance)

**File:** `src/utils/excelParser.ts`

Remove all debug console.log statements inside the parsing loop (lines 141-184, 192-194). These are meant for debugging but cause massive performance degradation with large files.

```typescript
// REMOVE these console.log statements:
console.log(`🔍 Cell ${rowNum},${colNum} fill analysis:`, { ... });
console.log(`✅ Solid fill color for ${rowNum},${colNum}: ${backgroundColor}`);
console.log(`✅ Pattern fill color for ${rowNum},${colNum}: ...`);
console.log(`✅ Gradient fill color for ${rowNum},${colNum}: ...`);
console.log(`✅ Fallback fill color for ${rowNum},${colNum}: ...`);
console.log(`⚠️ No background color extracted for ${rowNum},${colNum} ...`);
console.log(`✅ Font color for ${rowNum},${colNum}: ...`);
console.log(`⚠️ Could not parse font color for ${rowNum},${colNum}:`, ...);
```

### Fix 2: Add Pagination to SummaryTableViewer (Performance)

**File:** `src/components/app/SummaryTableViewer.tsx`

Add pagination with 500 rows per page to prevent DOM overload:

```typescript
// Add state for pagination
const [currentPage, setCurrentPage] = useState(1);
const ROWS_PER_PAGE = 500;

// Slice data for current page
const paginatedRows = useMemo(() => {
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  return dataRows.slice(startIdx, startIdx + ROWS_PER_PAGE);
}, [dataRows, currentPage]);

const totalPages = Math.ceil(dataRows.length / ROWS_PER_PAGE);
```

Add pagination controls when rows > 500.

### Fix 3: Lazy-Load Summary Data (Performance)

**File:** `src/pages/app/CaseAnalysisResults.tsx`

Change summary parsing from upfront to on-demand (only when user expands the collapsible):

```typescript
// BEFORE (lines 520-532): Parse all summaries upfront
if (summaryFile) {
  const summaryFileObj = zipData.file(summaryFile);
  if (summaryFileObj) {
    const summaryContent = await summaryFileObj.async("arraybuffer");
    const summaryParsedData = await parseExcelFile(summaryContent);
    parsedData.summaryDataMap.set(summaryFile, summaryParsedData);
  }
}

// AFTER: Don't parse upfront, parse when user clicks expand
// Just store the file reference, not the parsed data
```

### Fix 4: Improve POI Summary JSON Detection

**File:** `src/pages/app/CaseAnalysisResults.tsx`

Enhance the `poi_summary.json` detection to also check for nested paths:

```typescript
// Check for poi_summary.json at root or in any folder
let poiSummaryFile = zipData.file("poi_summary.json");

// If not found at root, search all files for it
if (!poiSummaryFile) {
  const allFiles = Object.keys(zipData.files);
  const poiSummaryPath = allFiles.find(name => 
    name.endsWith('poi_summary.json') && !name.includes('__MACOSX')
  );
  if (poiSummaryPath) {
    poiSummaryFile = zipData.file(poiSummaryPath);
    console.log('[Analysis] Found poi_summary.json at nested path:', poiSummaryPath);
  }
}
```

Also add logging to confirm which path was used:

```typescript
console.log('[Analysis] Looking for poi_summary.json, all files:', Object.keys(zipData.files).slice(0, 20));
```

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `excelParser.ts` | Remove ~8 console.log statements from parsing loop | **Major perf improvement** - eliminates 100k+ log calls |
| `SummaryTableViewer.tsx` | Add pagination (500 rows/page) | **Major perf improvement** - reduces DOM size |
| `CaseAnalysisResults.tsx` | Lazy-load summary data on expand | **Medium perf improvement** - faster initial load |
| `CaseAnalysisResults.tsx` | Improve poi_summary.json path detection | **Bug fix** - ensures JSON is found in nested folders |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Initial page load (47MB ZIP) | "Forever" (30+ seconds) | 3-5 seconds |
| Console log calls | ~200,000+ | ~10 |
| Summary parsing | All upfront | On-demand |
| Large summary tables | All rows rendered | 500 rows + pagination |
| POI count accuracy | Shows 150 (fallback) | Shows 5381 (from JSON) |

---

## Testing Checklist

1. Load the "Kodin Cough Syrup" case and verify page loads in reasonable time
2. Check browser console - should have minimal logs during load
3. Expand a summary table with many rows - verify pagination works
4. Verify POI count shows 5381 (from JSON) not 150
5. Check console for `[Analysis] POI count from poi_summary.json: 5381` message
