# Plan: Case Analysis PDF Report Generation

## Report Structure (from document)

4 pages: Case Overview → Important Trails → Top 10 Beneficiaries → Sankey Analysis

---

## Complete Field Inventory

### Page 1 — Case Overview


| #   | Field                 | Source                                                    | Available Now?                |
| --- | --------------------- | --------------------------------------------------------- | ----------------------------- |
| 1   | Case Name             | `cases.name` (DB)                                         | Yes                           |
| 2   | Case Created Date     | `cases.created_at` (DB)                                   | Yes                           |
| 3   | Total Files           | `files.length` (already fetched)                          | Yes                           |
| 4   | Total Statement Files | `report_data.json` → `case_summary.total_statement_files` | **No — backend must provide** |
| 5   | Total Inflow (in Cr)  | `report_data.json` → `case_summary.total_inflow_cr`       | **No — backend must provide** |
| 6   | Total Outflow (in Cr) | `report_data.json` → `case_summary.total_outflow_cr`      | **No — backend must provide** |
| 7   | Total Beneficiaries   | `poi_summary.json` → `total_beneficiaries`                | Yes                           |
| 8   | Total POIs            | `poi_summary.json` → `total_pois`                         | Yes                           |
| 9   | Total Transactions    | `report_data.json` → `case_summary.total_transactions`    | **No — backend must provide** |


**Transaction Types Table:**


| #   | Field                                                                             | Source                                                       | Available Now?                |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| 10  | Transaction Type (Cash, Cheque, Sweep, ACH, UPI, RTGS, NEFT, Remittance, OD, EMI) | `report_data.json` → `transaction_types[].type`              | **No — backend must provide** |
| 11  | Total Credit (in Cr) per type                                                     | `report_data.json` → `transaction_types[].total_credit_cr`   | **No — backend must provide** |
| 12  | Total Debit (in Cr) per type                                                      | `report_data.json` → `transaction_types[].total_debit_cr`    | **No — backend must provide** |
| 13  | # of Transactions per type                                                        | `report_data.json` → `transaction_types[].transaction_count` | **No — backend must provide** |


### Page 2-3 — Important Trails (per transaction type)


| #   | Field                                                  | Source                                                          | Available Now?                |
| --- | ------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------- |
| 14  | Section per type (Cash, Cheque, EMI, Sweep, ACH, etc.) | `report_data.json` → `important_trails` keys                    | **No — backend must provide** |
| 15  | Account                                                | `report_data.json` → `important_trails[type][].account`         | **No — backend must provide** |
| 16  | Beneficiaries                                          | `report_data.json` → `important_trails[type][].beneficiaries`   | **No — backend must provide** |
| 17  | Total Credit (in Cr)                                   | `report_data.json` → `important_trails[type][].total_credit_cr` | **No — backend must provide** |
| 18  | Total Debit (in Cr)                                    | `report_data.json` → `important_trails[type][].total_debit_cr`  | **No — backend must provide** |
| 19  | Total Txns                                             | `report_data.json` → `important_trails[type][].total_txns`      | **No — backend must provide** |


### Page 3 — Top 10 Beneficiaries Report


| #   | Field                          | Source                                                         | Available Now?                                                      |
| --- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| 20  | Investigation Score (rank)     | `report_data.json` → `top_beneficiaries[].investigation_score` | **No — backend scoring algorithm**                                  |
| 21  | Node (name)                    | Partially in `beneficiaries_by_file.xlsx`                      | Partial — names exist but not ranked/scored                         |
| 22  | Total Debit (in Cr)            | `report_data.json` → `top_beneficiaries[].total_debit_cr`      | **No — backend must aggregate**                                     |
| 23  | Total Credit (in Cr)           | `report_data.json` → `top_beneficiaries[].total_credit_cr`     | **No — backend must aggregate**                                     |
| 24  | Accounts Present               | `report_data.json` → `top_beneficiaries[].accounts_present`    | **No — backend must count**                                         |
| 25  | Suspicious Activity            | `report_data.json` → `top_beneficiaries[].suspicious_activity` | **No — backend pattern detection**                                  |
| 26  | Unique Beneficiary (1 file)    | `report_data.json` → `top_beneficiaries[].unique_beneficiary`  | **No — derivable from accounts_present but backend should provide** |
| 27  | Shared Beneficiary (2-3 files) | `report_data.json` → `top_beneficiaries[].shared_beneficiary`  | **No — same as above**                                              |
| 28  | Hub Beneficiary (4+ files)     | `report_data.json` → `top_beneficiaries[].hub_beneficiary`     | **No — same as above**                                              |


