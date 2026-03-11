# Plan: Dynamic Page Title, Back Navigation Fix, and Timeline Event Inventory

## Task 1: Dynamic Page Title in AppLayout Header

Currently, the header always shows `{orgName} Dashboard` (line 40 of AppLayout.tsx). Fix: use `useLocation()` to derive the page name from the current route.

**Route → Page Name mapping:**


| Route Pattern               | Display Name     |
| --------------------------- | ---------------- |
| `/app/dashboard`            | Dashboard        |
| `/app/cases` (exact)        | Cases            |
| `/app/cases/new`            | New Case         |
| `/app/cases/:id/results`    | Analysis Results |
| `/app/cases/:id/upload`     | Upload Files     |
| `/app/cases/:id/review`     | Review Data      |
| `/app/cases/:id`            | Case Preview     |
| `/app/account`              | Account          |
| `/app/admin/cases`          | Admin Cases      |
| `/app/support/raise-ticket` | Raise Ticket     |


**File:** `src/components/app/AppLayout.tsx`

- Import `useLocation` from `react-router-dom`
- Replace the hardcoded `{t('nav.dashboard')}` with a function that maps `location.pathname` to the correct page name
- Format: `{getOrganizationName()}` followed by the dynamic page name in muted text (same styling as current)

## Task 2: Fix "Back" Navigation on CaseDetail When Coming From Analysis Results

**Problem:** CaseDetail uses `navigate(-1)` (line 332). When user navigates Dashboard → CaseDetail → Results → "Back to Case" → CaseDetail → "Back" — it goes back to Results instead of Dashboard because of browser history stack.

**Fix in `src/pages/app/CaseDetail.tsx`:**

- Change `navigate(-1)` to `navigate('/app/cases')` (or `/app/dashboard`) — always navigate to a deterministic parent route rather than relying on history.
- This ensures "Back" from CaseDetail always goes to the cases list/dashboard, not back to results.

**Also fix in `src/pages/app/CaseAnalysisResults.tsx`:**

- Line 986 uses `navigate(-1)` — change to `navigate(`/app/cases/${id}`)` for consistency (the other two "Back to Case" buttons on lines 1039 and 1070 already use this pattern).

## Task 3: Timeline Event Types Inventory

Here is the complete list of all possible events currently displayed under the Timeline section in CaseDetail, based on the `EventRecord.type` enum and `getEventTitle()` logic (lines 134-172):


| Event Type           | Payload Condition                                              | Displayed Title                                              |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `created`            | —                                                              | Case Created                                                 |
| `files_uploaded`     | —                                                              | Files Uploaded                                               |
| `analysis_submitted` | `payload.stage === 'review_completed'` + `changes_made: true`  | Review Done - Submitted for Final Analysis - Changes Made    |
| `analysis_submitted` | `payload.stage === 'review_completed'` + `changes_made: false` | Review Done - Submitted for Final Analysis - No Changes Made |
| `analysis_submitted` | `payload.stage === 'grouping_reanalysis'`                      | Re-analysis Started - Grouping Changes Applied               |
| `analysis_submitted` | `payload.mode === 'hitl'`                                      | Analysis Started - HITL Flow                                 |
| `analysis_submitted` | (default, no special payload)                                  | Analysis Started                                             |
| `analysis_ready`     | `payload.stage === 'initial-parse'`                            | Report Prepared for Human Review                             |
| `analysis_ready`     | (default)                                                      | Results Ready                                                |
| `note_added`         | —                                                              | Note Added                                                   |


**Total: 10 distinct display variants across 5 event types.**

No changes will be made to the Timeline UI until you confirm the desired behavior. The timestamps currently show under every event entry — awaiting your direction on which events should show timestamps and the new grouping/display logic.  
  
Ignore Task 3 and execute Task 1 & 2

## Files Modified


| File                                    | Change                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `src/components/app/AppLayout.tsx`      | Add `useLocation`, dynamic page name mapping                    |
| `src/pages/app/CaseDetail.tsx`          | Change `navigate(-1)` → `navigate('/app/cases')`                |
| `src/pages/app/CaseAnalysisResults.tsx` | Change line 986 `navigate(-1)` → `navigate(`/app/cases/${id}`)` |
