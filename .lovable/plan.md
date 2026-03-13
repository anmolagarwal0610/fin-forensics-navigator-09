# Plan: Trace Transaction — Interactive Money Trail Tree

## Status: ✅ Phase 1 Complete (Frontend Implementation)

### What's been implemented:

1. **`src/types/traceTransaction.ts`** — TypeScript interfaces for trace tree JSON, node types, selected transaction
2. **`src/components/app/trace/useTraceLayout.ts`** — Hook converting backend JSON → React Flow nodes/edges via dagre auto-layout. Handles dead ends, untraced amounts, cycles, collapsed groups (>15 children)
3. **`src/components/app/trace/TraceTreeNode.tsx`** — Custom React Flow node with color-coded cards (root=primary, child=accent, untraced=muted, dead_end=error, cycle=warning). Hover tooltips with full details
4. **`src/components/app/TraceTransactionModal.tsx`** — Fullscreen modal with React Flow canvas, breadcrumb trail, Export PNG, Fit View, loading skeleton, error/retry states
5. **`src/components/app/BeneficiaryTransactionsDialog.tsx`** — Added "Select Transaction" checkbox column + "Trace Transaction" button in header
6. **`src/components/app/POITransactionsDialog.tsx`** — Same checkbox + trace button addition

### Dependencies added:
- `@xyflow/react` (React Flow v12)
- `dagre` + `@types/dagre`
- `html-to-image` (PNG export)

### Pending (backend):
- Backend must implement `POST /trace-transaction` endpoint returning `TraceTreeResponse` JSON
- Backend sends minimal JSON: `{ source_file, beneficiary, amount, date, has_linked_statement, linked_statement_file, children[] }`
- FE enriches display data from cached raw transaction files
- Inter-statement file for cross-statement expansion

### Minimal Backend JSON Structure:
```json
{
  "trace_tree": {
    "root_transaction": {
      "source_file": "HDFC_Statement_Jan.xlsx",
      "beneficiary": "Sandeep Keshava Hegde",
      "amount": 200000,
      "date": "2026-01-15",
      "has_linked_statement": true,
      "linked_statement_file": "SBI_Statement_Feb.xlsx",
      "children": [
        {
          "source_file": "HDFC_Statement_Jan.xlsx",
          "beneficiary": "Abhinav Ranga",
          "amount": 150000,
          "date": "2026-01-16",
          "has_linked_statement": false,
          "children": []
        }
      ]
    },
    "untraced_amount": 50000,
    "cycle_nodes": []
  },
  "metadata": {
    "trace_window_days": 5,
    "total_nodes": 3,
    "max_depth": 2
  }
}
```

### Edge Cases Handled:
- No date → error message, button disabled
- Dead end (no outflows) → red dashed "Dead End" node
- Partial trace → grey "Untraced ₹X" node
- Cycle detected → amber "Return Flow" ghost node with animated edge
- >15 children → auto-collapse into "+N more" group node
- API timeout → loading skeleton + retry button
- Deep tree → zoom/pan/fit-view controls + minimap
