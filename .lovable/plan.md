# Plan: Merge Statements via Drag & Drop on Upload Page

Let users group uploaded statements into a "primary + sub-files" hierarchy from the Upload Files for Analysis page, then send the resulting merge instructions to the backend as a config file at "Start Analysis" time.

## UX behavior

1. **Selection** — Click a file row to select it. Selected rows get a subtle accent ring/background using the existing `accent` / `primary` theme tokens (matches the dropzone active state). Multi-select with Ctrl/Cmd-click and Shift-click.
2. **Drag & drop merge** — Drag any file (or a multi-selection) onto another file row. The dragged file(s) become **sub-files** under the target (which becomes the **primary**). Sub-files render indented beneath the parent with slightly smaller font and a subtle left border.
3. **Hover discovery hint** — On the **first** (top) statement row, show a Radix `HoverCard`/`Tooltip` with the text: *"Select, Drag & Drop if you want to merge statements."* Trigger on hover, dismissible.
4. **Unmerge CTA** — Each sub-file gets a small, very subtle "Unmerge" text/button (muted-foreground color, `text-xs`, ghost variant) placed just to the **left of the existing X (remove)** button. Click → file is detached and re-appears as a top-level row in its original position.
5. **Remove (X)** — Unchanged. Removes the file from the case entirely. If a primary is removed, its sub-files are promoted back to top-level. If a sub-file is removed, it's just removed.
6. **All existing per-file UI is preserved** — page count, password lock badge, "Map File Columns" CTA, header-mapped badge, pre-existing badge, password input panel — all render identically on both primaries and sub-files.
7. **Constraints**
   - A sub-file cannot itself be a primary (one-level hierarchy only). Dropping onto a sub-file targets its parent.
   - A primary cannot be dragged into another primary while it has sub-files (must unmerge first) — prevents accidental nesting.
   - Pre-existing files (Add Files mode) can participate in merges with new files; behavior is symmetric.

## Visual sketch

```text
┌─ Selected Files (5) ────────────────────────────┐
│ ▸ HDFC_Anmol_Jan2024.pdf   12 pages    [×]      │  ← primary (hover hint here)
│   └ HDFC_Anmol_Feb2024.pdf 10 pages  unmerge [×]│  ← sub-file (smaller, indented)
│   └ HDFC_Anmol_Mar2024.pdf  9 pages  unmerge [×]│
│ ▸ ICICI_Statement.pdf       8 pages    [×]      │
│ ▸ SBI_Bonus.xlsx          Map Cols     [×]      │
└─────────────────────────────────────────────────┘
```

## Data model

Extend `FileItem` (frontend-only — no DB changes) with:

```ts
interface FileItem {
  ...existing fields...
  mergeParentName?: string;  // if set, this file is a sub-file of the named primary
}
```

Selection state lives in `CaseUpload.tsx` as `selectedNames: Set<string>`. Merge state is fully derived from the `mergeParentName` field on each `FileItem` — no separate `groups` array needed, which keeps add/remove/unmerge flows trivial.

## JSON sent to backend

When the user clicks **Start Analysis**, build:

```json
{
  "merges": [
    { "primary": "HDFC_Anmol_Jan2024.pdf",
      "sub_files": ["HDFC_Anmol_Feb2024.pdf", "HDFC_Anmol_Mar2024.pdf"] }
  ]
}
```

Filenames use the **sanitized** names (same as `header_mapping.json`). Only primaries with at least one sub-file are included. If `merges` is empty, the file is omitted entirely.

Wrap as `merges.json` and push it into the existing `configFiles: File[]` array in `handleStartAnalysis` — same mechanism currently used for `grouping_logic.json` and `header_mapping.json`. No changes to `startJob`, `uploadInput`, or backend contract beyond adding the new config file to the ZIP.

## Files to change

| File | Change |
|------|--------|
| `src/components/app/FileUploader.tsx` | Add: HTML5 drag-and-drop on file rows; selection state via prop callbacks; render sub-files indented with smaller font; "Unmerge" button next to X; HoverCard hint on first row. Sort/render order: each primary followed by its sub-files. |
| `src/pages/app/CaseUpload.tsx` | Extend `FileItem` with `mergeParentName`. Add `selectedNames` state + handlers (`onToggleSelect`, `onMerge(targets, primary)`, `onUnmerge(name)`). On X-remove of a primary, clear `mergeParentName` on its children. In `handleStartAnalysis`, build `merges.json` from current state and push into `configFiles`. |
| (no other files) | No DB, no edge function, no `startJob`/`uploadInput` changes. |

## Edge cases handled

- Removing a primary promotes its sub-files back to top-level (no orphaning).
- Unmerging the last sub-file leaves the (former) primary as a normal top-level row.
- Dropping a file onto itself is a no-op.
- Drag preview uses native HTML5 drag image; drop targets get a subtle ring while a drag is in progress.
- Selection is cleared after a successful merge.
- Order: sub-files render in the order they were merged in; the primary keeps its original position.

## Out of scope

- No backend changes (FE only sends the JSON; backend parses it).
- No persistence of merge state in DB / Save-for-Later (merges are reset if the user navigates away — same as selection state today).
- No nested merges (one-level hierarchy).
