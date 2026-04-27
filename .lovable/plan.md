## Goal

Let users restrict analysis to a date range — overall ("master") and per-file — both at upload time (Case Upload page) and after results are available (Analysis Results page). Selection is sent to the backend as `timeline_config.json` inside the input ZIP.

```json
{
  "master": { "start_date": "2024-01-15", "end_date": "2024-01-22" },
  "per_file": {
    "HDFC_Anmol_Jan2024.pdf": { "start_date": "2024-01-10", "end_date": "2024-01-31" }
  }
}
```

No DB column. JSON is rebuilt from local UI state every time and bundled into the ZIP — same pattern as today's `header_mapping.json` / `merge_config.json`.

---

## 1. New shared component: `DateRangePicker`

`src/components/app/DateRangePicker.tsx`

A reusable popover containing two side-by-side `Calendar`s (shadcn `react-day-picker`):
- **Left** = start date, **Right** = end date.
- Each calendar uses `captionLayout="dropdown-buttons"` with month + year dropdowns (range: 2000 → current year + 1) for fast navigation.
- Above each calendar, a manual `Input type="date"` (ISO `YYYY-MM-DD`) — typing updates the calendar selection, and clicking the calendar updates the input. Two-way bound.
- Validation: end must be ≥ start; if violated, end is highlighted red and Save is disabled.
- Footer: **Cancel** + **Save** (Save disabled until both dates valid).
- Optional **Clear** link to reset to no range.
- Returns `{ start_date: string; end_date: string } | null` via `onSave`.

Props:
```ts
{
  value: { start_date: string; end_date: string } | null;
  onSave: (range: { start_date: string; end_date: string } | null) => void;
  trigger: React.ReactNode;       // the CTA / icon button that opens the popover
  align?: "start" | "end" | "center";
}
```

Implementation notes:
- Use shadcn `Popover` + two `Calendar` components in a single `PopoverContent` (`flex gap-3`, responsive: stack on `< sm`).
- `pointer-events-auto` on each `<Calendar>` per shadcn datepicker guidance.
- Date format on the wire: `YYYY-MM-DD` (matches the example JSON).

---

## 2. CaseUpload page — `src/pages/app/CaseUpload.tsx`

### State
```ts
const [masterTimeline, setMasterTimeline] = useState<TimelineRange | null>(null);
const [perFileTimeline, setPerFileTimeline] = useState<Record<string, TimelineRange>>({}); // keyed by sanitized filename
```

### "Select Timeline" CTA (master)
- Place a secondary outline `Button` immediately to the **left** of the existing **Start Analysis** button.
- Label: `Select Timeline` with `Calendar` icon. If a master range is set, show it inline: `Jan 15 → Jan 22`.
- Wraps `<DateRangePicker value={masterTimeline} onSave={setMasterTimeline} />`.

### Per-file calendar icon
- In the file list (FileUploader rows / row actions), add a small icon-only `Button variant="ghost" size="icon"` with the `Calendar` icon, next to existing per-file actions (preview, delete, merge controls, etc.).
- Visual indicator: when a range is set for that file, the icon is filled / coloured (e.g. `text-primary`) and a tiny `Badge` shows the range below the filename (truncates on small viewports).
- Wraps the same `DateRangePicker`, keyed by the sanitized filename.
- This requires a small prop addition to `FileUploader.tsx`:
  - `getFileTimeline(name) => TimelineRange | null`
  - `onFileTimelineChange(name, range)`
  - Renders the icon when both callbacks are supplied (so it's opt-in and doesn't affect other call sites).

### Building `timeline_config.json` (in `triggerAnalysis`, alongside merge_config — ~line 441–465)
```ts
const hasMaster = !!masterTimeline;
const perFileEntries = Object.entries(perFileTimeline)
  .filter(([name]) => files.some(f => sanitizeFilename(f.name) === name));

if (hasMaster || perFileEntries.length > 0) {
  const timelineConfigJson = {
    master: masterTimeline ?? null,
    per_file: Object.fromEntries(perFileEntries),
  };
  const blob = new Blob([JSON.stringify(timelineConfigJson, null, 2)], { type: "application/json" });
  configFiles.push(new File([blob], "timeline_config.json", { type: "application/json" }));
}
```
Use sanitized filenames as keys so they match what the backend sees.

