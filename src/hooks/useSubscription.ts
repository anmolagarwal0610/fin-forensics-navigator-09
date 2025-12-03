import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  is_active: boolean;
  expires_at: string | null;
  pages_remaining: number;
  bonus_pages: number;
}

export function useSubscription() {
  const { user } = useAuth();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_subscription_status', {
        _user_id: user.id
      });

      if (rpcError) {
        console.error('Error fetching subscription:', rpcError);
        throw rpcError;
      }

      // Fetch bonus_pages from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('bonus_pages')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const subscriptionStatus = rpcData?.[0];
      return {
        ...subscriptionStatus,
        bonus_pages: profileData?.bonus_pages || 0,
      } as SubscriptionStatus | null;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
  
  const bonusPages = data?.bonus_pages || 0;
  const totalPagesRemaining = (data?.pages_remaining || 0) + bonusPages;

  return {
    tier: data?.tier || 'free',
    isActive: data?.is_active || false,
    expiresAt: data?.expires_at,
    pagesRemaining: totalPagesRemaining,
    bonusPages,
    loading: isLoading,
    hasAccess: (data?.is_active && totalPagesRemaining > 0) || false,
    refetch,
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 50,
  starter: 500,
  professional: 2000,
  enterprise: 10000,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};
