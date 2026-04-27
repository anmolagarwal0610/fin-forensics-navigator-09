## Goal

Three small UX/i18n refinements to the Timeline feature:

1. **Move the "Select Timeline" master CTA** out of the action row beside "Start Analysis" and place it on the **right side of the "Selected Files (N)" header** outside the file list section, just opposite to the " **Selected Files (N)" header**.
2. **Add a hover tooltip** on every Timeline CTA (master + per-file, on both Upload and Results pages) reading: *"Select a timeline to run the case on, or choose a custom date range."* — and make sure it does NOT collide with the existing drag-and-drop tooltip that wraps each file card.
3. **Add Hindi translations** for the new CTA labels and tooltip strings, plus the previously hard-coded "Select Timeline" / "Timeline" / "Apply Changes" labels that were never localized.

No backend or JSON-payload changes. Functional behavior unchanged.

---

## Changes

### 1. `src/components/app/FileUploader.tsx` — host the master CTA + fix tooltip overlap

- `FileUploaderProps`: add a new optional prop
  ```ts
  renderListHeaderActions?: () => React.ReactNode;
  ```
- In the `Selected Files ({files.length})` row, change the heading wrapper from a plain `<h3>` to a `flex items-center justify-between` container, and render `renderListHeaderActions?.()` on the right side (so the master "Select Timeline" CTA sits opposite "Selected Files (21)").
- **Tooltip overlap fix** — the per-file Timeline button currently sits inside the card that is itself wrapped by a Radix `<Tooltip>` ("Select, Drag & Drop if you want to merge statements."). Hovering the Timeline icon triggers BOTH tooltips. Fix by:
  - Wrapping `renderFileActions` container with `onPointerEnter`/`onPointerLeave` handlers that don't change anything structurally — instead, the cleanest fix is to render the action cluster with `data-no-card-tooltip` and add `onMouseEnter={(e) => e.stopPropagation()}` on the action-cluster `<span>`. Radix tooltip listens to pointer events on its trigger, so stopping propagation on the inner cluster prevents the outer card-tooltip from re-opening while the user is interacting with action buttons.
  - Additionally, move the per-file Timeline `<Button>`'s native `title=` attribute removal (replaced by a real Radix `<Tooltip>` from the parent — see step 2) so the browser's default title bubble doesn't double-up either.

### 2. `src/pages/app/CaseUpload.tsx` — relocate master CTA + add tooltip on every Timeline CTA

- Move the `<DateRangePicker>` block currently rendered right before the `Start Analysis` button into a new `renderListHeaderActions` callback passed to `<FileUploader>`. The Save-for-Later + Start Analysis buttons stay where they are.
- Wrap the master CTA's `<Button>` trigger with `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent side="bottom">{t('timeline.tooltip')}</TooltipContent></Tooltip>` (TooltipProvider already imported).
- Wrap each per-file Timeline `<Button>` trigger inside `renderFileActions` with the same tooltip. Remove the native `title=` attribute on those buttons (replaced by the Radix tooltip).
- Replace the hardcoded `"Select Timeline"` / `"Timeline"` strings with `t('timeline.selectTimeline')` / `t('timeline.short')`.

### 3. `src/pages/app/CaseAnalysisResults.tsx` — same tooltip + i18n on Results page

- Wrap both the master `<DateRangePicker>` trigger (line ~1343) and the per-file picker triggers (line ~1925) with the same Radix `<Tooltip>` carrying `t('timeline.tooltip')`. (TooltipProvider is already used elsewhere on this page.)
- Replace hardcoded `"Select Timeline"`, `"Timeline"`, and `"Apply Changes"` strings with i18n keys (`t('timeline.selectTimeline')`, `t('timeline.short')`, `t('timeline.applyChanges')`).
- Remove the per-file button's native `title=` attribute (replaced by Radix tooltip).

### 4. `src/i18n/locales/en.json` and `src/i18n/locales/hi.json` — new namespace

Add a top-level `"timeline"` namespace to both files:

**English:**

```json
"timeline": {
  "selectTimeline": "Select Timeline",
  "short": "Timeline",
  "tooltip": "Select a timeline to run the case on, or choose a custom date range.",
  "applyChanges": "Apply Changes"
}
```

**Hindi:**

```json
"timeline": {
  "selectTimeline": "समयरेखा चुनें",
  "short": "समयरेखा",
  "tooltip": "केस चलाने के लिए एक समयरेखा चुनें, या कस्टम तिथि सीमा चुनें।",
  "applyChanges": "बदलाव लागू करें"
}
```

(Existing `caseDetail.timeline` key is left untouched — used by a different feature.)

---

## Out of scope / unchanged

- `DateRangePicker.tsx` — no internal changes.
- `timelineConfig.ts` and the `timeline_config.json` payload — unchanged.
- `ApplyChangesDialog.tsx` — its already-localized labels are unaffected; only the trigger button on `CaseAnalysisResults.tsx` swaps to `t('timeline.applyChanges')`.
- The drag-and-drop "Select, Drag & Drop if you want to merge statements." tooltip — kept as-is; we only stop event propagation from the action cluster so it no longer fires while the user hovers the Timeline / X / Unmerge buttons.

---

## Result

- Master "Select Timeline" CTA appears on the same row as "Selected Files (21)", aligned right (matches the screenshot location).
- Hovering any Timeline button (master or per-file, Upload or Results page) shows the new tooltip in EN/HI without the merge-tooltip flickering on top of it.
- All Timeline-related labels (master CTA, per-file label, Apply Changes) render correctly in Hindi when language is switched.