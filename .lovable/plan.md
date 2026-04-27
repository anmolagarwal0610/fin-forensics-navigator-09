## Refinements to file merging UX

### 1. Click-to-toggle multi-select (no Ctrl/Cmd needed)

In `FileUploader.tsx` `toggleSelect`, treat every plain click as a toggle: if name is in the set, remove it; otherwise add it. Drop the Ctrl/Cmd branch and the "single-selected → clear" special case. Background click on the list container clears the selection.

### 2. Tooltip visible on every row (not just first)

Replace the per-first-row `HoverCard` wrapper with a `Tooltip` (from `@/components/ui/tooltip`, already imported in CaseUpload) wrapping every row card. Content: *"Select, Drag & Drop if you want to merge statements."* Use `TooltipProvider` once around the rows list with `delayDuration={300}`. Remove the `HoverCard` import.

### 3. Rename JSON file to `merge_config.json`

In `src/pages/app/CaseUpload.tsx` (lines ~441–461), change:

- File name from `merges.json` → `merge_config.json`
- Console log message accordingly
JSON shape stays the same:

```json
{ "merges": [ { "primary": "...", "sub_files": ["..."] } ] }
```

### 4. Marquee (rubber-band) selection like desktop folders

Add a marquee selection layer wrapping the rows list in `FileUploader.tsx`:

- Wrap `rows.map(...)` in a `<div ref={listRef} className="relative" onMouseDown={...}>`.
- On `mousedown` on the wrapper background (not on a card or button/input): record start point in list-relative coords, set `isMarqueeing=true`, capture pointer.
- On `mousemove`: compute the rectangle (min/max of start vs current), render an absolutely positioned overlay div with `border border-primary bg-primary/10 pointer-events-none`.
- During movement, intersect the marquee rect with each row's `getBoundingClientRect()` (offset by the wrapper's rect). For every intersecting row, add its filename to `selected`. (Additive; preserves prior selection if user holds the mouse — and since plain click already toggles, holding mouse + dragging behaves naturally.)
- On `mouseup`: clear marquee state. If the gesture was a tiny drag (<4px), let the underlying click handler run as a normal toggle; otherwise suppress the click that follows by checking a `wasMarqueeingRef`.
- Skip starting marquee if `mousedown.target.closest('[data-file-row]')` exists, so dragging files for merge still works. Each row card gets `data-file-row` and remains `draggable`.

Edge cases handled:

- Marquee never starts on Card/Button/Input → drag-to-merge and password input remain functional.
- Selection is purely additive during a marquee; starting a marquee on empty space without modifier clears prior selection first (matches desktop behavior).
- Sub-files are selectable too, same as before.

Do what they do in google drive to select multiple files.

### Files changed

- `src/components/app/FileUploader.tsx` — selection logic, tooltip per row, marquee layer.
- `src/pages/app/CaseUpload.tsx` — rename `merges.json` → `merge_config.json`.

No backend or other component changes.