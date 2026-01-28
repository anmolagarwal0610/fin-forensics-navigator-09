
# Plan: Add "View Results" Button to Admin Console Case List

## Overview
Add a "View Results" button to the Admin Console case list that navigates admins to the case's analysis results page. This requires updating the frontend UI and ensuring RLS policies allow admin access to case data.

## Current Architecture Analysis

### What Already Works
1. **Edge function `get-result-file`** (lines 98-109) already checks for admin role and allows access
2. **RLS policies exist** for:
   - `result_files` table: "Admins can view all result files" policy already exists
   - `cases` table: Currently only allows users to view their own cases
3. **Admin cases hook** already fetches `result_zip_url` via edge function (bypassing RLS)

### Gap Identified
The `CaseAnalysisResults` page uses `getCaseById()` and `getCaseFiles()` which query the `cases` and `case_files` tables directly. These tables have RLS policies that **only allow users to view their own data**. An admin trying to view another user's results page would get a "Case not found" error.

---

## Implementation Steps

### Step 1: Add RLS Policy for Admin Access to Cases Table

Create a new RLS policy that allows admins to **SELECT** from the `cases` table:

```sql
CREATE POLICY "Admins can view all cases" 
ON public.cases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));
```

### Step 2: Add RLS Policy for Admin Access to Case Files Table

Create a new RLS policy that allows admins to **SELECT** from the `case_files` table:

```sql
CREATE POLICY "Admins can view all case files" 
ON public.case_files 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));
```

### Step 3: Update AdminCases.tsx UI

Add a "View Results" button in the case table:

| Change | Location | Details |
|--------|----------|---------|
| Import `Eye` icon | Line 10 | Already imported, reuse it |
| Add new table column | Line 343 | Add "Results" column header |
| Add View Results button | Inside TableRow | Button that navigates to `/app/cases/{id}/results` |
| Conditional rendering | Button | Only show if case status is "Ready" and has result_zip_url |

**UI Design:**
```text
┌──────────────┬──────────┬────────────┬────────────┬──────────────┬─────────────┬─────────────┬──────────┐
│ Case Name    │ User     │ Email      │ Status     │ Input Files  │ Result URL  │ Results     │          │
├──────────────┼──────────┼────────────┼────────────┼──────────────┼─────────────┼─────────────┼──────────┤
│ ● Case ABC   │ John Doe │ j@mail.com │ Ready      │ [Download]   │ [Update]    │ [View] 👁   │          │
│ ● Case XYZ   │ Jane Doe │ x@mail.com │ Processing │ [Download]   │ [Set URL]   │ (disabled)  │          │
└──────────────┴──────────┴────────────┴────────────┴──────────────┴─────────────┴─────────────┴──────────┘
```

---

## Technical Details

### File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| Database | Migration | Add 2 RLS policies for admin access to `cases` and `case_files` |
| `src/pages/app/AdminCases.tsx` | UI Update | Add "Results" column and "View Results" button |

### New RLS Policies Summary

| Table | Policy Name | Command | Using Expression |
|-------|-------------|---------|------------------|
| `cases` | Admins can view all cases | SELECT | `has_role(auth.uid(), 'admin')` |
| `case_files` | Admins can view all case files | SELECT | `has_role(auth.uid(), 'admin')` |

### Security Considerations

1. **No new edge functions needed** - The existing `get-result-file` already validates admin access
2. **Read-only access** - Admins can only SELECT, not INSERT/UPDATE/DELETE other users' cases
3. **Consistent security model** - Uses the same `has_role()` function used throughout the codebase
4. **Result file access already works** - The `result_files` table already has admin SELECT policy

### Button Behavior

- **Enabled**: Case status is "Ready" AND has `result_zip_url` (legacy) or secure file
- **Disabled/Hidden**: Case is still processing or has no results
- **Click action**: Navigate to `/app/cases/{caseId}/results`
- **Opens in new tab**: Yes (recommended for admin workflow)

---

## Testing Checklist

After implementation:
1. Admin navigates to Admin Console → Cases tab
2. Find a case with "Ready" status
3. Click "View Results" button
4. Verify results page loads with full analysis data
5. Verify downloading results ZIP works
6. Test with case that has no results (button should be disabled)
7. Test as non-admin user (should not see admin console)
