# Plan: Enhanced Transaction Tracing (Batch + On-Demand Multi-Select)

## Overview

Three major additions to the transaction tracing system:

1. **Batch traces** from `fund_traces.json` — displayed via a new "Transaction Tree" CTA per file in the File Analysis Summary
2. **Multi-select** support in BeneficiaryTransactionsDialog and POITransactionsDialog — users can select multiple transactions and trace them sequentially
3. **Smart cache check** — before calling the backend for on-demand traces, check if the transaction exists in `fund_traces.json` or `fund_trace_results/` in the ZIP

## Tech Stack (Reusing Existing)

- **@xyflow/react** (React Flow) — interactive canvas
- **dagre** — hierarchical auto-layout (lazy-loaded)
- **html-to-image** — PNG export
- **TraceTreeNode** — custom node component (existing)
- **TraceTransactionModal** — fullscreen dialog (existing, will be extended)
- Direct API call to backend for on-demand traces (not job queue)

---

## Change 1: New Types for Updated JSON Schema

`**src/types/traceTransaction.ts**` — Add new types to match the batch/on-demand JSON structures:

- `BatchTraceResponse` (fund_traces.json top-level: metadata, file_index, seeds)
- `BatchTraceSeed` (each seed with trace_id, tree, etc.)
- `BatchTraceTreeNode` (recursive tree: node, file, status, context_inflows, outflows, child)
- `CreditTraceResponse` (backward_trace + forward_tree)
- `FundTrailRequest` (fund_trail_raw.json structure)
- Keep existing `TraceTreeResponse` for backward compatibility during transition

---

## Change 2: New Layout Hook for Batch JSON

`**src/components/app/trace/useBatchTraceLayout.ts**` — New hook that converts the batch JSON tree structure into React Flow nodes/edges:

- Takes a `BatchTraceSeed` (single seed with its tree) and converts recursive `outflows[].child` into flat nodes/edges
- Root node = seed transaction (seed_file, seed_beneficiary, seed_amount)
- Each tree node shows: node name (account holder), file, traced_credit, context_inflows count, outflows, retained amount
- Outflows with `is_inter_statement: true` + `child` → recurse into child tree
- Outflows with `is_inter_statement: false` → leaf node (external payment)
- `status: "cycle_detected"` → amber cycle node
- Uses dagre for layout (same as existing `useTraceLayout`)
- For **credit traces**: render backward_trace as a node above the root, forward_tree below

---

## Change 3: Batch Trace Viewer (fund_traces.json)

`**src/components/app/BatchTraceModal.tsx**` — New modal for viewing batch traces:

- **Left sidebar**: File list from `file_index` (file name, owner, seeds_with_trails count)
- **Main area**: When a file is selected, show list of seeds for that file
- When a seed is clicked, render the trace tree using React Flow (reusing TraceTreeNode + useBatchTraceLayout)
- Toolbar with fit view, export PNG, breadcrumb (same pattern as TraceTransactionModal)
- Seed list shows: beneficiary, amount, date, transaction type, has_trail badge

---

## Change 4: Parse fund_traces.json from ZIP

`**src/pages/app/CaseAnalysisResults.tsx**`:

- In `loadAnalysisFiles()`, parse `fund_traces.json` from the ZIP and store in `ParsedAnalysisData`
- Add field: `fundTracesData: BatchTraceResponse | null` to `ParsedAnalysisData`
- Also cache any `fund_trace_results/*.json` files for on-demand cache lookup

---

## Change 5: "Transaction Tree" CTA in File Analysis Summary

`**src/pages/app/CaseAnalysisResults.tsx**` — In the file summaries section (~line 1723-1776):

- Add a new CTA button "Transaction Tree" (with `GitBranch` icon) next to the existing "Graph" button
- Only shown when `fundTracesData` exists and has seeds for that file
- Opens `BatchTraceModal` filtered to that file's seeds
- Styled similarly to the Graph button (orange/amber theme to differentiate)

---

## Change 6: Multi-Select in Transaction Dialogs

`**src/components/app/BeneficiaryTransactionsDialog.tsx**`:

- Change `selectedTxIndex: number | null` → `selectedTxIndices: Set<number>`
- Checkbox becomes multi-select (toggle in/out of set)
- "Trace Transaction" CTA in footer shows count: "Trace N Transactions"
- On click, traces sequentially: first checks `fund_traces.json` cache, if not found sends to backend
- Each trace opens TraceTransactionModal one at a time (user closes one, next opens)

`**src/components/app/POITransactionsDialog.tsx**` — Same multi-select changes

When the user comes back and selects a single/multiple transactions and it was previously loaded or requested before - user should see this instantly and each time its not needed to send the request back to BE. But, there should be a limit so that cache memory does not overflow and the browser should not slow down.

---

## Change 7: Smart Cache Check + On-Demand API Call

`**src/lib/traceTransaction.ts**` — New utility:

- `checkBatchCache(fundTracesData, fileName, rowIndex)` — looks up seed by seed_file + seed_row_index match
- `checkOnDemandCache(zipData, fileName, rowIndex)` — checks `fund_trace_results/{filename}_{rowIndex}.json` in ZIP
- `requestOnDemandTrace(transactions, caseId, windowDays)` — Direct POST to `{backendUrl}/trace-transaction` with `fund_trail_raw.json` payload structure
- Returns the trace JSON for rendering

**Flow**:

1. User selects transaction(s) and clicks Trace
2. For each transaction: check batch cache → check on-demand cache → API call
3. If cache hit, render immediately
4. If API call needed, show branded loader (FinNavigator logo spinner animation)

---

## Change 8: Branded Loader Component

`**src/components/app/trace/TraceLoader.tsx**` — Cool loader for when backend is processing:

- FinNavigator logo/icon in center with pulsing animation
- Animated money trail lines flowing outward
- Text: "Tracing money flow..." with subtle animation
- Used in TraceTransactionModal when `isLoading` is true (replaces current skeleton loader)

---

## Change 9: row_index Derivation

Since `row_index` is derived from position:

- When building `SelectedTransaction`, include the row's position index (0-based) from the raw transactions data
- Add `row_index: number` field to `SelectedTransaction` type
- The position in the displayed table corresponds to the row index in the raw Excel

---

## Files to Create/Modify


| File                                                   | Action | Description                                            |
| ------------------------------------------------------ | ------ | ------------------------------------------------------ |
| `src/types/traceTransaction.ts`                        | Modify | Add batch/credit trace types, FundTrailRequest         |
| `src/components/app/trace/useBatchTraceLayout.ts`      | Create | Convert batch JSON tree → React Flow nodes/edges       |
| `src/components/app/trace/TraceLoader.tsx`             | Create | Branded loader for trace processing                    |
| `src/components/app/BatchTraceModal.tsx`               | Create | Full modal with sidebar + tree viewer for batch traces |
| `src/lib/traceTransaction.ts`                          | Create | Cache check + on-demand API utility                    |
| `src/pages/app/CaseAnalysisResults.tsx`                | Modify | Parse fund_traces.json, add Transaction Tree CTA       |
| `src/components/app/BeneficiaryTransactionsDialog.tsx` | Modify | Multi-select + cache-aware tracing                     |
| `src/components/app/POITransactionsDialog.tsx`         | Modify | Multi-select + cache-aware tracing                     |
| `src/components/app/TraceTransactionModal.tsx`         | Modify | Use new loader, support new JSON structure             |
| `src/components/app/trace/useTraceLayout.ts`           | Modify | Support new batch tree structure alongside old format  |
