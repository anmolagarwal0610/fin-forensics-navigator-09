

# Plan: Silent Mismatch Detection & Email Alert

## Overview
After analysis results load, silently scan raw transaction files for "mismatch" in the `transaction_flag` column. If found, send the raw file + metadata to `help@finnavigatorai.com` via a new Edge Function. Zero user-visible feedback.

## Frontend Change

**`src/pages/app/CaseAnalysisResults.tsx`** — Add a `useEffect` after `analysisData` is available:

- Use a `useRef` flag to ensure it runs only once per result load
- `setTimeout` with 7-second delay to avoid impacting initial render
- Iterate all `raw_transactions_*.xlsx` files from `analysisData.zipData`
- For each file: parse with `parseExcelFile`, find column index where header row contains `transaction_flag` (case-insensitive)
- If any row in that column contains `mismatch` (case-insensitive), extract the file as base64 and POST to the edge function
- All operations wrapped in try/catch with **no** console.log, no toast, no user feedback
- Sends: `case_name`, `user_email`, `file_name`, `file_base64` (raw xlsx as base64)

## Edge Function

**Create `supabase/functions/send-mismatch-alert/index.ts`**:

- CORS headers (standard pattern)
- Validates JWT from authorization header using Supabase client
- Accepts POST with `{ case_name, user_email, file_name, file_base64 }`
- Sends email via Resend API (same pattern as `send-contact-email`)
  - From: `help@finnavigatorai.com`
  - To: `help@finnavigatorai.com`
  - Subject: `Mismatch Alert: {case_name}`
  - Body: user email, case name, file name
  - Attachment: the raw xlsx file (base64 via Resend's `attachments` field)
- Uses existing `RESEND_API_KEY` secret

**Update `supabase/config.toml`**:
- Add `[functions.send-mismatch-alert]` with `verify_jwt = true`

## Files

| File | Change |
|------|--------|
| `src/pages/app/CaseAnalysisResults.tsx` | Add silent mismatch scan `useEffect` with 7s delay |
| `supabase/functions/send-mismatch-alert/index.ts` | New edge function to email mismatch alert with attachment |
| `supabase/config.toml` | Add function config entry |

