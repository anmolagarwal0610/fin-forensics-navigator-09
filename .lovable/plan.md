

# Fix: Fund Traces CTA Not Showing + Edge Function CORS + Page Refresh

## Issue 1: "Transaction Tree" CTA not appearing despite fund_traces.json being in ZIP

**Root Cause**: Console log shows:
```
[Analysis] Failed to parse fund_traces.json: SyntaxError: Unexpected token 'N', ..."on_type": NaN, ... is not valid JSON
```

The backend generates `fund_traces.json` with JavaScript `NaN` values (e.g., `"transaction_type": NaN`). `NaN` is **not valid JSON** — `JSON.parse()` throws, `fundTracesData` stays `null`, and the CTA never renders.

**Fix**: In `CaseAnalysisResults.tsx` line 983, pre-process the raw text to replace `NaN` with `null` before calling `JSON.parse()`:

```typescript
const ftContent = await fundTracesFile.async("text");
// Backend may emit NaN values which are invalid JSON — replace with null
const sanitized = ftContent.replace(/:\s*NaN\b/g, ": null");
parsedData.fundTracesData = JSON.parse(sanitized) as BatchTraceResponse;
```

Same sanitization should be applied in `checkOnDemandCacheZip()` in `src/lib/traceTransaction.ts` (line 75) for ZIP-cached on-demand results.

---

## Issue 2: Edge Function CORS — `Access-Control-Allow-Headers` incomplete

**Root Cause**: The `trace-transaction` edge function's CORS headers only allow:
```
authorization, x-client-info, apikey, content-type
```

But `@supabase/supabase-js` sends additional headers (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`). The browser blocks preflight because these headers aren't listed.

The edge function logs show only boot/shutdown — no actual requests ever reached it, confirming the preflight is being rejected.

**Fix**: In `supabase/functions/trace-transaction/index.ts`, update the CORS headers:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

---

## Issue 3: Page refreshing repeatedly

**Root Cause**: This is the Lovable dev server reconnecting after code changes. The console shows `[vite] server connection lost. Polling for restart...` — this happens when the Vite dev server restarts after file modifications. It's not a bug in the application code; it's the development environment hot-reloading. No code fix needed — it stops once edits stabilize.

---

## Files to modify

| File | Change |
|------|--------|
| `src/pages/app/CaseAnalysisResults.tsx` | Sanitize `NaN` in fund_traces.json text before `JSON.parse()` |
| `src/lib/traceTransaction.ts` | Sanitize `NaN` in ZIP cache results before `JSON.parse()` |
| `supabase/functions/trace-transaction/index.ts` | Add missing Supabase client headers to CORS `Access-Control-Allow-Headers` |

