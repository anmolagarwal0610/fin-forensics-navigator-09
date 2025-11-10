import { supabase } from '@/integrations/supabase/client';
import type { JobRow } from '@/types/job';

/**
 * Subscribe to Realtime updates for a specific job
 */
export function subscribeJob(
  jobId: string,
  onChange: (row: JobRow) => void
): () => void {
  const channel = supabase
    .channel(`jobs-${jobId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'jobs', 
        filter: `id=eq.${jobId}` 
      },
      (payload) => {
        console.log('Realtime job update:', payload);
        onChange(payload.new as JobRow);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
