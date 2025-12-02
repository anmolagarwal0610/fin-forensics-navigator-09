import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminPasswordStatus {
  isSet: boolean;
  isLocked: boolean;
  lockedUntil: string | null;
}

export function useAdminPasswordStatus() {
  return useQuery({
    queryKey: ['admin-password-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-check-password-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      return response.data as AdminPasswordStatus;
    },
  });
}