### Page 4 — Sankey Diagram Analysis


| #     | Field                                     | Source                                                              | Available Now?                  |
| ----- | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| 29    | Top 10 Start Trail Nodes — Node           | `report_data.json` → `sankey_nodes.start_trail[].node`              | **No — backend graph analysis** |
| 30    | Start Trail — Node Type                   | `report_data.json` → `sankey_nodes.start_trail[].node_type`         | **No**                          |
| 31    | Start Trail — Total Debit (in Cr)         | `report_data.json` → `sankey_nodes.start_trail[].total_debit_cr`    | **No**                          |
| 32    | Start Trail — Total Credit (in Cr)        | `report_data.json` → `sankey_nodes.start_trail[].total_credit_cr`   | **No**                          |
| 33    | Start Trail — Total Connections           | `report_data.json` → `sankey_nodes.start_trail[].total_connections` | **No**                          |
| 34-38 | Top 10 Pass Through Nodes (same 5 fields) | `report_data.json` → `sankey_nodes.pass_through[]`                  | **No**                          |
| 39-43 | Top 10 End Trail Nodes (same 5 fields)    | `report_data.json` → `sankey_nodes.end_trail[]`                     | **No**                          |


---

## Summary: What's Available vs. What Backend Must Provide


| Category                                      | Available on FE Now                | Must Come from Backend          |
| --------------------------------------------- | ---------------------------------- | ------------------------------- |
| Case metadata (name, date, file count)        | 3 fields                           | 0                               |
| POI/Beneficiary counts                        | 2 fields (from `poi_summary.json`) | 0                               |
| Case-level stats (inflow, outflow, txn count) | 0                                  | 3 fields                        |
| Transaction types breakdown                   | 0                                  | 4 fields × N types              |
| Important trails                              | 0                                  | 5 fields × N accounts × N types |
| Top 10 beneficiaries                          | 0 (partial names only)             | 9 fields × 10 rows              |
| Sankey node analysis                          | 0                                  | 5 fields × 10 × 3 categories    |


**Total: 5 fields available, 38+ fields must come from backend via `report_data.json**`

---

## Required `report_data.json` Schema (for backend team)

```json
{
  "case_summary": {
    "total_statement_files": 75,
    "total_inflow_cr": 42.23,
    "total_outflow_cr": 52.33,
    "total_beneficiaries": 2000,
    "total_pois": 332,
    "total_transactions": 4000
  },
  "transaction_types": [
    { "type": "Cash", "total_credit_cr": 1.23, "total_debit_cr": 3.23, "transaction_count": 150 },
    { "type": "Cheque", "total_credit_cr": 1.23, "total_debit_cr": null, "transaction_count": 4 },
    { "type": "Sweep", "total_credit_cr": null, "total_debit_cr": 5.0, "transaction_count": null },
    { "type": "ACH", "total_credit_cr": null, "total_debit_cr": 6.0, "transaction_count": null },
    { "type": "UPI", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null },
    { "type": "RTGS", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null },
    { "type": "NEFT", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null },
    { "type": "Remittance", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null },
    { "type": "OD", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null },
    { "type": "EMI", "total_credit_cr": null, "total_debit_cr": null, "transaction_count": null }
  ],
  "important_trails": {
    "Cash": [
      { "account": "Saili Traders", "beneficiaries": "Rahul, Aman, No Name Found", "total_credit_cr": 32, "total_debit_cr": 11, "total_txns": 72 }
    ],
    "Cheque": [
      { "account": "Saili Traders", "beneficiaries": "Rahul, Aman, No Name Found", "total_credit_cr": 32, "total_debit_cr": 11, "total_txns": 72 }
    ],
    "EMI": [],
    "Sweep": [],
    "ACH": []
  },
  "top_beneficiaries": [
    {
      "investigation_score": 1,
      "node": "Rahul",
      "total_debit_cr": 23,
      "total_credit_cr": 12,
      "accounts_present": 19,
      "suspicious_activity": "Multiple Transactions Same Day, Repeated Amount",
      "unique_beneficiary": false,
      "shared_beneficiary": false,
      "hub_beneficiary": true
    },
    {
      "investigation_score": 2,
      "node": "Saili Traders",
      "total_debit_cr": 10,
      "total_credit_cr": 0.9,
      "accounts_present": 55,
      "suspicious_activity": null,
      "unique_beneficiary": false,
      "shared_beneficiary": false,
      "hub_beneficiary": true
    }
  ],
  "sankey_nodes": {
    "start_trail": [
      { "node": "Cash Deposit", "node_type": "Extra", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 12 },
      { "node": "Rahul", "node_type": "Beneficiary", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 8 },
      { "node": "Saili Traders", "node_type": "Statement", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 9 }
    ],
    "pass_through": [
      { "node": "Cash Deposit", "node_type": "Extra", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 12 }
    ],
    "end_trail": [
      { "node": "Cash Deposit", "node_type": "Extra", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 12 }
    ]
  }
}
```

