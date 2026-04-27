# Simplify Date Range Picker

Remove the two inline calendar widgets from the timeline date range picker, keeping only the native HTML5 date inputs (which already have built-in browser calendar pickers via the calendar icon at the right of each field).

This change applies to **both** the Case Upload page and the Analysis Results page since they share the same `DateRangePicker` component — no separate work needed for the Results page.

## Changes

### `src/components/app/DateRangePicker.tsx`
- Remove the two `<Calendar>` (react-day-picker) instances under the Start Date and End Date inputs.
- Keep the existing native `<Input type="date">` fields for Start and End dates with their current validation (End ≥ Start, `min`/`max` constraints, invalid-range error message).
- Tighten the popover layout: since calendars are gone, the popover becomes much smaller. Stack Start/End vertically on mobile, side-by-side on desktop, with appropriate widths.
- Keep the header ("Select date range" + subtitle), the Clear / Cancel / Save footer, and all save/clear logic unchanged.
- Remove now-unused imports (`Calendar`, `cn` if unused elsewhere in the file, `fromIsoDate`, `toIsoDate` — verify and drop only what becomes dead).

## Out of scope / unchanged
- `CaseUpload.tsx`, `CaseAnalysisResults.tsx`, `FileUploader.tsx`, `ApplyChangesDialog.tsx`, `timelineConfig.ts` — no changes; they consume the picker via the same API (`value`, `onSave`, `trigger`).
- The "Select Timeline" master CTA and per-file calendar-icon popovers continue to work identically — only the popover's internal UI is simplified.
- JSON payload format (`timeline_config.json`) is unchanged.

## Result
Both the master "Select Timeline" popover and the per-file timeline popovers (on Upload and Analysis Results pages) show a compact dialog with just two labeled date input fields, Clear / Cancel / Save buttons, and inline validation.
