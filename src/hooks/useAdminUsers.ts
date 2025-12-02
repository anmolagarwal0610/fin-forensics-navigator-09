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
  created_at: string;
}

export function useAdminUsers(searchQuery: string = '') {
  return useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      // Call secure edge function instead of client-side auth.admin
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

      const { users } = response.data;
      
      // Filter by search query client-side (already filtered by backend too)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return users.filter((u: AdminUser) => 
          u.email.toLowerCase().includes(query) ||
          u.user_id.toLowerCase().includes(query) ||
          u.full_name.toLowerCase().includes(query) ||
          u.organization_name.toLowerCase().includes(query)
        );
      }

      return users;
    },
  });
}
