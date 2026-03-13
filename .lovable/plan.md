

# Plan: Show Previous Results When Re-run Fails

## What Changes

**Single file: `src/pages/app/CaseDetail.tsx`** (lines 560-561)

Currently, when a case has status `Failed` or `Timeout`, the Analysis Results card shows:
> "Analysis encountered an issue. See the message above for details."

**New behavior**: When the case has `previous_result_zip_url` (meaning a prior successful run exists), replace that text with:
> "Analysis encountered an issue. You can still see the last result."
> **[View Last Results]** button → navigates to `/app/cases/${id}/results`

When no `previous_result_zip_url` exists (first-time failure), keep the current text as-is.

## How It Works

The `CaseAnalysisResults` page already supports viewing previous results — it reads `previous_result_zip_url` from the case record and has a `viewingPreviousResults` toggle. When a `Failed` case has `previous_result_zip_url`, navigating to the results page will show the last successful results because:
- The query is enabled only when `case_.status === "Ready"` — this needs a small tweak to also allow `Failed`/`Timeout` cases that have a previous result URL
- Alternatively, the simpler approach: the "View Last Results" button navigates with a query param `?previous=true`, and `CaseAnalysisResults` reads it to auto-set `viewingPreviousResults = true`

After reviewing `CaseAnalysisResults` more carefully: the analysis query is gated on `case_.status === "Ready"` (line 305). So we need to also enable it for `Failed`/`Timeout` when `previous_result_zip_url` exists, and auto-set `viewingPreviousResults = true` in that scenario.

## Changes

### `src/pages/app/CaseDetail.tsx`
- Lines 560-561: For `Failed`/`Timeout` cases with `previous_result_zip_url`, show updated message + "View Last Results" button
- No other changes needed

### `src/pages/app/CaseAnalysisResults.tsx`
- Line 305: Expand the `enabled` condition to also allow `Failed`/`Timeout` cases when `previous_result_zip_url` exists
- Auto-set `viewingPreviousResults = true` when the case status is `Failed`/`Timeout` (so it defaults to showing the last good result)

## Edge Cases
- **First-time failure** (no `previous_result_zip_url`): Current behavior preserved — shows plain issue text
- **Ready status**: Unchanged — "View Results" button as normal
- **Processing/Draft**: Unchanged — "Results will appear here"
- **Previous result URL expired**: `CaseAnalysisResults` already handles fetch errors gracefully

