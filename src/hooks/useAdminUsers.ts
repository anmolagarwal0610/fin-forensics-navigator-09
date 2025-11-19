import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  organization_name: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  current_period_pages_used: number;
  created_at: string;
}

export function useAdminUsers(searchQuery: string = '') {
  return useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Get subscription statuses for all users
      const usersWithStatus: AdminUser[] = [];
      
      for (const profile of profiles) {
        const { data: statusData } = await supabase.rpc('get_subscription_status', {
          _user_id: profile.user_id
        });

        // Get email from auth.users (need service role for this in real app)
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.user_id);

        usersWithStatus.push({
          user_id: profile.user_id,
          email: authUser?.email || 'Unknown',
          full_name: profile.full_name,
          organization_name: profile.organization_name,
          subscription_tier: statusData?.[0]?.tier || profile.subscription_tier,
          subscription_expires_at: profile.subscription_expires_at,
          current_period_pages_used: profile.current_period_pages_used,
          created_at: profile.created_at,
        });
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return usersWithStatus.filter(u => 
          u.email.toLowerCase().includes(query) ||
          u.user_id.toLowerCase().includes(query) ||
          u.full_name.toLowerCase().includes(query) ||
          u.organization_name.toLowerCase().includes(query)
        );
      }

      return usersWithStatus;
    },
  });
}
