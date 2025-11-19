import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  is_active: boolean;
  expires_at: string | null;
  pages_remaining: number;
}

export function useSubscription() {
  const { user } = useAuth();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.rpc('get_subscription_status', {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }

      return data?.[0] as SubscriptionStatus | null;
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
  
  return {
    tier: data?.tier || 'free',
    isActive: data?.is_active || false,
    expiresAt: data?.expires_at,
    pagesRemaining: data?.pages_remaining || 0,
    loading: isLoading,
    hasAccess: (data?.is_active && (data?.pages_remaining || 0) > 0) || false,
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
