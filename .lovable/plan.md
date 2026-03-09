# Plan: Case Analysis PDF Report Generation

## Status: ✅ Phase 1 Complete (Frontend Implementation)

### What's been implemented:
1. **`src/types/reportData.ts`** — TypeScript interfaces for `report_data.json` schema
2. **`src/lib/reportGenerator.ts`** — jsPDF + jspdf-autotable PDF generation (4 pages: Overview, Trails, Beneficiaries, Sankey)
3. **`src/hooks/useReportGeneration.ts`** — Hook managing PDF blob state, generation via `requestIdleCallback`
4. **`src/pages/app/CaseAnalysisResults.tsx`** — Modified:
   - Added `reportData` field to `ParsedAnalysisData` interface
   - Parses `report_data.json` from result ZIP during `loadAnalysisFiles`
   - Replaced single "Download Report" button with `DropdownMenu`:
     - **Download PDF Report** (with Eye icon for preview)
     - **Download All Case Files** (original ZIP download)
   - Added `FilePreviewModal` for PDF preview
   - Wired `useReportGeneration` hook

### Dependencies added:
- `jspdf`
- `jspdf-autotable`

### Pending (backend):
- Backend must include `report_data.json` in the result ZIP
- Backend must add generated PDF to result ZIP (FE cannot upload directly — `upload-result-file` requires `BACKEND_API_KEY`)

### PDF Aesthetic choices applied:
- Alternating rows: White / light grey (#F8F9FA)
- Currency formatting: "₹ 42.23 Cr"
- Empty cells: "—" instead of blank
- Section titles: 14pt bold with thin blue underline
- Beneficiary classification: Colored dots — Green (Unique), Orange (Shared), Red (Hub)

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
    { "type": "Cash", "total_credit_cr": 1.23, "total_debit_cr": 3.23, "transaction_count": 150 }
  ],
  "important_trails": {
    "Cash": [
      { "account": "Saili Traders", "beneficiaries": "Rahul, Aman", "total_credit_cr": 32, "total_debit_cr": 11, "total_txns": 72 }
    ]
  },
  "top_beneficiaries": [
    {
      "investigation_score": 1,
      "node": "Rahul",
      "total_debit_cr": 23,
      "total_credit_cr": 12,
      "accounts_present": 19,
      "suspicious_activity": "Multiple Transactions Same Day",
      "unique_beneficiary": false,
      "shared_beneficiary": false,
      "hub_beneficiary": true
    }
  ],
  "sankey_nodes": {
    "start_trail": [
      { "node": "Cash Deposit", "node_type": "Extra", "total_debit_cr": null, "total_credit_cr": null, "total_connections": 12 }
    ],
    "pass_through": [],
    "end_trail": []
  }
}
```
