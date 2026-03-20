

# Real-time Dashboard Status Updates

## What's happening now
- `Dashboard.tsx` fetches cases once on mount, never updates
- `Cases.tsx` already has a Supabase Realtime subscription that updates state + shows toasts
- When a user is on Dashboard and a case finishes, the toast may appear but the KPI cards/activity list stay stale

## Fix
**One change in `src/pages/app/Dashboard.tsx`** — Add a `useEffect` with a Supabase Realtime subscription (identical pattern to Cases.tsx lines 44-95):

```typescript
import { supabase } from "@/integrations/supabase/client";

// Inside the component, after the loading useEffect:
useEffect(() => {
  const channel = supabase
    .channel('dashboard-case-updates')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'cases' },
      (payload) => {
        const updatedCase = payload.new as CaseRecord;
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

No toasts needed here (Cases.tsx already handles notifications). This just keeps the Dashboard data fresh.

## Files

| File | Change |
|------|--------|
| `src/pages/app/Dashboard.tsx` | Add Realtime subscription for case UPDATE events, import supabase client |

