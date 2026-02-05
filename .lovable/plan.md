

# Plan: Optimize Results Page Loading Performance

## Root Cause Identified

The 28-second silence + 10-second processing is caused by **three major bottlenecks**:

| Bottleneck | Current Behavior | Time Impact |
|------------|------------------|-------------|
| **Sequential Sankey HTML extraction** | 163 files extracted one-by-one with `await` | ~25-30 seconds |
| **Upfront summary parsing** | All summary Excel files parsed during load | ~5-10 seconds |
| **O(n×m) file matching** | Each file iterates all 163 sankey keys | ~2-3 seconds |

---

## Solution Overview

### Fix 1: Parallelize Sankey HTML Extraction (Critical)

**Current (Sequential):**
```typescript
for (const sankeyPath of sankeyFiles) {
  const htmlContent = await file.async("text"); // Blocks until complete
  sankeyPerFileMap.set(...);
}
```

**After (Parallel with Promise.all):**
```typescript
const sankeyExtractionPromises = sankeyFiles.map(async (sankeyPath) => {
  const file = zipData.file(sankeyPath);
  if (file) {
    const htmlContent = await file.async("text");
    const fileName = /* extract key */;
    return { key: fileName, content: htmlContent };
  }
  return null;
});

const results = await Promise.all(sankeyExtractionPromises);
results.filter(Boolean).forEach(r => sankeyPerFileMap.set(r.key, r.content));
```

**Impact:** Reduces 25-30 seconds → 2-3 seconds (parallel I/O)

---

### Fix 2: Lazy-Load Summary Data (Still Not Implemented)

The previous plan mentioned this but it appears the code still parses summaries upfront (lines 534-544). We need to **skip upfront parsing** and parse only when user clicks to expand.

**Current:**
```typescript
if (summaryFile) {
  const summaryContent = await summaryFileObj.async("arraybuffer");
  const summaryParsedData = await parseExcelFile(summaryContent);
  parsedData.summaryDataMap.set(summaryFile, summaryParsedData);
}
```

**After:**
```typescript
// DON'T parse during initial load - just record the file exists
// The SummaryTableViewer already has lazy-loading support
// Remove the parsing block entirely from loadAnalysisFiles
```

**Impact:** Removes ~5-10 seconds from initial load

---

### Fix 3: Build Pre-Indexed Sankey Lookup Map (O(1) instead of O(n))

**Current:** For each original file, loop through all 163 sankey keys and normalize/compare:
```typescript
for (const [sankeyFileName, sankeyContent] of sankeyPerFileMap) {
  const sankeyNormalized = normalizeString(sankeyFileName);
  if (sankeyNormalized === originalNormalized) { ... }
}
```

**After:** Build a pre-normalized lookup map once, then O(1) lookups:
```typescript
// Build normalized index once
const normalizedSankeyMap = new Map<string, string>();
for (const [key, content] of sankeyPerFileMap) {
  normalizedSankeyMap.set(normalizeString(key), key);
}

// Then for each file - O(1) lookup
const matchedKey = normalizedSankeyMap.get(originalNormalized);
if (matchedKey) {
  sankeyHtml = sankeyPerFileMap.get(matchedKey);
}
```

**Impact:** Reduces file matching from O(n×m) to O(n+m)

---

### Fix 4: Remove Excessive Console Logging in Loops

The `[Sankey Map] Added key` and `[Sankey Match]` logs are printed 163+ times. Even with parallel extraction, these logs cause UI thread blocking.

**Change:**
- Remove individual file logs from loops
- Add single summary log after processing: `console.log('[Analysis] Loaded', sankeyPerFileMap.size, 'sankey files')`

---

## Implementation Summary

| File | Change | Impact |
|------|--------|--------|
| `CaseAnalysisResults.tsx` | Parallelize sankey extraction with `Promise.all` | **-25 seconds** |
| `CaseAnalysisResults.tsx` | Remove upfront summary parsing (already lazy-load capable) | **-5 seconds** |
| `CaseAnalysisResults.tsx` | Pre-index normalized sankey keys for O(1) lookup | **-2 seconds** |
| `CaseAnalysisResults.tsx` | Remove per-file console.log statements | **Better UX** |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Time after ZIP download | 38+ seconds | 3-5 seconds |
| Sankey file extraction | Sequential (163 × 200ms) | Parallel (2-3s total) |
| File matching complexity | O(n × m) = 163 × files | O(n + m) |
| Console log calls | 300+ | ~5 |

---

## Backend Mapping (Not Required)

Your question about backend mapping: **It's not the matching logic that's slow** - it's the sequential file extraction. With parallel extraction, the matching (even O(n×m)) becomes negligible. However, if you want an even cleaner solution in the future, the backend could provide:

```json
{
  "file_mapping": {
    "Statement_123.xls": "sankey_Statement_123.xlsx.html",
    "AGARWAL_BROTHERS.pdf": "sankey_AGARWAL_BROTHERS.xlsx.html"
  }
}
```

But this is **not needed** for the current performance fix - parallelization solves the core issue.

---

## Code Changes Preview

### Parallel Sankey Extraction
```typescript
// Parse per-file sankey graphs - PARALLEL extraction
const sankeyPerFileMap = new Map<string, string>();
const sankeyFolderPrefix = "poi_flows_per_file_sankeys/";
const sankeyFiles = Object.keys(zipData.files).filter(
  name => name.startsWith(sankeyFolderPrefix) && name.endsWith('.html')
);

// Extract all sankey HTML files in parallel
const sankeyResults = await Promise.all(
  sankeyFiles.map(async (sankeyPath) => {
    const file = zipData.file(sankeyPath);
    if (!file) return null;
    
    const htmlContent = await file.async("text");
    const fileName = sankeyPath
      .replace(sankeyFolderPrefix, '')
      .replace('sankey_', '')
      .replace('.html', '')
      .replace(/\.(xlsx|pdf|csv)$/i, '');
    
    return { key: fileName, content: htmlContent };
  })
);

// Populate map from parallel results
sankeyResults.filter(Boolean).forEach(r => {
  sankeyPerFileMap.set(r!.key, r!.content);
});
console.log('[Analysis] ✓ Loaded', sankeyPerFileMap.size, 'sankey files');

// Build normalized lookup index for O(1) matching
const normalizedSankeyIndex = new Map<string, string>();
for (const key of sankeyPerFileMap.keys()) {
  normalizedSankeyIndex.set(normalizeString(key), key);
}
```

