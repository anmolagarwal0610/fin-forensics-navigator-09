

# Plan: Mismatch Alert Improvements (3 Changes)

## Change 1: Detect AMOUNT_MISMATCH alongside MISMATCH

**`src/pages/app/CaseAnalysisResults.tsx`** (line 490):
- Change the check from `cellVal === "mismatch"` to `cellVal === "mismatch" || cellVal === "amount_mismatch"`

## Change 2: Attach PDF file alongside raw xlsx

**`src/pages/app/CaseAnalysisResults.tsx`** (mismatch useEffect, ~line 465-516):
- After detecting a mismatch in `raw_transactions_{base}.xlsx`, derive the original PDF name (`{base}.pdf`)
- Look up the matching `CaseFileRecord` from the `files` array (already available in scope)
- If the original file has a `file_url`, download it as base64 and include as `pdf_file_base64` + `pdf_file_name` in the POST body
- If no PDF found (e.g. the input was xlsx/csv), skip the PDF attachment gracefully

**`supabase/functions/send-mismatch-alert/index.ts`**:
- Accept optional `pdf_file_base64` and `pdf_file_name` fields
- If present, add a second entry to the `attachments` array in the Resend API call

## Change 3: Send alert only once per result (not on every View Results click)

**`src/pages/app/CaseAnalysisResults.tsx`**:
- Replace the `useRef` approach (which resets on remount) with `localStorage`
- Key: `mismatch_checked_${caseId}_${case_.updated_at}` — this naturally invalidates when new results arrive
- Before running the scan, check localStorage. If key exists, skip entirely
- After scan completes (whether mismatch found or not), set the key in localStorage
- This ensures the scan runs exactly once per result version, regardless of how many times the user opens the results page

## Files

| File | Change |
|------|--------|
| `src/pages/app/CaseAnalysisResults.tsx` | Add AMOUNT_MISMATCH detection, attach PDF, use localStorage for one-time check |
| `supabase/functions/send-mismatch-alert/index.ts` | Accept optional PDF attachment fields |

