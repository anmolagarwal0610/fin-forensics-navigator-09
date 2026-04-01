# Plan: Map Columns Dialog Enhancements (3 Changes)

## Change 1: Dummy Column Addition (Balance & Date)

`**src/components/app/MapColumnsDialog.tsx**`:

### State & Logic

- Add state: `dummyColumns: { balance: boolean; date: boolean }` — tracks which dummy columns are added
- When a dummy column is added, append it to the working rows data (a new local copy of `rows` with the extra column at the end)
- **Balance**: Appends column header "Balance" with all data rows set to `0`
- **Date**: Appends column header "Transaction Date" with all data rows set to today's date (formatted as `DD-MM-YYYY`)
- When a dummy column is added, auto-scroll the table container to the far right using `scrollLeft = scrollWidth`
- Each dummy column automatically gets marked as auto-matched (since the header name will match the keywords)
- Dummy columns can be removed via an ✕ button in the column header — removing resets the state and re-enables the CTA

### CTAs

- Placed below the warning alert section in Step 2
- Two buttons: "Add Balance Column" and "Add Date Column"
- Only shown when the respective header (`balance`/`date`) is in the `unmatched` list
- Disabled when the corresponding dummy column is already added
- Styled as `variant="outline"` with a `Plus` icon

### JSON Update

- The `onSave` callback already builds `columnMapping` from the header row — since dummy columns are appended to the rows, they'll naturally appear in the mapping
- Add a new field `dummyColumns` to the save data so `CaseUpload.tsx` can include it in `header_mapping.json`:
  ```json
  {
    "files_config": [{
      "fileName": "...",
      "hasManualMapping": true,
      "headerRowIndex": 2,
      "columnMapping": { "date": "Transaction Date", "balance": "Balance", ... },
      "dummyColumns": {
        "balance": { "header": "Balance", "defaultValue": "0" },
        "date": { "header": "Transaction Date", "defaultValue": "01-04-2026" }
      }
    }]
  }
  ```

### Files

- `src/components/app/MapColumnsDialog.tsx` — Add dummy column logic, CTAs, remove buttons
- `src/pages/app/CaseUpload.tsx` — Pass `dummyColumns` through to `header_mapping.json`

---

## Change 2: Redesigned Mapping Row (Step 2 Table Layout)

**Current**: The selected header row itself contains dropdowns and green ticks inline.

**New layout**:

- **Row 1 (new "Mapping" row)**: A new sticky row at the top of `<thead>`, above the column labels row. Contains:
  - For **all** columns: A `<Select>` dropdown with default placeholder "Select Header"
  - For auto-matched columns: The dropdown is pre-populated with the matched header and shows a green `CheckCircle2` icon next to it (user can still override)
  - For manually mapped columns: Shows the selected mapping
  - For unmatched empty columns: Dropdown with "Select Header" placeholder
- **Row 2**: Column labels (A, B, C...) — unchanged
- **Header row (in tbody)**: The original selected header row is rendered with a light grey background (`bg-muted/30`) to visually distinguish it, but **no** dropdowns or highlights — just plain text

This gives all columns dropdowns (per user's preference) while keeping auto-detected ones pre-filled.

---

## Change 3: Hover Tooltip on Step 1 Checkbox Column

`**src/components/app/MapColumnsDialog.tsx**` — Step 1 table:

- On the `✓` column header (`<th>`), add a tooltip/popover that:
  - Appears automatically when Step 1 renders (using a `useEffect` + state `showHint: true`)
  - Shows text: "Please select the header row."
  - Has a slightly grey background matching the theme (`bg-muted`)
  - Auto-dismisses after 25 seconds OR when the user selects any header row (whichever comes first)
  - Implemented as an absolutely-positioned div (not a radix tooltip, since those need hover) styled as a floating hint near the `✓` header

---

## Files to Modify


| File                                      | Change                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `src/components/app/MapColumnsDialog.tsx` | All 3 changes: dummy columns, redesigned mapping row, Step 1 hint      |
| `src/pages/app/CaseUpload.tsx`            | Include `dummyColumns` in `header_mapping.json` output (~line 418-431) |
