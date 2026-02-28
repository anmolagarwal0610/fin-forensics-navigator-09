# Plan: Revamp MapColumnsDialog & Header Detection Logic

## Summary of Changes

The MapColumnsDialog gets a complete redesign: Step 1 shows an Excel-like table with checkboxes; Step 2 replaces the old form-based mapping with a table view where dropdowns appear inline on unmatched header columns. Keywords get updated, HTML-disguised files skip anomaly detection, and `no-headers`/`single-column` cases no longer show the CTA.

---

## 1. Update Keywords (`src/utils/headerKeywords.ts`)

Add missing keywords to each category:

- **date**: `transaction_date`(with underscore), `trans_date`, `tran_date`
- **description**: `transaction_details`, `tran_details`, `tran_particular`
- **debit**: `dr_amt`, `withdrawal_amount`(with underscore), `withdrawls`, `amount_withdrawn`
- **credit**: `cr_amt`, `deposit_amount`(with underscore), `amount_deposited`

Also add a new export `matchHeaderRowPartial(row)` that returns `{ matched: Record<RequiredHeader, {value, colIndex}>, unmatched: RequiredHeader[] }` — used by Step 2 to know which columns need dropdowns vs which auto-matched.

## 2. Update Worker (`src/workers/headerDetection.worker.ts`)

- **HTML-disguised files**: If `isHtmlDisguised(buffer)` returns true, immediately return `status: 'ok'` with empty rows — skip anomaly detection entirely. Backend handles these.
- **Embedded-HTML Excel detection**: After parsing, check if any cell in the first 5 rows contains `<img` or `<html` or `style=` patterns. If detected, return `status: 'ok'` — treat as normal, no anomaly.
- **no-headers / single-column**: Keep returning these statuses (used by CaseUpload to decide not to show CTA).

## 3. Redesign MapColumnsDialog (`src/components/app/MapColumnsDialog.tsx`) — Full Rewrite

### Step 1: "Select Header Row"

- **Layout**: Full-width dialog (`max-w-[90vw]`), Excel-like table showing all columns from the parsed rows
- **Table**: Each row renders all cell values in separate `<td>` columns. First column is a checkbox (radio-style — only one selectable). Column headers show "Col A", "Col B", etc.
- **Scrolling**: Native `div` with `overflow-x-auto overflow-y-auto` and `max-h-[55vh]` (no Radix ScrollArea per memory constraint). Shows up to 50 rows, ~15 visible initially.
- **Checkbox behavior**: Clicking selects row, clicking again deselects. Only one row selectable at a time. Selected row gets `bg-primary/10` highlight. No hover effect.
- **Subheading**: "Select the row that contains your column headers."
- **Account Name**: Input field at top, right of the file badge: `Account Name (Optional)` placeholder
- **Close button**: Add explicit `<X>` icon to the dialog's close button (currently missing the icon in `dialog.tsx`), make it `h-5 w-5`

### Step 2: "Map Header Columns"

- **Layout**: Same wide dialog. Shows a table with the selected header row as the first row, followed by up to 25 data rows below it.
- **Header row rendering**: For each column in the header row:
  - Run `matchHeaderRowPartial` to identify which columns matched a keyword
  - **Matched columns**: Show the cell value as-is (plain text, maybe with a subtle green checkmark)
  - **Unmatched columns**: Show a dropdown (`<Select>`) populated with the 5 required fields (Date, Description, Debit, Credit, Balance). Already-selected fields are excluded from other dropdowns.
- **Data rows**: Rendered as plain read-only cells below the header row, giving users context about what data is in each column
- **Subheading**: "Map the highlighted columns to the required fields. Columns already matched are shown as-is."
- **Save enabled**: When all 5 required fields are assigned (either auto-matched or manually selected)
- **Back button**: Returns to Step 1
- **Save button**: Collects the final mapping (merging auto-matched + manual selections)

### Close button fix

In `dialog.tsx`, the `<X>` icon is missing (line 23 is blank between the Close component tags). Add `<X className="h-5 w-5" />` there.

## 4. Update CaseUpload.tsx (`src/pages/app/CaseUpload.tsx`)

- **Remove CTA for `no-headers` and `single-column**`: These statuses no longer trigger the ⚠️ button. Only `anomaly` shows the CTA.
- Line 794: Change condition from `file.headerStatus === 'anomaly' || file.headerStatus === 'no-headers' || file.headerStatus === 'single-column'` to just `file.headerStatus === 'anomaly'`
- The `MapColumnsDialog` no longer needs to handle `no-headers`/`single-column` disabled states since those files won't open it.

## 5. Dialog Close Button (`src/components/ui/dialog.tsx`)

Add the missing `<X>` icon inside the close button on line 23:

```
<X className="h-5 w-5" />
```

---

## Files Changed


| File                                      | Change                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `src/utils/headerKeywords.ts`             | Add new keywords; add `matchHeaderRowPartial` function                        |
| `src/workers/headerDetection.worker.ts`   | Skip HTML-disguised files; detect embedded HTML in cells                      |
| `src/components/app/MapColumnsDialog.tsx` | Full rewrite: Excel-like table Step 1 with checkboxes, inline dropdown Step 2 |
| `src/pages/app/CaseUpload.tsx`            | Remove CTA for no-headers/single-column                                       |
| `src/components/ui/dialog.tsx`            | Add missing X icon to close button                                            |
