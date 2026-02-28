

# Validation: Sample Files vs. Plan Coverage

I analyzed all 8 uploaded files against the planned header detection logic. Here's how each maps to our use cases:

## File-by-File Analysis

| File | Format | Headers Found | Keywords Matched | Plan Status |
|------|--------|--------------|------------------|-------------|
| `abbott_health.xlsx` | Standard XLSX | Row 0: "Capture Date", "DEBIT AMOUNT", "CREDIT AMOUNT", "LEDGER BALANCE...", "Narration" | Debit ✓ (`debit_amount`), Credit ✓ (`credit_amount`), Description ✓ (`narration`), Date ✗ (`capture_date` not in list), Balance ✗ (`ledger_balance_before_the_transaction` not in list) | **Anomaly** — user maps Date + Balance |
| `ABHISHEK_DUBEY.xls` | Legacy XLS | Row 0: "Tran_Date", "Dr_Amt", "Cr_Amt", "Balance", "Narration" | Balance ✓, Description ✓ (`narration`), Date ✗ (`tran_date`), Debit ✗ (`dr_amt`), Credit ✗ (`cr_amt`) | **Anomaly** — user maps 3 columns |
| `ARISTO_PHARMACEUTICALS.csv` | CSV with metadata rows | Row 2 (not row 0): "PostDate", "bal_amt", "Credit", "Debit", "Description" | Date ✓ (`post_date`), Debit ✓, Credit ✓, Description ✓, Balance ✗ (`bal_amt`) | **Anomaly** — user selects row 2, maps bal_amt→Balance |
| `Azad_Medical-HDFC.xlsx` | XLSX | Nearly empty / unusual structure | Insufficient columns | **no-headers** — Save disabled, "No Headers Detected" |
| `Chandauli.csv.xls` | CSV disguised as XLS, single-column | All data comma-separated in one cell per row | Max columns = 1 | **single-column** — Save disabled, "No Headers Detected" |
| `ICORE_STMT.xlsx` | XLSX (processed result file) | Row 0: "debit", "credit", "balance", "date", "transaction_flag"... | Debit ✓, Credit ✓, Balance ✓, Date ✓, Description ✗ (no matching column) | **Anomaly** — user maps description |
| `MarutiEnter.csv` | Standard CSV | Row 0: "Transaction Date", "Description", "Debit/Credit Flag", "Amount", "Running Total" | Date ✓ (`transaction_date`), Description ✓, Debit ✗, Credit ✗, Balance ✗ (`running_total`) | **Anomaly** — user maps 3 columns |
| `Statement_7566362116.xls` | **HTML disguised as XLS** | HTML `<table>` with bank statement data | Format sniffer detects `<html>`, `<table>`, `<tr>` in first 500 bytes → SheetJS parses HTML table → then keyword matching runs | **HTML sniffer → Anomaly or OK** depending on parsed headers |

## Coverage Confirmation

All edge cases from the plan are represented:

- **Standard anomaly (partial keyword match):** `abbott_health.xlsx`, `ABHISHEK_DUBEY.xls`, `ICORE_STMT.xlsx`, `MarutiEnter.csv`
- **Header row not at row 0:** `ARISTO_PHARMACEUTICALS.csv` (headers at row 2 after metadata)
- **Single-column data:** `Chandauli.csv.xls` (Case 2 from requirements)
- **No headers / too few columns:** `Azad_Medical-HDFC.xlsx` (Case 1 from requirements)
- **HTML-disguised Excel:** `Statement_7566362116.xls` (format sniffer case)
- **Legacy .xls binary format:** `ABHISHEK_DUBEY.xls` (SheetJS handles both .xlsx and .xls)

## No Changes Needed to the Plan

The existing plan covers every sample file correctly. The keyword normalization strategy (lowercase, trim, spaces→underscores, exact match) works as intended — files that don't match become anomalies, and users manually map them.

**One observation:** Keywords like `bal_amt`, `dr_amt`, `cr_amt`, `tran_date`, `capture_date`, `running_total` are intentionally NOT in the keyword lists. This is correct behavior — these files should trigger the anomaly flow so users can map them. The keyword list is deliberately conservative to catch edge cases.

**Tech stack confirmed:**
- SheetJS (`xlsx`) — already installed in the project
- Vite Web Workers — supported natively via `new Worker(new URL(...), { type: 'module' })`, no config changes needed
- All existing UI components (Dialog, Select, Input, Button, Badge) available for the modal

The plan is ready for implementation as-is.

