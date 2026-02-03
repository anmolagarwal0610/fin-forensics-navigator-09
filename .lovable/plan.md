

# Plan: Add POI Summary JSON Support for POI Count

## Overview

Enhance the POI count logic in the Results Analysis page to prioritize reading from a `poi_summary.json` file when available, falling back to the current file-counting method when the JSON doesn't exist.

---

## Current Behavior

The POI count is determined by counting files in the ZIP archive that match the pattern `POI_*.xlsx`:

```typescript
parsedData.poiFileCount = Object.keys(zipData.files).filter(name => 
  name.startsWith('POI_') && name.endsWith('.xlsx')
).length;
```

---

## New Behavior

1. Check if `poi_summary.json` exists in the ZIP archive
2. If yes: Parse the JSON and extract `total_pois` value
3. If no: Fall back to counting `POI_*.xlsx` files (current behavior)

**JSON Format Expected:**
```json
{
    "total_pois": 4827,
    "exported_pois": 150,
    "export_threshold": "top_150_by_priority_score",
    "generated_at": "2026-01-28T15:30:45"
}
```

---

## Implementation Details

### File to Modify
- `src/pages/app/CaseAnalysisResults.tsx`

### Change Location
Inside the `loadAnalysisFiles` function, around lines 401-403, where `poiFileCount` is currently set.

### Code Change

Replace the current simple file-counting logic with a two-step approach:

```typescript
// First, try to get POI count from poi_summary.json
const poiSummaryFile = zipData.file("poi_summary.json");
if (poiSummaryFile) {
  try {
    const jsonContent = await poiSummaryFile.async("text");
    const poiSummary = JSON.parse(jsonContent);
    if (typeof poiSummary.total_pois === 'number') {
      parsedData.poiFileCount = poiSummary.total_pois;
      console.log('[Analysis] POI count from poi_summary.json:', poiSummary.total_pois);
    } else {
      // JSON exists but missing total_pois - fall back to file count
      parsedData.poiFileCount = Object.keys(zipData.files).filter(name => 
        name.startsWith('POI_') && name.endsWith('.xlsx')
      ).length;
      console.log('[Analysis] poi_summary.json missing total_pois, using file count:', parsedData.poiFileCount);
    }
  } catch (error) {
    // JSON parsing failed - fall back to file count
    console.warn('[Analysis] Failed to parse poi_summary.json, using file count:', error);
    parsedData.poiFileCount = Object.keys(zipData.files).filter(name => 
      name.startsWith('POI_') && name.endsWith('.xlsx')
    ).length;
  }
} else {
  // No JSON file - use existing file counting logic
  parsedData.poiFileCount = Object.keys(zipData.files).filter(name => 
    name.startsWith('POI_') && name.endsWith('.xlsx')
  ).length;
  console.log('[Analysis] No poi_summary.json, using file count:', parsedData.poiFileCount);
}
```

---

## What Stays the Same

| Component | Status |
|-----------|--------|
| `ParsedAnalysisData` interface | Unchanged - `poiFileCount: number` |
| KPI Card display (line 777) | Unchanged - still shows `analysisData.poiFileCount` |
| KPI Card label | Unchanged - "Beneficiaries Present in more than one file" |
| Download button text | Unchanged - still shows file count for downloads |
| All other logic | Unchanged |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| `poi_summary.json` exists with valid `total_pois` | Use JSON value |
| `poi_summary.json` exists but `total_pois` is missing | Fall back to file count |
| `poi_summary.json` exists but is malformed JSON | Fall back to file count |
| `poi_summary.json` does not exist | Fall back to file count (current behavior) |
| `total_pois` is 0 | Display 0 (valid scenario) |

---

## Testing Checklist

1. Upload a case with a ZIP containing `poi_summary.json` - verify the count shows `total_pois` value
2. Upload a case with a ZIP without `poi_summary.json` - verify it still counts `POI_*.xlsx` files
3. Check browser console for the appropriate log messages confirming which method was used

