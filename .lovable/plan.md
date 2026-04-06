

# Fix: Scrollable Sidebar + Replace "Dead End" with Correct Leaf Node Labels

## Issue 1: Left Sidebar Sections Not Scrollable

**Root Cause**: The `ScrollArea` components in `BatchTraceModal.tsx` are working, but the parent `div.w-[280px]` uses `flex flex-col` without `overflow-hidden`, and the file list section doesn't constrain height properly. The transactions `ScrollArea` at line 204 uses `flex-1` but the parent also needs `min-h-0` for flex overflow to work.

**Fix** in `BatchTraceModal.tsx`:
- Line 163: Add `overflow-hidden min-h-0` to the sidebar container
- Line 165: Add `shrink-0` to the file list wrapper so it doesn't grow unboundedly  
- Line 198: Add `min-h-0` to the transactions flex container so `flex-1` + `ScrollArea` can scroll

## Issue 2: Replace "Dead End" with Correct Leaf Node Semantics

**Current behavior**: Any leaf outflow where `is_inter_statement: false` is rendered as a `dead_end` node with a red dashed border and "Dead End — No further trace found" label.

**Correct behavior**: These are simply destinations whose statements were not uploaded. The money is accounted for — it's not "dead".

### Changes in `useBatchTraceLayout.ts` (lines 102-123)

Replace the `dead_end` type assignment for external leaf nodes:
- Leaf outflows with `is_inter_statement: false` and a beneficiary name → type `"leaf"` (new type, neutral styling)
- Leaf outflows with no beneficiary → type `"leaf"` with beneficiary "Unknown Recipient"

Remove all `dead_end` type usage from this file.

### Changes in `useTraceLayout.ts` (lines 71-95)

Remove the dead end detection block entirely (lines 71-95). This block auto-creates synthetic "Dead End" nodes for any childless non-root node without a linked statement. Instead:
- If a node is childless and has no linked statement, it's simply a leaf — render it normally with its name and amount

### Changes in `TraceTreeNode.tsx`

**Remove** the `dead_end` rendering block (lines 56-67) entirely.

**Add** a new `"leaf"` node type rendering:
- Neutral card styling (similar to `child` but with a subtle tag)
- Show beneficiary name + amount + date
- Small tag: "No statement" if `!has_linked_statement`, or "External" if no source file
- No red/destructive styling

**Add reconciliation indicator** to `account_node` and `root` nodes:
- Calculate: `outflows_total = sum of outflow edge amounts` from `outflows_count` and `retained`
- If `retained ≈ 0` (within 1% of total): show green "✅ Fully reconciled" text
- If `retained > 0`: show "₹X retained in account" in neutral style
- Display this below the node card content

### Changes in `types/traceTransaction.ts`

Add `"leaf"` to the `TraceNodeType` union type.

### Node Style Updates

| Node Type | Old Label | New Label | Style |
|-----------|-----------|-----------|-------|
| Leaf (named beneficiary) | "Dead End" | Shows name + amount | Neutral card, "No statement" tag |
| Leaf (no name) | "Dead End" | "Unknown Recipient" | Muted card |
| Parent with retained=0 | — | "✅ Fully reconciled" | Green text |
| Parent with retained>0 | — | "₹X retained" | Neutral text on node |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/app/BatchTraceModal.tsx` | Fix sidebar overflow/scroll with `min-h-0` and `overflow-hidden` |
| `src/components/app/trace/useBatchTraceLayout.ts` | Replace `dead_end` leaf type with `leaf` |
| `src/components/app/trace/useTraceLayout.ts` | Remove dead end detection block |
| `src/components/app/trace/TraceTreeNode.tsx` | Remove `dead_end` render, add `leaf` render + reconciliation indicator |
| `src/types/traceTransaction.ts` | Add `"leaf"` to `TraceNodeType` |

