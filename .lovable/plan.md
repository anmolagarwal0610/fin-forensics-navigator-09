# Plan

## 1. Remove per-file Timeline CTA from File Analysis Summary (Results page)

In `src/pages/app/CaseAnalysisResults.tsx`, remove the inline per-file `DateRangePicker` block (lines ~1931–1979) that renders the `CalendarClock` "Timeline" button next to each file heading.

The master/global Timeline picker at the top of the Results page remains untouched. Per-file timeline overrides on the Results page are no longer offered (Case Upload page keeps both master + per-file as before).

Cleanup of now-unused state/logic in `CaseAnalysisResults.tsx`:
- Remove `resultsPerFileTimeline` state and all setters/usages.
- In `hasTimelineChanges`, drop the per-file check (master only).
- In the Apply Changes payload (around lines 467–471 and 2224–2225), drop `perFile` entries — only the master range gets sent.
- In the post-apply reset (line ~498), drop `setResultsPerFileTimeline({})`.
- Drop now-unused `CalendarClock` import if no other usage remains.

## 2. Numbered list in "Merged files" hover tooltip

Update both tooltips that list merged sub-files so each entry shows its index:

- `src/pages/app/CaseAnalysisResults.tsx` (~line 1909): change `mergedSubs.map((sub) => …)` to `mergedSubs.map((sub, idx) => …)` and prepend `{idx + 1}.` (font-mono, muted, fixed-width) before the filename.
- `src/pages/app/CaseDetail.tsx` (~line 512): same change for consistency, so the numbered format appears wherever the "Merged" tag is shown.

Format example inside each `<li>`:
```
1.  60176162758_TSD.xlsx           👁
2.  ADIL_429902010084243.xlsx      👁
3.  Bikram_8086778890_…xlsx        👁
```

No i18n strings change (the tooltip header "Merged files:" and number prefix are language-agnostic).

## Files to be modified
- `src/pages/app/CaseAnalysisResults.tsx`
- `src/pages/app/CaseDetail.tsx`
