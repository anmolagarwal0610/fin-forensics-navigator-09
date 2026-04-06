

# Fix: Trace Transaction Errors + UI Improvements + Context Inflows Display

## Summary

This plan addresses 8 UI/UX issues, the trace API error, and adds the context inflows feature to tree nodes.

---

## Issue 1: Trace API Error (401/500)

**Root Cause**: `trace-transaction` is missing from `supabase/config.toml`. Without an entry, Supabase defaults to `verify_jwt = true` — but the gateway JWT verification may be rejecting tokens, and zero logs confirms requests never reach the function code.

**Fix**:
- Add `[functions.trace-transaction]` with `verify_jwt = true` to `config.toml`
- Redeploy the function
- The function already handles auth internally via `getUser()`, so this should work once properly registered

## Issue 2: User-Unfriendly Error Message

**Current**: Shows raw `"Trace request failed: Edge Function returned a non-2xx status code"`

**Fix**: In `TraceTransactionModal.tsx` (line 106-119), replace the error display:
- Title: "Found an error. Please try again later."
- Remove the raw error text from UI (keep it in console.log for debugging)

## Issue 3: Files Section Not Scrollable (BatchTraceModal)

**Fix**: The Files section in `BatchTraceModal.tsx` line 169 already has `ScrollArea` with `max-h-[180px]`. This is too small for 7 files. Increase to `max-h-[240px]` and ensure overflow works.

## Issue 4: Transactions Section Cut Off

**Fix**: In `BatchTraceModal.tsx`, the transactions section (line 198) uses `flex-1 overflow-hidden`. The issue is the parent container doesn't leave enough room. Adjust the Files section to be collapsible or reduce its max-height, ensuring Transactions gets adequate space.

## Issue 5: Zoom Controls (+/-) Invisible

**Root Cause**: The React Flow `Controls` component buttons are white-on-white in dark mode (or same as background).

**Fix**: In both `TraceTransactionModal.tsx` and `BatchTraceModal.tsx`, add explicit styling to the Controls:
```
className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!fill-foreground [&>button]:!border-border"
```

## Issue 6: MiniMap Black Box

**Root Cause**: The MiniMap background blends with dark theme, appearing as a featureless black box.

**Fix**: Style the MiniMap with visible background and border:
```
className="!bg-muted/50 !border-border !rounded-md"
```

## Issue 7: Edge Arrows + Amount Labels

**Current**: Edges use `smoothstep` without arrowheads. Edge labels show the parent node amount instead of the exchanged amount.

**Fix**:
- Add `markerEnd` with an arrow marker to all edges in both layout files
- Edge labels already show outflow amounts correctly in `useBatchTraceLayout.ts` — verify `useTraceLayout.ts` does the same (line 65 shows `node.amount` which is the child's amount, correct)

## Issue 8: Tooltip Z-Index Behind Dead End Nodes

**Fix**: In `TraceTreeNode.tsx` line 212, increase tooltip z-index:
```
className="p-3 max-w-sm bg-popover border shadow-lg z-[9999]"
```

## Issue 9: Default "Fit View"

Already implemented — both modals use `fitView` prop on ReactFlow. The issue may be that initial render happens before dagre layout. Add `fitViewOptions` with `padding: 0.3` and ensure `fitView` fires after layout.

---

## Feature: Context Inflows Display

### A. TraceTreeNode Enhancement

Modify `TraceTreeNode.tsx` to:

1. **Node card**: Add `+N other inflows` indicator below the date/source line when `context_inflows_count > 1`
2. **Tooltip**: Add "Inflows in Window" section showing:
   - Traced credit (`is_traced: true`): highlighted with accent background, "Traced" badge
   - Contextual inflows (`is_traced: false`): dimmed styling
   - Section header: "Inflows in Window (8) — 1 traced · 7 contextual"
3. **Aggregate split**: Show Traced Inflow, Other Inflows, Total Inflow, Total Outflow, Retained
4. **Negative retained**: Show in red with note

### B. Data Flow

The `context_inflows` array is already in `BatchTraceTreeNode`. Pass it through to `TraceNodeDisplayData`:
- Add `context_inflows?: BatchContextInflow[]` to `TraceNodeDisplayData`
- In `useBatchTraceLayout.ts` `flattenBatchTree()`, pass `treeNode.context_inflows` into node data
- In `useTraceLayout.ts` `batchNodeToLegacy()` / `convertToLegacy()`, also propagate context_inflows

### C. Edge Cases
- No contextual inflows: don't show "Other Inflows" row
- Negative retained: red text + note
- `is_inter_statement: true` on contextual: show source_owner with link icon

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.trace-transaction]` entry |
| `src/components/app/TraceTransactionModal.tsx` | User-friendly error message, Controls/MiniMap styling |
| `src/components/app/BatchTraceModal.tsx` | Files scroll fix, Controls/MiniMap styling, transactions section height |
| `src/components/app/trace/TraceTreeNode.tsx` | Tooltip z-index, context inflows section, +N indicator on node card |
| `src/types/traceTransaction.ts` | Add `context_inflows` to `TraceNodeDisplayData` |
| `src/components/app/trace/useBatchTraceLayout.ts` | Pass context_inflows to node data, add arrow markers to edges |
| `src/components/app/trace/useTraceLayout.ts` | Pass context_inflows through conversion, add arrow markers |

