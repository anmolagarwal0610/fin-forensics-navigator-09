

# Plan: Source File Column, PDF Report Query, and Footer Socials

## Task 1: Add "Source File" column to non-POI Beneficiary Transactions Dialog

The raw transaction Excel files already contain a `source_file` column. The issue is that:
1. `TransactionRow` interface lacks `source_file`
2. Neither ExcelViewer nor SummaryTableViewer populate it when building `TransactionRow[]`
3. `BeneficiaryTransactionsDialog` doesn't render it

### Changes

**`src/components/app/BeneficiaryTransactionsDialog.tsx`**
- Add `source_file: string` to `TransactionRow` interface
- Add `Source File` column header at the end of the table (after Transaction Type)
- Render `source_file` value in each row, styled as `text-muted-foreground` like in POI dialog
- Add `Source File` to CSV download headers and rows
- Increase `min-w` from `850px` to `1000px` to accommodate the new column
- Adjust column widths proportionally

**`src/components/app/ExcelViewer.tsx`** (lines 341-349)
- Add `source_file: String(txRow[colMap['source_file']]?.value || '')` to the non-POI `TransactionRow` construction

**`src/components/app/SummaryTableViewer.tsx`** (lines 337-345)
- Add `source_file: String(row[columnMap['source_file']]?.value || '')` to the `TransactionRow` construction

---

## Query 5: PDF Report "Download PDF Report" disabled + Eye icon

**Why disabled**: The `Download PDF Report` item is `disabled={!isReportReady}`. `isReportReady` is `true` only when `pdfBlob` exists, which requires `reportData` (parsed from `report_data.json` in the ZIP). Since the backend hasn't added `report_data.json` to the result ZIP yet, `reportData` is `null`, so the button stays disabled. This is expected — it will auto-enable once the backend includes `report_data.json`.

**Eye icon**: It IS implemented (lines 1132-1142). It only renders when `isReportReady && reportPdfUrl` — so it's hidden because the PDF hasn't been generated (same reason as above). Both will work automatically once `report_data.json` is present.

No code changes needed for this query.

---

## Task 2: Add social links to Footer

**`src/components/layout/Footer.tsx`**
- Below the description paragraph, add a "Socials:" label with X (Twitter) and LinkedIn icons
- Use lucide-react `Twitter` icon (or custom X icon via inline SVG) and `Linkedin` icon
- Links: X → `https://x.com/finnavigatorai`, LinkedIn → `https://www.linkedin.com/company/finnavigatorai/`
- Open in new tab with `target="_blank" rel="noopener noreferrer"`
- Style: `text-muted-foreground hover:text-foreground` consistent with theme

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/app/BeneficiaryTransactionsDialog.tsx` | Add `source_file` to interface, table header, rows, CSV |
| `src/components/app/ExcelViewer.tsx` | Add `source_file` to TransactionRow construction |
| `src/components/app/SummaryTableViewer.tsx` | Add `source_file` to TransactionRow construction |
| `src/components/layout/Footer.tsx` | Add social icons below company description |

