

## Root Cause

The code for the Actions column and Retry button is already correct in `AdminCases.tsx` (lines 431 and 492-518). The reason it's not showing in the preview is that **the build is failing** due to the unresolved `dagre` import in `src/components/app/trace/useTraceLayout.ts`. This means the preview is still running an older version of the code from before both the retry feature and trace feature were added.

The build error:
```
Rollup failed to resolve import "dagre" from "src/components/app/trace/useTraceLayout.ts"
```

Even though `dagre` is listed in `package.json`, the lock file may not have been properly synced, so the module isn't actually installed.

## Fix

**One change needed** — Force the `dagre` dependency to resolve by regenerating the lock file. This can be done by making a trivial edit to `package.json` (e.g., bumping a comment or re-saving) which triggers a fresh `npm install` / `bun install` in the build pipeline.

Alternatively, if the lock file issue persists, we can **lazy-import dagre** in `useTraceLayout.ts` so the build doesn't fail even if dagre isn't installed (since the trace feature isn't used yet):

```typescript
// Instead of: import dagre from 'dagre';
// Use dynamic import that won't break the build
let dagre: any = null;
async function getDagre() {
  if (!dagre) {
    dagre = (await import('dagre')).default;
  }
  return dagre;
}
```

This ensures the admin retry feature (and all other code changes) deploy successfully regardless of whether dagre resolves.

## Files to modify

| File | Change |
|------|--------|
| `src/components/app/trace/useTraceLayout.ts` | Change static `import dagre` to a dynamic `import()` so the build doesn't fail if the module isn't available |

No changes needed to `AdminCases.tsx` or `useAdminCases.ts` — the retry button code is already correct.

