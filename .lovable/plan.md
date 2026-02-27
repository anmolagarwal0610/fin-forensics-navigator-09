

# Plan: Fund Trail Save/Load Refactor, Admin Search Fix, Result ZIP Retention

## 1. Fund Trail Save/Load — Switch to `getFundTrailViewData()` / `loadFundTrailView()`

**Current approach:** Regex-based HTML injection for positions/filters before rendering, plus a `postMessage`-based save override. This is fragile and only handles `positions` and `filters`.

**New approach:** The embedded HTML now exposes `getFundTrailViewData()` and `loadFundTrailView(data)` on the iframe's `contentWindow`. The save data is a single rich JSON blob (with groups, dissolvedGroups, memberMappings, nodeStates, modifiedLinks, etc.).

### Database Migration
Add a `view_data` jsonb column to `fund_trail_views`:
```sql
ALTER TABLE public.fund_trail_views ADD COLUMN view_data jsonb;
```

### File: `src/components/app/FundTrailViewer.tsx`

**Save flow changes:**
- Remove the injected `<script>` that overrides `saveView` with `postMessage`
- Remove the `handleMessage` / `window.addEventListener("message", ...)` logic
- Add a "Save View" button to the toolbar
- On click: call `iframeRef.current.contentWindow.getFundTrailViewData()`, then upsert the returned JSON into `fund_trail_views.view_data`

**Load flow changes:**
- Remove all regex-based HTML modification (`modifiedHtml` useMemo that replaces `savedPositions`, `hasSavedView`, `selectedOwners`, `topN`)
- Pass raw `htmlContent` directly to `srcDoc`
- After iframe loads (`onLoad` event), call `iframeRef.current.contentWindow.loadFundTrailView(savedViewData)` if saved data exists
- Query now selects `view_data` instead of `positions, filters`

**Shared views:** Check `ShareFundTrailDialog` — shared views should also use `view_data` for read-only rendering via `loadFundTrailView`.

---

## 2. Admin Users Search — Client-Side Filtering

**Current:** `searchQuery` is part of the react-query key. Every keystroke changes the key, triggering a new edge function invocation (slow network call per character).

### File: `src/hooks/useAdminUsers.ts`
- Remove `searchQuery` from the query key and function parameter
- Query key becomes `['admin-users']` (load once)
- Return all users; no client-side filtering in the hook

### File: `src/pages/app/AdminUsers.tsx`
- Call `useAdminUsers()` with no argument (loads full list once)
- Apply `searchQuery` filter locally via `useMemo` on the returned `users` array
- Search is instant with no network calls per keystroke

---

## 3. Result ZIP Retention — Keep Only 2 Latest Per Case

**Current:** Step 4 in `cleanup-storage` deletes ALL `is_current = false` result files. This means only 1 file (the current one) is ever kept.

**Requirement:** Keep the 2 most recent result ZIPs per case, delete the rest.

### File: `supabase/functions/cleanup-storage/index.ts`

**Replace Step 4** logic:
- Query all `result_files` grouped by `case_id`, ordered by `created_at DESC`
- For each case, keep the 2 newest records (regardless of `is_current` flag)
- Delete storage files and DB records for all others
- This handles cases that have been re-run many times

```text
For each case_id:
  files = SELECT * FROM result_files WHERE case_id = X ORDER BY created_at DESC
  keep = files[0..1]  (2 newest)
  delete = files[2..]  (everything else)
  -> remove from storage bucket
  -> delete from result_files table
```

### Cron Job Setup
Run a SQL insert (via Supabase SQL editor, not migration) to schedule the cleanup at midnight daily:
```sql
SELECT cron.schedule(
  'nightly-storage-cleanup',
  '0 0 * * *',
  $$ SELECT net.http_post(
    url:='https://rwzpffsaivgjuuthvkfa.supabase.co/functions/v1/cleanup-storage',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id; $$
);
```
Will provide the exact SQL with the anon key for the user to run.

---

## Summary

| File | Change |
|------|--------|
| Migration | Add `view_data` jsonb column to `fund_trail_views` |
| `src/components/app/FundTrailViewer.tsx` | Replace regex injection + postMessage with `getFundTrailViewData()` / `loadFundTrailView()` API; add Save button |
| `src/hooks/useAdminUsers.ts` | Remove search param from query; load all users once |
| `src/pages/app/AdminUsers.tsx` | Filter users client-side with `useMemo` |
| `supabase/functions/cleanup-storage/index.ts` | Step 4: keep 2 latest result ZIPs per case instead of only current |
| Cron job SQL | Schedule cleanup at midnight daily |

