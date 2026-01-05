import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'monthly' | 'yearly_tier' | 'yearly_plan';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  is_active: boolean;
  expires_at: string | null;
  pages_remaining: number;
  bonus_pages: number;
  total_pages_granted: number | null;
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

      // Fetch bonus_pages and total_pages_granted from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('bonus_pages, total_pages_granted, current_period_pages_used')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      const subscriptionStatus = rpcData?.[0];
      return {
        ...subscriptionStatus,
        bonus_pages: profileData?.bonus_pages || 0,
        total_pages_granted: profileData?.total_pages_granted || null,
        current_period_pages_used: profileData?.current_period_pages_used || 0,
      } as SubscriptionStatus & { current_period_pages_used: number };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
  
  const bonusPages = data?.bonus_pages || 0;
  const totalPagesGranted = data?.total_pages_granted;
  const currentPeriodPagesUsed = (data as any)?.current_period_pages_used || 0;
  
  // If total_pages_granted is set, use it; otherwise fall back to tier limits
  const effectiveTotalPages = totalPagesGranted ?? TIER_LIMITS[data?.tier || 'free'];
  const pagesRemaining = Math.max(0, effectiveTotalPages - currentPeriodPagesUsed) + bonusPages;

  return {
    tier: data?.tier || 'free',
    isActive: data?.is_active || false,
    expiresAt: data?.expires_at,
    pagesRemaining,
    bonusPages,
    totalPagesGranted,
    currentPeriodPagesUsed,
    loading: isLoading,
    hasAccess: (data?.is_active && pagesRemaining > 0) || false,
    refetch,
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 50,
  starter: 500,
  professional: 2000,
  enterprise: 10000,
  monthly: 22500,
  yearly_tier: 200000,
  yearly_plan: 250000,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  monthly: 'Monthly Tier',
  yearly_tier: 'Yearly Tier',
  yearly_plan: 'Yearly Plan',
};

// Helper to get pages per period for a tier
export const TIER_PAGES_PER_PERIOD: Record<SubscriptionTier, { pages: number; period: 'month' | 'year' }> = {
  free: { pages: 50, period: 'month' },
  starter: { pages: 500, period: 'month' },
  professional: { pages: 2000, period: 'month' },
  enterprise: { pages: 10000, period: 'month' },
  monthly: { pages: 22500, period: 'month' },
  yearly_tier: { pages: 200000, period: 'year' },
  yearly_plan: { pages: 250000, period: 'year' },
};
