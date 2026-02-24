

# Plan: Fix Scroll Issues in Three Locations

## Root Cause (All 3 Issues)

The Radix UI `ScrollArea` component needs its root to have a definite height (not just `max-height`) for scrolling to work. The internal `Viewport` is set to `h-full w-full`, so when the root only has `max-h-*`, the Viewport expands unbounded and the scrollbar never appears. The content simply gets clipped by `overflow-hidden` on the outer container.

**Solution:** Replace `ScrollArea` with native `div` + `overflow-y-auto` in these three locations. This is simpler and reliable for dynamic-height containers with `max-h-*` constraints.

---

## Fix 1: Search Dropdown in EditGroupedNamesDialog

**File:** `src/components/app/EditGroupedNamesDialog.tsx`

**Line 249-276:** Replace the outer `div` + `ScrollArea` with a single scrollable div:

```
Before:
<div class="... max-h-64 overflow-hidden">
  <ScrollArea class="max-h-64">
    ...content...
  </ScrollArea>
</div>

After:
<div class="... max-h-64 overflow-y-auto">
  ...content (no ScrollArea wrapper)...
</div>
```

This enables native browser scrolling when more than ~6 results appear.

---

## Fix 2: Review Changes Dialog (ApplyChangesDialog)

**File:** `src/components/app/ApplyChangesDialog.tsx`

**Line 121-175:** Replace `ScrollArea` with a scrollable div:

```
Before:
<ScrollArea class="flex-1 px-4 ... max-h-[55vh]">
  <div class="space-y-5">...changes...</div>
</ScrollArea>

After:
<div class="flex-1 px-4 ... max-h-[55vh] overflow-y-auto">
  <div class="space-y-5">...changes...</div>
</div>
```

---

## Fix 3: Grouped Names & Removed Names Columns

**File:** `src/components/app/EditGroupedNamesDialog.tsx`

**Lines 289 and 352:** The Grouped Names and Removed Names columns currently use `ScrollArea` with `h-[200px] sm:h-[280px]`. These also need to use native scrolling. Additionally, cap the visible area to approximately 5 items (~200px) to ensure the dialog does not grow excessively:

```
Before:
<ScrollArea class="flex-1 h-[200px] sm:h-[280px] rounded-lg border ...">

After:
<div class="flex-1 max-h-[200px] sm:max-h-[240px] overflow-y-auto rounded-lg border ...">
```

Using `max-h` instead of fixed `h` lets the box shrink when there are few items, but caps at ~5 visible items and scrolls beyond that.

---

## Summary

| File | Location | Change |
|------|----------|--------|
| `EditGroupedNamesDialog.tsx` | Lines 249-276 | Replace ScrollArea with `overflow-y-auto` div for search dropdown |
| `EditGroupedNamesDialog.tsx` | Lines 289, 352 | Replace ScrollArea with `overflow-y-auto` div for Grouped/Removed columns |
| `ApplyChangesDialog.tsx` | Lines 121-175 | Replace ScrollArea with `overflow-y-auto` div for changes list |

No other logic, state, or flow changes. Only scroll containers are updated.