### Config file isolation
Add `timeline_config.json` to the existing exclusion list (so it's not shown in any frontend file list — see memory `architecture/config-file-isolation`).

---

## 3. Analysis Results page — `src/pages/app/CaseAnalysisResults.tsx`

### State
```ts
const [resultsMasterTimeline, setResultsMasterTimeline] = useState<TimelineRange | null>(null);
const [resultsPerFileTimeline, setResultsPerFileTimeline] = useState<Record<string, TimelineRange>>({});
const hasTimelineChanges = !!resultsMasterTimeline || Object.keys(resultsPerFileTimeline).length > 0;
```

### "Select Timeline" CTA
- Add a secondary outline button to the **left** of the **Download Report** dropdown (around line 1322 in the header `<div className="flex gap-2 ...">`), wrapping `<DateRangePicker>` for the master range.
- Label: `Select Timeline` with `Calendar` icon. Shows current master range when set.

### Per-file calendar icon (per primary file in File Analysis Summary)
- In each summary row's action cluster (next to View Summary / Graph / Transaction Tree CTAs in the per-file section), add a `Calendar` icon button using the same `DateRangePicker`, keyed by `summary.originalFile`.
- Sub-files merged into a primary inherit the primary's range (no separate picker — matches the merge UI rule).

### Apply Changes (shared button)
Update the existing Apply Changes condition:
```ts
const canApply = hasGroupingChanges || hasTimelineChanges;
```
Re-label nothing — the button text stays `Apply Changes`.

In `handleApplyChanges` (line 370+):
- If `hasTimelineChanges`, build `timeline_config.json` with the same master/per_file shape and add it to `newZip`:
  ```ts
  newZip.file("timeline_config.json", JSON.stringify({
    master: resultsMasterTimeline,
    per_file: resultsPerFileTimeline,
  }, null, 2));
  ```
- `grouping_logic.json` is added only when grouping changes exist (current behaviour preserved).
- Continue with the existing `parse-statements` job submission flow.

After successful submit, clear local timeline state alongside the existing grouping reset.

### ApplyChangesDialog text
Extend `ApplyChangesDialog` body to mention timeline changes when present (e.g. "Timeline range will be applied to the analysis"). Single dialog, single confirm.

---

## 4. Shared types & utility

`src/utils/timelineConfig.ts`:
```ts
export type TimelineRange = { start_date: string; end_date: string };
export type TimelineConfig = {
  master: TimelineRange | null;
  per_file: Record<string, TimelineRange>;
};
export function buildTimelineConfigFile(cfg: TimelineConfig): File | null;
export function isValidRange(r: Partial<TimelineRange>): r is TimelineRange;
```
`buildTimelineConfigFile` returns `null` if both master is null and per_file is empty (so the JSON is omitted entirely from the ZIP).

---

## 5. i18n

Add minimal English + Hindi keys:
- `timeline.selectTimeline` = "Select Timeline" / "समयरेखा चुनें"
- `timeline.startDate`, `timeline.endDate`, `timeline.save`, `timeline.cancel`, `timeline.clear`
- `timeline.invalidRange` = "End date must be on or after start date"

---

## 6. UI rules (consistency)

- Buttons: outline secondary variant for "Select Timeline"; icon-only `ghost` button for per-file pickers.
- Calendar trigger displays formatted range `MMM dd → MMM dd, yyyy` (using `date-fns format`) when a range is set; otherwise just the label + icon.
- Manual date `<Input type="date">` is sized `h-9 text-sm`, sits above its calendar.
- Mobile (<640px): stack the two calendars vertically inside the popover (`flex-col`); popover width caps at viewport-12.
- Save button styling matches existing primary CTAs.
- Disabled Save when: missing start, missing end, or end < start.

---

## 7. Files touched

- `src/components/app/DateRangePicker.tsx` (new)
- `src/utils/timelineConfig.ts` (new)
- `src/pages/app/CaseUpload.tsx` (state + Select Timeline CTA + JSON build)
- `src/components/app/FileUploader.tsx` (optional per-row calendar icon props, additive)
- `src/pages/app/CaseAnalysisResults.tsx` (state + Select Timeline CTA + per-file icons + Apply Changes integration + JSON build)
- `src/components/app/ApplyChangesDialog.tsx` (mention timeline if present)
- `src/i18n/locales/en.json`, `src/i18n/locales/hi.json`

## Out of scope

- No DB schema change.
- No backend code change (backend will read `timeline_config.json` from the input ZIP — out of this repo).
- No change to merge UI, grouping UI, or existing CTAs other than appending the new ones.
- Existing flows (Add Files, HITL Review, retry, viewing previous results) are untouched — they don't add a timeline picker, and `timeline_config.json` is only emitted when the user explicitly sets a range.