---

## Tech Stack


| Component         | Technology                                                          | Reason                                                                     |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| PDF generation    | **jsPDF + jspdf-autotable**                                         | Lightweight, table-focused, no server dependency. ~100KB gzipped.          |
| Data source       | `report_data.json` extracted from result ZIP                        | Single JSON parse, no heavy Excel parsing                                  |
| Performance       | Synchronous jsPDF (fast for tables) + `requestIdleCallback` wrapper | For 4-page table-heavy PDF, generation takes <200ms — no Web Worker needed |
| PDF preview       | Blob URL in `FilePreviewModal` (existing component)                 | Reuses existing PDF viewer with Eye icon                                   |
| Upload to backend | `upload-result-file` edge function (existing)                       | Sends generated PDF back to backend to include in result ZIP               |


---

## UI Changes

### Current "Download Report" button behavior

Single button → downloads full result ZIP

### New behavior

"Download Report" button becomes a **dropdown** with two options:

1. **Download PDF Report** (new) — downloads the generated PDF. Has an **Eye icon** beside it to preview the PDF in the existing `FilePreviewModal` (same viewer as file preview in File Summary section).
2. **Download All Case Files** — the original ZIP download behavior.

### Implementation

- Use `DropdownMenu` from shadcn/ui (already installed: `@radix-ui/react-dropdown-menu`)
- The dropdown trigger replaces the current `<Button>` and keeps the same styling/theme
- Eye icon click opens `FilePreviewModal` with the PDF blob URL
- PDF is auto-generated during `loadAnalysisFiles` when `report_data.json` is found in the ZIP

### Sending PDF to Backend

After PDF generation, call `upload-result-file` edge function with `file_type: "case_report_pdf"` so the backend can include it in the result ZIP. This happens asynchronously in the background — does not block the UI.

---

## New/Modified Files


| File                                    | Action     | Purpose                                                                                                 |
| --------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `src/lib/reportGenerator.ts`            | **Create** | jsPDF + jspdf-autotable logic: takes `report_data.json` + case metadata → returns PDF Blob              |
| `src/hooks/useReportGeneration.ts`      | **Create** | Hook: manages PDF blob state, generation trigger, upload-to-backend                                     |
| `src/pages/app/CaseAnalysisResults.tsx` | **Modify** | Parse `report_data.json` from ZIP; replace Download button with dropdown; add Eye preview; wire up hook |
| `src/types/reportData.ts`               | **Create** | TypeScript interfaces for `report_data.json` schema                                                     |
| `package.json`                          | **Modify** | Add `jspdf` + `jspdf-autotable`                                                                         |


---

## Aesthetic Suggestions for the PDF

1. **Header bar**: Blue gradient stripe (#3A86FF → #6C63FF) across the top of page 1 with white "Fin Case Analysis Report" text and logo
2. **Table headers**: Dark blue background (#3A86FF) with white text, 10pt bold
3. **Alternating rows**: White / light grey (#F8F9FA) for readability
4. **Currency formatting**: "₹ 42.23 Cr" — consistent across all monetary cells
5. **Empty cells**: Show "—" instead of blank for null/zero values
6. **Page footer**: "Page X of Y | Generated on DD MMM YYYY | Confidential" in grey
7. **Section titles**: Left-aligned, 14pt bold, with a thin blue underline
8. **Beneficiary classification**: Use colored dots — Green (Unique), Orange (Shared), Red (Hub) — rendered as colored circles in the PDF

&nbsp;

## Aesthetic Suggestions for the PDF   
Only execute: 3, 4, 5, 7, 8

---

## Flow Summary

```text
Results Ready
    ↓
loadAnalysisFiles() parses ZIP
    ↓
Finds report_data.json → stores in ParsedAnalysisData
    ↓
useReportGeneration hook generates PDF blob (<200ms)
    ↓
PDF blob available → dropdown CTA enabled
    ↓
User clicks "Download PDF Report" → downloads blob
User clicks Eye → FilePreviewModal opens with PDF
    ↓
Background: upload PDF to backend via upload-result-file
```