import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  organization_name: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  current_period_pages_used: number;
  bonus_pages: number;
  total_pages_granted: number | null;
  created_at: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-get-users', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      return response.data.users as AdminUser[];
    },
  });
}
