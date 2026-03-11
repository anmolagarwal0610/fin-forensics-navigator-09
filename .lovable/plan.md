

# Plan Update: Trace Transaction — Minimal Backend JSON

## Field Availability Analysis

The frontend already has access to raw transaction files (via ZIP) which contain per-transaction rows with these columns:

| Field Needed for Trace Tree | Available on FE? | Source |
|---|---|---|
| `beneficiary_name` | Yes | Raw transaction files (`beneficiary` column) |
| `amount` (debit/credit) | Yes | Raw transaction files (`debit`, `credit` columns) |
| `date` | Yes | Raw transaction files (`date` column) |
| `source_file` | Yes | Raw transaction files (`source_file` column) |
| `description` | Yes | Raw transaction files (`description` column) |
| `transaction_type` | Yes | Raw transaction files (`transaction_type` column) |
| `balance` | Yes | Raw transaction files (`balance` column) |
| `is_poi` | Yes | Can be derived — POI files exist per source file in ZIP (`poi_*.xlsx`) |
| `priority_score` | No | Not in raw files, only in POI summary output |
| `statement_count` / `accounts_present` | Yes | Available in beneficiary summary table (`files present` column) |
| `total_inflow` / `total_outflow` | Yes | Can be computed by summing credit/debit from raw transactions |
| `suspicious_reason` (for POI) | Yes | Available in POI transaction files (`suspicious_reason` column) |
| **Which beneficiary has a linked statement in the case** | **No** | FE doesn't know which beneficiaries match uploaded statement files across the case. This is cross-file graph linkage — only the backend (NetworkX) knows this. |
| **Matched outgoing transactions within 5-day window across statements** | **No** | FE has individual raw files but doesn't have the cross-statement matching logic. The backend must identify which outflows from Statement A land in Statement B. This is the core tracing logic. |
| **Cycle detection** | **No** | Requires graph traversal across all statements — backend only. |

## Conclusion

The FE can display all node details (amounts, dates, names, etc.) from data it already has. What the FE **cannot do** is:

1. **Cross-statement linkage** — determining which beneficiary in one statement maps to another uploaded statement
2. **5-day window trace matching** — finding outflows that sum to the root amount across linked statements
3. **Cycle detection** — identifying return flows in the money graph

These three things are graph operations that only the backend can perform.

## Revised Minimal Backend JSON Structure

The backend only needs to send the **tree structure** (which nodes connect to which) with minimal identifying info. All display details (amounts, dates, descriptions) can be looked up by the FE from the raw transaction files it already has in the ZIP.

```json
{
  "trace_tree": {
    "root_transaction": {
      "source_file": "HDFC_Statement_Jan.xlsx",
      "row_index": 42
    },
    "children": [
      {
        "source_file": "HDFC_Statement_Jan.xlsx",
        "row_index": 55,
        "has_linked_statement": true,
        "linked_statement_file": "SBI_Statement_Feb.xlsx",
        "children": [
          {
            "source_file": "SBI_Statement_Feb.xlsx",
            "row_index": 12,
            "has_linked_statement": false,
            "children": []
          }
        ]
      },
      {
        "source_file": "HDFC_Statement_Jan.xlsx",
        "row_index": 58,
        "has_linked_statement": false,
        "children": []
      }
    ],
    "untraced_amount": 20000,
    "cycle_nodes": [
      {
        "source_file": "SBI_Statement_Feb.xlsx",
        "row_index": 30,
        "returns_to_file": "HDFC_Statement_Jan.xlsx"
      }
    ]
  },
  "metadata": {
    "trace_window_days": 5,
    "total_nodes": 8,
    "max_depth": 3
  }
}
```

**Alternative** — if row indices are fragile (rows may shift), the backend can send transaction identifiers instead:

```json
{
  "source_file": "HDFC_Statement_Jan.xlsx",
  "beneficiary": "Sandeep Keshava Hegde",
  "amount": 200000,
  "date": "2026-01-15",
  "has_linked_statement": true,
  "linked_statement_file": "SBI_Statement_Feb.xlsx",
  "children": [...]
}
```

This adds 3 fields per node (~50 bytes each) but makes matching robust. The FE uses `(source_file + beneficiary + amount + date)` as a composite key to look up the full transaction row from the raw data it already has.

**Recommendation**: Use the second approach (with `beneficiary`, `amount`, `date`, `source_file` per node). It's slightly more data but far more reliable than row indices, and it's still minimal — no duplicated display data like `description`, `balance`, `transaction_type`, `total_inflow`, etc.

## What Changes from Previous Plan

- **No change** to the frontend component architecture (TraceTransactionModal, TraceTreeNode, etc.)
- **No change** to the UI/UX flow (checkbox → Trace button → modal)
- **Backend JSON is ~70% smaller** — only sends tree linkage + minimal identifiers
- **FE does a lookup step** in `useTraceLayout.ts`: for each node in the tree, find the matching row in the already-loaded raw transaction data to populate display fields
- All other details (tech stack, edge cases, acceptance criteria) remain the same as previous plan

Shall I proceed with implementation using this revised minimal JSON structure?

