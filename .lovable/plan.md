
# Plan: UI-Only Stuck-Processing Email Alert (3h+)

Detect cases stuck in `Processing` for ≥3 hours from the **frontend** and fire an email to `help@finnavigatorai.com`. No DB schema changes, no `stale_alert_sent` writes — only an email send.

## How it works

1. Add a lightweight hook `useStaleProcessingWatcher` mounted once inside `AppLayout` (so it runs on any authenticated app page).
2. Hook queries the user's own cases where `status = 'Processing'` and `updated_at < now() - 3h`.
3. For each stuck case, check a `localStorage` key `stale-alert-sent:<caseId>` — if absent, call an edge function to send the alert, then write the key. This prevents re-sending on every render/refresh (best-effort, per-browser).
4. Re-check every 15 minutes via `setInterval` + on window focus.

## Email sender

Reuse the existing `send-mismatch-alert` pattern (direct fetch to Resend, purple-gradient template, `help@finnavigatorai.com` recipient). Create a tiny new edge function `send-stale-processing-alert` that:
- Accepts `{ caseId, caseName, hoursStuck, fileCount, processingStarted }` from the authenticated client.
- Validates JWT (`supabase.auth.getClaims`) — only the case's creator or an admin can trigger.
- Sends the email via Resend with the same visual language as `check-stale-processing` (purple header, warning box, details box).

No DB writes. No `stale_alert_sent` toggling. No cron. Pure on-demand send when a logged-in user views the app and has a stuck case.

## Files

| File | Change |
|------|--------|
| `src/hooks/useStaleProcessingWatcher.ts` | NEW — query stuck cases, dedupe via localStorage, invoke edge function |
| `src/components/app/AppLayout.tsx` | Mount the hook once |
| `supabase/functions/send-stale-processing-alert/index.ts` | NEW — JWT-verified Resend sender, mirrors existing email template |
| `supabase/config.toml` | Register new function with `verify_jwt = true` |

## Limits & trade-offs

- Alert fires only when a logged-in user opens the app — won't catch cases of users who never return. Acceptable per request ("UI only").
- LocalStorage dedupe is per-browser; same user on a new device may resend once. Acceptable.
- No interaction with the broken DB trigger / `stale_alert_sent` column — fully decoupled from "cases fix 8".
