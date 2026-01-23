

# Plan: Case Preview Page Layout Changes & Results Page File Name Truncation

## Overview
Two separate changes are requested:
1. **Case Preview Page (CaseDetail.tsx)**: Move Timeline below Analysis Results, make Files section use 2 columns
2. **Results Analysis Page (CaseAnalysisResults.tsx)**: Truncate long file names in the File Analysis Summary section

---

## Part 1: Case Preview Page Layout Restructure

### Current Layout (lines 337-550)
```
┌─────────────────────────────────────────────────┐
│  grid-cols-1 lg:grid-cols-2                     │
│  ┌──────────────┐  ┌──────────────┐             │
│  │    Files     │  │   Timeline   │             │
│  │  (1 column)  │  │              │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
│  Review Files Banner (conditional)              │
│  Status Messages (conditional)                  │
│  Analysis Results Card                          │
└─────────────────────────────────────────────────┘
│  (Nothing below this)                           │
└─────────────────────────────────────────────────┘
```

### Proposed New Layout
```
┌─────────────────────────────────────────────────┐
│  Files Card (full-width)                        │
│  ┌─────────────────────────────────────────────┐│
│  │  2-column grid for files list               ││
│  │  (responsive: 1 col on mobile, 2 on md+)    ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
│  Review Files Banner (conditional)              │
│  Status Messages (conditional)                  │
│  Analysis Results Card                          │
└─────────────────────────────────────────────────┘
│  Timeline Card (full-width, dynamic height)     │
│  - Extends naturally with more entries          │
└─────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1.1: Restructure the grid layout (CaseDetail.tsx)
- **Remove** the `grid-cols-1 lg:grid-cols-2` wrapper around Files and Timeline
- **Make Files card full-width** instead of half-width

#### Step 1.2: Make Files section use 2 columns
- Change the files list from `space-y-2` single column to a **2-column grid**
- Use responsive breakpoints: `grid grid-cols-1 md:grid-cols-2 gap-2`
- Each file item remains the same, just arranged in 2 columns on larger screens

#### Step 1.3: Move Timeline below Analysis Results
- Move the entire Timeline `<Card>` block to after the Analysis Results card
- Make it full-width with no grid constraints
- Keep dynamic height (already extends naturally with `space-y-4`)

### File Changes: `src/pages/app/CaseDetail.tsx`

**Lines 337-497** - Restructure from:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Files */}
  <Card>...</Card>
  
  {/* Timeline */}
  <Card>...</Card>
</div>
```

To:
```tsx
{/* Files - Full Width with 2-Column Grid */}
<Card>
  <CardHeader>
    {/* Keep existing header unchanged */}
  </CardHeader>
  <CardContent>
    {files.length === 0 ? (
      <div>No files uploaded yet.</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {files.map((file, index) => (
          {/* Keep existing file item structure */}
        ))}
      </div>
    )}
  </CardContent>
</Card>

{/* Review Banner, Status Messages, Analysis Results - unchanged */}

{/* Timeline - Moved to bottom, dynamic height */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Clock className="h-5 w-5" />
      Timeline
    </CardTitle>
  </CardHeader>
  <CardContent>
    {events.length === 0 ? (
      <div>No events yet.</div>
    ) : (
      <div className="space-y-4">
        {events.map(event => (...))}
      </div>
    )}
  </CardContent>
</Card>
```

---

## Part 2: Results Page File Name Truncation

### Problem
In the File Analysis Summary section (lines 1100-1240), long file names like `VERY_LONG_FILENAME_WITH_MANY_DETAILS_JANUARY_2024_UPDATED_VERSION.pdf` overflow and break the layout.

### Solution
Create a display-only truncation utility function:
- Truncates the **base name** (not extension) if it exceeds a threshold (e.g., 30 characters)
- Preserves the file extension
- Shows full name on hover via tooltip

### Implementation

#### Step 2.1: Create truncation helper function
```typescript
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension
    return fileName.length > maxLength 
      ? fileName.slice(0, maxLength) + '...'
      : fileName;
  }
  
  const baseName = fileName.slice(0, lastDotIndex);
  const extension = fileName.slice(lastDotIndex); // includes the dot
  
  if (baseName.length <= maxLength) {
    return fileName; // No truncation needed
  }
  
  return baseName.slice(0, maxLength) + '...' + extension;
};
```

#### Step 2.2: Apply to File Analysis Summary section
Update line 1112 where `summary.originalFile` is displayed:

From:
```tsx
<span className="text-primary font-mono">{summary.originalFile}</span>
```

To:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-primary font-mono">
        {truncateFileName(summary.originalFile, 30)}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p>{summary.originalFile}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### File Changes: `src/pages/app/CaseAnalysisResults.tsx`

1. Add the `truncateFileName` utility function (inside the component or as a helper)
2. Wrap the file name display with Tooltip for full name on hover
3. Import `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` if not already imported

---

## Summary of Changes

| File | Change | Lines Affected |
|------|--------|----------------|
| `src/pages/app/CaseDetail.tsx` | Remove 2-col grid wrapper, make Files full-width with 2-column file list, move Timeline to bottom | 337-550 |
| `src/pages/app/CaseAnalysisResults.tsx` | Add `truncateFileName` helper, wrap file names with Tooltip | ~1108-1115 |

---

## Key Points

1. **No logic changes** - Only layout and display modifications
2. **File matching logic unchanged** - Truncation is display-only, original file names preserved for all operations
3. **Responsive design maintained** - 2-column grid is responsive (1 col on mobile)
4. **Timeline remains dynamic** - Uses `space-y-4` which naturally expands with content
5. **Tooltip for full name** - Users can hover to see complete file name

