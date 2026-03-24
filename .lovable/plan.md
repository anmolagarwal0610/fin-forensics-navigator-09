# Fix: Mismatch Alert — PDF Not Attaching + Duplicate Emails

## Issue 1: PDF file not attached

**Root Cause**: `file_url` in the `case_files` table stores a **relative storage path** like `15589412-.../b43053a0-.../MAHFOOZ.pdf`, not a full URL. The current code does `fetch(matchingFile.file_url)` which makes a relative HTTP request against the preview domain, returning a 404 (visible in network logs: `GET 15589412-.../MAHFOOZ.pdf → 404`).

**Fix**: Instead of `fetch(matchingFile.file_url)`, use `supabase.storage.from('case-files').download(matchingFile.file_url)` to download the file through the Supabase SDK, which correctly resolves the storage path.

In `CaseAnalysisResults.tsx` (~lines 515-524), replace:

```typescript
const pdfResp = await fetch(matchingFile.file_url);
if (pdfResp.ok) {
  const pdfBuf = await pdfResp.arrayBuffer();
  pdfFileBase64 = btoa(
    new Uint8Array(pdfBuf).reduce((s, b) => s + String.fromCharCode(b), "")
  );
  pdfFileName = matchingFile.file_name;
}
```

With:

```typescript
const { data: pdfBlob } = await supabase.storage
  .from('case-files')
  .download(matchingFile.file_url);
if (pdfBlob) {
  const pdfBuf = await pdfBlob.arrayBuffer();
  pdfFileBase64 = btoa(
    new Uint8Array(pdfBuf).reduce((s, b) => s + String.fromCharCode(b), "")
  );
  pdfFileName = matchingFile.file_name;
}
```

## Issue 2: Duplicate emails on every "View Results" click

**Root Cause**: The localStorage key uses `case_.updated_at` which comes from the `cases` table's `updated_at` column. This value can change even without new results (e.g., any case update). More critically, `case_` is a dependency of the `useEffect`, and if the reference changes on re-render (which it does since it comes from a query), the effect re-runs. The `localStorage.setItem` is inside `setTimeout` (7s delay), but if the user navigates away and back within 7s, or if `case_` object reference changes, the key might not yet be set.

However, the **real issue** is that `localStorage.setItem(storageKey, "1")` is placed **inside** the `setTimeout` callback. If the useEffect fires, checks localStorage (empty), then fires again before the 7s timeout completes, the second invocation also sees no localStorage entry and schedules another timeout. This happens because `case_` is in the dependency array and React may re-render with a new object reference.

**Fix**: Move `localStorage.setItem(storageKey, "1")` **before** the `setTimeout` (immediately when the effect runs), so duplicate effect invocations see the flag instantly. Also use the case `id` + a stable result identifier (like `result_zip_url` or the `updated_at` of the result_files record) instead of `case_.updated_at` as the storage key. Since the secure flow doesn't update `result_zip_url`, use `case_.updated_at` but truncate to minute precision to avoid micro-changes.

Actually, the simplest robust fix: set the localStorage flag **synchronously before the timeout**, not inside it:

```typescript
const storageKey = `mismatch_checked_${id}_${case_.updated_at}`;
if (localStorage.getItem(storageKey)) return;
localStorage.setItem(storageKey, "1"); // Set immediately, not inside setTimeout

const timer = setTimeout(async () => {
  // ... scan logic
}, 7000);
```

For Issues 1 and 2, make sure no flow is broken

## Issue 3: Cache invalidation on deploy (informational — no code changes) Dont do this

When you deploy new code to Cloudflare Pages, users with cached assets see the old version until they hard-refresh. Options:

1. **Service Worker with update detection** — Register a service worker that checks for new versions periodically (e.g., every 24h or on each navigation). When a new version is detected, prompt the user or auto-reload.
2. **Vite's built-in cache busting** — Vite already hashes filenames, so new deploys serve new files. The issue is the cached `index.html`. Set `Cache-Control: no-cache` on `index.html` in Cloudflare Pages headers config, while keeping hashed assets cached long-term. This way the browser always fetches a fresh `index.html` which points to the new hashed JS/CSS files.
3. **Cloudflare Pages `_headers` file** — Add a `public/_headers` file with `/ Cache-Control: no-cache` for HTML. This is the simplest approach and requires no timer — users get new code on their next page load/navigation without hard refresh.

**Recommended**: Option 3 (Cloudflare `_headers` file) is the simplest and most reliable. No timer needed.

## Files to modify


| File                                    | Change                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/pages/app/CaseAnalysisResults.tsx` | Fix PDF download to use Supabase storage SDK; move localStorage.setItem before setTimeout |
