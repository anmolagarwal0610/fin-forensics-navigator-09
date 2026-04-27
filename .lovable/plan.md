## Goal

When users merge files at upload (drag-and-drop), reflect that hierarchy across the app:
- Hide sub-files from flat lists (Case Detail "Files (n)" and Results "File Analysis Summary").
- Show a small "Merged" label next to the primary file. Hovering it underlines it and reveals a tooltip listing the merged sub-file names, each with an eye icon to preview the original file.

## Persistence: where merge info lives

Today, merge info is only written into `merge_config.json` inside the input ZIP sent to the backend. The frontend doesn't store it anywhere queryable, so the Results / Case Detail pages have no way to know which file was merged into which.

**Approach:** add a single JSON column on `cases` to store the user-defined merge hierarchy at upload time, and read it on view pages. Lightweight, no new tables.

```sql
alter table public.cases
  add column if not exists merge_config jsonb;
```

Shape:
```json
{ "merges": [ { "primary": "FileA.pdf", "sub_files": ["FileB.pdf", "FileC.pdf"] } ] }
```

(`merge_config.json` continues to be sent to the backend exactly as today — no backend change required.)

## Changes

### 1. CaseUpload.tsx — persist merges to `cases.merge_config`

Right where `merge_config.json` is built (around line 441–462), additionally:
- If `primaryToSubs.size > 0`: `update cases set merge_config = {...} where id = caseId`.
- If 0: set it to `null` (clear stale merges on re-analysis).

Use sanitized filenames (same as the JSON) so they match `case_files.file_name` exactly.

### 2. Case Detail page (`src/pages/app/CaseDetail.tsx`) — Files (n) section

Mirror the Results-page treatment of merged files (per Screenshot 2):
- Fetch `case_.merge_config` along with the case (already loaded via `getCaseById`).
- Build a Set of "sub-file names" → exclude them from the rendered grid. The header count `Files (n)` shows only top-level files.
- For each primary file that has sub-files, render a small grey **"Merged"** chip next to the filename:
  - Hover → underline the word + show a Tooltip listing each sub-file name (truncated if long, wrapping otherwise) with an eye icon next to each that opens the existing `FilePreviewModal` flow (reuse `handlePreviewFile`).
- Keep the existing CTAs (Download All Files, Add or Remove Files) and the existing per-file Eye / Download buttons unchanged. "Download All Files" still zips every physical file (primaries + sub-files).
- Make the rendering dynamic: `Files (count of top-level files)`; sub-files are not numbered.

### 3. Results page — File Analysis Summary (`src/pages/app/CaseAnalysisResults.tsx`, ~line 919, 1687–1780)

- Load `merge_config` from the case (it's already on `caseData`).
- When iterating `originalFiles` to build `parsedData.fileSummaries` (line 919), **skip any file whose name appears as a sub-file** in `merge_config`. The numbered list and the count then naturally show only primaries.
- In the summary header row (line 1707 area), if the current `summary.originalFile` is a primary in `merge_config`, render:
  - `originalFile` (existing truncation/tooltip preserved)
  - then a small `text-muted-foreground text-xs` **"Merged"** label inside a `Tooltip`:
    - Trigger: `<span className="cursor-help hover:underline">Merged</span>`
    - Content: vertical list of sub-file names. Each row = filename (truncated to ~30 chars with full-name title) + an eye `Button` that runs the **same signed-URL preview flow already used at line 1727–1778** (`supabase.storage.from('case-files').createSignedUrl(...)`) for the sub-file. Long names wrap to next line; very long ones get truncated with hover-full tooltip.
- All existing CTAs (View Summary, Raw Transactions Download, Summary Download, Graph) are unchanged.

### 4. Shared helper

Add `src/utils/mergeConfig.ts` with:
- `type MergeConfig = { merges: Array<{ primary: string; sub_files: string[] }> }`
- `getSubFileNames(mc): Set<string>`
- `getSubFilesFor(mc, primaryName): string[]`
- Case-insensitive matching against `file_name` (re-use the same normalization style as the strict file-matching memory).

### 5. Types

- Extend `CaseRecord` in `src/api/cases.ts` to include `merge_config: MergeConfig | null`.
- Regenerate `src/integrations/supabase/types.ts` is not needed if we cast; but we'll widen the local type.

## Out of scope / not changing

- No backend change. `merge_config.json` continues to be sent in the input ZIP unchanged.
- No change to drag-merge UX in `FileUploader.tsx`.
- No change to "Add or Remove Files" flow itself (it already re-runs through CaseUpload, which will refresh `cases.merge_config`).
- "Download All Files" continues to download every physical file (sub-files included), since they exist as real `case_files` rows.

## Migration

Single migration:
```sql
alter table public.cases add column if not exists merge_config jsonb;
```

No RLS change needed — existing `cases` policies already cover the new column.
