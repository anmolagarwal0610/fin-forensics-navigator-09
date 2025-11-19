import { Progress } from "@/components/ui/progress";
import { TIER_LIMITS, type SubscriptionTier } from "@/hooks/useSubscription";

interface UsageIndicatorProps {
  tier: SubscriptionTier;
  pagesUsed: number;
  className?: string;
}

export function UsageIndicator({ tier, pagesUsed, className }: UsageIndicatorProps) {
  const limit = TIER_LIMITS[tier];
  const percentage = Math.min((pagesUsed / limit) * 100, 100);
  
  const getColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">Pages Used</span>
        <span className="font-medium">
          {pagesUsed.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <style dangerouslySetInnerHTML={{__html: `
        .progress-indicator {
          background-color: ${percentage >= 90 ? 'rgb(239 68 68)' : percentage >= 70 ? 'rgb(234 179 8)' : 'rgb(16 185 129)'} !important;
        }
      `}} />

      <p className="text-xs text-muted-foreground mt-1">
        {Math.max(0, limit - pagesUsed).toLocaleString()} pages remaining
      </p>
    </div>
  );
}
