# RCA & Fix: Transaction Tree CTA Missing + "No trace data available"

## Issue 1: "Transaction Tree" CTA not appearing

**Root Cause**: The backend has not included `fund_traces.json` in the results ZIP for this case. Console logs confirm: `[Analysis] No fund_traces.json found in ZIP`. The CTA rendering logic is correct — it only shows when `fundTracesData` exists and has seeds for a file. This is **not a frontend bug**. The backend either hasn't implemented batch trace generation for this case yet, or the case was processed before this feature was deployed.

**No frontend fix needed** — the CTA will appear automatically once the backend includes `fund_traces.json` in the results ZIP.

However, to help debug future cases, we should add a small improvement: log the actual ZIP file listing so we can see exactly what files are present.

## Issue 2: "No trace data available" when tracing selected transactions

**Root Cause**: The trace data is **never fetched**. In `BeneficiaryTransactionsDialog.tsx`:

- Line 56: `const [traceData] = useState<TraceTreeResponse | null>(null)` — hardcoded to `null`, never updated
- Line 57: `const [traceLoading] = useState(false)` — never set to true
- Line 58: `const [traceError] = useState<string | null>(null)` — never set

When the user clicks "Trace Transaction", it opens `TraceTransactionModal` with `traceData=null`, which renders "No trace data available". The actual cache-check and API-call logic in `src/lib/traceTransaction.ts` is never invoked.

**Fix**: Wire up the trace flow in `BeneficiaryTransactionsDialog.tsx`:

1. Accept `fundTracesData` and `zipData` as props (passed from `CaseAnalysisResults.tsx`)
2. Accept `caseId` as a prop for on-demand API calls
3. When user clicks "Trace N Transactions":
  - For each selected transaction (sequentially):
   a. Check batch cache (`checkBatchCache`) using `fundTracesData`
   b. Check on-demand ZIP cache (`checkOnDemandCacheZip`) using `zipData`
   c. Check in-memory LRU cache (`getFromMemoryCache`)
   d. If all miss → call `requestOnDemandTrace` API
  - Set `traceData` with the result and show the modal
  - Show `TraceLoader` while fetching
4. Same changes in `POITransactionsDialog.tsx`

### Prop Threading

`**CaseAnalysisResults.tsx**` must pass `fundTracesData`, `zipData`, and `caseId` down to `BeneficiaryTransactionsDialog` and `POITransactionsDialog` wherever they are rendered. Need to find all render sites.

### `SelectedTransaction.row_index`

&nbsp;

`in this particular case there was no interlinking sent by the backend, but for tracing single trasaction, it should work fine and send the request to BE.`  
`Check on this.`

Currently `row_index` is set to `idx` (the filtered list index), but it should be the original position in the full transaction list for correct cache lookup. This needs adjustment.

## Files to modify


| File                                                   | Change                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/app/BeneficiaryTransactionsDialog.tsx` | Wire up trace flow: accept `fundTracesData`, `zipData`, `caseId` props; implement cache check → API call logic; update state properly |
| `src/components/app/POITransactionsDialog.tsx`         | Same trace flow wiring                                                                                                                |
| `src/pages/app/CaseAnalysisResults.tsx`                | Pass `fundTracesData`, `zipData`, `caseId` props to both dialogs; add ZIP file listing log                                            |
