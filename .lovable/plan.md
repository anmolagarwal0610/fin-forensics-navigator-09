
# Plan: Use `poi_summary.json` for Total Beneficiaries Count

## Strategy

Extract `total_beneficiaries` from `poi_summary.json` **before** parsing the Excel file. If found, use it for the KPI and "Top XX" title. If not found (older cases), fall back to the current Excel row-counting logic.

## Changes (Single File)

**File:** `src/pages/app/CaseAnalysisResults.tsx`

### Change 1: Extract `total_beneficiaries` from JSON early (lines 424-466)

The `poi_summary.json` is already parsed here for `total_pois`. We simply also extract `total_beneficiaries` in the same block:

```typescript
if (typeof poiSummary.total_pois === 'number') {
  parsedData.poiFileCount = poiSummary.total_pois;
}
// NEW: Also extract total_beneficiaries if available
if (typeof poiSummary.total_beneficiaries === 'number') {
  parsedData.totalBeneficiaryCount = poiSummary.total_beneficiaries;
  console.log('[Analysis] Beneficiary count from poi_summary.json:', poiSummary.total_beneficiaries);
}
```

### Change 2: Skip Excel row-count when JSON already provided (lines 264-267)

In the beneficiaries Excel parsing block, only set `totalBeneficiaryCount` from row count if the JSON didn't already set it:

```typescript
// Before:
const totalBeneficiaries = jsonData.length - 2;
parsedData.totalBeneficiaryCount = Math.max(0, totalBeneficiaries);

// After:
if (parsedData.totalBeneficiaryCount === 0) {
  const totalBeneficiaries = jsonData.length - 2;
  parsedData.totalBeneficiaryCount = Math.max(0, totalBeneficiaries);
}
```

### Change 3: Move JSON parsing before Excel parsing

The `poi_summary.json` block currently runs at line 424 (after Excel parsing at line 220). We need to move it **before** the Excel parsing so the JSON value is available as the "first preference." This means relocating the JSON detection and parsing block (lines 424-466) to just after line 218 (after fund trail extraction, before beneficiaries Excel parsing).

## Ordering of Logic

```
1. Extract fund_trail_main.html
2. [NEW POSITION] Parse poi_summary.json -> set totalBeneficiaryCount + poiFileCount
3. Parse beneficiaries_by_file.xlsx -> only set totalBeneficiaryCount if still 0
4. Continue with graphs, POI files, sankeys, etc.
```

## Backward Compatibility

- Old cases without `poi_summary.json`: JSON block finds nothing, `totalBeneficiaryCount` stays 0, Excel parsing sets it from row count -- same as today
- Old cases with `poi_summary.json` but no `total_beneficiaries` key: JSON block sets only `poiFileCount`, beneficiary count falls back to Excel
- New cases with full JSON: Both values come from JSON, Excel parsing skips the count

## No Other Files Changed

The KPI display (line 804) and "Top XX" title (line 835) already read from `analysisData.totalBeneficiaryCount`, so they automatically use the correct value.
