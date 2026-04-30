# Show "Account Name Mismatch" in Merged Tooltips

## Goal

Backend now emits `owner_mismatch_alerts.json` inside the result ZIP whenever an account-owner name on a sub-file does not match the resolved owner of its primary. We need to surface this inside the existing **Merged** hover tooltip in three places:

- Analysis Results page (individual summary)
- Case Preview / Detail page
- Add or Remove Files page (FileUploader)

UI requirement: next to the **eye (preview) icon** of any sub-file row inside the tooltip that appears in the alerts JSON, render small red text **"Account Name Mismatch"**. No other UI changes; no toast, no banner.

Backward compat: if the JSON is absent, or a primary/sub is not listed in `alerts[].extracted_names`, no red text is shown — current behavior preserved.

## Data shape recap

```json
{
  "alerts": [
    {
      "primary_file": "ADIL_429902010084243.xlsx",
      "extracted_names": [
        { "file": "ADIL_...xlsx", "role": "primary", ... },
        { "file": "Chawalas_...xlsx", "role": "sub", ... }
      ]
    }
  ]
}
```

Logic: a sub-file is "mismatched" iff there exists an alert whose `primary_file` matches the parent name AND the sub-file appears in that alert's `extracted_names` with `role: "sub"`. (Subs without a mismatch are simply not listed in `extracted_names`, per spec.)

## Files to change

### 1. New utility — `src/utils/ownerMismatchAlerts.ts`

Tiny pure helpers (case-insensitive base-name compare, consistent with existing merge utils):

```ts
export type OwnerMismatchAlerts = {
  alerts: Array<{
    primary_file: string;
    extracted_names?: Array<{ file: string; role: "primary" | "sub" }>;
  }>;
};

export function isSubMismatched(
  alerts: OwnerMismatchAlerts | null | undefined,
  primaryName: string,
  subName: string,
): boolean;

export function getMismatchedSubsFor(
  alerts: OwnerMismatchAlerts | null | undefined,
  primaryName: string,
): Set<string>; // lowercased sub names
```

Plus a JSZip loader:

```ts
export async function loadOwnerMismatchAlerts(zip: JSZip): Promise<OwnerMismatchAlerts | null>;
```

Returns `null` if the file is missing or unparseable — never throws.

### 2. `src/pages/app/CaseAnalysisResults.tsx`

- Inside the result-ZIP parser (around line ~700, alongside `timeline_config.json` extraction), load `owner_mismatch_alerts.json` into `parsedData.ownerMismatchAlerts`. Add the field to the parsed-data type (line ~105 area).
- In the Merged tooltip render (around line 1987–2010), for each sub `<li>`, compute `mismatched = isSubMismatched(alerts, parentFileName, sub)` and render after the eye `Button`:
  ```tsx
  {mismatched && (
    <span className="text-[10px] text-destructive font-medium ml-1 flex-shrink-0">
      Account Name Mismatch
    </span>
  )}
  ```

### 3. `src/pages/app/CaseDetail.tsx`

This page does not currently parse the result ZIP. Add a lightweight fetch (only when a result is available) using the existing `useSecureDownload().fetchFileForParsing` hook to pull just `owner_mismatch_alerts.json`:

- New state `const [ownerAlerts, setOwnerAlerts] = useState<OwnerMismatchAlerts | null>(null);`
- New effect that runs once when `hasResults` becomes true: fetch the result ZIP, `loadAsync`, then `loadOwnerMismatchAlerts(zip)`. Cache result; ignore failures silently.
- In the Merged tooltip (lines 510–537), inside each sub `<li>` after the existing preview `Button`, render the same red `Account Name Mismatch` span when `isSubMismatched(ownerAlerts, file.file_name, sub)` is true.

### 4. `src/components/app/FileUploader.tsx` + `src/pages/app/CaseUpload.tsx`

The uploader has no direct ZIP access. Pass alerts in as a prop:

- Add to `FileUploaderProps`:
  ```ts
  ownerMismatchAlerts?: OwnerMismatchAlerts | null;
  ```
- In the parent-row Merged tooltip (lines 525–537), inject the red span beside each sub name (no eye icon exists in this tooltip — render it inline at the end of the line):
  ```tsx
  <span className="break-all flex-1">{sub}</span>
  {isSubMismatched(ownerMismatchAlerts, file.name, sub) && (
    <span className="text-[10px] text-destructive font-medium flex-shrink-0">
      Account Name Mismatch
    </span>
  )}
  ```
- In `CaseUpload.tsx → loadPreExistingFiles` (around line 394, where `merge_config.json` is read from the same `zipData`), also call `loadOwnerMismatchAlerts(zipData)` and store on a new `const [ownerMismatchAlerts, setOwnerMismatchAlerts] = useState(...)`. Pass it through to `<FileUploader ownerMismatchAlerts={...} />` (line 1016).

### 5. i18n (optional)

Add `caseDetail.accountNameMismatch: "Account Name Mismatch"` to `en.json` / `hi.json` and use `t(...)` for the three render sites. Hindi translation: `"खाता नाम बेमेल"`.

## Out of scope

- Persisting `owner_mismatch_alerts.json` across reruns. Backend will emit it fresh on every run, so a rerun without mismatches will simply not include the file → tooltip cleanly shows no red text. No DB column, no FE fallback persistence needed.
- Forwarding the alerts JSON into the rerun ZIP (backend regenerates it).
- Any UI outside the existing Merged hover tooltip (no banners, no badges on parent rows).
- Backend changes.

## Backward compatibility

If the result ZIP lacks `owner_mismatch_alerts.json` (older cases, or new cases with no mismatches), all three helpers short-circuit to `false` / empty set → identical to current UI.
