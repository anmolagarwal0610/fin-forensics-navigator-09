

# Fix: Back Navigation from Analysis Results

## Problem
All "Back to Case" buttons on the Analysis Results page (`CaseAnalysisResults.tsx`) navigate to `/app/dashboard` instead of `/app/cases/${id}` (the Case Preview page). The correct flow should be:

**Dashboard → Case Preview → Analysis Results**
- Analysis Results "Back to Case" → Case Preview (`/app/cases/${id}`)
- Case Preview "Back" → Dashboard (`/app/dashboard`)

## Changes

**`src/pages/app/CaseAnalysisResults.tsx`** — 3 locations (lines 987, 1040, 1071):
- Change `navigate('/app/dashboard')` → `` navigate(`/app/cases/${id}`) ``

These are the "Back to Case" buttons in the loading state, error state, and main render. The label already says "Back to Case" which is correct.

Line 1015 ("Back to Dashboard" for invalid case state) stays as-is — that's correct behavior.

No other files need changes. `CaseDetail.tsx` already navigates to `/app/dashboard` which is correct.

